import type { IncidentRecord, Severity, SourceSystem } from "./types";

export interface PersonaIncident extends IncidentRecord {
  customer: string;
  correlationGroup: string;
  alertType: string;
  duplicateSuppressed: boolean;
  schemaValid: boolean;
  completenessScore: number;
  // Real-payload additions
  device: string;
  deviceIp?: string;
  description: string;
  clearedAt?: string;
  playbook: string[];
}

export interface CustomerHeatmapRow {
  customer: string;
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export interface WeeklyVolumePoint {
  week: string;
  volume: number;
}

const BASE_MS = new Date("2026-02-13T08:00:00.000Z").getTime();
function ago(days: number, hours = 0): string {
  return new Date(BASE_MS - (days * 86400 + hours * 3600) * 1000).toISOString();
}

// ─── 35 incidents derived from real Auvik / Meraki / N-Central payloads ───────
export const personaIncidents: PersonaIncident[] = [
  // ── Auvik ────────────────────────────────────────────────────────────────────
  {
    id: "TKT-3001", source: "Auvik", severity: "Critical",
    title: "Internet Connection is Lost",
    alertType: "internet-lost", status: "Investigating",
    createdAt: ago(1, 2), mttrMinutes: 0,
    customer: "DYOPATH Oakbrook Terrace Lab",
    device: "dpOBTfw01.dyopathcorp.com", deviceIp: "12.207.114.35",
    description: "Internet connection lost on default gateway 12.207.114.35. ASA outside interface on dpOBTfw01.",
    correlationGroup: "internet-outage",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "VPN/Direct connect to device in question",
      "Validate interface status on ASA outside interface",
      "Contact carrier and verify circuit status",
      "If carrier shows up: initiate crisis management",
      "Warm handoff to IS – Networking team"
    ]
  },
  {
    id: "TKT-3002", source: "Auvik", severity: "Critical",
    title: "Network Element Offline",
    alertType: "device-offline", status: "Open",
    createdAt: ago(1, 2), mttrMinutes: 0,
    customer: "DYOPATH Oakbrook Terrace Lab",
    device: "dpOBTlabsw01 Member 2",
    description: "Cisco WS-C2960XR-48FPD-I offline – downstream of affected ASA (correlated).",
    correlationGroup: "internet-outage",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.95,
    playbook: [
      "VPN into client network via out-of-band path",
      "Connect to nearest live device and validate uplink port",
      "If ISP shows site down: begin crisis management",
      "Validate power on device with on-site contact",
      "Warm handoff to IS – Networking team"
    ]
  },
  {
    id: "TKT-3003", source: "Auvik", severity: "Critical",
    title: "VPN Remote Gateway is Lost",
    alertType: "vpn-gateway-lost", status: "Resolved",
    createdAt: ago(2, 4), clearedAt: ago(2, 2), mttrMinutes: 112,
    customer: "HVP SLHV Data Center",
    device: "asa5515x-01.kslinc.net", deviceIp: "12.207.114.41",
    description: "VPN remote gateway 12.207.114.41 lost on ASA 5515X. Begin Crisis Management. Warm Hand-off to IS – Networking.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.99,
    playbook: [
      "Verify VPN peer reachability via out-of-band path",
      "Check ISP circuit status for remote gateway IP",
      "Review IKE/IPSec logs on ASA",
      "Initiate warm handoff to IS – Networking team",
      "Open crisis management bridge if site is unreachable"
    ]
  },
  {
    id: "TKT-3004", source: "Auvik", severity: "Critical",
    title: "VPN Remote Gateway is Lost",
    alertType: "vpn-gateway-lost", status: "Resolved",
    createdAt: ago(5, 3), clearedAt: ago(5, 1), mttrMinutes: 87,
    customer: "Hanover Company Azure",
    device: "HAN-AZURE-ASAV", deviceIp: "12.207.114.35",
    description: "VPN remote gateway 12.207.114.35 lost. NOTE: if gateway 71.26.198.53 or 71.26.196.61 – auto-close per Bruce Fay.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.98,
    playbook: [
      "Check if gateway IP is on the auto-close exception list",
      "If exception: auto-close ticket – site shutdown is scheduled",
      "Otherwise: verify IKE phase-1/phase-2 on ASAV",
      "Check Azure VPN Gateway health in portal",
      "Escalate if RTO > 30 min"
    ]
  },
  {
    id: "TKT-3005", source: "Auvik", severity: "Critical",
    title: "VPN Remote Gateway is Lost",
    alertType: "vpn-gateway-lost", status: "Open",
    createdAt: ago(1, 1), mttrMinutes: 0,
    customer: "DYOPATH Azure Central",
    device: "asav-02.dyopathcorp.com", deviceIp: "12.207.114.35",
    description: "VPN remote gateway 12.207.114.35 lost on asav-02. Begin Crisis Management. Warm Hand-off to IS.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "Verify VPN peer reachability via out-of-band path",
      "Review IKE/IPSec logs on asav-02",
      "Check Azure vNet gateway status via portal",
      "Initiate crisis management bridge",
      "Warm handoff to IS – Networking team"
    ]
  },
  {
    id: "TKT-3006", source: "Auvik", severity: "Medium",
    title: "Access Point Offline",
    alertType: "ap-offline", status: "Resolved",
    createdAt: ago(7, 6), clearedAt: ago(7, 5), mttrMinutes: 12,
    customer: "Ambient Enterprises DMG San Luis Obispo",
    device: "DMG-SLO-AP02 (Ubiquiti U6+)",
    description: "AP DMG-SLO-AP02 offline. Auto-cleared after PoE port power-cycle.",
    correlationGroup: "wireless-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.94,
    playbook: [
      "Check PoE switch port – confirm port status",
      "Ping AP management IP",
      "If unreachable: power-cycle PoE port",
      "Verify controller shows AP re-adopted",
      "If down > 15 min: escalate to on-site contact"
    ]
  },
  {
    id: "TKT-3007", source: "Auvik", severity: "Medium",
    title: "Access Point Offline",
    alertType: "ap-offline", status: "Resolved",
    createdAt: ago(7, 6), clearedAt: ago(7, 5), mttrMinutes: 8,
    customer: "Ambient Enterprises DMG San Luis Obispo",
    device: "DMG-SLO-AP01 (Ubiquiti U6+)",
    description: "AP01 offline – same PoE switch as AP02, correlated dropout event.",
    correlationGroup: "wireless-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.93,
    playbook: [
      "Check PoE switch port – confirm port status",
      "Ping AP management IP",
      "If unreachable: power-cycle PoE port",
      "Verify controller shows AP re-adopted",
      "If down > 15 min: escalate to on-site contact"
    ]
  },
  {
    id: "TKT-3008", source: "Auvik", severity: "Medium",
    title: "Interface Status Mismatch",
    alertType: "interface-mismatch", status: "Resolved",
    createdAt: ago(7, 5), clearedAt: ago(7, 4), mttrMinutes: 4,
    customer: "DYOPATH Oakbrook Terrace",
    device: "dyoOBTextsw01.dyopath.com – Gi1/0/3",
    description: "Gi1/0/3 admin Up / operational Down. Connected to Lab-Depot ASAx outside Gi1/1.",
    correlationGroup: "internet-outage",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.96,
    playbook: [
      "Check interface counters: err-disabled?",
      "Verify cable/SFP on both ends",
      "Check connected ASA interface",
      "If err-disabled: shutdown / no shutdown the port",
      "Monitor error counters for 5 min post-recovery"
    ]
  },
  {
    id: "TKT-3009", source: "Auvik", severity: "Medium",
    title: "Access Point Offline",
    alertType: "ap-offline", status: "Open",
    createdAt: ago(0, 3), mttrMinutes: 0,
    customer: "Ambient Enterprises DMG San Luis Obispo",
    device: "DMG-SLO-AP03 (Ubiquiti U6+)",
    description: "AP03 offline – third AP at this site. Likely upstream PoE switch fault.",
    correlationGroup: "wireless-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.95,
    playbook: [
      "Check PoE switch port – confirm port status",
      "Ping AP management IP",
      "If unreachable: power-cycle PoE port",
      "Verify controller shows AP re-adopted",
      "If down > 15 min: escalate to on-site contact"
    ]
  },
  {
    id: "TKT-3024", source: "Auvik", severity: "Critical",
    title: "VPN Remote Gateway is Lost",
    alertType: "vpn-gateway-lost", status: "Resolved",
    createdAt: ago(14, 4), clearedAt: ago(14, 2), mttrMinutes: 95,
    customer: "DYOPATH Azure Central",
    device: "asav-01.dyopathcorp.com", deviceIp: "12.207.114.30",
    description: "VPN remote gateway 12.207.114.30 lost on primary ASAV. Earlier recurrence than asav-02.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.98,
    playbook: [
      "Verify VPN peer reachability via out-of-band path",
      "Review IKE/IPSec logs",
      "Check Azure vNet gateway status",
      "Initiate crisis management if > 30 min",
      "Warm handoff to IS – Networking"
    ]
  },
  {
    id: "TKT-3027", source: "Auvik", severity: "Medium",
    title: "Network Element Offline",
    alertType: "device-offline", status: "Resolved",
    createdAt: ago(15, 3), clearedAt: ago(15, 2), mttrMinutes: 35,
    customer: "DYOPATH Oakbrook Terrace",
    device: "dyoOBTdepotsw03.dyopathcorp.com",
    description: "Depot switch 03 offline. UPS reboot resolved the power-cycle cycle.",
    correlationGroup: "internet-outage",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.93,
    playbook: [
      "VPN into client network",
      "Validate interface status on upstream switch",
      "If unreachable: arrange on-site power cycle",
      "Confirm device shown online in Auvik after recovery"
    ]
  },
  {
    id: "TKT-3031", source: "Auvik", severity: "Medium",
    title: "Access Point Offline",
    alertType: "ap-offline", status: "Resolved",
    createdAt: ago(21, 4), clearedAt: ago(21, 3), mttrMinutes: 18,
    customer: "Ambient Enterprises DMG San Luis Obispo",
    device: "DMG-SLO-AP04 (Ubiquiti U6+)",
    description: "AP04 offline – fourth occurrence at this site in 30 days. PoE switch under review.",
    correlationGroup: "wireless-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.92,
    playbook: [
      "Check PoE switch port – confirm port status",
      "Ping AP management IP",
      "Power-cycle PoE port",
      "Verify controller re-adoption",
      "If > 15 min: escalate to on-site"
    ]
  },
  {
    id: "TKT-3032", source: "Auvik", severity: "Critical",
    title: "Internet Connection is Lost",
    alertType: "internet-lost", status: "Resolved",
    createdAt: ago(9, 2), clearedAt: ago(9, 0), mttrMinutes: 148,
    customer: "DYOPATH Oakbrook Terrace Lab",
    device: "dpOBTfw01.dyopathcorp.com", deviceIp: "12.207.114.35",
    description: "ISP circuit down. Carrier confirmed maintenance outage. Restored after scheduled window.",
    correlationGroup: "internet-outage",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "VPN/Direct connect to device",
      "Validate interface status",
      "Contact carrier – verify circuit status",
      "Initiate crisis management",
      "Warm handoff to IS – Networking"
    ]
  },
  // ── Meraki ───────────────────────────────────────────────────────────────────
  {
    id: "TKT-3010", source: "Meraki", severity: "Medium",
    title: "VPN Connectivity Changed",
    alertType: "vpn-change", status: "Resolved",
    createdAt: ago(7, 3), clearedAt: ago(7, 2), mttrMinutes: 28,
    customer: "Ambient Enterprises - Johnson Barrow",
    device: "JB-CLACKAMAS-FW (MX68)",
    description: "VPN connectivity changed on JB-CLACKAMAS-FW (Q2KY-6Z7H-6UUS). Network: JB Clackamas.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.98,
    playbook: [
      "Log into Meraki dashboard → Security & SD-WAN → VPN Status",
      "Identify which VPN peer dropped",
      "Check uplink health on MX68",
      "Review event log for WAN failover events",
      "If peer unreachable > 10 min: open ISP ticket"
    ]
  },
  {
    id: "TKT-3011", source: "Meraki", severity: "Medium",
    title: "VPN Connectivity Changed",
    alertType: "vpn-change", status: "Open",
    createdAt: ago(0, 2), mttrMinutes: 0,
    customer: "Ambient Enterprises - Johnson Barrow",
    device: "JB-CLACKAMAS-FW (MX68)",
    description: "VPN flapping – duplicate event within same minute. WAN instability suspected.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "Log into Meraki dashboard → Security & SD-WAN → VPN Status",
      "Identify which VPN peer dropped",
      "Check uplink health on MX68",
      "Review event log for WAN failover events",
      "If peer unreachable > 10 min: open ISP ticket"
    ]
  },
  {
    id: "TKT-3012", source: "Meraki", severity: "Medium",
    title: "Client IP Conflict Detected",
    alertType: "ip-conflict", status: "Resolved",
    createdAt: ago(6, 2), clearedAt: ago(6, 0), mttrMinutes: 52,
    customer: "Ambient Enterprises",
    device: "MH-BoiseOffice-MX (MX68)",
    description: "Client IP conflict on MH–Boise Main Office. DHCP pool exhaustion suspected.",
    correlationGroup: "dhcp-issues",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.95,
    playbook: [
      "Meraki Dashboard → Network-wide → Clients → identify conflicting MACs",
      "Force DHCP release on conflicting client",
      "Expand DHCP pool if near exhaustion",
      "Enable ARP inspection if conflict persists"
    ]
  },
  {
    id: "TKT-3013", source: "Meraki", severity: "Medium",
    title: "Client IP Conflict Detected",
    alertType: "ip-conflict", status: "Resolved",
    createdAt: ago(6, 2), clearedAt: ago(6, 0), mttrMinutes: 55,
    customer: "Ambient Enterprises - Johnson Barrow",
    device: "JB-SEATTLE-FW (MX85)",
    description: "Three IP conflict events in 1 minute on JB Seattle network. Stale lease from decommissioned host.",
    correlationGroup: "dhcp-issues",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.96,
    playbook: [
      "Meraki Dashboard → Network-wide → Clients → identify conflicting MACs",
      "Force DHCP release on conflicting client",
      "Expand DHCP pool if near exhaustion",
      "Enable ARP inspection if conflict persists"
    ]
  },
  {
    id: "TKT-3014", source: "Meraki", severity: "Medium",
    title: "Client IP Conflict Detected",
    alertType: "ip-conflict", status: "Open",
    createdAt: ago(0, 1), mttrMinutes: 0,
    customer: "Ambient Enterprises",
    device: "MH-BoiseOffice-MX (MX68)",
    description: "IP conflict recurrence on MH–Boise – third time this week. Root cause not yet permanenty resolved.",
    correlationGroup: "dhcp-issues",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.94,
    playbook: [
      "Meraki Dashboard → Network-wide → Clients → identify conflicting MACs",
      "Force DHCP release on conflicting client",
      "Expand DHCP pool if near exhaustion",
      "Enable ARP inspection if conflict persists"
    ]
  },
  {
    id: "TKT-3025", source: "Meraki", severity: "Medium",
    title: "VPN Connectivity Changed",
    alertType: "vpn-change", status: "Resolved",
    createdAt: ago(10, 6), clearedAt: ago(10, 5), mttrMinutes: 22,
    customer: "Ambient Enterprises - Johnson Barrow",
    device: "JB-SEATTLE-FW (MX85)",
    description: "VPN changed on JB-SEATTLE-FW during ISP maintenance window. Cleared automatically.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "Log into Meraki dashboard → Security & SD-WAN → VPN Status",
      "Identify which VPN peer dropped",
      "Check uplink health on MX85",
      "Review event log for WAN failover",
      "If peer unreachable > 10 min: open ISP ticket"
    ]
  },
  {
    id: "TKT-3029", source: "Meraki", severity: "Medium",
    title: "Client IP Conflict Detected",
    alertType: "ip-conflict", status: "Resolved",
    createdAt: ago(12, 1), clearedAt: ago(11, 23), mttrMinutes: 42,
    customer: "Ambient Enterprises",
    device: "MH-BoiseOffice-MX (MX68)",
    description: "First IP conflict at MH Boise – stale DHCP lease from decommissioned device.",
    correlationGroup: "dhcp-issues",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.94,
    playbook: [
      "Meraki Dashboard → Network-wide → Clients → identify conflicting MACs",
      "Force DHCP release on conflicting client",
      "Expand DHCP pool if near exhaustion",
      "Enable ARP inspection if conflict persists"
    ]
  },
  {
    id: "TKT-3034", source: "Meraki", severity: "Medium",
    title: "VPN Connectivity Changed",
    alertType: "vpn-change", status: "Resolved",
    createdAt: ago(17, 6), clearedAt: ago(17, 5), mttrMinutes: 31,
    customer: "Ambient Enterprises - Johnson Barrow",
    device: "JB-PORTLAND-FW (MX67)",
    description: "VPN dropped briefly during BGP reconvergence at upstream ISP. MX67 auto-recovered.",
    correlationGroup: "vpn-stability",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.96,
    playbook: [
      "Log into Meraki dashboard → VPN Status",
      "Identify dropped VPN peer",
      "Check ISP BGP event history",
      "If recurring: review SD-WAN failover config"
    ]
  },
  // ── N-Central ─────────────────────────────────────────────────────────────────
  {
    id: "TKT-3015", source: "N-Central", severity: "Critical",
    title: "Disk C: Usage Critical",
    alertType: "disk-critical", status: "Resolved",
    createdAt: ago(20, 0), clearedAt: ago(19, 20), mttrMinutes: 240,
    customer: "Ocean Point Terminals (LTB)",
    device: "LBTAMAG01", deviceIp: "10.108.6.90",
    description: "Disk C: 94% used. Total 159.66 GB, Free 10.27 GB. Threshold breached on LBTAMAG01 (DYOPATH SOC).",
    correlationGroup: "storage-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.99,
    playbook: [
      "RDP to LBTAMAG01 via remote control link",
      "Run Disk Cleanup and remove temp files",
      "Clear Windows Update cache (C:\\Windows\\SoftwareDistribution)",
      "Identify top space consumers via WinDirStat or TreeSize",
      "Archive or move logs if > 2 GB",
      "Alert customer if still > 90% after cleanup"
    ]
  },
  {
    id: "TKT-3016", source: "N-Central", severity: "Critical",
    title: "Disk C: Usage Critical",
    alertType: "disk-critical", status: "Open",
    createdAt: ago(0, 4), mttrMinutes: 0,
    customer: "Wedgewood Pharmacy",
    device: "NJ-EX01", deviceIp: "192.168.1.85",
    description: "Exchange server C: drive critical. Transaction logs likely contributor after Exchange DB alert.",
    correlationGroup: "storage-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "RDP to NJ-EX01",
      "Run Disk Cleanup and remove temp files",
      "Clear Windows Update cache",
      "Purge Exchange transaction logs (if circular logging is off)",
      "Alert customer if still > 90% after cleanup"
    ]
  },
  {
    id: "TKT-3017", source: "N-Central", severity: "Critical",
    title: "Exchange Database 2016 Failed",
    alertType: "exchange-db-failed", status: "Resolved",
    createdAt: ago(7, 5), clearedAt: ago(7, 3), mttrMinutes: 95,
    customer: "Wedgewood Pharmacy",
    device: "NJ-EX01", deviceIp: "192.168.1.85",
    description: "Exchange edgetransport service failed. DB Page Fault Stalls: 0. Cache Hit: 0%. Log Threads Waiting: 0.",
    correlationGroup: "exchange-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.98,
    playbook: [
      "RDP into NJ-EX01",
      "Restart edgetransport service via services.msc",
      "Review Application Event Log for Exchange errors",
      "Check disk space on transaction log drive",
      "Run Get-MailboxDatabase | Get-MailboxStatistics to validate DB mounts",
      "Escalate to Exchange admin if DB unmounted"
    ]
  },
  {
    id: "TKT-3018", source: "N-Central", severity: "High",
    title: "CPU Usage Critical",
    alertType: "cpu-high", status: "Resolved",
    createdAt: ago(7, 4), clearedAt: ago(7, 2), mttrMinutes: 110,
    customer: "Ambient Enterprises HCN",
    device: "GlacierVmProd2", deviceIp: "10.10.6.6",
    description: "CPU at 94%. Top processes: minionhost (PID 27392), MsMpEng, QBDBMgrN, QBW.",
    correlationGroup: "host-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.96,
    playbook: [
      "RDP to GlacierVmProd2",
      "Open Task Manager – identify top CPU consumer",
      "If MsMpEng: schedule AV scan to off-peak hours",
      "If QBDBMgrN: check QuickBooks for runaway queries",
      "If minionhost: restart N-Central agent service",
      "Document root cause and notify customer"
    ]
  },
  {
    id: "TKT-3019", source: "N-Central", severity: "Medium",
    title: "Agent Status Restored",
    alertType: "agent-restored", status: "Resolved",
    createdAt: ago(7, 3), clearedAt: ago(7, 3), mttrMinutes: 2,
    customer: "Wyffels",
    device: "AmesUtility", deviceIp: "10.0.4.6",
    description: "Agent check-in interval returned to 0.00 sec. Previously reported as Failed.",
    correlationGroup: "agent-health",
    duplicateSuppressed: false, schemaValid: false, completenessScore: 0.71,
    playbook: [
      "Confirm agent is green in N-Central console",
      "Review agent log for disconnect reason",
      "Verify network path to N-Central server",
      "If intermittent: schedule maintenance window check"
    ]
  },
  {
    id: "TKT-3020", source: "N-Central", severity: "Medium",
    title: "Connectivity Restored",
    alertType: "connectivity-restored", status: "Resolved",
    createdAt: ago(7, 3), clearedAt: ago(7, 3), mttrMinutes: 3,
    customer: "Wyffels",
    device: "AmesUtility", deviceIp: "10.0.4.6",
    description: "Packet Loss: 0%, RTT: 17ms, DNS: True. Connectivity normalised after brief outage.",
    correlationGroup: "agent-health",
    duplicateSuppressed: true, schemaValid: false, completenessScore: 0.73,
    playbook: [
      "Confirm ping success to device",
      "Review upstream switch port for errors",
      "Verify no scheduled maintenance caused the drop"
    ]
  },
  {
    id: "TKT-3021", source: "N-Central", severity: "High",
    title: "Windows Event Log – AD System",
    alertType: "ad-event-log", status: "Resolved",
    createdAt: ago(7, 2), clearedAt: ago(6, 22), mttrMinutes: 185,
    customer: "Ocean Point Terminals (LTB)",
    device: "LBTDC001", deviceIp: "10.108.1.1",
    description: "NETLOGON Event 5807: 3 connections from unmapped subnets in 4.1 hrs. Subnet-to-site mapping gap.",
    correlationGroup: "ad-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.92,
    playbook: [
      "Open Active Directory Sites and Services",
      "Create subnet objects for unmapped IP ranges",
      "Map subnets to nearest AD site",
      "Monitor NETLOGON.LOG for NO_CLIENT_SITE entries",
      "Verify replication health with repadmin /replsummary"
    ]
  },
  {
    id: "TKT-3022", source: "N-Central", severity: "High",
    title: "Windows Event Log – AD Directory",
    alertType: "ad-event-log", status: "Open",
    createdAt: ago(1, 3), mttrMinutes: 0,
    customer: "Ocean Point Terminals (LTB)",
    device: "HOVDC005", deviceIp: "10.108.6.37",
    description: "LDAP connection closed with error 1236 (network connection aborted). HOVDC005.hovensa.com.",
    correlationGroup: "ad-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.91,
    playbook: [
      "Check replication health on HOVDC005",
      "Review LDAP connection limits in registry",
      "Check network path between LDAP clients and DC",
      "Run dcdiag /test:ldap on HOVDC005"
    ]
  },
  {
    id: "TKT-3023", source: "N-Central", severity: "High",
    title: "CPU Usage Critical",
    alertType: "cpu-high", status: "Open",
    createdAt: ago(0, 2), mttrMinutes: 0,
    customer: "Ambient Enterprises HCN",
    device: "GlacierVmProd2", deviceIp: "10.10.6.6",
    description: "CPU at 94% – recurrence within 7 days on same host. minionhost, MsMpEng, QBDBMgrN.",
    correlationGroup: "host-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.96,
    playbook: [
      "RDP to GlacierVmProd2",
      "Open Task Manager – identify top CPU consumer",
      "If MsMpEng: schedule AV scan to off-peak hours",
      "If QBDBMgrN: check QuickBooks for runaway queries",
      "If minionhost: restart N-Central agent service",
      "Document root cause and notify customer"
    ]
  },
  {
    id: "TKT-3026", source: "N-Central", severity: "Critical",
    title: "Exchange Database 2016 Failed",
    alertType: "exchange-db-failed", status: "Investigating",
    createdAt: ago(1, 5), mttrMinutes: 0,
    customer: "Wedgewood Pharmacy",
    device: "NJ-EX02", deviceIp: "192.168.1.86",
    description: "Edgetransport failed on NJ-EX02. Second Exchange server affected – log threads stalled.",
    correlationGroup: "exchange-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.97,
    playbook: [
      "RDP into NJ-EX02",
      "Restart edgetransport service",
      "Review Application Event Log for Exchange errors",
      "Check disk space on transaction log drive",
      "Run Get-MailboxDatabase to validate DB mounts",
      "Escalate to Exchange admin if DB unmounted"
    ]
  },
  {
    id: "TKT-3028", source: "N-Central", severity: "Medium",
    title: "Agent Status Restored",
    alertType: "agent-restored", status: "Resolved",
    createdAt: ago(3, 4), clearedAt: ago(3, 4), mttrMinutes: 1,
    customer: "Wyffels",
    device: "AmesUtility", deviceIp: "10.0.4.6",
    description: "Agent check-in normalised. Second occurrence this week – persistent agent review recommended.",
    correlationGroup: "agent-health",
    duplicateSuppressed: true, schemaValid: false, completenessScore: 0.70,
    playbook: [
      "Confirm agent is green in N-Central console",
      "Review agent log for disconnect reason",
      "Verify network path to N-Central server",
      "If intermittent: schedule maintenance window check"
    ]
  },
  {
    id: "TKT-3030", source: "N-Central", severity: "High",
    title: "Disk C: Usage Warning",
    alertType: "disk-warning", status: "Resolved",
    createdAt: ago(10, 5), clearedAt: ago(9, 20), mttrMinutes: 180,
    customer: "Ocean Point Terminals (LTB)",
    device: "LBTAMAG01", deviceIp: "10.108.6.90",
    description: "Disk C: at 85% – warning threshold. Pre-cursor to the critical event resolved later the same day.",
    correlationGroup: "storage-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.98,
    playbook: [
      "RDP to LBTAMAG01",
      "Run Disk Cleanup",
      "Identify top space consumers",
      "Archive logs if > 2 GB",
      "Alert customer if still > 90% after cleanup"
    ]
  },
  {
    id: "TKT-3033", source: "N-Central", severity: "High",
    title: "CPU Usage Critical",
    alertType: "cpu-high", status: "Resolved",
    createdAt: ago(18, 3), clearedAt: ago(18, 1), mttrMinutes: 88,
    customer: "Ambient Enterprises HCN",
    device: "GlacierVmProd1", deviceIp: "10.10.6.5",
    description: "CPU at 91% on Prod1. minionhost and MsMpEng top consumers.",
    correlationGroup: "host-health",
    duplicateSuppressed: false, schemaValid: true, completenessScore: 0.95,
    playbook: [
      "RDP to GlacierVmProd1",
      "Kill or reschedule minionhost if spiking",
      "Schedule AV scan to off-peak hours",
      "Monitor CPU for 30 min post-action"
    ]
  },
  {
    id: "TKT-3035", source: "N-Central", severity: "High",
    title: "Windows Event Log – AD System",
    alertType: "ad-event-log", status: "Resolved",
    createdAt: ago(14, 1), clearedAt: ago(13, 23), mttrMinutes: 200,
    customer: "Ocean Point Terminals (LTB)",
    device: "LBTDC001", deviceIp: "10.108.1.1",
    description: "NETLOGON 5807 – 2nd occurrence this month. Same unmapped subnets persist after partial fix.",
    correlationGroup: "ad-health",
    duplicateSuppressed: true, schemaValid: true, completenessScore: 0.92,
    playbook: [
      "Open Active Directory Sites and Services",
      "Create subnet objects for remaining unmapped ranges",
      "Map subnets to nearest AD site",
      "Monitor NETLOGON.LOG for NO_CLIENT_SITE",
      "Verify replication health with repadmin /replsummary"
    ]
  }
];

