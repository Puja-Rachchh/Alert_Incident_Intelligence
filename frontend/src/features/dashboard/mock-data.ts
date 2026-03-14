import type { IncidentRecord } from "./types";

const now = Date.now();

function daysAgo(days: number): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const incidents: IncidentRecord[] = [
  { id: "INC-1001", source: "Auvik", severity: "Critical", title: "Core switch link flapping", status: "Investigating", createdAt: daysAgo(1), mttrMinutes: 140 },
  { id: "INC-1002", source: "Meraki", severity: "High", title: "WAN packet loss above threshold", status: "Open", createdAt: daysAgo(1), mttrMinutes: 95 },
  { id: "INC-1003", source: "N-Central", severity: "Medium", title: "Server CPU sustained over 90%", status: "Resolved", createdAt: daysAgo(2), mttrMinutes: 40 },
  { id: "INC-1004", source: "Auvik", severity: "Low", title: "Access point heartbeat delayed", status: "Resolved", createdAt: daysAgo(2), mttrMinutes: 20 },
  { id: "INC-1005", source: "Meraki", severity: "Critical", title: "Branch firewall unreachable", status: "Open", createdAt: daysAgo(3), mttrMinutes: 180 },
  { id: "INC-1006", source: "N-Central", severity: "High", title: "Backup job failures", status: "Investigating", createdAt: daysAgo(4), mttrMinutes: 110 },
  { id: "INC-1007", source: "Auvik", severity: "Medium", title: "Interface errors increasing", status: "Resolved", createdAt: daysAgo(5), mttrMinutes: 55 },
  { id: "INC-1008", source: "Meraki", severity: "Low", title: "Client connection retries", status: "Resolved", createdAt: daysAgo(6), mttrMinutes: 30 },
  { id: "INC-1009", source: "N-Central", severity: "Critical", title: "Agent stopped reporting", status: "Investigating", createdAt: daysAgo(7), mttrMinutes: 160 },
  { id: "INC-1010", source: "Auvik", severity: "High", title: "Routing instability detected", status: "Resolved", createdAt: daysAgo(9), mttrMinutes: 70 },
  { id: "INC-1011", source: "Meraki", severity: "Medium", title: "VPN rekey errors", status: "Open", createdAt: daysAgo(10), mttrMinutes: 50 },
  { id: "INC-1012", source: "N-Central", severity: "Low", title: "Disk usage warning", status: "Resolved", createdAt: daysAgo(12), mttrMinutes: 25 },
  { id: "INC-1013", source: "Auvik", severity: "Critical", title: "Datacenter uplink down", status: "Open", createdAt: daysAgo(14), mttrMinutes: 220 },
  { id: "INC-1014", source: "Meraki", severity: "High", title: "SSID authentication failures", status: "Resolved", createdAt: daysAgo(16), mttrMinutes: 60 },
  { id: "INC-1015", source: "N-Central", severity: "Medium", title: "Patch deployment pending", status: "Investigating", createdAt: daysAgo(20), mttrMinutes: 80 },
  { id: "INC-1016", source: "Auvik", severity: "Low", title: "Device inventory drift", status: "Resolved", createdAt: daysAgo(23), mttrMinutes: 22 },
  { id: "INC-1017", source: "Meraki", severity: "Critical", title: "Dual ISP outage", status: "Resolved", createdAt: daysAgo(26), mttrMinutes: 210 },
  { id: "INC-1018", source: "N-Central", severity: "High", title: "Endpoint memory pressure", status: "Open", createdAt: daysAgo(29), mttrMinutes: 88 }
];
