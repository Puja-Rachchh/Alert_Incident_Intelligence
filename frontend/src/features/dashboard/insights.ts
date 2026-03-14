import type {
  DashboardKpis,
  DistributionPoint,
  IncidentRecord,
  Severity,
  SourceSystem,
  TrendPoint
} from "./types";

export interface FilterSettings {
  source: SourceSystem | "All";
  severities: Severity[];
  timeWindowDays: number;
}

export function filterIncidents(records: IncidentRecord[], filters: FilterSettings): IncidentRecord[] {
  const now = Date.now();
  const threshold = now - filters.timeWindowDays * 24 * 60 * 60 * 1000;

  return records.filter((record) => {
    const inWindow = new Date(record.createdAt).getTime() >= threshold;
    const matchesSource = filters.source === "All" || record.source === filters.source;
    const matchesSeverity = filters.severities.includes(record.severity);

    return inWindow && matchesSource && matchesSeverity;
  });
}

export function summarizeKpis(records: IncidentRecord[]): DashboardKpis {
  const totalIncidents = records.length;
  const openIncidents = records.filter((item) => item.status !== "Resolved").length;
  const criticalIncidents = records.filter((item) => item.severity === "Critical").length;

  const avgMttrMinutes =
    totalIncidents === 0
      ? 0
      : Math.round(records.reduce((sum, item) => sum + item.mttrMinutes, 0) / totalIncidents);

  return {
    totalIncidents,
    openIncidents,
    criticalIncidents,
    avgMttrMinutes
  };
}

export function buildTrendSeries(records: IncidentRecord[], days = 14): TrendPoint[] {
  const now = new Date();
  const bins = new Map<string, TrendPoint>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    bins.set(key, { day: key.slice(5), incidents: 0, resolved: 0 });
  }

  records.forEach((record) => {
    const key = record.createdAt.slice(0, 10);
    const point = bins.get(key);
    if (!point) {
      return;
    }

    point.incidents += 1;
    if (record.status === "Resolved") {
      point.resolved += 1;
    }
  });

  return Array.from(bins.values());
}

export function buildSourceDistribution(records: IncidentRecord[]): DistributionPoint[] {
  const counters: Record<SourceSystem, number> = {
    Auvik: 0,
    Meraki: 0,
    "N-Central": 0
  };

  records.forEach((record) => {
    counters[record.source] += 1;
  });

  return (Object.keys(counters) as SourceSystem[]).map((key) => ({
    name: key,
    value: counters[key]
  }));
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
