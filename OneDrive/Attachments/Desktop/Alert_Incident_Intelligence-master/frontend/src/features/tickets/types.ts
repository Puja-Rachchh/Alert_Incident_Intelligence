export type TicketSeverity = "Critical" | "High" | "Medium" | "Low";

export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Mark for Review"
  | "Resolved";

export interface IncomingAlert {
  source: string;
  customer: string;
  title: string;
  alertType: string;
  details: string;
  signalScore: number;
}

export interface IncidentKnowledge {
  id: string;
  source: string;
  customer: string;
  title: string;
  alertType: string;
  rootCause: string;
  resolutionSummary: string;
  runbookSteps: string[];
  status: "Resolved" | "Closed";
  tags: string[];
  createdAt: string;
}

export interface SimilarIncident {
  incidentId: string;
  score: number;
  rootCause: string;
  resolutionSummary: string;
  runbookSteps: string[];
}

export interface Ticket {
  id: string;
  source: string;
  customer: string;
  title: string;
  alertType: string;
  details: string;
  severity: TicketSeverity;
  status: TicketStatus;
  createdAt: string;
  similarIncidents: SimilarIncident[];
  suggestedResolution?: string;
  autoResolvedCandidate: boolean;
  requiresApproval: boolean;
}