export function dedupSuppressedCount(records: PersonaIncident[]): number {
  return records.filter((r) => r.duplicateSuppressed).length;
}

export function mttrTrendByWeek(records: PersonaIncident[]): WeeklyVolumePoint[] {
  const resolved = records.filter((r) => r.status === "Resolved" && r.mttrMinutes > 0);
  const weekMap = new Map<string, { total: number; count: number }>();

  resolved.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `W${Math.ceil(d.getDate() / 7)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = weekMap.get(key) ?? { total: 0, count: 0 };
    existing.total += r.mttrMinutes;
    existing.count += 1;
    weekMap.set(key, existing);
  });

  return [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, volume: Math.round(v.total / v.count) }));
}

export function alertVolumeByWeek(records: PersonaIncident[]): WeeklyVolumePoint[] {
  const weekMap = new Map<string, number>();

  records.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `W${Math.ceil(d.getDate() / 7)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  });

  return [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, volume]) => ({ week, volume }));
}

export function severityHeatmapByCustomer(records: PersonaIncident[]): CustomerHeatmapRow[] {
  const bucket = new Map<string, CustomerHeatmapRow>();

  records.forEach((r) => {
    if (!bucket.has(r.customer)) {
      bucket.set(r.customer, { customer: r.customer, Critical: 0, High: 0, Medium: 0, Low: 0 });
    }
    bucket.get(r.customer)![r.severity] += 1;
  });

  return [...bucket.values()].sort((a, b) => (b.Critical + b.High) - (a.Critical + a.High));
}

