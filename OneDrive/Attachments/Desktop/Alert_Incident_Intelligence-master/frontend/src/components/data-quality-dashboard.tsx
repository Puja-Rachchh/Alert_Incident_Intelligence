"use client";

import { useMemo, useState, useEffect } from "react";
import { DistributionBarChart } from "@/components/charts/distribution-bar-chart";
import { InsightCard } from "@/components/insight-card";
import { PersonaNav } from "@/components/persona-nav";
import { personaIncidents, dedupSuppressedCount, severityDistribution } from "@/features/dashboard/persona-data";
import type { PersonaIncident } from "@/features/dashboard/persona-data";
import type { SourceSystem } from "@/features/dashboard/types";
import { SOURCE_COLORS } from "@/features/dashboard/types";
import { fetchIncidents, fetchQualityMetrics } from "@/lib/api";

/* ─── Severity color palette ──────────────────────── */
const SEV_COLOR: Record<string, string> = {
  Critical: "var(--critical)",
  High: "var(--accent)",
  Medium: "var(--primary)",
  Low: "var(--good)",
};

export function DataQualityDashboard() {
  const [incidents, setIncidents] = useState<PersonaIncident[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceSystem | "All">("All");
  const [quality, setQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchIncidents(100).then((data: any) => {
        const mapped = data.map((i: any) => ({
          ...i,
          customer: i.customer || "Unknown",
          correlationGroup: i.correlationGroup || "none",
          duplicateSuppressed: i.duplicateSuppressed ?? false,
          schemaValid: i.schemaValid ?? true,
          completenessScore: i.completenessScore ?? 1,
          device: i.device || "",
          playbook: i.playbook || [],
        }));
        setIncidents(mapped);
      }).catch(console.error),
      fetchQualityMetrics().then(setQuality).catch(console.error),
    ]).finally(() => setLoading(false));
  }, []);

  const availableSources = useMemo(() => {
    const dataSources = incidents.map((i: PersonaIncident) => i.source);
    return [...new Set([...dataSources, "Auvik", "Meraki", "N-Central", "Ctgan"])].sort();
  }, [incidents]);

  const filtered = useMemo(() => {
    const list = incidents.length > 0 ? incidents : personaIncidents;
    return selectedSource === "All" ? list : list.filter((i) => i.source === selectedSource);
  }, [selectedSource, incidents]);

  /* ─── Warehouse-derived KPIs ─── */
  const sourcesBreakdownData = useMemo(() => quality?.sources ?? [], [quality]);
  const dedupCount = useMemo(() => quality?.duplicates ?? dedupSuppressedCount(incidents), [incidents, quality]);
  const latency = useMemo(() => quality?.avg_latency ?? 12.5, [quality]);
  const fieldCompleteness = useMemo(
    () => quality?.field_completeness ?? { customer: 95, device: 88, description: 92, severity: 100 },
    [quality]
  );

  const totalAlertFlow = useMemo(() => {
    if (!quality?.sources) return filtered.length;
    if (selectedSource === "All")
      return quality.total_records ?? quality.sources.reduce((s: number, src: any) => s + src.count, 0);
    const match = quality.sources.find((s: any) => s.source === selectedSource);
    return match?.count ?? 0;
  }, [quality, selectedSource, filtered]);

  const dedupRate = totalAlertFlow > 0 ? Math.round((dedupCount / (totalAlertFlow + dedupCount)) * 100) : 0;

  /* Severity from warehouse or fallback */
  /* Severity — use per-source breakdown when a source is selected */
  const severityData = useMemo(() => {
    if (selectedSource !== "All" && quality?.per_source_severity?.length) {
      const match = quality.per_source_severity.find((ps: any) => ps.source === selectedSource);
      if (match) {
        return (["Critical", "High", "Medium", "Low"] as const).map((sev) => ({
          severity: sev,
          count: match[sev] ?? 0,
        }));
      }
    }
    if (quality?.severity_distribution?.length) return quality.severity_distribution;
    return severityDistribution(filtered);
  }, [quality, filtered, selectedSource]);

  const criticalCount = severityData.find((s: any) => s.severity === "Critical")?.count ?? 0;
  const criticalDensity = totalAlertFlow > 0 ? Math.round((criticalCount / totalAlertFlow) * 100) : 0;

  /* Warehouse extras */
  const topAlertTypes = quality?.top_alert_types ?? [];
  const hourlyHeatmap = quality?.hourly_heatmap ?? [];
  const geoSummary = quality?.geo_summary ?? [];
  const perSourceSev = quality?.per_source_severity ?? [];

  /* Cap latency at a reasonable display value */
  const displayLatency = latency > 120 ? ">120" : `${latency}`;

  /* Hourly max for heatmap scaling */
  const hourlyMax = Math.max(...hourlyHeatmap.map((h: any) => h.count), 1);

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Data Quality / Intelligence View</p>
        <h1>Pipeline Health & Trust Analytics</h1>
        <p>
          Real-time monitoring of ingestion latency, noise reduction, attribute coverage, and alert intelligence across
          the full ingestion fleet.
        </p>
      </header>

      <PersonaNav />

      {/* ── Source Selector ── */}
      <div className="filter-bar">
        {["All", ...availableSources.filter((s) => s !== "All")].map((src) => (
          <button
            key={src}
            className={`source-tab${selectedSource === src ? " source-tab-active" : ""}`}
            style={
              selectedSource === src && src !== "All" && SOURCE_COLORS[src]
                ? { borderColor: SOURCE_COLORS[src] }
                : {}
            }
            onClick={() => setSelectedSource(src as any)}
          >
            {src !== "All" && SOURCE_COLORS[src] && (
              <span className="source-dot" style={{ background: SOURCE_COLORS[src], display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 6 }} />
            )}
            {src}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
          {loading ? "Loading warehouse…" : `Analyzing ${totalAlertFlow.toLocaleString()} event streams`}
        </span>
      </div>

      {/* ── KPIs ── */}
      <section className="kpi-grid persona-kpis">
        <InsightCard label="Ingestion Latency" value={`${displayLatency}m`} tone={latency < 15 ? "good" : latency > 120 ? "critical" : "warning"} delta="Avg processing lag" />
        <InsightCard label="Noise Reduction" value={`${dedupRate}%`} tone={dedupRate > 5 ? "good" : "neutral"} delta="Duplicate suppression" />
        <InsightCard label="Data Coverage" value={`${fieldCompleteness.description}%`} tone="good" delta="Rich text population" />
        <InsightCard label="Total Alert Flow" value={totalAlertFlow.toLocaleString()} tone="neutral" delta="Warehouse records" />
        <InsightCard label="Ingestion Sources" value={sourcesBreakdownData.length || 4} tone="good" delta="Active pipelines" />
        <InsightCard label="Critical Density" value={`${criticalDensity}%`} tone={criticalDensity > 25 ? "critical" : criticalDensity > 10 ? "warning" : "good"} delta={`${criticalCount} critical alerts`} />
      </section>

      {/* ── Source-level Reliability Matrix (KEPT — the big one) ── */}
      <section className="chart-full-row">
        <article className="glass-panel" style={{ padding: 24, background: "rgba(255,255,255,0.03)" }}>
          <div className="table-head" style={{ marginBottom: 20 }}>
            <h3 className="premium-accent" style={{ fontSize: "1.4rem" }}>Source-level Reliability Matrix</h3>
            <span style={{ color: "var(--text-muted)" }}>End-to-end quality and completeness by ingestion point</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
            {sourcesBreakdownData.map((src: any) => {
              const srcSev = perSourceSev.find((ps: any) => ps.source === src.source);
              const srcTotal = srcSev ? srcSev.Critical + srcSev.High + srcSev.Medium + srcSev.Low : src.count;
              return (
                <div
                  key={src.source}
                  className="source-card-premium"
                  style={{
                    borderLeft: `4px solid ${SOURCE_COLORS[src.source] || "var(--primary)"}`,
                    paddingLeft: 16,
                    transition: "transform 0.2s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedSource(src.source as any)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: "1.1rem", color: SOURCE_COLORS[src.source] || "var(--primary)" }}>
                      {src.source}
                    </span>
                    <span style={{ fontSize: 13, background: "rgba(255,255,255,0.05)", padding: "2px 10px", borderRadius: 6 }}>
                      {src.count.toLocaleString()} records
                    </span>
                  </div>

                  {/* Attribute Coverage */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                      <span>Attribute Coverage</span>
                      <span>{src.avgCompleteness}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 6, background: "rgba(255,255,255,0.1)" }}>
                      <div className="progress-fill" style={{ width: `${src.avgCompleteness}%`, background: `linear-gradient(90deg, ${SOURCE_COLORS[src.source] || "var(--primary)"}dd, #fff)` }} />
                    </div>
                  </div>

                  {/* Mini severity breakdown */}
                  {srcSev && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      {(["Critical", "High", "Medium", "Low"] as const).map((sev) => {
                        const cnt = srcSev[sev] ?? 0;
                        const pct = srcTotal > 0 ? Math.round((cnt / srcTotal) * 100) : 0;
                        return (
                          <div key={sev} style={{ flex: 1, textAlign: "center", padding: "4px 0", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: SEV_COLOR[sev] }}>{cnt}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{sev}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="mini-kpi" style={{ background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Health</div>
                      <div style={{ fontWeight: 600, color: src.avgCompleteness >= 80 ? "var(--good)" : "var(--accent)" }}>
                        {src.avgCompleteness >= 80 ? "Optimal" : "Review"}
                      </div>
                    </div>
                    <div className="mini-kpi" style={{ background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Status</div>
                      <div style={{ fontWeight: 600 }}>Active</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* ── Main Grid ── */}
      <section className="main-grid">
        <div className="left-column">
          {/* Severity Distribution from Warehouse */}
          <article className="glass-panel" style={{ padding: 24 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Severity Distribution</h3>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Warehouse · Real-time</span>
            </div>
            <DistributionBarChart
              title=""
              data={severityData.map((item: any) => ({ severity: item.severity, count: item.count }))}
              xKey="severity"
              yKey="count"
              barColor="var(--secondary)"
            />
          </article>

          {/* Field Completeness Matrix */}
          <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Global Attribute Coverage</h3>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Field-level population rates</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(fieldCompleteness).map(([field, val]: [string, any]) => (
                <div key={field}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{field}</span>
                    <span style={{ fontWeight: 700, color: val >= 90 ? "var(--good)" : val >= 70 ? "var(--accent)" : "var(--critical)" }}>{val}%</span>
                  </div>
                  <div className="progress-track" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${val}%`, background: "var(--premium-grad)" }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Noise Reduction Visual */}
          <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 16 }}>
              <h3 className="premium-accent">Noise Reduction Profile</h3>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Deduplication efficiency</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "16px 0" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-muted)" }}>{(totalAlertFlow + dedupCount).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Inbound Events</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 28, color: "var(--primary)" }}>→</div>
                <div style={{ fontSize: 11, color: "var(--good)", fontWeight: 600 }}>{dedupRate}% reduced</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--primary)" }}>{totalAlertFlow.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 4 }}>Intelligence Units</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, textAlign: "center", color: "var(--good)", opacity: 0.8 }}>
              Pipeline suppressed {dedupCount.toLocaleString()} redundant signals
            </div>
          </article>
        </div>

        <div className="right-column">
          {/* ★ NEW: Top Alert Types from Warehouse */}
          {topAlertTypes.length > 0 && (
            <article className="glass-panel" style={{ padding: 24 }}>
              <div className="table-head" style={{ marginBottom: 16 }}>
                <h3 className="premium-accent">Top Alert Types</h3>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Warehouse · {topAlertTypes.length} categories</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {topAlertTypes.map((t: any, i: number) => {
                  const pct = topAlertTypes[0]?.count ? Math.round((t.count / topAlertTypes[0].count) * 100) : 0;
                  return (
                    <div key={t.name + i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.name}>
                          {t.name}
                        </span>
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{t.count}</span>
                      </div>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--premium-grad)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* ★ NEW: Hourly Activity Heatmap */}
          {hourlyHeatmap.length > 0 && (
            <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
              <div className="table-head" style={{ marginBottom: 16 }}>
                <h3 className="premium-accent">Hourly Activity Heatmap</h3>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Alert volume by hour-of-day</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4 }}>
                {hourlyHeatmap.map((h: any) => {
                  const intensity = h.count / hourlyMax;
                  const bg =
                    intensity > 0.8
                      ? "rgba(239,68,68,0.5)"
                      : intensity > 0.5
                        ? "rgba(245,158,11,0.4)"
                        : intensity > 0.25
                          ? "rgba(59,130,246,0.3)"
                          : "rgba(255,255,255,0.06)";
                  return (
                    <div
                      key={h.hour}
                      title={`${h.hour}:00 — ${h.count} alerts`}
                      style={{
                        textAlign: "center",
                        padding: "10px 0",
                        borderRadius: 6,
                        background: bg,
                        cursor: "default",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{h.count}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{h.hour}h</div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* ★ NEW: Geographic Footprint */}
          {geoSummary.length > 0 && (
            <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
              <div className="table-head" style={{ marginBottom: 16 }}>
                <h3 className="premium-accent">Geographic Footprint</h3>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{geoSummary.length} countries</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {geoSummary.map((g: any) => {
                  const pct = geoSummary[0]?.count ? Math.round((g.count / geoSummary[0].count) * 100) : 0;
                  return (
                    <div key={g.country}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ fontWeight: 500 }}>{g.country}</span>
                        <span style={{ color: "var(--text-muted)" }}>{g.count} alerts</span>
                      </div>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--good)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
