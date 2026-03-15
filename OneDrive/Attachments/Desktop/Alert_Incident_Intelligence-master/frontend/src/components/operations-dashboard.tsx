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
import { SOURCE_COLORS } from "@/features/dashboard/types";
import { useEffect } from "react";
import { fetchIncidents, fetchOperationalTrends } from "@/lib/api";

const SEV_CLASS: Record<Severity, string> = {
  Critical: "sev-badge critical sev-pulse",
  High: "sev-badge high",
  Medium: "sev-badge medium",
  Low: "sev-badge low"
};

function heatTone(n: number): string {
  if (n >= 5) return "heat-extreme";
  if (n >= 3) return "heat-critical";
  if (n >= 2) return "heat-high";
  if (n >= 1) return "heat-medium";
  return "heat-low";
}

const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export function OperationsDashboard() {
  const [srcFilter, setSrcFilter] = useState<SourceSystem | "All">("All");
  const [sevFilter, setSevFilter] = useState<Severity | "All">("All");
  const [custFilter, setCustFilter] = useState<string>("All");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<PersonaIncident[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    fetchIncidents(100).then((data: any) => {
      const mapped = data.map((i: any) => ({
        ...i,
        customer: i.customer || "Unknown",
        correlationGroup: i.correlationGroup || "none",
        duplicateSuppressed: i.duplicateSuppressed ?? false,
        schemaValid: i.schemaValid ?? true,
        completenessScore: i.completenessScore ?? 1,
        device: i.device || "",
        playbook: i.playbook || []
      }));
      setIncidents(mapped);
    }).catch(console.error);

    fetchOperationalTrends().then(setTrendData).catch(console.error);
  }, []);

  const sources = useMemo(() => {
    const dataSources = incidents.map(i => i.source);
    return [...new Set([...dataSources, "Auvik", "Meraki", "N-Central", "Ctgan"])].sort();
  }, [incidents]);

  const customers = useMemo(() => {
    const dataCustomers = incidents.map(i => i.customer);
    const personaCustomers = personaIncidents.map(i => i.customer);
    return [...new Set([...dataCustomers, ...personaCustomers])].sort();
  }, [incidents]);

  const filtered = useMemo(() => {
    let list: PersonaIncident[] = incidents.length > 0 ? incidents : personaIncidents;
    if (srcFilter !== "All") list = list.filter((i) => i.source === srcFilter);
    if (sevFilter !== "All") list = list.filter((i) => i.severity === sevFilter);
    if (custFilter !== "All") list = list.filter((i) => i.customer === custFilter);
    return list;
  }, [srcFilter, sevFilter, custFilter]);

  const openIncidents = useMemo(() => filtered.filter((i: any) => i.status !== "Resolved"), [filtered]);
  const grouped = useMemo(() => groupedByCorrelation(filtered), [filtered]);
  const heatmapRows = useMemo(() => severityHeatmapByCustomer(filtered), [filtered]);
  const mttrWeekly = useMemo(() => mttrTrendByWeek(filtered), [filtered]);
  const dedupCount = useMemo(() => dedupSuppressedCount(incidents.length > 0 ? incidents : personaIncidents), [incidents]);
  const areaData = useMemo(() => (trendData.length > 0 ? trendData : alertsByDayAndSource(personaIncidents, 14)), [trendData]);

  const avgMttr = mttrWeekly.length
    ? Math.round(mttrWeekly.reduce((s: number, p: any) => s + p.volume, 0) / mttrWeekly.length)
    : 0;

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Operations / Triage Intelligence</p>
        <h1>Incident Response Command</h1>
        <p>Unified triage across {sources.length} active sources with automated correlation and pressure mapping.</p>
      </header>

      <PersonaNav />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value as SourceSystem | "All")} className="filter-select">
          <option value="All">All Ingestion Sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as Severity | "All")} className="filter-select">
          <option value="All">All Threat Levels</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={custFilter} onChange={(e) => setCustFilter(e.target.value)} className="filter-select">
          <option value="All">Global Portfolio</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {(srcFilter !== "All" || sevFilter !== "All" || custFilter !== "All") && (
          <button className="filter-reset" onClick={() => { setSrcFilter("All"); setSevFilter("All"); setCustFilter("All"); }}>
            Reset Filters
          </button>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────────── */}
      <section className="kpi-grid persona-kpis">
        <InsightCard label="Active Alerts" value={openIncidents.length} tone="warning" delta="Pending triage" />
        <InsightCard label="Clustered Groups" value={grouped.length} tone="neutral" delta="Correlated items" />
        <InsightCard label="Operational MTTR" value={`${avgMttr}m`} tone="good" delta="Mean time to resolve" />
        <InsightCard label="Signal Suppression" value={`${Math.round((dedupCount / Math.max(incidents.length + dedupCount, 1)) * 100)}%`} tone="warning" delta="Duplicate reduction" />
        <InsightCard label="Critical Density" value={openIncidents.filter((i) => i.severity === "Critical").length} tone="critical" delta="Action required" />
        <InsightCard label="Sensor Health" value="100%" tone="good" delta="All nodes active" />
      </section>

      {/* ── Alert volume stacked area ─────────────────────────────────────────── */}
      <section className="chart-full-row">
        <article className="glass-panel" style={{ padding: 24, background: "rgba(255,255,255,0.02)" }}>
          <div className="table-head" style={{ marginBottom: 20 }}>
            <h3 className="premium-accent" style={{ fontSize: "1.3rem" }}>Ingestion Velocity & Source Trends</h3>
            <span style={{ color: "var(--text-muted)" }}>14-day telemetry across the alert fleet</span>
          </div>
          <div style={{ height: 320 }}>
            <StackedAreaChart data={areaData} />
          </div>
        </article>
      </section>

      <section className="main-grid">
        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="left-column">
          {/* Live alert feed */}
          <article className="glass-panel" style={{ padding: 0 }}>
            <div className="table-head" style={{ padding: "20px 20px 16px" }}>
              <h3 className="premium-accent">Live Operations Stream</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="badge-open" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>{openIncidents.filter(i => i.severity === "Critical").length} Critical</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{openIncidents.length} active total</span>
              </div>
            </div>
            <div className="table-wrap premium-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Alert Description</th>
                    <th>Severity</th>
                    <th>Point</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openIncidents.map((inc: any) => (
                    <tr key={inc.id} className="feed-row-premium">
                      <td style={{ minWidth: 140 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{inc.customer.length > 20 ? inc.customer.slice(0, 20) + '...' : inc.customer}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inc.device}</div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13 }}>{inc.title}</span>
                          {inc.duplicate_count > 1 && (
                            <span className="badge-count-premium">
                              x{inc.duplicate_count}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>{inc.id.split('-')[0]}...</div>
                      </td>
                      <td><span className={(SEV_CLASS as any)[inc.severity]}>{inc.severity}</span></td>
                      <td><span className="source-badge-premium">{(SOURCE_COLORS as any)[inc.source] && <span className="source-dot" style={{ background: (SOURCE_COLORS as any)[inc.source] }} />} {inc.source}</span></td>
                      <td><span style={{ fontSize: 12, opacity: 0.8 }}>{inc.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Correlation groups */}
          <article className="glass-panel" style={{ padding: 20, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Intelligence Clusters</h3>
              <span style={{ background: "var(--primary-grad)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{grouped.length} Correlated Units</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped.map((g: any) => (
                <div key={g.group} className={`corr-group-premium ${expandedGroup === g.group ? 'expanded' : ''}`}>
                  <button
                    className="corr-group-header-premium"
                    onClick={() => setExpandedGroup(expandedGroup === g.group ? null : g.group)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="corr-icon">{expandedGroup === g.group ? '−' : '+'}</div>
                      <span className="corr-group-name">{g.group}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="badge-premium-muted">{g.count} events</span>
                      {g.openCount > 0 && <span className="badge-premium-warn">{g.openCount} open</span>}
                    </div>
                  </button>
                  {expandedGroup === g.group && (
                    <div className="corr-group-body-premium">
                      {g.incidents.map((inc: any) => (
                        <div key={inc.id} className="corr-item-premium">
                          <span style={{ fontSize: 12, flex: 1 }}>{inc.title}</span>
                          <span className={(SEV_CLASS as any)[inc.severity]} style={{ transform: "scale(0.8)" }}>{inc.severity}</span>
                          <span style={{ fontSize: 11, opacity: 0.6, minWidth: 80, textAlign: "right" }}>{inc.status}</span>
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
          <article className="glass-panel" style={{ padding: 20 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Portfolio Pressure Map</h3>
              <span>Severity density by entity</span>
            </div>
            <div className="table-wrap">
              <table className="heatmap-table-premium">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th style={{ textAlign: "center" }}>C</th>
                    <th style={{ textAlign: "center" }}>H</th>
                    <th style={{ textAlign: "center" }}>M</th>
                    <th style={{ textAlign: "center" }}>L</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapRows.slice(0, 10).map((row) => (
                    <tr key={row.customer}>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>{row.customer.length > 20 ? row.customer.slice(0, 18) + '...' : row.customer}</td>
                      <td className={`heat-cell ${heatTone(row.Critical)}`}>{row.Critical}</td>
                      <td className={`heat-cell ${heatTone(row.High)}`}>{row.High}</td>
                      <td className={`heat-cell ${heatTone(row.Medium)}`}>{row.Medium}</td>
                      <td className={`heat-cell ${heatTone(row.Low)}`}>{row.Low}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* MTTR trend */}
          <article className="glass-panel" style={{ padding: 20, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Response Efficiency</h3>
              <span>MTTR trend (min)</span>
            </div>
            <WeeklyBarChart title="" data={mttrWeekly} barColor="var(--good)" />
          </article>

          {/* Resolution Profile */}
          <article className="glass-panel" style={{ padding: 20, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 20 }}>
              <h3 className="premium-accent">Resolution Distribution</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Resolved", count: filtered.filter((i) => i.status === "Resolved").length, color: "var(--good)" },
                { label: "Investigating", count: filtered.filter((i) => i.status === "Investigating").length, color: "var(--warning)" },
                { label: "Open", count: filtered.filter((i) => i.status === "Open").length, color: "var(--critical)" }
              ].map(({ label, count, color }) => {
                const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 6 }}>
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
