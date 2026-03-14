import requests
import time
import random
import uuid
import json
from datetime import datetime, timezone, timedelta
import schedule

BASE_URL = "http://localhost:8001"
HEALTH_PATH = "/health"


def ensure_backend_healthy():
    try:
        resp = requests.get(f"{BASE_URL}{HEALTH_PATH}", timeout=5)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise SystemExit(f"Backend health check failed at {BASE_URL}{HEALTH_PATH}: {exc}")


def post_json(path, payload):
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=payload, timeout=5)
        resp.raise_for_status()
        return resp
    except requests.RequestException as exc:
        print(f"POST failed for {path}: {exc}")
        raise


def post_xml(path, xml_payload):
    try:
        resp = requests.post(
            f"{BASE_URL}{path}",
            data=xml_payload,
            headers={"Content-Type": "text/xml"},
            timeout=5,
        )
        resp.raise_for_status()
        return resp
    except requests.RequestException as exc:
        print(f"POST failed for {path}: {exc}")
        raise

# ── AUVIK TEMPLATES ──────────────────────────────────────

AUVIK_ALERT_TYPES = [
    {
        "alertName": "Access Point Offline",
        "alertSeverityString": "Warning",
        "alertSeverity": 3,
        "entityType": "device",
        "alertDescription": "This network element has gone offline   Ubiquiti U6+",
    },
    {
        "alertName": "Network Element Offline",
        "alertSeverityString": "Emergency",
        "alertSeverity": 1,
        "entityType": "device",
        "alertDescription": "This network element has gone offline   Cisco WS-C3560X\n\nSD Tasks\nVPN into client\nValidate interface status\nBegin crisis management if needed",
    },
    {
        "alertName": "VPN remote gateway is Lost",
        "alertSeverityString": "Critical",
        "alertSeverity": 2,
        "entityType": "service",
        "alertDescription": "The VPN remote gateway has been lost\n\nBegin Crisis Management\nWarm Hand-off to IS - Networking team",
    },
    {
        "alertName": "Internet Connection is Lost",
        "alertSeverityString": "Emergency",
        "alertSeverity": 1,
        "entityType": "service",
        "alertDescription": "The internet connection for this default gateway has been lost\n\nValidate interface status\nContact carrier and verify circuit status\nInitiate Crisis management",
    },
    {
        "alertName": "Interface Status Mismatch",
        "alertSeverityString": "Warning",
        "alertSeverity": 3,
        "entityType": "interface",
        "alertDescription": "Interface has gone Down. Administrative status is Up.",
    },
]

AUVIK_COMPANIES = [
    {"companyName": "Ambient Enterprises DMG San Luis Obispo", "companyId": "1083819129238950653"},
    {"companyName": "DYOPATH Oakbrook Terrace", "companyId": "1167420203531866877"},
    {"companyName": "HVP SLHV Data Center", "companyId": "1139449271987278589"},
    {"companyName": "Hanover Company Azure", "companyId": "748793047432794877"},
]

AUVIK_DEVICES = [
    "DMG-SLO-AP01", "DMG-SLO-AP02", "JB-CLACKAMAS-FW",
    "JB-SEATTLE-FW", "dyo-sch-fw01a", "dpOBTlabsw01",
    "dyoOBTdepotsw02", "asa5515x-01.kslinc.net"
]

