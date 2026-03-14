"use client";

import { useMemo, useState } from "react";
import { PersonaNav } from "@/components/persona-nav";
import HealthGauge from "@/components/charts/health-gauge";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import {
  alertVolumeByWeek,
  customerHealthScores,
  personaIncidents,
  topRecurringAlertTypes,
} from "@/features/dashboard/persona-data";
import type { PersonaIncident } from "@/features/dashboard/persona-data";

type SlaRisk = "High" | "Medium" | "Low";

const RISK_COLOR: Record<SlaRisk, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

const HEALTH_COLOR = (score: number) =>
  score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

export function ExecutiveDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const allHealth = useMemo(() => customerHealthScores(personaIncidents), []);
  const topTypes = useMemo(() => topRecurringAlertTypes(personaIncidents, 6), []);
  const weekly = useMemo(() => alertVolumeByWeek(personaIncidents), []);

  const portfolioAvg = Math.round(
    allHealth.reduce((s, h) => s + h.score, 0) / Math.max(allHealth.length, 1)
  );

  const highRisk = allHealth.filter((h) => h.slaRisk === "High").length;
  const lowRisk = allHealth.filter((h) => h.slaRisk === "Low").length;
  const totalActive = allHealth.reduce((s, h) => s + h.openCount, 0);
  const totalVolume = weekly.reduce((s, w) => s + w.volume, 0);

  const selectedHealth = allHealth.find((h) => h.org === selectedOrg) ?? null;
  const selectedIncidents: PersonaIncident[] = selectedOrg
    ? personaIncidents.filter((i) => i.customer === selectedOrg)
    : [];

  const riskCounts: Record<SlaRisk, number> = { High: 0, Medium: 0, Low: 0 };
  allHealth.forEach((h) => {
    riskCounts[h.slaRisk as SlaRisk] = (riskCounts[h.slaRisk as SlaRisk] ?? 0) + 1;
  });

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Executive / Account Manager View</p>
        <h1>Portfolio Health &amp; Risk</h1>
        <p>
          Pan-customer health scores, SLA risk distribution, and alert trends. Click any
          org to drill down.
        </p>
      </header>

      <PersonaNav />

      {/* KPIs */}
      <section className="kpi-grid persona-kpis">
        <div className="insight-card tone-good">
          <span className="insight-label">Portfolio Avg Health</span>
          <span className="insight-value">{portfolioAvg}%</span>
        </div>
        <div className="insight-card tone-critical">
          <span className="insight-label">High SLA Risk Orgs</span>
          <span className="insight-value">{highRisk}</span>
        </div>
        <div className="insight-card tone-warning">
          <span className="insight-label">Total Active Alerts</span>
          <span className="insight-value">{totalActive}</span>
        </div>
        <div className="insight-card">
          <span className="insight-label">Tracked Orgs</span>
          <span className="insight-value">{allHealth.length}</span>
        </div>
        <div className="insight-card">
          <span className="insight-label">Alert Volume (all weeks)</span>
          <span className="insight-value">{totalVolume}</span>
        </div>
        <div className="insight-card tone-good">
          <span className="insight-label">Low Risk Orgs</span>
          <span className="insight-value">{lowRisk}</span>
        </div>
      </section>

      {/* Gauge grid */}
      <section className="chart-card" style={{ marginBottom: 16 }}>
        <div className="table-head" style={{ marginBottom: 12 }}>
          <h3>Organization Health Gauges</h3>
          <span>Click to drill down</span>
        </div>
        <div className="gauge-grid">
          {allHealth.map((h) => (
            <div
              key={h.org}
              className={`gauge-cell${selectedOrg === h.org ? " gauge-selected" : ""}`}
              onClick={() =>
                setSelectedOrg(selectedOrg === h.org ? null : h.org)
              }
            >
              <HealthGauge
                value={h.score}
                label={`${h.score}%`}
                color={HEALTH_COLOR(h.score)}
              />
              <div className="gauge-org-label" title={h.org}>
                {h.org.length > 22 ? h.org.slice(0, 22) + "..." : h.org}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Drill-down */}
      {selectedHealth && (
        <section
          className="chart-card drill-panel"
          style={{
            marginBottom: 16,
            borderColor: HEALTH_COLOR(selectedHealth.score) + "55",
          }}
        >
          <div className="table-head">
            <h3>{selectedHealth.org}</h3>
            <span
              style={{
                color: RISK_COLOR[(selectedHealth.slaRisk as SlaRisk) ?? "Low"],
                fontWeight: 700,
              }}
            >
              {selectedHealth.slaRisk} SLA Risk
            </span>
          </div>
          <div className="drill-kpis">
            <div className="drill-kpi">
              <span
                className="drill-kpi-val"
                style={{ color: HEALTH_COLOR(selectedHealth.score) }}
              >
                {selectedHealth.score}%
              </span>
              <span className="drill-kpi-label">Health Score</span>
            </div>
            <div className="drill-kpi">
              <span className="drill-kpi-val" style={{ color: "#ef4444" }}>
                {selectedHealth.openCount}
              </span>
              <span className="drill-kpi-label">Open Alerts</span>
            </div>
            <div className="drill-kpi">
              <span className="drill-kpi-val" style={{ color: "#22c55e" }}>
                {selectedHealth.resolvedCount}
              </span>
              <span className="drill-kpi-label">Resolved</span>
            </div>
            <div className="drill-kpi">
              <span className="drill-kpi-val">{selectedHealth.avgMttr} min</span>
              <span className="drill-kpi-label">Avg MTTR</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{inc.id}</td>
                    <td>{inc.title}</td>
                    <td>
                      <span
                        className={`sev-badge ${inc.severity.toLowerCase()}`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <span className="source-badge">{inc.source}</span>
                    </td>
                    <td>{inc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="main-grid">
        <div className="left-column">
          {/* Org scorecard */}
          <article className="table-card">
            <div className="table-head">
              <h3>Organization Scorecard</h3>
              <span>Sorted by health (worst first)</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Health</th>
                    <th>SLA Risk</th>
                    <th>Open</th>
                    <th>Resolved</th>
                    <th>MTTR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allHealth]
                    .sort((a, b) => a.score - b.score)
                    .map((h) => (
                      <tr
                        key={h.org}
                        className={selectedOrg === h.org ? "row-selected" : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setSelectedOrg(
                            selectedOrg === h.org ? null : h.org
                          )
                        }
                      >
                        <td
                          style={{
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.org}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ color: HEALTH_COLOR(h.score), fontWeight: 700 }}>
                              {h.score}%
                            </span>
                            <div className="progress-track" style={{ flex: 1 }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${h.score}%`,
                                  background: HEALTH_COLOR(h.score),
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: RISK_COLOR[(h.slaRisk as SlaRisk) ?? "Low"] }}>
                            {h.slaRisk}
                          </span>
                        </td>
                        <td style={{ color: "#ef4444" }}>{h.openCount}</td>
                        <td style={{ color: "#22c55e" }}>{h.resolvedCount}</td>
                        <td>{h.avgMttr} min</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="right-column">
          {/* Weekly volume */}
          <WeeklyBarChart title="Weekly Alert Volume" data={weekly} barColor="#00a8ff" />

          {/* SLA Risk distribution */}
          <article className="table-card">
            <div className="table-head">
              <h3>SLA Risk Distribution</h3>
            </div>
            <div style={{ padding: "8px 0 4px", display: "flex", flexDirection: "column", gap: 12 }}>
              {(["High", "Medium", "Low"] as SlaRisk[]).map((risk) => {
                const cnt = riskCounts[risk] ?? 0;
                const pct = allHealth.length
                  ? Math.round((cnt / allHealth.length) * 100)
                  : 0;
                return (
                  <div key={risk}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: RISK_COLOR[risk] }}>{risk} Risk</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {cnt} orgs ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%`, background: RISK_COLOR[risk] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          {/* Top alert types */}
          <article className="table-card">
            <div className="table-head">
              <h3>Top Recurring Alert Types</h3>
            </div>
            <div style={{ padding: "4px 0" }}>
              {topTypes.map((t) => {
                const pct = topTypes[0]?.count
                  ? Math.round((t.count / topTypes[0].count) * 100)
                  : 0;
                return (
                  <div key={t.name} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span>{t.name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{t.count}x</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%`, background: "#a78bfa" }}
                      />
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