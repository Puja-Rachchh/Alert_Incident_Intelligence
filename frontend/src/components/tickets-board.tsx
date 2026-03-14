"use client";

import { useMemo, useState } from "react";
import { personaIncidents } from "@/features/dashboard/persona-data";
import {
  activeTicketsBySeverity,
  computeKpis,
  generateTickets,
  ticketsByAlertType
} from "@/features/tickets/ticket-engine";
import type { Ticket, TicketStatus } from "@/features/tickets/ticket-engine";
import type { Severity } from "@/features/dashboard/types";
import { PersonaNav } from "@/components/persona-nav";
import { DistributionBarChart } from "@/components/charts/distribution-bar-chart";

// --- Helpers ------------------------------------------------------------------
const SEV_COLORS: Record<Severity, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#22c55e"
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  "auto-review": "Auto-Review",
  approved: "Approved",
  resolved: "Resolved"
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: "#ef4444",
  investigating: "#f59e0b",
  "auto-review": "#a78bfa",
  approved: "#22c55e",
  resolved: "#64748b"
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "< 1h ago";
}

// --- Component ----------------------------------------------------------------
export function TicketsBoard() {
  const allTickets = useMemo(() => generateTickets(personaIncidents), []);
  const [tickets, setTickets] = useState<Ticket[]>(allTickets);

  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const kpis = useMemo(() => computeKpis(tickets), [tickets]);
  const alertTypeDist = useMemo(() => ticketsByAlertType(tickets), [tickets]);
  const activeSevDist = useMemo(() => activeTicketsBySeverity(tickets), [tickets]);

  const visible = useMemo(() => {
    let list = tickets;
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (sevFilter !== "all") list = list.filter((t) => t.severity === sevFilter);
    return list.sort((a, b) => {
      const order: TicketStatus[] = ["open", "investigating", "auto-review", "approved", "resolved"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
  }, [tickets, statusFilter, sevFilter]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) ?? null, [tickets, selectedId]);

  function approveTicket(id: string) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "approved" as TicketStatus } : t))
    );
    if (selectedId === id) setSelectedId(null);
  }

  function resolveTicket(id: string) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "resolved" as TicketStatus, resolvedAt: new Date().toISOString() } : t))
    );
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Automatic Ticket Tracker</p>
        <h1>Alert Intelligence Tickets</h1>
        <p>
          Tickets are auto-generated from incoming alerts. Known issues are flagged for one-click approval.
          No manual ticket creation required.
        </p>
      </header>

      <PersonaNav />

      {/* -- KPIs ---------------------------------------------------------------- */}
      <section className="kpi-grid persona-kpis">
        <div className="insight-card tone-warning">
          <span className="insight-label">Total Tickets</span>
          <span className="insight-value">{kpis.total}</span>
        </div>
        <div className="insight-card tone-critical">
          <span className="insight-label">Open</span>
          <span className="insight-value">{kpis.open}</span>
        </div>
        <div className="insight-card tone-warning">
          <span className="insight-label">Investigating</span>
          <span className="insight-value">{kpis.investigating}</span>
        </div>
        <div className="insight-card" style={{ borderColor: "#a78bfa" }}>
          <span className="insight-label" style={{ color: "#a78bfa" }}>Auto-Review Ready</span>
          <span className="insight-value">{kpis.autoReview}</span>
          <span className="insight-delta">{kpis.autoReviewRate}% auto-identified</span>
        </div>
        <div className="insight-card tone-good">
          <span className="insight-label">Resolved</span>
          <span className="insight-value">{kpis.resolved}</span>
        </div>
        <div className="insight-card tone-critical">
          <span className="insight-label">Critical Open</span>
          <span className="insight-value">{kpis.criticalOpen}</span>
        </div>
      </section>

      {/* -- Charts row ----------------------------------------------------------- */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <DistributionBarChart
          title="Tickets by Alert Type"
          data={alertTypeDist.slice(0, 8).map((d) => ({ type: d.alertType, count: d.count }))}
          xKey="type"
          yKey="count"
          barColor="#a78bfa"
        />
        <DistributionBarChart
          title="Active Tickets by Severity"
          data={activeSevDist.map((d) => ({ severity: d.severity, count: d.count }))}
          xKey="severity"
          yKey="count"
          barColor="#f59e0b"
        />
      </section>

      {/* -- Filters + Board ------------------------------------------------------ */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
        >
          <option value="all">All Statuses</option>
          {(["open", "investigating", "auto-review", "approved", "resolved"] as TicketStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value as Severity | "all")}
        >
          <option value="all">All Severities</option>
          {(["Critical", "High", "Medium", "Low"] as Severity[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
          {visible.length} ticket{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      <section className="ticket-board-layout">
        {/* -- Ticket list ------------------------------------------------------- */}
        <div className="ticket-list">
          {visible.map((t) => (
            <div
              key={t.id}
              className={`ticket-row${selectedId === t.id ? " ticket-row-selected" : ""}${t.status === "auto-review" ? " ticket-auto-review" : ""}`}
              onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
            >
              <div className="ticket-row-header">
                <span className="ticket-id">{t.id}</span>
                <span
                  className="status-badge"
                  style={{ background: STATUS_COLOR[t.status] + "22", color: STATUS_COLOR[t.status], border: `1px solid ${STATUS_COLOR[t.status]}55` }}
                >
                  {STATUS_LABELS[t.status]}
                </span>
              </div>
              <div className="ticket-title">{t.title}</div>
              <div className="ticket-meta">
                <span className="sev-badge-sm" style={{ background: SEV_COLORS[t.severity] + "22", color: SEV_COLORS[t.severity] }}>
                  {t.severity}
                </span>
                <span className="source-badge">{t.source}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: "auto" }}>{timeAgo(t.createdAt)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.customer}
              </div>
              {t.status === "auto-review" && (
                <div className="auto-review-pill">AI: Similar incidents found - one-click approval available</div>
              )}
              {t.duplicateSuppressed && (
                <div className="dedup-pill">Duplicate suppressed by source</div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              No tickets match the current filters.
            </div>
          )}
        </div>

        {/* -- Detail panel ------------------------------------------------------ */}
        <div className="ticket-detail-panel">
          {selected ? (
            <>
              {/* Auto-review banner */}
              {selected.status === "auto-review" && (
                <div className="auto-review-banner">
                  <span>AI Auto-Review</span>
                  <span style={{ fontSize: 13, fontWeight: 400 }}>{selected.autoReviewReason}</span>
                  {selected.highConfidence && (
                    <span className="high-conf-badge">High Confidence</span>
                  )}
                </div>
              )}

              <div className="detail-header">
                <div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{selected.id}</div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{selected.title}</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="sev-badge" style={{ background: SEV_COLORS[selected.severity] + "22", color: SEV_COLORS[selected.severity] }}>
                    {selected.severity}
                  </span>
                  <span
                    className="status-badge"
                    style={{ background: STATUS_COLOR[selected.status] + "22", color: STATUS_COLOR[selected.status] }}
                  >
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </div>

              {/* Alert details */}
              <div className="detail-section">
                <h4>Alert Details</h4>
                <div className="detail-grid">
                  <span className="detail-label">Source</span><span className="detail-val">{selected.source}</span>
                  <span className="detail-label">Customer</span><span className="detail-val">{selected.customer}</span>
                  <span className="detail-label">Device</span><span className="detail-val">{selected.device}</span>
                  {selected.deviceIp && <><span className="detail-label">IP</span><span className="detail-val">{selected.deviceIp}</span></>}
                  <span className="detail-label">Alert Type</span><span className="detail-val">{selected.alertType}</span>
                  <span className="detail-label">Recurrences</span><span className="detail-val">{selected.recurrenceCount}x (this alert type + customer)</span>
                  <span className="detail-label">Created</span><span className="detail-val">{new Date(selected.createdAt).toLocaleString()}</span>
                  {selected.resolvedAt && <><span className="detail-label">Resolved</span><span className="detail-val">{new Date(selected.resolvedAt).toLocaleString()}</span></>}
                </div>
              </div>

              {/* Description */}
              <div className="detail-section">
                <h4>Alert Description</h4>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
              </div>

              {/* Playbook */}
              <div className="detail-section">
                <h4>Resolution Playbook</h4>
                <ol className="playbook-list">
                  {selected.playbook.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Similar prior incidents */}
              {selected.similarPrior.length > 0 && (
                <div className="detail-section">
                  <h4>Similar Prior Resolutions ({selected.similarPrior.length})</h4>
                  {selected.similarPrior.map((pr) => (
                    <div key={pr.ticketId} className="prior-card">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{pr.ticketId}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(pr.date).toLocaleDateString()} | MTTR: {pr.mttrMinutes} min</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Device: {pr.device}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Resolution: <em>{pr.resolution}</em></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {selected.status !== "resolved" && (
                <div className="detail-actions">
                  {(selected.status === "auto-review" || selected.status === "investigating" || selected.status === "open") && (
                    <button className="btn-approve" onClick={() => approveTicket(selected.id)}>
                      {selected.status === "auto-review" ? "Approve & Mark Resolved" : "Approve"}
                    </button>
                  )}
                  {selected.status === "approved" && (
                    <button className="btn-approve" onClick={() => resolveTicket(selected.id)}>
                      Mark Resolved
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => setSelectedId(null)}>
                    Close Panel
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="detail-empty">
              <div style={{ fontSize: 32, marginBottom: 12 }}>Select a ticket</div>
              <p>Click any ticket on the left to view full details, resolution playbook, and similar prior incidents.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