def make_auvik_payload(alert_type=None, company=None, device=None,
                        status="Triggered", correlation_id=None):
    alert_type = alert_type or random.choice(AUVIK_ALERT_TYPES)
    company = company or random.choice(AUVIK_COMPANIES)
    device = device or random.choice(AUVIK_DEVICES)
    corr_id = correlation_id or str(uuid.uuid4()).replace("-", "")
    alert_id = str(uuid.uuid4()).replace("-", "")
    # Generate a random datetime within the last 2 years
    days_ago = random.randint(0, 730)  # up to 2 years
    random_dt = datetime.now(timezone.utc) - timedelta(days=days_ago, seconds=random.randint(0, 86400))
    now = random_dt.isoformat().replace("+00:00", "Z")

    return {
        "entityId": str(uuid.uuid4()),
        "subject": "You have a new alert!",
        "alertStatusString": status,
        "alertId": alert_id,
        "alertName": alert_type["alertName"],
        "entityName": device,
        "companyName": company["companyName"],
        "entityType": alert_type["entityType"],
        "date": now,
        "link": f"https://auvik.example.com/alert/{alert_id}/summary",
        "alertStatus": 0 if status == "Triggered" else 1,
        "correlationId": corr_id,
        "alertDescription": alert_type["alertDescription"],
        "alertSeverityString": alert_type["alertSeverityString"],
        "alertSeverity": alert_type["alertSeverity"],
        "companyId": company["companyId"],
    }


# ── MERAKI TEMPLATES ─────────────────────────────────────

MERAKI_ALERT_TYPES = [
    {
        "alertType": "VPN connectivity changed",
        "alertTypeId": "vpn_connectivity_change",
        "alertLevel": "warning",
        "check": "VPN connectivity changed",
    },
    {
        "alertType": "Client IP conflict detected",
        "alertTypeId": "ip_conflict",
        "alertLevel": "warning",
        "check": "Client IP conflict detected",
    },
    {
        "alertType": "Uplink status changed",
        "alertTypeId": "uplink_status_change",
        "alertLevel": "critical",
        "check": "Uplink status changed",
    },
    {
        "alertType": "Rogue AP detected",
        "alertTypeId": "rogue_ap",
        "alertLevel": "warning",
        "check": "Rogue AP detected",
    },
]

MERAKI_NETWORKS = [
    {
        "organizationId": "607985949695019864",
        "organizationName": "Ambient Enterprises - Johnson Barrow",
        "networkId": "L_607985949695032811",
        "networkName": "JB Clackamas",
    },
    {
        "organizationId": "652458996015301466",
        "organizationName": "Ambient Enterprises",
        "networkId": "L_652458996015307218",
        "networkName": "MH - Boise Main Office",
    },
    {
        "organizationId": "607985949695019864",
        "organizationName": "Ambient Enterprises - Johnson Barrow",
        "networkId": "L_607985949695032817",
        "networkName": "JB Seattle",
    },
]

MERAKI_DEVICES = [
    {"deviceName": "JB-CLACKAMAS-FW",  "deviceSerial": "Q2KY-6Z7H-6UUS",
     "deviceMac": "14:9f:43:22:9b:84", "deviceModel": "MX68"},
    {"deviceName": "MH-BoiseOffice-MX", "deviceSerial": "Q2KY-LGTN-PKCD",
     "deviceMac": "08:f1:b3:77:e2:ec", "deviceModel": "MX68"},
    {"deviceName": "JB-SEATTLE-FW",    "deviceSerial": "Q2YN-US2S-2S5N",
     "deviceMac": "0c:7b:c8:cd:34:0a", "deviceModel": "MX85"},
]

def make_meraki_payload(alert_type=None, network=None, device=None, dupe_of=None):
    alert_type = alert_type or random.choice(MERAKI_ALERT_TYPES)
    network = network or random.choice(MERAKI_NETWORKS)
    device = device or random.choice(MERAKI_DEVICES)
    # Generate a random datetime within the last 2 years
    days_ago = random.randint(0, 730)
    now = datetime.now(timezone.utc) - timedelta(days=days_ago, seconds=random.randint(0, 86400))
    occurred = now - timedelta(seconds=random.randint(15, 30))

    base_alert_id = dupe_of or str(random.randint(600000000000000000, 699999999999999999))

    return {
        "app_key": "0a0505127ff98963f1ad4a500b0075dd",
        "status": alert_type["alertLevel"],
        "check": alert_type["check"],
        "version": "0.1",
        "sharedSecret": "",
        "sentAt": now.isoformat().replace("+00:00", "Z"),
        "organizationId": network["organizationId"],
        "organizationName": network["organizationName"],
        "networkId": network["networkId"],
        "networkName": " " + network["networkName"],
        "deviceSerial": device["deviceSerial"],
        "deviceMac": device["deviceMac"],
        "deviceName": device["deviceName"],
        "deviceModel": device["deviceModel"],
        "alertId": str(int(base_alert_id) + random.randint(0, 3)),
        "alertType": alert_type["alertType"],
        "alertTypeId": alert_type["alertTypeId"],
        "alertLevel": alert_type["alertLevel"],
        "occurredAt": occurred.isoformat().replace("+00:00", "Z"),
        "host": device["deviceName"],
    }


