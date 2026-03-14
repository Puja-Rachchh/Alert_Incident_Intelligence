"use client";

import { useMemo, useState } from "react";
import { DistributionBarChart } from "@/components/charts/distribution-bar-chart";
import { InsightCard } from "@/components/insight-card";
import { PersonaNav } from "@/components/persona-nav";
import {
  alertTypeDistribution,
  completenessPercent,
  dedupSuppressedCount,
  personaIncidents,
  resolutionRateBySource,
  schemaValidationSummary,
  severityDistribution,
  sourceBreakdown
} from "@/features/dashboard/persona-data";
import type { SourceSystem } from "@/features/dashboard/types";

const SOURCE_COLORS: Record<SourceSystem, string> = {
  Auvik: "#3b82f6",
  Meraki: "#06b6d4",
  "N-Central": "#8b5cf6"
};

export function DataQualityDashboard() {
  const [selectedSource, setSelectedSource] = useState<SourceSystem | "All">("All");

  const filtered = useMemo(() =>
    selectedSource === "All" ? personaIncidents : personaIncidents.filter((i) => i.source === selectedSource),
    [selectedSource]
  );

  const completeness = useMemo(() => completenessPercent(filtered), [filtered]);
  const schema = useMemo(() => schemaValidationSummary(filtered), [filtered]);
  const sources = useMemo(() => sourceBreakdown(personaIncidents), []);
  const severity = useMemo(() => severityDistribution(filtered), [filtered]);
  const alertTypes = useMemo(() => alertTypeDistribution(filtered).slice(0, 8), [filtered]);
  const dedupCount = useMemo(() => dedupSuppressedCount(personaIncidents), []);
  const resolutionBySource = useMemo(() => resolutionRateBySource(personaIncidents), []);

  const invalidRate = filtered.length ? Math.round(((filtered.length - schema.valid) / filtered.length) * 100) : 0;
  const dedupRate = personaIncidents.length ? Math.round((dedupCount / personaIncidents.length) * 100) : 0;

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Data Quality / Admin View</p>
        <h1>Pipeline Quality &amp; Validation Control</h1>
        <p>Track record completeness, schema conformance, dedup rates, and source health for trustable analytics.</p>
      </header>

      <PersonaNav />

      {/* Source selector */}
      <div className="filter-bar">
        {(["All", "Auvik", "Meraki", "N-Central"] as const).map((src) => (
          <button
            key={src}
            className={`source-tab${selectedSource === src ? " source-tab-active" : ""}`}
            style={selectedSource === src && src !== "All" ? { borderColor: SOURCE_COLORS[src as SourceSystem] } : {}}
            onClick={() => setSelectedSource(src as SourceSystem | "All")}
          >
            {src}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
          Showing {filtered.length} of {personaIncidents.length} records
        </span>
      </div>

      {/* KPIs */}
      <section className="kpi-grid persona-kpis">
        <InsightCard label="Completeness Score" value={`${completeness}%`} tone={completeness >= 90 ? "good" : "warning"} />
        <InsightCard label="Schema Valid" value={schema.valid} tone="good" />
        <InsightCard label="Schema Invalid" value={schema.invalid} tone={schema.invalid > 0 ? "critical" : "good"} delta={`${invalidRate}% invalid rate`} />
        <InsightCard label="Duplicate Suppressed" value={dedupCount} delta={`${dedupRate}% dedup rate`} tone="warning" />
        <InsightCard label="Total Records" value={filtered.length} />
        <InsightCard label="Sources Active" value={sources.filter((s) => s.count > 0).length} tone="good" />
      </section>

      {/* Source breakdown with completeness bars */}
      <section className="chart-full-row">
        <article className="chart-card">
          <div className="table-head">
            <h3>Source-level Quality Breakdown</h3>
            <span>Valid / Invalid / Completeness per source</span>
          </div>
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
            {sources.map((src) => (
              <div key={src.source}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: SOURCE_COLORS[src.source] }}>{src.source}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {src.count} records | {src.valid} valid | {src.invalid} invalid | {src.avgCompleteness}% complete
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Completeness</div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${src.avgCompleteness}%`, background: SOURCE_COLORS[src.source] }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Valid rate</div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${src.count ? Math.round((src.valid / src.count) * 100) : 0}%`, background: "#22c55e" }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="main-grid">
        <div className="left-column">
          {/* Schema validation detail */}
          <article className="table-card">
            <div className="table-head">
              <h3>Schema Validation by Source</h3>
              <span>Record-level quality gate</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Records</th>
                    <th>Valid</th>
                    <th>Invalid</th>
                    <th>Avg Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((row) => (
                    <tr key={row.source}>
                      <td>
                        <span style={{ color: SOURCE_COLORS[row.source], fontWeight: 600 }}>{row.source}</span>
                      </td>
                      <td>{row.count}</td>
                      <td style={{ color: "#22c55e" }}>{row.valid}</td>
                      <td style={{ color: row.invalid > 0 ? "#ef4444" : "var(--text-muted)" }}>{row.invalid}</td>
                      <td>
                        <span style={{ color: row.avgCompleteness >= 90 ? "#22c55e" : "#f59e0b" }}>
                          {row.avgCompleteness}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Resolution by source */}
          <article className="table-card">
            <div className="table-head">
              <h3>Resolution Rate by Source</h3>
            </div>
            <div style={{ padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
              {resolutionBySource.map((row) => {
                const total = row.resolved + row.open;
                const pct = total ? Math.round((row.resolved / total) * 100) : 0;
                return (
                  <div key={row.source}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: SOURCE_COLORS[row.source], fontWeight: 600 }}>{row.source}</span>
                      <span style={{ color: "var(--text-muted)" }}>{row.resolved}/{total} resolved ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: SOURCE_COLORS[row.source] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <DistributionBarChart
            title="Severity Distribution"
            data={severity.map((item) => ({ severity: item.severity, count: item.count }))}
            xKey="severity"
            yKey="count"
            barColor="#ffb200"
          />
        </div>

        <div className="right-column">
          <DistributionBarChart
            title="Alert Type Distribution"
            data={alertTypes.map((item) => ({ alertType: item.alertType, count: item.count }))}
            xKey="alertType"
            yKey="count"
            barColor="#00a8ff"
          />

          {/* Invalid records detail */}
          <article className="table-card">
            <div className="table-head">
              <h3>Records with Schema Issues</h3>
              <span>Incomplete or invalid entries</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Customer</th>
                    <th>Complete %</th>
                    <th>Schema</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .filter((i) => !i.schemaValid || i.completenessScore < 0.85)
                    .sort((a, b) => a.completenessScore - b.completenessScore)
                    .map((i) => (
                      <tr key={i.id}>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{i.id}</td>
                        <td><span className="source-badge">{i.source}</span></td>
                        <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.customer}</td>
                        <td style={{ color: i.completenessScore < 0.85 ? "#f59e0b" : "inherit" }}>{Math.round(i.completenessScore * 100)}%</td>
                        <td style={{ color: i.schemaValid ? "#22c55e" : "#ef4444" }}>{i.schemaValid ? "Valid" : "Invalid"}</td>
                      </tr>
                    ))}
                  {filtered.filter((i) => !i.schemaValid || i.completenessScore < 0.85).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>All records pass quality checks.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
