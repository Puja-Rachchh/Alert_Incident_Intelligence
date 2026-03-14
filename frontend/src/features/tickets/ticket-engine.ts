/**
 * Auto-ticket engine
 * ─────────────────
 * Generates tickets automatically from PersonaIncident data (no manual submission).
 * - Every non-Resolved incident → Open or Investigating ticket
 * - Every Resolved incident → Resolved ticket (forms the history pool)
 * - Same (alertType + customer) resolved before → status "auto-review" with
 *   suggested playbook and prior-resolution list pre-filled
 * - High-frequency recurrences (3+) get an urgency flag
 */

import type { PersonaIncident } from "@/features/dashboard/persona-data";
import type { SourceSystem, Severity } from "@/features/dashboard/types";

// ─── Types ────────────────────────────────────────────────────────────────────
export type TicketStatus = "open" | "investigating" | "auto-review" | "approved" | "resolved";

export interface PriorResolution {
  ticketId: string;
  date: string;
  device: string;
  resolution: string;       // last playbook step as the resolution summary
  mttrMinutes: number;
}

export interface Ticket {
  id: string;
  alertId: string;
  severity: Severity;
  title: string;
  alertType: string;
  source: SourceSystem;
  customer: string;
  device: string;
  deviceIp?: string;
  description: string;
  createdAt: string;
  resolvedAt?: string;
  status: TicketStatus;
  playbook: string[];
  /** Past tickets with matching alertType + customer that were resolved */
  similarPrior: PriorResolution[];
  /** Set when status is auto-review */
  autoReviewReason?: string;
  /** Number of times this alertType+customer pair has fired historically */
  recurrenceCount: number;
  /** High-confidence = same pair resolved 3+ times (we can reliably auto-approve) */
  highConfidence: boolean;
  /** Alert deduplicated upstream by source system */
  duplicateSuppressed: boolean;
}

// ─── KPI summary ──────────────────────────────────────────────────────────────
export interface TicketKpis {
  total: number;
  open: number;
  investigating: number;
  autoReview: number;
  approved: number;
  resolved: number;
  criticalOpen: number;
  avgMttrMinutes: number;
  autoReviewRate: number;   // percentage of tickets that were auto-identified
}

// ─── Engine ───────────────────────────────────────────────────────────────────
export function generateTickets(incidents: PersonaIncident[]): Ticket[] {
  // Build a pool of resolved incidents indexed by (alertType + customer)
  const resolvedPool = new Map<string, PersonaIncident[]>();
  incidents
    .filter((i) => i.status === "Resolved")
    .forEach((i) => {
      const key = `${i.alertType}::${i.customer}`;
      const pool = resolvedPool.get(key) ?? [];
      pool.push(i);
      resolvedPool.set(key, pool);
    });

  // Count total occurrences per (alertType + customer) across ALL incidents
  const recurrenceMap = new Map<string, number>();
  incidents.forEach((i) => {
    const key = `${i.alertType}::${i.customer}`;
    recurrenceMap.set(key, (recurrenceMap.get(key) ?? 0) + 1);
  });

  return incidents.map((i): Ticket => {
    const key = `${i.alertType}::${i.customer}`;
    const priorResolved = resolvedPool.get(key) ?? [];
    // Exclude the incident itself if it is resolved
    const similarPrior: PriorResolution[] = priorResolved
      .filter((p) => p.id !== i.id)
      .slice(0, 3)
      .map((p) => ({
        ticketId: p.id,
        date: p.createdAt,
        device: p.device,
        resolution: p.playbook[p.playbook.length - 1] ?? "Resolved per standard runbook",
        mttrMinutes: p.mttrMinutes
      }));

    const recurrenceCount = recurrenceMap.get(key) ?? 1;
    const highConfidence = similarPrior.length >= 2;

    // Derive ticket status from incident status + similarity
    let status: TicketStatus;
    let autoReviewReason: string | undefined;

    if (i.status === "Resolved") {
      status = "resolved";
    } else if (similarPrior.length > 0) {
      status = "auto-review";
      autoReviewReason =
        `Matched ${similarPrior.length} previous resolution(s) for "${i.title}" at ${i.customer}.` +
        (highConfidence ? " High confidence – one-click approval enabled." : "");
    } else if (i.status === "Investigating") {
      status = "investigating";
    } else {
      status = "open";
    }

    return {
      id: i.id,
      alertId: i.id,
      severity: i.severity,
      title: i.title,
      alertType: i.alertType,
      source: i.source,
      customer: i.customer,
      device: i.device,
      deviceIp: i.deviceIp,
      description: i.description,
      createdAt: i.createdAt,
      resolvedAt: i.clearedAt,
      status,
      playbook: i.playbook,
      similarPrior,
      autoReviewReason,
      recurrenceCount,
      highConfidence,
      duplicateSuppressed: i.duplicateSuppressed
    };
  });
}

export function computeKpis(tickets: Ticket[]): TicketKpis {
  const open = tickets.filter((t) => t.status === "open").length;
  const investigating = tickets.filter((t) => t.status === "investigating").length;
  const autoReview = tickets.filter((t) => t.status === "auto-review").length;
  const approved = tickets.filter((t) => t.status === "approved").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const criticalOpen = tickets.filter(
    (t) => t.severity === "Critical" && t.status !== "resolved"
  ).length;

  const resolvedWithMttr = tickets.filter((t) => t.status === "resolved" && t.resolvedAt);
  const avgMttrMinutes =
    resolvedWithMttr.length === 0
      ? 0
      : Math.round(
          resolvedWithMttr.reduce((s, t) => {
            const start = new Date(t.createdAt).getTime();
            const end = new Date(t.resolvedAt!).getTime();
            return s + (end - start) / 60000;
          }, 0) / resolvedWithMttr.length
        );

  const active = open + investigating + autoReview + approved;
  const autoReviewRate = active === 0 ? 0 : Math.round((autoReview / (active + resolved)) * 100);

  return {
    total: tickets.length,
    open,
    investigating,
    autoReview,
    approved,
    resolved,
    criticalOpen,
    avgMttrMinutes,
    autoReviewRate
  };
}

/** Group tickets by alertType for recurrence analytics */
export function ticketsByAlertType(tickets: Ticket[]): Array<{ alertType: string; count: number; resolved: number }> {
  const map = new Map<string, { count: number; resolved: number }>();
  tickets.forEach((t) => {
    const existing = map.get(t.alertType) ?? { count: 0, resolved: 0 };
    existing.count += 1;
    if (t.status === "resolved") existing.resolved += 1;
    map.set(t.alertType, existing);
  });
  return [...map.entries()]
    .map(([alertType, v]) => ({ alertType, ...v }))
    .sort((a, b) => b.count - a.count);
}

/** Severity distribution of active (non-resolved) tickets */
export function activeTicketsBySeverity(tickets: Ticket[]): Array<{ severity: Severity; count: number }> {
  const dist: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  tickets.filter((t) => t.status !== "resolved").forEach((t) => { dist[t.severity] += 1; });
  return (["Critical", "High", "Medium", "Low"] as Severity[]).map((severity) => ({
    severity,
    count: dist[severity]
  }));
}