# ── N-CENTRAL TEMPLATES ──────────────────────────────────

NCENTRAL_CUSTOMERS = [
    "Ocean Point Terminals (LTB)",
    "Wyffels",
    "Ambient Enterprises > Ambient Enterprises HCN (HAR)",
    "Wedgewood Pharmacy",
    "Signorelli Company",
]

NCENTRAL_DEVICES = [
    {"DeviceName": "LBTAMAG01", "DeviceURI": "10.108.6.90"},
    {"DeviceName": "DC3",       "DeviceURI": "10.0.1.24"},
    {"DeviceName": "AmesUtility","DeviceURI": "10.0.4.6"},
    {"DeviceName": "GlacierVmProd2","DeviceURI": "10.10.6.6"},
    {"DeviceName": "NJ-EX01",   "DeviceURI": "192.168.1.85"},
]

NCENTRAL_SERVICE_TEMPLATES = {
    "Disk": {
        "states": ["Normal", "Warning", "Failed"],
        "quant": lambda: (
            f"Total disk size: {random.uniform(100,500):.2f} GB\n"
            f"Disk space used: {random.uniform(80,490):.2f} GB\n"
            f"Disk free space: {random.uniform(1,20):.2f} GB\n"
            f"Disk Usage: {random.randint(75,99)}.00 %"
        ),
        "task": "C:",
    },
    "CPU": {
        "states": ["Normal", "Warning", "Failed"],
        "quant": lambda: (
            f"CPU Usage: {random.randint(70,100)}.00 %\n"
            f"Top Process 1: MsMpEng\n"
            f"Top Process 2: SentinelAgent\n"
            f"CPU Usage for Process 1: {random.randint(10,40)}.00 %"
        ),
        "task": "",
    },
    "Memory": {
        "states": ["Normal", "Warning", "Failed"],
        "quant": lambda: (
            f"Total Physical Memory: {random.uniform(8,32):.2f} GB\n"
            f"Used Physical Memory: {random.uniform(6,30):.2f} GB\n"
            f"Physical Memory Usage: {random.randint(70,98)}.00 %"
        ),
        "task": "",
    },
    "Connectivity": {
        "states": ["Normal", "Failed"],
        "quant": lambda: (
            f"Packet Loss: {random.choice([0,0,0,5,10,100])}.00 %\n"
            f"Average Round Trip Time: {random.randint(1,200)}.00 msec\n"
            f"DNS Resolution: {random.choice(['True','False'])}"
        ),
        "task": "",
    },
    "Agent Status": {
        "states": ["Normal", "Failed"],
        "quant": lambda: "Agent check-in interval: 0.00 sec",
        "task": "",
    },
    "Windows Event Log": {
        "states": ["Normal", "Failed"],
        "quant": lambda: (
            f"Event Log Module Status: 0\n"
            f"Source: NETLOGON\n"
            f"Event ID: {random.choice([5781,5805,5807,1216])}\n"
            f"Event Log Type: {random.choice(['warning','error'])}\n"
            f"Event Description: Domain controller connectivity issue detected."
        ),
        "task": "AD (System Log)",
    },
}

