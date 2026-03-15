import requests
import json

try:
    resp = requests.get("http://127.0.0.1:8000/api/sla-metrics")
    print(f"Status: {resp.status_code}")
    print("Body preview:")
    data = resp.json()
    print(json.dumps(data, indent=2)[:500] + "...")
except Exception as e:
    print(f"Request failed: {e}")
