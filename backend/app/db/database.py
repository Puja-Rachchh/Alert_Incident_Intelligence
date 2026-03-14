import os
from contextlib import contextmanager

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
