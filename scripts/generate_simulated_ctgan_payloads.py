# Generate synthetic alert payloads using CTGAN, matching simulator.py format
# Usage: python generate_simulated_ctgan_payloads.py

import os
import json
import psycopg2
import pandas as pd
from ctgan import CTGAN
from tqdm import tqdm

# --- Config ---
POSTGRES_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:admin123@127.0.0.1:5433/alerts",
)
TABLE = "bronze_alerts"
SYNTHETIC_COUNT = 200

# --- Step 1: Load real payloads from bronze_alerts ---
with psycopg2.connect(POSTGRES_URL) as conn:
    df = pd.read_sql(f"SELECT raw_payload FROM {TABLE} WHERE content_type = 'json' LIMIT 1000", conn)

# Parse JSON payloads into dicts
records = []
for payload in df["raw_payload"]:
    try:
        records.append(json.loads(payload))
    except Exception:
        continue

if not records:
    raise RuntimeError("No valid JSON payloads found in bronze_alerts!")


# Normalize to DataFrame (fields as columns)
df_struct = pd.json_normalize(records)
# Fill nulls: empty string for objects, -1 for numbers
for col in df_struct.columns:
    if df_struct[col].dtype == 'object':
        df_struct[col] = df_struct[col].fillna("")
    else:
        df_struct[col] = df_struct[col].fillna(-1)

# --- Step 2: Train CTGAN ---
discrete_cols = [col for col in df_struct.columns if df_struct[col].dtype == 'object']
ctgan = CTGAN(epochs=300)
ctgan.fit(df_struct, discrete_columns=discrete_cols)

# --- Step 3: Generate synthetic samples ---
synth = ctgan.sample(SYNTHETIC_COUNT)

# --- Step 4: Reconstruct payloads and save ---
payloads = synth.to_dict(orient="records")
with open("synthetic_ctgan_payloads.jsonl", "w") as f:
    for p in payloads:
        f.write(json.dumps(p) + "\n")
print(f"Wrote {len(payloads)} synthetic payloads to synthetic_ctgan_payloads.jsonl")

# --- Step 5: (Optional) Insert into bronze_alerts ---
def insert_bronze_alert(payload, conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO bronze_alerts (source_system, raw_payload, content_type)
            VALUES (%s, %s, %s)
            """,
            [payload.get("source_system", "ctgan"), json.dumps(payload), "json"]
        )
    conn.commit()

with psycopg2.connect(POSTGRES_URL) as conn:
    for p in tqdm(payloads):
        insert_bronze_alert(p, conn)
print(f"Inserted {len(payloads)} synthetic payloads into bronze_alerts.")