export function groupedByCorrelation(
  records: PersonaIncident[]
): Array<{ group: string; count: number; openCount: number; incidents: PersonaIncident[] }> {
  const grouped = new Map<string, PersonaIncident[]>();

  records.forEach((r) => {
    const existing = grouped.get(r.correlationGroup) ?? [];
    existing.push(r);
    grouped.set(r.correlationGroup, existing);
  });

  return [...grouped.entries()]
    .map(([group, incidents]) => ({
      group,
      count: incidents.length,
      openCount: incidents.filter((i) => i.status !== "Resolved").length,
      incidents
    }))
    .sort((a, b) => b.count - a.count);
}

export function customerHealthScores(
  records: PersonaIncident[]
): Array<{ org: string; score: number; slaRisk: "Low" | "Medium" | "High"; openCount: number; resolvedCount: number; avgMttr: number }> {
  const grouped = new Map<string, PersonaIncident[]>();

  records.forEach((r) => {
    const existing = grouped.get(r.customer) ?? [];
    existing.push(r);
    grouped.set(r.customer, existing);
  });

  return [...grouped.entries()].map(([org, incidents]) => {
    const critical = incidents.filter((r) => r.severity === "Critical").length;
    const unresolved = incidents.filter((r) => r.status !== "Resolved").length;
    const avgComp = incidents.reduce((s, r) => s + r.completenessScore, 0) / incidents.length;
    const score = Math.max(0, Math.round(100 - critical * 7 - unresolved * 4 - (1 - avgComp) * 25));

    const resolved = incidents.filter((r) => r.status === "Resolved");
    const avgMttr =
      resolved.length === 0 ? 0 : Math.round(resolved.reduce((s, r) => s + r.mttrMinutes, 0) / resolved.length);

    let slaRisk: "Low" | "Medium" | "High" = "Low";
    if (score < 60) slaRisk = "High";
    else if (score < 78) slaRisk = "Medium";

    return { org, score, slaRisk, openCount: unresolved, resolvedCount: resolved.length, avgMttr };
  });
}

