import requests

payload = {
    "severity_High": 1,
    "severity_Low": 0,
    "severity_Medium": 0,
    "source_system_CTGAN_Auvik": 1,
    "source_system_Meraki": 0,
    "source_system_N-Central": 0,
    "alert_type_network_down": 1,
    "alert_type_packet_loss": 0,
    "customer_type_Enterprise": 1,
    "customer_type_Standard": 0
}

try:
    resp = requests.post("http://127.0.0.1:8000/api/predict-sla", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Request failed: {e}")
