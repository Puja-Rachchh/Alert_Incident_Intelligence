# Utility to export alerts with duplicate counts for CTGAN training
# Usage: python scripts/export_duplicate_samples.py

import pandas as pd
import psycopg2
import os
from pathlib import Path
from sqlalchemy import create_engine

# Postgres connection details
POSTGRES_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:admin123@127.0.0.1:5433/alerts",
)

def export_duplicates():
    print("Connecting to PostgreSQL...")
    try:
        engine = create_engine(POSTGRES_URL.replace("postgresql://", "postgresql+psycopg2://"))
        with engine.connect() as conn:
            query = """
                SELECT * 
                FROM silver_alerts 
                WHERE duplicate_count > 1 
                ORDER BY duplicate_count DESC
            """
            df = pd.read_sql(query, conn)
            
            if df.empty:
                print("No duplicate alerts found in silver_alerts. Training on full dataset instead.")
                df = pd.read_sql("SELECT * FROM silver_alerts LIMIT 2000", conn)
            
            output_path = Path("data/training/duplicate_samples.csv")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            df.to_csv(output_path, index=False)
            print(f"Exported {len(df)} samples to {output_path}")
            
    except Exception as e:
        print(f"Error exporting duplicates: {e}")

if __name__ == "__main__":
    export_duplicates()
