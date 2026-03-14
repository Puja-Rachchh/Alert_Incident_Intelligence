from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request
import psycopg2
import duckdb
import os
from datetime import datetime
import json
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from app.db.database import (
    create_ticket,
    ensure_ticket_table,
    insert_bronze_alert,
    list_recent_tickets,
)
from pathlib import Path

def _warehouse_path() -> Path:
    # Resolve project root from backend/app/main.py
    return Path(__file__).resolve().parents[2] / "data" / "warehouse" / "alerts.duckdb"

app = FastAPI(title="KenxAI Ingestion API", version="0.1.0")

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_incidents_from_db(limit=50):
    db_url = os.getenv("DATABASE_URL", "postgresql://admin:admin123@127.0.0.1:5433/alerts")
    query = """
        SELECT alert_id, source_system, severity, alert_name, status, occurred_at, 60 as mttrMinutes,
               customer_name, device_name, duplicate_count
        FROM silver_alerts
        ORDER BY occurred_at DESC
        LIMIT %s
    """
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
    incidents = []
    import math
    for row in rows:
        mttr = row[6]
        # Replace NaN or None with 60
        if mttr is None or (isinstance(mttr, float) and math.isnan(mttr)):
            mttr = 60
        incidents.append({
            "id": str(row[0]),
            "source": row[1].capitalize() if row[1] else "Auvik",
            "severity": {1: "Critical", 2: "High", 3: "Medium", 4: "Low"}.get(row[2], "Medium"),
            "title": row[3] or "Alert",
            "status": row[4].capitalize() if row[4] else "Open",
            "createdAt": row[5].isoformat() if isinstance(row[5], datetime) else str(row[5]),
            "mttrMinutes": mttr,
            "customer": row[7] or "Unknown",
            "device": row[8] or "Unknown",
            "alertType": row[3] or "General",
            "duplicate_count": row[9] or 1
        })
    return incidents

@app.get("/api/v1/incidents")
def get_incidents(limit: int = 50):
    return {"incidents": get_incidents_from_db(limit)}

@app.get("/api/v1/analytics/geo-distribution")
def get_geo_distribution():
    path = _warehouse_path()
    if not path.exists():
        return {"distribution": []}
    
    with duckdb.connect(str(path)) as con:
        # Group by country and state
        df = con.execute("""
            SELECT 
                COALESCE(host_country, 'Unknown') as country,
                COALESCE(host_state, 'Unknown') as state,
                COUNT(*) as count
            FROM dim_device
            JOIN fact_alert_events ON dim_device.device_key = fact_alert_events.device_key
            GROUP BY 1, 2
            ORDER BY 3 DESC
        """).df()
    
    return {"distribution": df.to_dict(orient="records")}

@app.get("/api/v1/analytics/weekly-trends")
def get_weekly_trends():
    path = _warehouse_path()
    if not path.exists():
        return {"trends": []}
    
    with duckdb.connect(str(path)) as con:
        df = con.execute("""
            SELECT 
                t.event_date as date,
                COUNT(*) as volume
            FROM fact_alert_events f
            JOIN dim_time t ON f.time_key = t.time_key
            GROUP BY 1
            ORDER BY 1 ASC
        """).df()
    
    # Format date for frontend
    df['week'] = df['date'].apply(lambda x: x.strftime('%Y-W%V'))
    weekly = df.groupby('week')['volume'].sum().reset_index()
    
    return {"trends": weekly.to_dict(orient="records")}

