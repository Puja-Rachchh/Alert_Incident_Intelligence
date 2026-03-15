"use client";

import { useMemo, useState } from "react";
import { ChatAssistant } from "@/components/chat/chat-assistant";
import { IncidentTrendChart } from "@/components/charts/incident-trend-chart";
import { SourceDistributionChart } from "@/components/charts/source-distribution-chart";
import { InsightCard } from "@/components/insight-card";
import { filterIncidents, summarizeKpis, buildSourceDistribution, buildTrendSeries, formatRelativeDate } from "@/features/dashboard/insights";
import { incidents } from "@/features/dashboard/mock-data";
import type { Severity, SourceSystem } from "@/features/dashboard/types";

const allSeverities: Severity[] = ["Critical", "High", "Medium", "Low"];
const sources: Array<SourceSystem | "All"> = ["All", "Auvik", "Meraki", "N-Central"];

export function DashboardPage() {
  const [source, setSource] = useState<SourceSystem | "All">("All");
  const [timeWindowDays, setTimeWindowDays] = useState(30);
  const [severities, setSeverities] = useState<Severity[]>(allSeverities);

  const filtered = useMemo(
    () =>
      filterIncidents(incidents, {
        source,
        severities,
        timeWindowDays
      }),
    [source, severities, timeWindowDays]
  );

  const kpis = useMemo(() => summarizeKpis(filtered), [filtered]);
  const trendData = useMemo(() => buildTrendSeries(filtered, 14), [filtered]);
  const sourceDistribution = useMemo(() => buildSourceDistribution(filtered), [filtered]);

  const contextSummary = useMemo(() => {
    const topSource = [...sourceDistribution].sort((a, b) => b.value - a.value)[0]?.name ?? "None";
    return `Total incidents=${kpis.totalIncidents}, Open=${kpis.openIncidents}, Critical=${kpis.criticalIncidents}, Avg MTTR=${kpis.avgMttrMinutes}m, Top source=${topSource}`;
  }, [kpis, sourceDistribution]);

  function toggleSeverity(next: Severity) {
    setSeverities((previous) => {
      if (previous.includes(next)) {
        const updated = previous.filter((item) => item !== next);
        return updated.length === 0 ? previous : updated;
      }

      return [...previous, next];
    });
  }

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Alert Incident Intelligence</p>
        <h1>Network Operations Command Center</h1>
        <p>
          PowerBI-style visibility with drill-down filters, trend analytics, and an AI copilot that explains what is happening and what to do next.
        </p>
      </header>

      <section className="filters-panel">
        <label>
          Source
          <select value={source} onChange={(event) => setSource(event.target.value as SourceSystem | "All") }>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Time Window
          <select value={timeWindowDays} onChange={(event) => setTimeWindowDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>

        <div className="severity-filter">
          <span>Severity</span>
          <div className="severity-group">
            {allSeverities.map((item) => (
              <button
                key={item}
                type="button"
                className={severities.includes(item) ? "active" : ""}
                onClick={() => toggleSeverity(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <InsightCard label="Total Incidents" value={kpis.totalIncidents} delta="Window-adjusted" />
        <InsightCard label="Open Incidents" value={kpis.openIncidents} tone="warning" />
        <InsightCard label="Critical Alerts" value={kpis.criticalIncidents} tone="critical" />
        <InsightCard label="Average MTTR" value={`${kpis.avgMttrMinutes} min`} tone="good" />
      </section>

      <section className="main-grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) 400px', alignItems: 'start' }}>
        <div className="left-column">
          <IncidentTrendChart data={trendData} />
          <SourceDistributionChart data={sourceDistribution} />

          <article className="table-card">
            <div className="table-head">
              <h3>Recent Incidents</h3>
              <span>{filtered.length} records</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Source</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.source}</td>
                      <td>{item.severity}</td>
                      <td>{item.status}</td>
                      <td>{formatRelativeDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="right-column" style={{ position: 'sticky', top: '24px', height: 'calc(100vh - 48px)' }}>
          <ChatAssistant contextSummary={contextSummary} />
        </div>
      </section>
    </main>
  );
}
