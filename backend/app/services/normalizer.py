import hashlib
import json
from datetime import datetime, timezone
from xml.etree import ElementTree as ET


def _parse_iso_utc(value: str) -> datetime:
    # Accept ISO strings with Z suffix from webhook payloads.
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_ncentral_time(value: str) -> datetime:
    dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    return dt.replace(tzinfo=timezone.utc)


def _safe_json_loads(raw_payload: str):
    return json.loads(raw_payload)


def _fingerprint(parts: list[str]) -> str:
    joined = "|".join((p or "").strip().lower() for p in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def normalize_auvik(raw_payload: str) -> dict:
    p = _safe_json_loads(raw_payload)
    occurred_at = _parse_iso_utc(p["date"])
    status = p.get("alertStatusString", "Triggered")
    is_resolution = (status or "").lower() == "cleared" or p.get("alertStatus") == 1

    severity = int(p.get("alertSeverity", 4))
    if severity < 1 or severity > 4:
        severity = 4

    return {
        "source_system": "auvik",
        "source_alert_id": p.get("alertId"),
        "alert_name": p.get("alertName", "Unknown Auvik Alert"),
        "severity": severity,
        "severity_label": p.get("alertSeverityString"),
        "status": status,
        "customer_name": p.get("companyName", "Unknown"),
        "device_name": p.get("entityName"),
        "host": p.get("entityName"),
        "alert_category": p.get("entityType", "network"),
        "is_resolution": is_resolution,
        "occurred_at": occurred_at,
        "description": p.get("alertDescription"),
        "quantitative_data": {},
        "extra_data": {
            "correlation_id": p.get("correlationId"),
            "entity_id": p.get("entityId"),
            "entity_type": p.get("entityType"),
            "company_id": p.get("companyId"),
            "alert_url": p.get("link"),
        },
        "fingerprint": _fingerprint([
            "auvik",
            p.get("companyId", ""),
            p.get("entityName", ""),
            p.get("alertName", ""),
            str(severity),
        ]),
    }


def normalize_meraki(raw_payload: str) -> dict:
    p = _safe_json_loads(raw_payload)
    occurred_at = _parse_iso_utc(p["occurredAt"])

    level = (p.get("alertLevel") or p.get("status") or "informational").lower()
    severity_map = {"critical": 2, "warning": 3, "informational": 4}
    severity = severity_map.get(level, 4)

    canonical_keys = {
        "app_key",
        "status",
        "check",
        "version",
        "sharedSecret",
        "sentAt",
        "organizationId",
        "organizationName",
        "organizationUrl",
        "networkId",
        "networkName",
        "networkUrl",
        "deviceSerial",
        "deviceMac",
        "deviceName",
        "deviceUrl",
        "deviceModel",
        "alertId",
        "alertType",
        "alertTypeId",
        "alertLevel",
        "occurredAt",
        "host",
    }

    # Preserve any non-canonical keys to survive source schema drift.
    passthrough = {k: v for k, v in p.items() if k not in canonical_keys}

    return {
        "source_system": "meraki",
        "source_alert_id": p.get("alertId"),
        "alert_name": p.get("alertType", "Unknown Meraki Alert"),
        "severity": severity,
        "severity_label": p.get("alertLevel"),
        "status": "Triggered",
        "customer_name": p.get("organizationName", "Unknown"),
        "device_name": p.get("deviceName"),
        "host": p.get("host") or p.get("deviceName"),
        "alert_category": "network",
        "is_resolution": False,
        "occurred_at": occurred_at,
        "description": p.get("check") or p.get("alertType"),
        "quantitative_data": {},
        "extra_data": {
            "organization_id": p.get("organizationId"),
            "network_id": p.get("networkId"),
            "network_name": p.get("networkName"),
            "organization_url": p.get("organizationUrl"),
            "network_url": p.get("networkUrl"),
            "device_url": p.get("deviceUrl"),
            "device_serial": p.get("deviceSerial"),
            "device_mac": p.get("deviceMac"),
            "device_model": p.get("deviceModel"),
            "alert_type_id": p.get("alertTypeId"),
            "sent_at": p.get("sentAt"),
            "shared_secret": p.get("sharedSecret"),
            "source_version": p.get("version"),
            "app_key": p.get("app_key"),
            "passthrough": passthrough,
        },
        "fingerprint": _fingerprint([
            "meraki",
            p.get("organizationId", ""),
            p.get("networkId", ""),
            p.get("deviceSerial", ""),
            p.get("alertTypeId", ""),
            occurred_at.replace(second=0, microsecond=0).isoformat(),
        ]),
    }


def normalize_ncentral(raw_payload: str) -> dict:
    root = ET.fromstring(raw_payload)

    def _text(tag: str, default: str = "") -> str:
        node = root.find(tag)
        return node.text.strip() if node is not None and node.text is not None else default

    occurred_at = _parse_ncentral_time(_text("TimeOfStateChange", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")))
    old_state = _text("QualitativeOldState", "Unknown")
    new_state = _text("QualitativeNewState", "Unknown")
    state = new_state.lower()
    if state == "failed":
        severity = 1
    elif state == "warning":
        severity = 3
    else:
        severity = 4

    return {
        "source_system": "ncentral",
        "source_alert_id": _text("ActiveNotificationTriggerID"),
        "alert_name": _text("AffectedService", "Unknown N-Central Alert"),
        "severity": severity,
        "severity_label": new_state,
        "status": new_state,
        "customer_name": _text("CustomerName", "Unknown"),
        "device_name": _text("DeviceName"),
        "host": _text("DeviceURI"),
        "alert_category": "server",
        "is_resolution": old_state.lower() == "failed" and new_state.lower() == "normal",
        "occurred_at": occurred_at,
        "description": _text("QuantitativeNewState"),
        "quantitative_data": {
            "raw_quantitative_state": _text("QuantitativeNewState"),
        },
        "extra_data": {
            "trigger_id": _text("ActiveNotificationTriggerID"),
            "old_state": old_state,
            "new_state": new_state,
            "task_ident": _text("TaskIdent"),
            "probe_uri": _text("ProbeURI"),
            "ncentral_uri": _text("NcentralURI"),
            "service_org": _text("ServiceOrganizationName"),
        },
        "fingerprint": _fingerprint([
            "ncentral",
            _text("CustomerName"),
            _text("DeviceName"),
            _text("AffectedService"),
            old_state,
            new_state,
            occurred_at.replace(second=0, microsecond=0).isoformat(),
        ]),
    }


def normalize_record(source_system: str, raw_payload: str) -> dict:
    source = source_system.lower()
    if source == "auvik":
        return normalize_auvik(raw_payload)
    if source == "meraki":
        return normalize_meraki(raw_payload)
    if source == "ncentral":
        return normalize_ncentral(raw_payload)
    raise ValueError(f"Unsupported source system: {source_system}")
