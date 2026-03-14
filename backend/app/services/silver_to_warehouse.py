from datetime import datetime
from pathlib import Path

import duckdb
import psycopg2


def _database_url() -> str:
    # Keep this in sync with backend DB settings.
    return "postgresql://admin:admin123@127.0.0.1:5433/alerts"


def _warehouse_path() -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "data" / "warehouse" / "alerts.duckdb"


def _create_schema(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS dim_source (
            source_key INTEGER PRIMARY KEY,
            source_system VARCHAR UNIQUE
        );

        CREATE SEQUENCE IF NOT EXISTS seq_dim_source START 1;

        CREATE TABLE IF NOT EXISTS dim_customer (
            customer_key INTEGER PRIMARY KEY,
            customer_name VARCHAR UNIQUE
        );

        CREATE SEQUENCE IF NOT EXISTS seq_dim_customer START 1;

        CREATE TABLE IF NOT EXISTS dim_device (
            device_key INTEGER PRIMARY KEY,
            device_name VARCHAR,
            host VARCHAR,
            UNIQUE(device_name, host)
        );

        CREATE SEQUENCE IF NOT EXISTS seq_dim_device START 1;

        CREATE TABLE IF NOT EXISTS dim_alert_type (
            alert_type_key INTEGER PRIMARY KEY,
            alert_name VARCHAR,
            alert_category VARCHAR,
            UNIQUE(alert_name, alert_category)
        );

        CREATE SEQUENCE IF NOT EXISTS seq_dim_alert_type START 1;

        CREATE TABLE IF NOT EXISTS dim_time (
            time_key INTEGER PRIMARY KEY,
            event_date DATE,
            year INTEGER,
            month INTEGER,
            day INTEGER,
            hour INTEGER,
            UNIQUE(event_date, hour)
        );

        CREATE TABLE IF NOT EXISTS fact_alert_events (
            alert_id UUID PRIMARY KEY,
            occurred_at TIMESTAMP,
            ingested_at TIMESTAMP,
            source_key INTEGER,
            customer_key INTEGER,
            device_key INTEGER,
            alert_type_key INTEGER,
            time_key INTEGER,
            severity SMALLINT,
            is_duplicate BOOLEAN,
            is_resolution BOOLEAN,
            fingerprint VARCHAR,
            description VARCHAR
        );
        """
    )


def _get_or_create_source_key(con: duckdb.DuckDBPyConnection, source_system: str) -> int:
    row = con.execute(
        "SELECT source_key FROM dim_source WHERE source_system = ?", [source_system]
    ).fetchone()
    if row:
        return row[0]

    con.execute(
        "INSERT INTO dim_source VALUES (nextval('seq_dim_source'), ?)", [source_system]
    )
    return con.execute(
        "SELECT source_key FROM dim_source WHERE source_system = ?", [source_system]
    ).fetchone()[0]


def _get_or_create_customer_key(con: duckdb.DuckDBPyConnection, customer_name: str) -> int:
    row = con.execute(
        "SELECT customer_key FROM dim_customer WHERE customer_name = ?", [customer_name]
    ).fetchone()
    if row:
        return row[0]

    con.execute(
        "INSERT INTO dim_customer VALUES (nextval('seq_dim_customer'), ?)", [customer_name]
    )
    return con.execute(
        "SELECT customer_key FROM dim_customer WHERE customer_name = ?", [customer_name]
    ).fetchone()[0]


def _get_or_create_device_key(con: duckdb.DuckDBPyConnection, device_name: str, host: str) -> int:
    row = con.execute(
        "SELECT device_key FROM dim_device WHERE device_name = ? AND host = ?",
        [device_name, host],
    ).fetchone()
    if row:
        return row[0]

    con.execute(
        "INSERT INTO dim_device VALUES (nextval('seq_dim_device'), ?, ?)",
        [device_name, host],
    )
    return con.execute(
        "SELECT device_key FROM dim_device WHERE device_name = ? AND host = ?",
        [device_name, host],
    ).fetchone()[0]


def _get_or_create_alert_type_key(
    con: duckdb.DuckDBPyConnection, alert_name: str, alert_category: str
) -> int:
    row = con.execute(
        "SELECT alert_type_key FROM dim_alert_type WHERE alert_name = ? AND alert_category = ?",
        [alert_name, alert_category],
    ).fetchone()
    if row:
        return row[0]

    con.execute(
        "INSERT INTO dim_alert_type VALUES (nextval('seq_dim_alert_type'), ?, ?)",
        [alert_name, alert_category],
    )
    return con.execute(
        "SELECT alert_type_key FROM dim_alert_type WHERE alert_name = ? AND alert_category = ?",
        [alert_name, alert_category],
    ).fetchone()[0]


def _time_key(occurred_at: datetime) -> int:
    return int(occurred_at.strftime("%Y%m%d%H"))


def _get_or_create_time_key(con: duckdb.DuckDBPyConnection, occurred_at: datetime) -> int:
    key = _time_key(occurred_at)
    row = con.execute("SELECT time_key FROM dim_time WHERE time_key = ?", [key]).fetchone()
    if row:
        return row[0]

    con.execute(
        """
        INSERT INTO dim_time (time_key, event_date, year, month, day, hour)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            key,
            occurred_at.date(),
            occurred_at.year,
            occurred_at.month,
            occurred_at.day,
            occurred_at.hour,
        ],
    )
    return key