export function topRecurringAlertTypes(records: PersonaIncident[], topN = 5): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  records.forEach((r) => counts.set(r.alertType, (counts.get(r.alertType) ?? 0) + 1));
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function completenessPercent(records: PersonaIncident[]): number {
  if (records.length === 0) return 0;
  return Math.round((records.reduce((s, r) => s + r.completenessScore, 0) / records.length) * 100);
}

export function schemaValidationSummary(records: PersonaIncident[]): { valid: number; invalid: number } {
  const valid = records.filter((r) => r.schemaValid).length;
  return { valid, invalid: records.length - valid };
}

export function sourceBreakdown(
  records: PersonaIncident[]
): Array<{ source: SourceSystem; count: number; valid: number; invalid: number; avgCompleteness: number }> {
  const sources = [...new Set(records.map(r => r.source))];
  return (sources as SourceSystem[]).map((source) => {
    const items = records.filter((r) => r.source === source);
    const valid = items.filter((i) => i.schemaValid).length;
    const avgCompleteness =
      items.length === 0 ? 0 : Math.round((items.reduce((s, i) => s + i.completenessScore, 0) / items.length) * 100);
    return { source, count: items.length, valid, invalid: items.length - valid, avgCompleteness };
  });
}

export function severityDistribution(records: PersonaIncident[]): Array<{ severity: Severity; count: number }> {
  const dist: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  records.forEach((r) => { dist[r.severity] += 1; });
  return (["Critical", "High", "Medium", "Low"] as Severity[]).map((severity) => ({ severity, count: dist[severity] }));
}

