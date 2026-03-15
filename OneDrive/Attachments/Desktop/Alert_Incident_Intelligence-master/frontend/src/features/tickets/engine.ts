import { incidentKnowledgeBase } from "./knowledge-base";
import type { IncomingAlert, SimilarIncident, Ticket, TicketSeverity } from "./types";

const REVIEW_THRESHOLD = 0.72;

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));

  const intersection = [...setA].filter((item) => setB.has(item)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

function classifySeverity(alert: IncomingAlert): TicketSeverity {
  if (alert.signalScore >= 85 || /outage|down|critical|severe/i.test(alert.title + " " + alert.details)) {
    return "Critical";
  }

  if (alert.signalScore >= 70 || /degraded|packet loss|latency|failure/i.test(alert.title + " " + alert.details)) {
    return "High";
  }

  if (alert.signalScore >= 45) {
    return "Medium";
  }

  return "Low";
}

function rankSimilarIncidents(alert: IncomingAlert): SimilarIncident[] {
  const searchCorpus = `${alert.source} ${alert.customer} ${alert.title} ${alert.alertType} ${alert.details}`;

  return incidentKnowledgeBase
    .map((record) => {
      const corpus = `${record.source} ${record.customer} ${record.title} ${record.alertType} ${record.rootCause} ${record.tags.join(" ")}`;
      const rawScore = jaccardSimilarity(searchCorpus, corpus);

      const sourceBonus = record.source === alert.source ? 0.1 : 0;
      const typeBonus = record.alertType.toLowerCase() === alert.alertType.toLowerCase() ? 0.2 : 0;
      const score = Math.min(1, rawScore + sourceBonus + typeBonus);

      return {
        incidentId: record.id,
        score,
        rootCause: record.rootCause,
        resolutionSummary: record.resolutionSummary,
        runbookSteps: record.runbookSteps
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function createTicketFromAlert(alert: IncomingAlert): Ticket {
  const similarIncidents = rankSimilarIncidents(alert);
  const best = similarIncidents[0];
  const reviewCandidate = Boolean(best && best.score >= REVIEW_THRESHOLD);

  return {
    id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
    source: alert.source,
    customer: alert.customer,
    title: alert.title,
    alertType: alert.alertType,
    details: alert.details,
    severity: classifySeverity(alert),
    status: reviewCandidate ? "Mark for Review" : "Open",
    createdAt: new Date().toISOString(),
    similarIncidents,
    suggestedResolution: reviewCandidate ? best.resolutionSummary : undefined,
    autoResolvedCandidate: reviewCandidate,
    requiresApproval: reviewCandidate
  };
}

export function approveAndResolve(ticket: Ticket): Ticket {
  if (!ticket.requiresApproval) {
    return ticket;
  }

  return {
    ...ticket,
    status: "Resolved",
    requiresApproval: false
  };
}

export function severityBadgeTone(severity: TicketSeverity): "critical" | "warning" | "good" | "neutral" {
  if (severity === "Critical") {
    return "critical";
  }

  if (severity === "High") {
    return "warning";
  }

  if (severity === "Medium") {
    return "good";
  }

  return "neutral";
}
