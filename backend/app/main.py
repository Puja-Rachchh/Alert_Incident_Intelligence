import json

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.db.database import insert_bronze_alert


app = FastAPI(title="KenxAI Ingestion API", version="0.1.0")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/webhook/auvik")
async def webhook_auvik(request: Request):
    payload = await request.json()
    bronze_id = insert_bronze_alert(
        source_system="auvik",
        raw_payload=json.dumps(payload),
        content_type="json",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})


@app.post("/webhook/meraki")
async def webhook_meraki(request: Request):
    payload = await request.json()
    bronze_id = insert_bronze_alert(
        source_system="meraki",
        raw_payload=json.dumps(payload),
        content_type="json",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})


@app.post("/webhook/ncentral")
async def webhook_ncentral(request: Request):
    payload_bytes = await request.body()
    payload_xml = payload_bytes.decode("utf-8", errors="replace")
    bronze_id = insert_bronze_alert(
        source_system="ncentral",
        raw_payload=payload_xml,
        content_type="xml",
    )
    return JSONResponse({"status": "accepted", "bronze_id": bronze_id})
