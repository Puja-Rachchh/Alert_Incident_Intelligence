"use client";

import { useMemo, useState } from "react";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { InsightCard } from "@/components/insight-card";
import { PersonaNav } from "@/components/persona-nav";
import StackedAreaChart from "@/components/charts/stacked-area-chart";
import {
  alertsByDayAndSource,
  dedupSuppressedCount,
  groupedByCorrelation,
  mttrTrendByWeek,
  personaIncidents,
  severityHeatmapByCustomer
} from "@/features/dashboard/persona-data";
import type { PersonaIncident } from "@/features/dashboard/persona-data";
import type { Severity, SourceSystem } from "@/features/dashboard/types";

const SEV_CLASS: Record<Severity, string> = {
  Critical: "sev-badge critical",
  High: "sev-badge high",
  Medium: "sev-badge medium",
  Low: "sev-badge low"
};

function heatTone(n: number): string {
  if (n >= 3) return "heat-critical";
  if (n >= 2) return "heat-high";
  if (n >= 1) return "heat-medium";
  return "heat-low";
}

const SOURCES: SourceSystem[] = ["Auvik", "Meraki", "N-Central"];
const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];
const CUSTOMERS = [...new Set(personaIncidents.map((i) => i.customer))].sort();

export function OperationsDashboard() {
  const [srcFilter, setSrcFilter] = useState<SourceSystem | "All">("All");
  const [sevFilter, setSevFilter] = useState<Severity | "All">("All");
  const [custFilter, setCustFilter] = useState<string>("All");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list: PersonaIncident[] = personaIncidents;
    if (srcFilter !== "All") list = list.filter((i) => i.source === srcFilter);
    if (sevFilter !== "All") list = list.filter((i) => i.severity === sevFilter);
    if (custFilter !== "All") list = list.filter((i) => i.customer === custFilter);
    return list;
  }, [srcFilter, sevFilter, custFilter]);

  const openIncidents = useMemo(() => filtered.filter((i) => i.status !== "Resolved"), [filtered]);
  const grouped = useMemo(() => groupedByCorrelation(filtered), [filtered]);
  const heatmapRows = useMemo(() => severityHeatmapByCustomer(filtered), [filtered]);
  const mttrWeekly = useMemo(() => mttrTrendByWeek(filtered), [filtered]);
  const dedupCount = useMemo(() => dedupSuppressedCount(personaIncidents), []);
  const areaData = useMemo(() => alertsByDayAndSource(personaIncidents, 14), []);

  const avgMttr = mttrWeekly.length
    ? Math.round(mttrWeekly.reduce((s, p) => s + p.volume, 0) / mttrWeekly.length)
    : 0;

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Operations Engineer View</p>
        <h1>Live Incident Operations</h1>
        <p>Real-time triage, correlation groups, customer heatmap pressure, and operational MTTR.</p>
      </header>

      <PersonaNav />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value as SourceSystem | "All")} className="filter-select">
          <option value="All">All Sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as Severity | "All")} className="filter-select">
          <option value="All">All Severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={custFilter} onChange={(e) => setCustFilter(e.target.value)} className="filter-select">
          <option value="All">All Customers</option>
          {CUSTOMERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {(srcFilter !== "All" || sevFilter !== "All" || custFilter !== "All") && (
          <button className="filter-reset" onClick={() => { setSrcFilter("All"); setSevFilter("All"); setCustFilter("All"); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────────── */}
      <section className="kpi-grid persona-kpis">
        <InsightCard label="Active Alerts" value={openIncidents.length} tone="warning" />
        <InsightCard label="Correlation Groups" value={grouped.length} />
        <InsightCard label="Avg MTTR (min)" value={`${avgMttr}`} tone="good" />
        <InsightCard label="Dedup Suppressed" value={dedupCount} delta={`${Math.round((dedupCount / personaIncidents.length) * 100)}% of total`} tone="critical" />
        <InsightCard label="Critical Open" value={openIncidents.filter((i) => i.severity === "Critical").length} tone="critical" />
        <InsightCard label="Schema Valid %" value={`${Math.round((filtered.filter((i) => i.schemaValid).length / Math.max(filtered.length, 1)) * 100)}%`} tone="good" />
      </section>

      {/* ── Alert volume stacked area ─────────────────────────────────────────── */}
      <section className="chart-full-row">
        <article className="chart-card">
          <div className="table-head">
            <h3>Alerts by Day &amp; Source (Last 14 Days)</h3>
            <span>All sources</span>
          </div>
          <StackedAreaChart data={areaData} />
        </article>
      </section>

      <section className="main-grid">
        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="left-column">
          {/* Live alert feed */}
          <article className="table-card">
            <div className="table-head">
              <h3>Live Alert Feed</h3>
              <span>{openIncidents.length} active</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Device</th>
                    <th>Title</th>
                    <th>Sev</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openIncidents.map((inc) => (
                    <tr key={inc.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{inc.id}</td>
                      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.customer}</td>
                      <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>{inc.device}</td>
                      <td>{inc.title}</td>
                      <td><span className={SEV_CLASS[inc.severity]}>{inc.severity}</span></td>
                      <td><span className="source-badge">{inc.source}</span></td>
                      <td>{inc.status}</td>
                    </tr>
                  ))}
                  {openIncidents.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>No active alerts match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Correlation groups */}
          <article className="table-card">
            <div className="table-head">
              <h3>Correlation Groups</h3>
              <span>{grouped.length} clusters</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 0 8px" }}>
              {grouped.map((g) => (
                <div key={g.group} className="corr-group">
                  <button
                    className="corr-group-header"
                    onClick={() => setExpandedGroup(expandedGroup === g.group ? null : g.group)}
                  >
                    <span className="corr-group-name">{g.group}</span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge-count">{g.count} total</span>
                      {g.openCount > 0 && <span className="badge-open">{g.openCount} open</span>}
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{expandedGroup === g.group ? "▲" : "▼"}</span>
                    </span>
                  </button>
                  {expandedGroup === g.group && (
                    <div className="corr-group-body">
                      {g.incidents.map((inc) => (
                        <div key={inc.id} className="corr-incident-row">
                          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{inc.id}</span>
                          <span className={SEV_CLASS[inc.severity]}>{inc.severity}</span>
                          <span style={{ flex: 1, fontSize: 12 }}>{inc.title}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{inc.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="right-column">
          {/* Heatmap */}
          <article className="table-card">
            <div className="table-head">
              <h3>Severity Heatmap by Customer</h3>
              <span>Alert pressure matrix</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Critical</th>
                    <th>High</th>
                    <th>Medium</th>
                    <th>Low</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapRows.map((row) => (
                    <tr key={row.customer}>
                      <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.customer}</td>
                      <td className={heatTone(row.Critical)}>{row.Critical}</td>
                      <td className={heatTone(row.High)}>{row.High}</td>
                      <td className={heatTone(row.Medium)}>{row.Medium}</td>
                      <td className={heatTone(row.Low)}>{row.Low}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* MTTR trend */}
          <WeeklyBarChart title="Avg MTTR by Week (min)" data={mttrWeekly} barColor="#ffb200" />

          {/* Resolution rate mini-bar */}
          <article className="table-card">
            <div className="table-head">
              <h3>Resolution Breakdown</h3>
            </div>
            <div style={{ padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Resolved", count: filtered.filter((i) => i.status === "Resolved").length, color: "#22c55e" },
                { label: "Investigating", count: filtered.filter((i) => i.status === "Investigating").length, color: "#f59e0b" },
                { label: "Open", count: filtered.filter((i) => i.status === "Open").length, color: "#ef4444" }
              ].map(({ label, count, color }) => {
                const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{label}</span><span style={{ color: "var(--text-muted)" }}>{count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
