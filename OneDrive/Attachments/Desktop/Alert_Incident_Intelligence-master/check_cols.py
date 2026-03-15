import psycopg2
import os

db_url = "postgresql://admin:admin123@127.0.0.1:5433/alerts"
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT * FROM silver_alerts LIMIT 1")
colnames = [desc[0] for desc in cur.description]
print(colnames)
conn.close()