def make_ncentral_payload(customer=None, device=None, service_name=None,
                           old_state=None, new_state=None):
    customer = customer or random.choice(NCENTRAL_CUSTOMERS)
    device = device or random.choice(NCENTRAL_DEVICES)
    service_name = service_name or random.choice(list(NCENTRAL_SERVICE_TEMPLATES.keys()))
    svc = NCENTRAL_SERVICE_TEMPLATES[service_name]

    states = svc["states"]
    if old_state is None:
        old_state = random.choice(states[:-1])
    if new_state is None:
        new_state = random.choice(states[1:]) if old_state == states[0] else random.choice(states)

    # Generate a random datetime within the last 2 years
    days_ago = random.randint(0, 730)
    random_dt = datetime.now(timezone.utc) - timedelta(days=days_ago, seconds=random.randint(0, 86400))
    now = random_dt.strftime("%Y-%m-%d %H:%M:%S")
    trigger_id = random.randint(100000000, 999999999)
    quant = svc["quant"]()
    task = svc["task"]

    xml = f"""<?xml version="1.0" encoding="UTF-8"?><notification>
  <ActiveNotificationTriggerID>{trigger_id}</ActiveNotificationTriggerID>
  <CustomerName>{customer}</CustomerName>
  <DeviceURI>{device['DeviceURI']}</DeviceURI>
  <DeviceName>{device['DeviceName']}</DeviceName>
  <AffectedService>{service_name}</AffectedService>
  <TaskIdent>{task}</TaskIdent>
  <NcentralURI>ncod524.n-able.com</NcentralURI>
  <QualitativeOldState>{old_state}</QualitativeOldState>
  <QualitativeNewState>{new_state}</QualitativeNewState>
  <TimeOfStateChange>{now}</TimeOfStateChange>
  <ProbeURI>{device['DeviceURI']}</ProbeURI>
  <QuantitativeNewState>{quant}</QuantitativeNewState>
  <ServiceOrganizationName>DYOPATH</ServiceOrganizationName>
  <RemoteControlLink>https://ncod524.n-able.com:443/deepLinkAction.do</RemoteControlLink>
</notification>"""
    return xml


# ── FIRING PATTERNS ──────────────────────────────────────

def fire_normal():
    """Single random alert from any source."""
    source = random.choices(
        ["auvik", "meraki", "ncentral"],
        weights=[0.35, 0.25, 0.40]
    )[0]

    if source == "auvik":
        payload = make_auvik_payload()
        post_json("/webhook/auvik", payload)

    elif source == "meraki":
        payload = make_meraki_payload()
        post_json("/webhook/meraki", payload)

    else:
        xml = make_ncentral_payload()
        post_xml("/webhook/ncentral", xml)


def fire_meraki_duplicate():
    """
    Simulate Meraki's real duplicate pattern:
    same event sent 2-3 times with sequential alertIds
    and identical occurredAt.
    """
    alert_type = random.choice(MERAKI_ALERT_TYPES)
    network = random.choice(MERAKI_NETWORKS)
    device = random.choice(MERAKI_DEVICES)
    base_id = str(random.randint(600000000000000000, 699999999999999999))
    count = random.randint(2, 3)

    for i in range(count):
        p = make_meraki_payload(alert_type, network, device, dupe_of=base_id)
        p["alertId"] = str(int(base_id) + i)
        post_json("/webhook/meraki", p)
        time.sleep(0.1)  # 100ms between duplicates — realistic


def fire_ncentral_duplicate():
    """
    Simulate N-Central's real duplicate pattern:
    two different TriggerIDs for the same device+service+state.
    """
    customer = random.choice(NCENTRAL_CUSTOMERS)
    device = random.choice(NCENTRAL_DEVICES)
    service = random.choice(["Windows Event Log", "CPU", "Disk"])

    xml1 = make_ncentral_payload(customer, device, service,
                                  old_state="Normal", new_state="Failed")
    xml2 = make_ncentral_payload(customer, device, service,
                                  old_state="Normal", new_state="Failed")

    post_xml("/webhook/ncentral", xml1)
    time.sleep(0.5)
    post_xml("/webhook/ncentral", xml2)