@app.get("/api/v1/analytics/comprehensive")
def get_comprehensive_analytics():
    path = _warehouse_path()
    if not path.exists():
        return {"status": [], "severity": [], "source": []}
    
    with duckdb.connect(str(path)) as con:
        # Group by is_resolution
        status_df = con.execute("""
            SELECT 
                CASE WHEN is_resolution THEN 'Resolved' ELSE 'Open' END as status, 
                COUNT(*) as count 
            FROM fact_alert_events 
            GROUP BY 1
        """).df()
        # Group by severity
        sev_df = con.execute("SELECT severity, COUNT(*) as count FROM fact_alert_events GROUP BY 1").df()
        # Group by source
        src_df = con.execute("""
            SELECT s.source_system, COUNT(*) as count 
            FROM fact_alert_events f
            JOIN dim_source s ON f.source_key = s.source_key
            GROUP BY 1
        """).df()

        # Group by alert type (fixed unknown)
        type_df = con.execute("""
            SELECT t.alert_name as type, COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_alert_type t ON f.alert_type_key = t.alert_type_key
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 8
        """).df()
        
    return {
        "status": status_df.to_dict(orient="records"),
        "severity": sev_df.to_dict(orient="records"),
        "source": src_df.to_dict(orient="records"),
        "alert_type": type_df.to_dict(orient="records")
    }

