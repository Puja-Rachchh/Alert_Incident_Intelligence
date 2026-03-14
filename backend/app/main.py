import json

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.db.database import (
    create_ticket,
    ensure_ticket_table,
    insert_bronze_alert,
    list_recent_tickets,
)


app = FastAPI(title="KenxAI Ingestion API", version="0.1.0")


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
