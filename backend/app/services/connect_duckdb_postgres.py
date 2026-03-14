from pathlib import Path

import duckdb


POSTGRES_DSN = "host=127.0.0.1 port=5433 dbname=alerts user=admin password=admin123"


def warehouse_path() -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "data" / "warehouse" / "alerts.duckdb"


def connect_duckdb_to_postgres() -> None:
    db_file = warehouse_path()
    db_file.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(str(db_file))
    try:
        def _safe_detach(alias: str) -> None:
            try:
                con.execute(f"DETACH {alias};")
            except duckdb.Error:
                # Alias may not be attached yet; ignore and continue.
                pass

        # Install/load extension once, then attach postgres as an external schema.
        con.execute("INSTALL postgres;")
        con.execute("LOAD postgres;")
        _safe_detach("pg_alerts")
        con.execute(f"ATTACH '{POSTGRES_DSN}' AS pg_alerts (TYPE postgres);")

        bronze_count = con.execute("SELECT count(*) FROM pg_alerts.public.bronze_alerts").fetchone()[0]
        silver_count = con.execute("SELECT count(*) FROM pg_alerts.public.silver_alerts").fetchone()[0]

        print("DuckDB <-> PostgreSQL connection successful")
        print(f"Warehouse file: {db_file}")
        print(f"bronze_alerts rows: {bronze_count}")
        print(f"silver_alerts rows: {silver_count}")
    finally:
        con.close()


if __name__ == "__main__":
    connect_duckdb_to_postgres()