def _fact_exists(con: duckdb.DuckDBPyConnection, alert_id: str) -> bool:
    row = con.execute(
        "SELECT 1 FROM fact_alert_events WHERE alert_id = ? LIMIT 1", [alert_id]
    ).fetchone()
    return row is not None


def load_silver_to_warehouse(limit: int = 50000) -> None:
    warehouse_file = _warehouse_path()
    warehouse_file.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(str(warehouse_file))
    _create_schema(con)

    pg = psycopg2.connect(_database_url())
    try:
        with pg.cursor() as cur:
            cur.execute(
                """
                SELECT
                    alert_id,
                    source_system,
                    customer_name,
                    COALESCE(device_name, '') AS device_name,
                    COALESCE(host, '') AS host,
                    alert_name,
                    COALESCE(alert_category, 'unknown') AS alert_category,
                    occurred_at,
                    ingested_at,
                    severity,
                    is_duplicate,
                    is_resolution,
                    fingerprint,
                    COALESCE(description, '') AS description
                FROM silver_alerts
                ORDER BY occurred_at ASC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        inserted = 0
        skipped = 0

        for row in rows:
            (
                alert_id,
                source_system,
                customer_name,
                device_name,
                host,
                alert_name,
                alert_category,
                occurred_at,
                ingested_at,
                severity,
                is_duplicate,
                is_resolution,
                fingerprint,
                description,
            ) = row

            alert_id_str = str(alert_id)
            if _fact_exists(con, alert_id_str):
                skipped += 1
                continue

            source_key = _get_or_create_source_key(con, source_system)
            customer_key = _get_or_create_customer_key(con, customer_name)
            device_key = _get_or_create_device_key(con, device_name, host)
            alert_type_key = _get_or_create_alert_type_key(con, alert_name, alert_category)
            time_key = _get_or_create_time_key(con, occurred_at)

            con.execute(
                """
                INSERT INTO fact_alert_events (
                    alert_id,
                    occurred_at,
                    ingested_at,
                    source_key,
                    customer_key,
                    device_key,
                    alert_type_key,
                    time_key,
                    severity,
                    is_duplicate,
                    is_resolution,
                    fingerprint,
                    description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    alert_id_str,
                    occurred_at,
                    ingested_at,
                    source_key,
                    customer_key,
                    device_key,
                    alert_type_key,
                    time_key,
                    severity,
                    is_duplicate,
                    is_resolution,
                    fingerprint,
                    description,
                ],
            )
            inserted += 1

        print(
            f"Silver->Warehouse load complete: inserted={inserted}, skipped_existing={skipped}, warehouse={warehouse_file}"
        )
    finally:
        pg.close()
        con.close()


if __name__ == "__main__":
    load_silver_to_warehouse()
