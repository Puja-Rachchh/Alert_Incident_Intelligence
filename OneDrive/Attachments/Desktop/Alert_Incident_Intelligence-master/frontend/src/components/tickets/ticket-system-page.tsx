"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChatAssistant } from "@/components/chat/chat-assistant";
import { InsightCard } from "@/components/insight-card";
import { PersonaNav } from "@/components/persona-nav";
import { approveAndResolve, createTicketFromAlert, severityBadgeTone } from "@/features/tickets/engine";
import type { IncomingAlert, Ticket } from "@/features/tickets/types";

const starterAlert: IncomingAlert = {
  source: "Auvik",
  customer: "Acme Retail",
  title: "Core switch loop detected",
  alertType: "SwitchLoop",
  details: "Multiple ports entering forwarding state repeatedly in core stack.",
  signalScore: 88
};

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoDate));
}

export function TicketSystemPage() {
  const [form, setForm] = useState<IncomingAlert>(starterAlert);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId), [tickets, selectedTicketId]);
  const reviewCount = useMemo(() => tickets.filter((ticket) => ticket.status === "Mark for Review").length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((ticket) => ticket.status === "Resolved").length, [tickets]);
  const autoCandidateCount = useMemo(() => tickets.filter((ticket) => ticket.autoResolvedCandidate).length, [tickets]);

  function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTicket = createTicketFromAlert(form);
    setTickets((current) => [nextTicket, ...current]);
    setSelectedTicketId(nextTicket.id);
  }

  function approveResolution(ticketId: string) {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket;
        }

        return approveAndResolve(ticket);
      })
    );
  }

  return (
    <main className="dashboard-root">
      <div className="background-grid" />

      <header className="hero">
        <p className="eyebrow">Ticketing & Resolution Intelligence</p>
        <h1>Smart Alert-to-Ticket Workflow</h1>
        <p>
          Incoming alerts are severity-tagged, linked to similar historical incidents, and auto-routed to Mark for Review when a strong prior match exists.
        </p>
      </header>

      <PersonaNav />

      <section className="kpi-grid persona-kpis">
        <InsightCard label="Total Tickets" value={tickets.length} />
        <InsightCard label="Mark for Review" value={reviewCount} tone="warning" />
        <InsightCard label="Resolved" value={resolvedCount} tone="good" />
        <InsightCard label="Auto-Review Candidates" value={autoCandidateCount} tone="critical" />
      </section>

      <section className="main-grid">
        <div className="left-column">
          <article className="table-card">
            <div className="table-head">
              <h3>Incoming Alert Intake</h3>
              <span>Generate ticket with analytics</span>
            </div>

            <form className="ticket-form" onSubmit={submitAlert}>
              <label>
                Source
                <select value={form.source} onChange={(event) => setForm((state) => ({ ...state, source: event.target.value }))}>
                  <option value="Auvik">Auvik</option>
                  <option value="Meraki">Meraki</option>
                  <option value="N-Central">N-Central</option>
                </select>
              </label>

              <label>
                Customer
                <input value={form.customer} onChange={(event) => setForm((state) => ({ ...state, customer: event.target.value }))} required />
              </label>

              <label>
                Alert Title
                <input value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} required />
              </label>

              <label>
                Alert Type
                <input value={form.alertType} onChange={(event) => setForm((state) => ({ ...state, alertType: event.target.value }))} required />
              </label>

              <label>
                Signal Score
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.signalScore}
                  onChange={(event) => setForm((state) => ({ ...state, signalScore: Number(event.target.value) }))}
                />
              </label>

              <label className="ticket-form-wide">
                Alert Details
                <textarea
                  value={form.details}
                  onChange={(event) => setForm((state) => ({ ...state, details: event.target.value }))}
                  rows={4}
                  required
                />
              </label>

              <button type="submit">Create Ticket</button>
            </form>
          </article>

          <article className="table-card">
            <div className="table-head">
              <h3>Ticket Queue</h3>
              <span>Click a ticket for details</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className={selectedTicketId === ticket.id ? "ticket-selected" : ""}>
                      <td>{ticket.id}</td>
                      <td>{ticket.customer}</td>
                      <td>
                        <span className={`severity-pill tone-${severityBadgeTone(ticket.severity)}`}>{ticket.severity}</span>
                      </td>
                      <td>{ticket.status}</td>
                      <td>{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="right-column">
          {selectedTicket ? (
            <article className="table-card">
              <div className="table-head">
                <h3>Ticket Details & Similar Incident Analytics</h3>
                <span>{selectedTicket.id}</span>
              </div>

              <div className="ticket-details">
                <p><strong>Title:</strong> {selectedTicket.title}</p>
                <p><strong>Source:</strong> {selectedTicket.source}</p>
                <p><strong>Alert Type:</strong> {selectedTicket.alertType}</p>
                <p><strong>Severity Tag:</strong> {selectedTicket.severity}</p>
                <p><strong>Status:</strong> {selectedTicket.status}</p>
                <p><strong>Description:</strong> {selectedTicket.details}</p>
              </div>

              {selectedTicket.suggestedResolution ? (
                <div className="suggested-resolution">
                  <h4>Suggested Resolution from Similar Incident</h4>
                  <p>{selectedTicket.suggestedResolution}</p>
                </div>
              ) : null}

              <div className="similar-list">
                <h4>Similar Previous Incidents</h4>
                {selectedTicket.similarIncidents.map((item) => (
                  <article key={item.incidentId} className="similar-item">
                    <p>
                      <strong>{item.incidentId}</strong> match score {(item.score * 100).toFixed(0)}%
                    </p>
                    <p><strong>Root cause:</strong> {item.rootCause}</p>
                    <p><strong>Resolution:</strong> {item.resolutionSummary}</p>
                    <ul>
                      {item.runbookSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              {selectedTicket.requiresApproval ? (
                <button type="button" className="approve-button" onClick={() => approveResolution(selectedTicket.id)}>
                  Approve & Resolve
                </button>
              ) : null}
            </article>
          ) : null}

          <ChatAssistant
            contextSummary={`Ticketing context: total=${tickets.length}, review=${reviewCount}, resolved=${resolvedCount}. Assist team with triage and resolution guidance.`}
          />
        </div>
      </section>
    </main>
  );
}
