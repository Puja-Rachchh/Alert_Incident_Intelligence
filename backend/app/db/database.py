import os
from contextlib import contextmanager
import json

import psycopg2


def _database_url() -> str:
    # Use an explicit env var if present, otherwise fall back to local Docker defaults.
    return os.getenv(
        "DATABASE_URL",
        "postgresql://admin:admin123@127.0.0.1:5433/alerts",
    )


@contextmanager
def get_connection():
    conn = psycopg2.connect(_database_url())
    try:
        yield conn
    finally:
        conn.close()


def insert_bronze_alert(source_system: str, raw_payload: str, content_type: str) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bronze_alerts (source_system, raw_payload, content_type)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (source_system, raw_payload, content_type),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return new_id


def ensure_ticket_table() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    ticket_number BIGSERIAL UNIQUE,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    requester TEXT,
                    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                    status VARCHAR(20) NOT NULL DEFAULT 'open',
                    source_query TEXT,
                    related_incident_id UUID,
                    metadata JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        conn.commit()


def create_ticket(
    title: str,
    description: str,
    requester: str | None,
    priority: str,
    source_query: str | None,
    related_incident_id: str | None,
    metadata: dict | None,
) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tickets (
                    title,
                    description,
                    requester,
                    priority,
                    source_query,
                    related_incident_id,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING ticket_id, ticket_number, title, status, priority, created_at
                """,
                (
                    title,
                    description,
                    requester,
                    priority,
                    source_query,
                    related_incident_id,
                    json.dumps(metadata or {}),
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "ticket_id": str(row[0]),
        "ticket_number": row[1],
        "title": row[2],
        "status": row[3],
        "priority": row[4],
        "created_at": row[5].isoformat(),
    }


def list_recent_tickets(limit: int = 20) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ticket_id, ticket_number, title, status, priority, requester, created_at
                FROM tickets
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

    tickets: list[dict] = []
    for row in rows:
        tickets.append(
            {
                "ticket_id": str(row[0]),
                "ticket_number": row[1],
                "title": row[2],
                "status": row[3],
                "priority": row[4],
                "requester": row[5],
                "created_at": row[6].isoformat(),
            }
        )
    return tickets
