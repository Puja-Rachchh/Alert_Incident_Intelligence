"use client";

import { useMemo, useState, useEffect } from "react";
import { PersonaNav } from "@/components/persona-nav";
import HealthGauge from "@/components/charts/health-gauge";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { InsightCard } from "@/components/insight-card";
import {
  alertVolumeByWeek,
  customerHealthScores,
  personaIncidents,
} from "@/features/dashboard/persona-data";
import type { PersonaIncident } from "@/features/dashboard/persona-data";
import { fetchGeoDistribution, fetchWeeklyTrends, fetchCustomerMetrics } from "@/lib/api";
import { DistributionBarChart } from "./charts/distribution-bar-chart";

type SlaRisk = "High" | "Medium" | "Low";

const RISK_COLOR: Record<SlaRisk, string> = {
  High: "var(--critical)",
  Medium: "var(--warning)",
  Low: "var(--good)",
};

const HEALTH_COLOR = (score: number) =>
  score >= 75 ? "var(--good)" : score >= 50 ? "var(--warning)" : "var(--critical)";

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#22c55e",
};

export function ExecutiveDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allHealth, setAllHealth] = useState<any[]>(customerHealthScores(personaIncidents));

  const weekly = useMemo(() => (weeklyData.length > 0 ? weeklyData : alertVolumeByWeek(personaIncidents)), [weeklyData]);

  useEffect(() => {
    Promise.all([
      fetchGeoDistribution().then(setGeoData).catch(console.error),
      fetchWeeklyTrends().then(setWeeklyData).catch(console.error),
      fetchCustomerMetrics().then((data: any) => {
        if (data.customers && data.customers.length > 0) {
          setAllHealth(data.customers);
        }
      }).catch(console.error),
    ]).finally(() => setLoading(false));
  }, []);

  const portfolioAvg = Math.round(
    allHealth.reduce((s: number, h: any) => s + h.score, 0) / Math.max(allHealth.length, 1)
  );

  const highRiskCount = allHealth.filter((h: any) => h.slaRisk === "High").length;
  const medRiskCount = allHealth.filter((h: any) => h.slaRisk === "Medium").length;
  const totalAlerts = allHealth.reduce((s: number, h: any) => s + (h.total || 0), 0);
  const totalNoiseSuppressed = allHealth.reduce((s: number, h: any) => s + (h.dedupSuppressed || 0), 0);
  const avgNoisePct = allHealth.length > 0 ? Math.round(allHealth.reduce((s: number, h: any) => s + (h.noiseReductionPct || 0), 0) / allHealth.length) : 0;
  const portfolioHealthTone = portfolioAvg >= 75 ? "good" : portfolioAvg >= 50 ? "warning" : "critical";

  const selectedHealth = allHealth.find((h: any) => h.org === selectedOrg) ?? null;
  const selectedIncidents: PersonaIncident[] = selectedOrg
    ? personaIncidents.filter((i) => i.customer === selectedOrg)
    : [];

  const riskCounts: Record<SlaRisk, number> = { High: 0, Medium: 0, Low: 0 };
  allHealth.forEach((h) => {
    const risk = (h.slaRisk as SlaRisk) || "Low";
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
  });

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Executive / Strategic Intelligence</p>
        <h1>Portfolio Health & Risk</h1>
        <p>
          Global multi-tenant health score aggregation with real-time SLA risk monitoring across{" "}
          {allHealth.length} organizations.
        </p>
      </header>

      <PersonaNav />

      {/* KPIs */}
      <section className="kpi-grid persona-kpis">
        <InsightCard
          label="Portfolio Health"
          value={loading ? "…" : `${portfolioAvg}%`}
          tone={portfolioHealthTone}
          delta="Aggregated average"
        />
        <InsightCard label="High Risk" value={highRiskCount} tone="critical" delta="Immediate action" />
        <InsightCard label="Active Portfolio" value={allHealth.length} tone="neutral" delta="Tracked organizations" />
        <InsightCard label="Total Alerts" value={totalAlerts.toLocaleString()} tone="neutral" delta="Warehouse volume" />
        <InsightCard label="Noise Reduced" value={`${avgNoisePct}%`} tone="good" delta={`${totalNoiseSuppressed.toLocaleString()} events suppressed`} />
        <InsightCard label="Avg MTTR" value={`${Math.round(allHealth.reduce((s: number, h: any) => s + (h.avgMttr || 0), 0) / Math.max(allHealth.length, 1))}m`} tone="warning" delta="Mean time to resolve" />
      </section>

      {/* Health Matrix */}
      <section className="glass-panel" style={{ marginBottom: 20, padding: 24, background: "rgba(255,255,255,0.01)" }}>
        <div className="table-head" style={{ marginBottom: 28 }}>
          <h3 className="premium-accent" style={{ fontSize: "1.2rem" }}>Global Entity Health Scores</h3>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {loading ? "Loading warehouse data…" : `${allHealth.length} Organizations Monitored`}
          </span>
        </div>
        <div className="gauge-grid-premium">
          {allHealth.map((h: any) => (
            <div
              key={h.org}
              className={`gauge-card-premium ${selectedOrg === h.org ? "selected" : ""}`}
              onClick={() => setSelectedOrg(selectedOrg === h.org ? null : h.org)}
            >
              <div className="gauge-outer">
                <HealthGauge
                  value={h.score}
                  label={`${h.score}%`}
                  color={HEALTH_COLOR(h.score)}
                />
              </div>
              <div className="gauge-info">
                <div className="gauge-org-name" title={h.org}>{h.org}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 2 }}>
                  <div className="gauge-risk-tag" style={{ color: RISK_COLOR[h.slaRisk as SlaRisk], fontSize: 10 }}>
                    {h.slaRisk} Risk
                  </div>
                  {h.noiseReductionPct > 0 && (
                    <div style={{ fontSize: 9, color: "var(--good)", fontWeight: 600 }}>
                      {h.noiseReductionPct}% noise ↓
                    </div>
                  )}
                </div>
                {/* Mini stats row */}
                <div style={{ display: "flex", gap: 6, marginTop: 6, width: "100%", fontSize: 9, color: "var(--text-muted)" }}>
                  <span>{h.total ?? 0} alerts</span>
                  <span>·</span>
                  <span>{h.avgMttr ?? 0}m MTTR</span>
                </div>
                {/* Mini severity bar */}
                {(h.critical != null || h.total) && (
                  <div style={{ display: "flex", gap: 2, marginTop: 4, height: 3, width: "100%", borderRadius: 2, overflow: "hidden" }}>
                    {h.critical > 0 && <div style={{ flex: h.critical, background: SEV_COLOR.critical }} />}
                    {h.high > 0 && <div style={{ flex: h.high, background: SEV_COLOR.high }} />}
                    {h.medium > 0 && <div style={{ flex: h.medium, background: SEV_COLOR.medium }} />}
                    {h.low > 0 && <div style={{ flex: h.low, background: SEV_COLOR.low }} />}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Drill-down Section */}
      {selectedHealth && (
        <section className="drill-panel-premium slide-up">
          <div className="drill-header">
            <div className="drill-title">
              <h2 className="premium-accent">{selectedHealth.org}</h2>
              <span
                className="badge-risk-premium"
                style={{
                  background: RISK_COLOR[selectedHealth.slaRisk as SlaRisk] + "22",
                  color: RISK_COLOR[selectedHealth.slaRisk as SlaRisk],
                  borderColor: RISK_COLOR[selectedHealth.slaRisk as SlaRisk] + "44",
                }}
              >
                {selectedHealth.slaRisk} SLA RISK
              </span>
            </div>
            <button className="drill-close" onClick={() => setSelectedOrg(null)}>✕</button>
          </div>

          <div className="drill-stats">
            <div className="drill-stat-box">
              <div className="stat-label">Health Index</div>
              <div className="stat-value" style={{ color: HEALTH_COLOR(selectedHealth.score) }}>{selectedHealth.score}%</div>
            </div>
            <div className="drill-stat-box">
              <div className="stat-label">Total Alerts</div>
              <div className="stat-value">{selectedHealth.total?.toLocaleString() ?? 0}</div>
            </div>
            <div className="drill-stat-box">
              <div className="stat-label">Noise Reduced</div>
              <div className="stat-value" style={{ color: "var(--good)" }}>{selectedHealth.noiseReductionPct ?? 0}%</div>
            </div>
            <div className="drill-stat-box">
              <div className="stat-label">MTTR</div>
              <div className="stat-value">{selectedHealth.avgMttr ?? 0}m</div>
            </div>
            <div className="drill-stat-box">
              <div className="stat-label">Open Signals</div>
              <div className="stat-value" style={{ color: "var(--critical)" }}>{selectedHealth.openCount}</div>
            </div>
            <div className="drill-stat-box">
              <div className="stat-label">Resolution Rate</div>
              <div className="stat-value" style={{ color: "var(--good)" }}>
                {Math.round((selectedHealth.resolvedCount / Math.max(selectedHealth.openCount + selectedHealth.resolvedCount, 1)) * 100)}%
              </div>
            </div>
          </div>

          {/* Severity breakdown for selected org */}
          {(selectedHealth.critical != null) && (
            <div style={{ display: "flex", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
              {(["critical", "high", "medium", "low"] as const).map((sev) => {
                const val = selectedHealth[sev] ?? 0;
                return (
                  <div key={sev} style={{ flex: "1 1 80px", textAlign: "center", padding: "12px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8, borderTop: `3px solid ${SEV_COLOR[sev]}` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: SEV_COLOR[sev] }}>{val}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize", marginTop: 4 }}>{sev}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="table-wrap premium-scroll" style={{ maxHeight: 300 }}>
            <table>
              <thead>
                <tr>
                  <th>Incident Identifier</th>
                  <th>Intelligence Title</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Current State</th>
                </tr>
              </thead>
              <tbody>
                {selectedIncidents.map((inc) => (
                  <tr key={inc.id} className="feed-row-premium">
                    <td style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.6 }}>{inc.id.split("-")[0]}...</td>
                    <td style={{ fontWeight: 500 }}>{inc.title}</td>
                    <td>
                      <span className={`sev-badge ${inc.severity.toLowerCase()}`} style={{ transform: "scale(0.85)" }}>
                        {inc.severity}
                      </span>
                    </td>
                    <td><span className="source-badge-premium">{inc.source}</span></td>
                    <td><span style={{ fontSize: 13, opacity: 0.8 }}>{inc.status}</span></td>
                  </tr>
                ))}
                {selectedIncidents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      No recent events for this organization.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="main-grid">
        <div className="left-column">
          {/* Scorecard */}
          <article className="glass-panel" style={{ padding: 0 }}>
            <div className="table-head" style={{ padding: "20px 24px" }}>
              <h3 className="premium-accent">Organization Intelligence Scorecard</h3>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Ordered by priority</span>
            </div>
            <div className="table-wrap premium-scroll">
              <table className="scorecard-table-premium">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Health</th>
                    <th>SLA</th>
                    <th style={{ textAlign: "center" }}>Alerts</th>
                    <th style={{ textAlign: "center" }}>Open</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allHealth]
                    .sort((a, b) => a.score - b.score)
                    .map((h: any) => (
                      <tr
                        key={h.org}
                        className={`clickable-row ${selectedOrg === h.org ? "active" : ""}`}
                        onClick={() => setSelectedOrg(selectedOrg === h.org ? null : h.org)}
                      >
                        <td style={{ fontWeight: 600, fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.org}>{h.org}</td>
                        <td style={{ minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: HEALTH_COLOR(h.score), fontWeight: 700, minWidth: 32, fontSize: 14 }}>{h.score}%</span>
                            <div className="progress-track" style={{ flex: 1, height: 4 }}>
                              <div className="progress-fill" style={{ width: `${h.score}%`, background: HEALTH_COLOR(h.score) }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: RISK_COLOR[h.slaRisk as SlaRisk], fontWeight: 500, fontSize: 11 }}>
                            {h.slaRisk.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", fontSize: 13 }}>{h.total ?? "—"}</td>
                        <td style={{ textAlign: "center", color: h.openCount > 0 ? "var(--critical)" : "inherit", fontSize: 13 }}>{h.openCount}</td>
                        <td>
                          {(h.critical != null) && (
                            <div style={{ display: "flex", gap: 4, fontSize: 10 }}>
                              {h.critical > 0 && <span style={{ color: SEV_COLOR.critical }}>{h.critical}C</span>}
                              {h.high > 0 && <span style={{ color: SEV_COLOR.high }}>{h.high}H</span>}
                              {h.medium > 0 && <span style={{ color: SEV_COLOR.medium }}>{h.medium}M</span>}
                              {h.low > 0 && <span style={{ color: SEV_COLOR.low }}>{h.low}L</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="right-column">
          {/* Volume Trend */}
          <article className="glass-panel" style={{ padding: 24 }}>
            <div className="table-head" style={{ marginBottom: 20 }}>
              <h3 className="premium-accent">Portfolio Ingestion Volume</h3>
            </div>
            <WeeklyBarChart title="" data={weekly} barColor="var(--primary)" />
          </article>

          {/* Geo Distribution */}
          <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 20 }}>
              <h3 className="premium-accent">Global Distribution</h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Warehouse · Top countries</span>
            </div>
            <DistributionBarChart
              data={geoData
                .reduce((acc: any[], curr: any) => {
                  const existing = acc.find((a: any) => a.country === curr.country);
                  if (existing) existing.count += curr.count;
                  else acc.push({ country: curr.country, count: curr.count });
                  return acc;
                }, [])
                .sort((a: any, b: any) => b.count - a.count)
                .slice(0, 8)}
              xKey="country"
              yKey="count"
              barColor="var(--good)"
              title=""
            />
          </article>

          {/* SLA Distribution */}
          <article className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
            <div className="table-head" style={{ marginBottom: 20 }}>
              <h3 className="premium-accent">SLA Risk Profile</h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{allHealth.length} orgs assessed</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {(["High", "Medium", "Low"] as SlaRisk[]).map((risk) => {
                const cnt = riskCounts[risk] ?? 0;
                const pct = allHealth.length ? Math.round((cnt / allHealth.length) * 100) : 0;
                return (
                  <div key={risk}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: RISK_COLOR[risk], fontWeight: 600 }}>{risk} Risk</span>
                      <span style={{ color: "var(--text-muted)" }}>{cnt} Orgs ({pct}%)</span>
                    </div>
                    <div className="progress-track" style={{ height: 8 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: RISK_COLOR[risk] }} />
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
