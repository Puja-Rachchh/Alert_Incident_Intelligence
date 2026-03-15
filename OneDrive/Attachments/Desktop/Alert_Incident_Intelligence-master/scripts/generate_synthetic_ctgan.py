# Synthetic data generation using CTGAN
# Usage: python generate_synthetic_ctgan.py


import pandas as pd
from ctgan import CTGAN
import json
import psycopg2
import os
from tqdm import tqdm
from sqlalchemy import create_engine


# Postgres connection details
POSTGRES_URL = os.getenv(
	"DATABASE_URL",
	"postgresql://admin:admin123@127.0.0.1:5433/alerts",
)


# Number of synthetic samples to generate
num_samples = 500

# Load real data from Postgres silver_alerts
engine = create_engine(POSTGRES_URL.replace("postgresql://", "postgresql+psycopg2://"))
with engine.connect() as conn:
	query = """
		SELECT 
			source_system, alert_name, severity, status, 
			customer_name, device_name, host, host_country, host_state,
			alert_category, is_duplicate, is_resolution, duplicate_count
		FROM silver_alerts 
		LIMIT 2000
	"""
	df = pd.read_sql(query, conn)


# Train CTGAN
discrete_columns = [
	'source_system', 'alert_name', 'status', 'customer_name', 
	'device_name', 'host', 'host_country', 'host_state', 'alert_category'
]
print(f"Training CTGAN on {len(df)} samples...")
ctgan = CTGAN(epochs=300)
ctgan.fit(df, discrete_columns=discrete_columns)

# Generate synthetic data
synthetic = ctgan.sample(num_samples)

# Save to CSV (optional)
synthetic.to_csv('synthetic_ctgan_data.csv', index=False)
print('Synthetic data saved to synthetic_ctgan_data.csv')

def insert_silver_alert(row, conn):
	with conn.cursor() as cur:
		cur.execute(
			'''
			INSERT INTO silver_alerts (
				source_system, alert_name, severity, status, 
				customer_name, device_name, host, host_country, host_state,
				alert_category, is_duplicate, is_resolution, 
				occurred_at, ingested_at, duplicate_count, fingerprint
			) VALUES (
				%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s
			)
			ON CONFLICT DO NOTHING
			''',
			[
				'ctgan',
				row.get('alert_name'),
				int(row.get('severity', 3)),
				row.get('status', 'Open'),
				row.get('customer_name'),
				row.get('device_name'),
				row.get('host'),
				row.get('host_country'),
				row.get('host_state'),
				row.get('alert_category'),
				bool(row.get('is_duplicate', False)),
				bool(row.get('is_resolution', False)),
				int(row.get('duplicate_count', 1)),
				f"synth-{os.urandom(4).hex()}"
			]
		)
	conn.commit()

with psycopg2.connect(POSTGRES_URL) as conn:
	for _, row in tqdm(synthetic.iterrows(), total=len(synthetic)):
		insert_silver_alert(row, conn)

print(f'Synthetic data inserted into Postgres table silver_alerts.')