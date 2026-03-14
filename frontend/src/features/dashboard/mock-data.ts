
import type { IncidentRecord } from "./types";

// Dynamic incidents loader: fetch from backend, fallback to mock data
let incidents: IncidentRecord[] = [];

async function fetchIncidents() {
  try {
    const res = await fetch("http://localhost:8001/api/v1/incidents");
    if (res.ok) {
      const data = await res.json();
      incidents = data.incidents;
    }
  } catch (e) {
    // fallback to mock data if fetch fails
    incidents = [
      { id: "INC-1001", source: "Auvik", severity: "Critical", title: "Core switch link flapping", status: "Investigating", createdAt: new Date().toISOString(), mttrMinutes: 140 },
      { id: "INC-1002", source: "Meraki", severity: "High", title: "WAN packet loss above threshold", status: "Open", createdAt: new Date().toISOString(), mttrMinutes: 95 },
    ];
  }
}

fetchIncidents();
export { incidents };
