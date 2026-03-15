import requests

payload = {
    "query": "What are the critical alerts?",
    "contextSummary": "Landing context"
}

try:
    resp = requests.post("http://127.0.0.1:8000/api/chat", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Request failed: {e}")
