import json
from datetime import timedelta

from app.db.database import get_connection
from app.services.normalizer import normalize_record


def fetch_pending_bronze(cur, limit: int = 500):
    cur.execute(
        """
        SELECT id, source_system, raw_payload, content_type
        FROM bronze_alerts
        WHERE processing_status = 'pending'
        ORDER BY ingested_at ASC
        LIMIT %s
        """,
        (limit,),
    )
    return cur.fetchall()


def is_duplicate(cur, fingerprint: str, occurred_at):
    window_start = occurred_at - timedelta(minutes=5)
    window_end = occurred_at + timedelta(minutes=5)
    cur.execute(
        """
        SELECT 1
        FROM silver_alerts
        WHERE fingerprint = %s
          AND occurred_at BETWEEN %s AND %s
        LIMIT 1
        """,
        (fingerprint, window_start, window_end),
    )
    return cur.fetchone() is not None


def insert_silver(cur, bronze_id: int, rec: dict, duplicate_flag: bool):
    cur.execute(
        """
        INSERT INTO silver_alerts (
            source_system,
            source_alert_id,
            alert_name,
            severity,
            severity_label,
            status,
            customer_name,
            device_name,
            host,
            alert_category,
            is_duplicate,
            is_resolution,
            fingerprint,
            occurred_at,
            description,
            quantitative_data,
            extra_data,
            bronze_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s
        )
        """,
        (
            rec["source_system"],
            rec.get("source_alert_id"),
            rec["alert_name"],
            rec["severity"],
            rec.get("severity_label"),
            rec["status"],
            rec["customer_name"],
            rec.get("device_name"),
            rec.get("host"),
            rec.get("alert_category"),
            duplicate_flag,
            rec["is_resolution"],
            rec["fingerprint"],
            rec["occurred_at"],
            rec.get("description"),
            json.dumps(rec.get("quantitative_data", {})),
            json.dumps(rec.get("extra_data", {})),
            bronze_id,
        ),
    )


def mark_processed(cur, bronze_id: int):
    cur.execute(
        """
        UPDATE bronze_alerts
        SET processing_status = 'processed', processed_at = NOW(), error_message = NULL
        WHERE id = %s
        """,
        (bronze_id,),
    )


def mark_failed(cur, bronze_id: int, error_message: str):
    cur.execute(
        """
        UPDATE bronze_alerts
        SET processing_status = 'failed', error_message = %s, processed_at = NOW()
        WHERE id = %s
        """,
        (error_message[:2000], bronze_id),
    )


def run(limit: int = 500):
    processed = 0
    failed = 0
    duplicates = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            rows = fetch_pending_bronze(cur, limit=limit)

            for bronze_id, source_system, raw_payload, _content_type in rows:
                try:
                    rec = normalize_record(source_system=source_system, raw_payload=raw_payload)
                    duplicate_flag = is_duplicate(cur, rec["fingerprint"], rec["occurred_at"])
                    if duplicate_flag:
                        duplicates += 1

                    insert_silver(cur, bronze_id, rec, duplicate_flag)
                    mark_processed(cur, bronze_id)
                    processed += 1
                except Exception as exc:
                    mark_failed(cur, bronze_id, str(exc))
                    failed += 1

        conn.commit()

    print(
        f"Bronze->Silver run complete: processed={processed}, failed={failed}, duplicates={duplicates}"
    )


if __name__ == "__main__":
    run()