def fire_cascade():
    """
    Simulate the real Auvik cascade from your data:
    Internet lost → multiple devices offline within 30 seconds.
    This should trigger automatic incident correlation.
    """
    company = random.choice(AUVIK_COMPANIES)
    corr_root = str(uuid.uuid4()).replace("-", "")

    # Root cause: internet goes down
    internet_alert = make_auvik_payload(
        alert_type=next(a for a in AUVIK_ALERT_TYPES
                        if a["alertName"] == "Internet Connection is Lost"),
        company=company,
        status="Triggered",
        correlation_id=corr_root,
    )
    post_json("/webhook/auvik", internet_alert)
    print(f"CASCADE: Internet lost at {company['companyName']}")

    time.sleep(random.uniform(10, 20))

    # Consequence: 2-4 devices go offline
    count = random.randint(2, 4)
    for i in range(count):
        device_alert = make_auvik_payload(
            alert_type=next(a for a in AUVIK_ALERT_TYPES
                            if a["alertName"] == "Network Element Offline"),
            company=company,
            device=random.choice(AUVIK_DEVICES),
            status="Triggered",
        )
        post_json("/webhook/auvik", device_alert)
        time.sleep(random.uniform(1, 3))

    print(f"CASCADE: {count} devices offline — correlation engine should group these")


def fire_resolution():
    """
    Simulate a Cleared event — Auvik sends these when problems resolve.
    N-Central sends Normal state.
    """
    source = random.choice(["auvik", "ncentral"])

    if source == "auvik":
        corr_id = str(uuid.uuid4()).replace("-", "")
        payload = make_auvik_payload(status="Cleared", correlation_id=corr_id)
        payload["alertStatus"] = 1
        payload["alertDescription"] = "Device Online Status is now equal to Online"
        post_json("/webhook/auvik", payload)

    else:
        customer = random.choice(NCENTRAL_CUSTOMERS)
        device = random.choice(NCENTRAL_DEVICES)
        service = random.choice(["CPU", "Disk", "Memory", "Connectivity"])
        xml = make_ncentral_payload(customer, device, service,
                                     old_state="Failed", new_state="Normal")
        post_xml("/webhook/ncentral", xml)


# ── MAIN SCHEDULER ───────────────────────────────────────

def run_simulation_tick():
    """
    Every 30 seconds, decide what kind of event to fire.
    Weights reflect real-world patterns.
    """
    roll = random.random()

    if roll < 0.50:
        fire_normal()               # 50% — regular alerts
    elif roll < 0.70:
        fire_meraki_duplicate()     # 20% — Meraki duplicate storm
    elif roll < 0.80:
        fire_ncentral_duplicate()   # 10% — N-Central double-trigger
    elif roll < 0.90:
        fire_resolution()           # 10% — things getting better
    else:
        fire_cascade()              # 10% — full cascade incident


def bulk_seed(count=200):
    """
    Seed the database with historical data so ML teammate
    has enough rows to train on from day one.
    Run this ONCE when starting up.
    """
    print(f"Seeding {count} historical alerts...")
    ensure_backend_healthy()
    source_counts = {"auvik": 0, "meraki": 0, "ncentral": 0}

    for i in range(count):
        roll = random.random()
        if roll < 0.40:
            p = make_auvik_payload()
            post_json("/webhook/auvik", p)
            source_counts["auvik"] += 1
        elif roll < 0.65:
            p = make_meraki_payload()
            post_json("/webhook/meraki", p)
            source_counts["meraki"] += 1
        else:
            xml = make_ncentral_payload()
            post_xml("/webhook/ncentral", xml)
            source_counts["ncentral"] += 1

        if i % 20 == 0:
            print(f"  {i}/{count} seeded")
        time.sleep(0.1)

    print("Seeding complete.")
    print("Seed breakdown:")
    print(json.dumps(source_counts, indent=2))


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "seed":
        bulk_seed(300)
    else:
        ensure_backend_healthy()
        print("Simulator starting — firing every 30 seconds")
        print("Patterns: 50% normal, 20% Meraki dup, 10% NC dup, 10% resolve, 10% cascade")
        schedule.every(30).seconds.do(run_simulation_tick)
        run_simulation_tick()  # fire once immediately
        while True:
            schedule.run_pending()
            time.sleep(1)