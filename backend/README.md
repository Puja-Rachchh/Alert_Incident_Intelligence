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