export function alertTypeDistribution(records: PersonaIncident[]): Array<{ alertType: string; count: number }> {
  const counts = new Map<string, number>();
  records.forEach((r) => counts.set(r.alertType, (counts.get(r.alertType) ?? 0) + 1));
  return [...counts.entries()]
    .map(([alertType, count]) => ({ alertType, count }))
    .sort((a, b) => b.count - a.count);
}

// ── New analytics helpers used by enhanced dashboards ────────────────────────
export function alertsByDayAndSource(
  records: PersonaIncident[],
  days = 14
): Array<{ day: string;[key: string]: any }> {
  const BASE = new Date("2026-02-13T08:00:00.000Z");
  const bins = new Map<string, any>();
  const sources = [...new Set(records.map(r => r.source))];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(BASE);
    d.setDate(BASE.getDate() - i);
    const emptyBin: any = {};
    sources.forEach(s => emptyBin[s] = 0);
    bins.set(d.toISOString().slice(5, 10), emptyBin);
  }

  records.forEach((r) => {
    const key = r.createdAt.slice(5, 10);
    const bin = bins.get(key);
    if (bin) bin[r.source] = (bin[r.source] || 0) + 1;
  });

  return [...bins.entries()].map(([day, counts]) => ({ day, ...counts }));
}

export function resolutionRateBySource(
  records: PersonaIncident[]
): Array<{ source: SourceSystem; resolved: number; open: number }> {
  const sources = [...new Set(records.map(r => r.source))];
  return (sources as SourceSystem[]).map((source) => {
    const items = records.filter((r) => r.source === source);
    return {
      source,
      resolved: items.filter((i) => i.status === "Resolved").length,
      open: items.filter((i) => i.status !== "Resolved").length
    };
  });
}
