# KenxAI Backend (Minimal Ingestion API)

This backend exposes the webhook endpoints used by the simulator:

- /webhook/auvik
- /webhook/meraki
- /webhook/ncentral
- /health

It stores raw payloads into the bronze_alerts table.

Note: Docker Postgres is exposed on host port 5433 to avoid conflicts with any local Postgres service on 5432.

## 1) Start infrastructure

From repo root:

```
docker-compose up -d postgres redis minio
```

## 2) Install backend dependencies

From backend folder:

```
pip install -r requirements.txt
```

## 3) Run API

From backend folder:

```
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 4) Run simulator seed

From sim folder:

```
pip install requests schedule
python simulator.py seed
```

## 5) Run Bronze -> Silver normalization

From backend folder:

```
python -m app.services.bronze_to_silver
```

This reads pending rows from bronze_alerts, normalizes source payloads into silver_alerts,
marks duplicates in a 5-minute fingerprint window, and updates bronze processing status.

## 6) Load Silver -> Warehouse (DuckDB)

From backend folder:

```
python -m app.services.silver_to_warehouse
```

This loads canonical silver_alerts rows into a local star schema warehouse at:

data/warehouse/alerts.duckdb

## 7) Directly connect DuckDB to PostgreSQL

From backend folder:

```
python -m app.services.connect_duckdb_postgres
```

This uses DuckDB's postgres extension to ATTACH the live PostgreSQL database as
schema pg_alerts inside DuckDB, so you can query postgres tables directly from DuckDB.