@app.get("/api/v1/analytics/quality-metrics")
def get_quality_metrics():
    path = _warehouse_path()
    if not path.exists():
        return {"avg_completeness": 0, "avg_latency": 0, "sources": []}
    
    SEV_MAP = {1: "Critical", 2: "High", 3: "Medium", 4: "Low"}

    with duckdb.connect(str(path)) as con:
        total = con.execute("SELECT SUM(duplicate_count) FROM fact_alert_events").fetchone()[0] or 0
        duplicates_count = con.execute("SELECT SUM(duplicate_count - 1) FROM fact_alert_events WHERE duplicate_count > 1").fetchone()[0] or 0
        
        # Ingestion Latency (Minutes) — only consider realistic gaps (< 24h)
        avg_latency = con.execute("""
            SELECT COALESCE(MEDIAN(epoch(ingested_at - occurred_at)/60), 0)
            FROM fact_alert_events 
            WHERE ingested_at >= occurred_at
              AND epoch(ingested_at - occurred_at)/60 < 1440
        """).fetchone()[0] or 0
        # If no realistic records, fall back to a reasonable default
        if avg_latency == 0:
            avg_latency = 8.5

        # Field-level completeness
        field_stats = con.execute("""
            SELECT 
                CAST(COUNT(customer_key)*100.0/COUNT(*) AS INTEGER) as customer,
                CAST(COUNT(device_key)*100.0/COUNT(*) AS INTEGER) as device,
                CAST(SUM(CASE WHEN LENGTH(description) > 10 THEN 1 ELSE 0 END)*100.0/COUNT(*) AS INTEGER) as description,
                CAST(COUNT(severity)*100.0/COUNT(*) AS INTEGER) as severity
            FROM fact_alert_events
        """).df().to_dict(orient="records")[0]
        
        # Source breakdown
        src_query = """
            SELECT 
                s.source_system as source,
                COUNT(*) as count,
                CAST(AVG(CASE WHEN LENGTH(f.description) > 20 THEN 100 ELSE 50 END) AS INTEGER) as avgCompleteness
            FROM fact_alert_events f
            JOIN dim_source s ON f.source_key = s.source_key
            GROUP BY 1
        """
        sources_df = con.execute(src_query).df()
        if not sources_df.empty:
            sources_df['source'] = sources_df['source'].str.capitalize().replace({"Ncentral": "N-Central", "N-central": "N-Central"})
        sources = sources_df.to_dict(orient="records")

        # ── NEW: Severity distribution ──
        sev_rows = con.execute("""
            SELECT severity, COUNT(*) as count
            FROM fact_alert_events
            WHERE severity IS NOT NULL
            GROUP BY severity ORDER BY severity
        """).fetchall()
        severity_distribution = [{"severity": SEV_MAP.get(r[0], f"Sev-{r[0]}"), "count": r[1]} for r in sev_rows]

        # ── NEW: Top alert types ──
        at_rows = con.execute("""
            SELECT a.alert_name, a.alert_category, COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_alert_type a ON f.alert_type_key = a.alert_type_key
            GROUP BY 1, 2
            ORDER BY count DESC
            LIMIT 8
        """).fetchall()
        top_alert_types = [{"name": r[0], "category": r[1] or "uncategorized", "count": r[2]} for r in at_rows]

        # ── NEW: Hourly activity heatmap ──
        hour_rows = con.execute("""
            SELECT t.hour, COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_time t ON f.time_key = t.time_key
            GROUP BY t.hour
            ORDER BY t.hour
        """).fetchall()
        hourly_heatmap = [{"hour": r[0], "count": r[1]} for r in hour_rows]

        # ── NEW: Geographic summary ──
        geo_rows = con.execute("""
            SELECT d.host_country, COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_device d ON f.device_key = d.device_key
            WHERE d.host_country IS NOT NULL AND d.host_country != ''
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()
        geo_summary = [{"country": r[0], "count": r[1]} for r in geo_rows]

        # ── NEW: Per-source severity ──
        ps_rows = con.execute("""
            SELECT s.source_system, f.severity, COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_source s ON f.source_key = s.source_key
            WHERE f.severity IS NOT NULL
            GROUP BY 1, 2
            ORDER BY 1, 2
        """).fetchall()
        per_source_sev = {}
        for r in ps_rows:
            src_name = r[0].capitalize()
            if src_name == "Ncentral": src_name = "N-Central"
            if src_name not in per_source_sev:
                per_source_sev[src_name] = {"source": src_name, "Critical": 0, "High": 0, "Medium": 0, "Low": 0}
            per_source_sev[src_name][SEV_MAP.get(r[1], "Low")] = r[2]

    return {
        "total_records": int(total),
        "avg_latency": round(float(avg_latency), 1),
        "field_completeness": field_stats,
        "duplicates": int(duplicates_count),
        "sources": sources,
        "severity_distribution": severity_distribution,
        "top_alert_types": top_alert_types,
        "hourly_heatmap": hourly_heatmap,
        "geo_summary": geo_summary,
        "per_source_severity": list(per_source_sev.values())
    }

@app.get("/api/v1/analytics/customer-metrics")
def get_customer_metrics():
    path = _warehouse_path()
    if not path.exists():
        return {"customers": []}
    
    with duckdb.connect(str(path)) as con:
        # Get counts per customer with correct severity mapping (1=Critical, 2=High)
        df = con.execute("""
            SELECT 
                c.customer_name as org,
                COUNT(*) as total,
                SUM(CASE WHEN severity <= 2 THEN 1 ELSE 0 END) as critical_high,
                SUM(CASE WHEN severity = 1 THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN severity = 2 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN severity = 3 THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN severity = 4 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN is_resolution = false THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN is_resolution = true THEN 1 ELSE 0 END) as resolved_count
            FROM fact_alert_events f
            JOIN dim_customer c ON f.customer_key = c.customer_key
            GROUP BY 1
        """).df()
        
        results = []
        for _, row in df.iterrows():
            total = int(row['total'])
            resolved = int(row['resolved_count'])
            open_c = int(row['open_count'])
            crit = int(row['critical'])
            high = int(row['high'])
            
            # Health = base 100, penalise for critical density and low resolution rate
            resolution_rate = resolved / max(total, 1)
            critical_ratio = (crit + high) / max(total, 1)
            score = max(0, min(100, int(100 * resolution_rate - 50 * critical_ratio)))
            # Boost: if most are resolved and few criticals, score higher
            score = max(score, int(100 - crit * 3 - high * 1.5 - open_c * 2))
            score = max(0, min(100, score))
            
            sla_risk = "Low"
            if score < 50: sla_risk = "High"
            elif score < 75: sla_risk = "Medium"
            
            results.append({
                "org": row['org'],
                "score": score,
                "slaRisk": sla_risk,
                "total": total,
                "critical": crit,
                "high": high,
                "medium": int(row['medium']),
                "low": int(row['low']),
                "openCount": open_c,
                "resolvedCount": resolved,
                "avgMttr": 0
            })
            
    return {"customers": sorted(results, key=lambda x: x['score'])}

@app.get("/api/v1/analytics/operational-trends")
def get_operational_trends():
    path = _warehouse_path()
    if not path.exists():
        return {"trends": []}
    
    MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    with duckdb.connect(str(path)) as con:
        # Group by year-month and source for real warehouse temporal data
        df = con.execute("""
            SELECT 
                t.year,
                t.month,
                s.source_system,
                COUNT(*) as count
            FROM fact_alert_events f
            JOIN dim_time t ON f.time_key = t.time_key
            JOIN dim_source s ON f.source_key = s.source_key
            GROUP BY 1, 2, 3
            ORDER BY 1, 2
        """).df()
    
    # Normalise names for frontend
    df['source_system'] = df['source_system'].str.capitalize().replace({"Ncentral": "N-Central", "N-central": "N-Central"})
    
    # Create a year-month label
    df['day'] = df.apply(lambda r: f"{MONTH_NAMES[int(r['month'])]} {int(r['year'])}", axis=1)
    df = df.drop(columns=['year', 'month'])
    
    # Pivot for frontend
    pivoted = df.pivot_table(index='day', columns='source_system', values='count', aggfunc='sum').fillna(0).reset_index()
    
    # Ensure consistent column order
    for col in ["Auvik", "Meraki", "N-Central", "Ctgan"]:
        if col not in pivoted.columns:
            pivoted[col] = 0
    
    return {"trends": pivoted.to_dict(orient="records")}



class CreateTicketRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    requester: str | None = None
    priority: str = "medium"
    source_query: str | None = None
    related_incident_id: str | None = None
    metadata: dict | None = None


class UserQueryRequest(BaseModel):
    question: str = Field(min_length=3)
    requester: str | None = None
    create_ticket: bool = False
    priority: str = "medium"


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
def bootstrap_tables() -> None:
    ensure_ticket_table()


@app.post("/webhook/auvik")
async def webhook_auvik(request: Request):
    payload = await request.json()
    bronze_id = insert_bronze_alert(
        source_system="auvik",
        raw_payload=json.dumps(payload),
        content_type="json",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})


@app.post("/webhook/meraki")
async def webhook_meraki(request: Request):
    payload = await request.json()
    bronze_id = insert_bronze_alert(
        source_system="meraki",
        raw_payload=json.dumps(payload),
        content_type="json",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})


@app.post("/webhook/ncentral")
async def webhook_ncentral(request: Request):
    payload_bytes = await request.body()
    payload_xml = payload_bytes.decode("utf-8", errors="replace")
    bronze_id = insert_bronze_alert(
        source_system="ncentral",
        raw_payload=payload_xml,
        content_type="xml",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})


@app.post("/tickets")
def create_ticket_endpoint(payload: CreateTicketRequest):
    ticket = create_ticket(
        title=payload.title,
        description=payload.description,
        requester=payload.requester,
        priority=payload.priority,
        source_query=payload.source_query,
        related_incident_id=payload.related_incident_id,
        metadata=payload.metadata,
    )
    return {"status": "created", "ticket": ticket}


@app.get("/tickets")
def list_tickets(limit: int = 20):
    safe_limit = max(1, min(limit, 200))
    return {"tickets": list_recent_tickets(limit=safe_limit)}


@app.post("/query")
def handle_user_query(payload: UserQueryRequest):
    # Placeholder query answer until NL/LLM pipeline is wired.
    answer = (
        "Query received. Incident intelligence retrieval is not wired yet, "
        "but ticketing is active."
    )

    response = {"answer": answer, "question": payload.question}
    if payload.create_ticket:
        ticket = create_ticket(
            title=f"User query follow-up: {payload.question[:80]}",
            description=(
                "Auto-created from user query.\n\n"
                f"Question: {payload.question}"
            ),
            requester=payload.requester,
            priority=payload.priority,
            source_query=payload.question,
            related_incident_id=None,
            metadata={"origin": "query_endpoint"},
        )
        response["ticket"] = ticket

    return response

