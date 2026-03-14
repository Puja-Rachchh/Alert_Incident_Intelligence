import duckdb
from pathlib import Path

# Path to your new warehouse
db_path = r"C:\Users\Goku\Desktop\kenxai\data\warehouse\alerts.duckdb"

with duckdb.connect(db_path) as con:
    print("--- Top 5 Countries by Alert Volume ---")
    print(con.execute("""
        SELECT d.host_country, COUNT(*) as alert_count
        FROM fact_alert_events f
        JOIN dim_device d ON f.device_key = d.device_key
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    """).df())

    print("\n--- Severity Distribution ---")
    print(con.execute("""
        SELECT severity, COUNT(*) as count
        FROM fact_alert_events
        GROUP BY 1 ORDER BY 1
    """).df())
