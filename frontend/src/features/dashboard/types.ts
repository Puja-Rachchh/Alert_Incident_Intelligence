export type SourceSystem = "Auvik" | "Meraki" | "N-Central" | "Ctgan";
export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface IncidentRecord {
  id: string;
  source: SourceSystem;
  severity: Severity;
  title: string;
  status: "Open" | "Investigating" | "Resolved";
  createdAt: string;
  mttrMinutes: number;
}

export interface TrendPoint {
  day: string;
  incidents: number;
  resolved: number;
}

export interface DistributionPoint {
  name: SourceSystem;
  value: number;
}

export interface DashboardKpis {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  avgMttrMinutes: number;
}

export const SOURCE_COLORS: Record<string, string> = {
  Auvik: "#3b82f6",
  Meraki: "#06b6d4",
  "N-Central": "#8b5cf6",
  Ctgan: "#a78bfa" // Added Ctgan color
};
