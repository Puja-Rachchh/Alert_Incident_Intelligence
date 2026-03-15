import type { IncidentKnowledge } from "./types";

const now = Date.now();

function daysAgo(days: number): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const incidentKnowledgeBase: IncidentKnowledge[] = [
  {
    id: "KB-1001",
    source: "Auvik",
    customer: "Acme Retail",
    title: "Core switch loop detected",
    alertType: "SwitchLoop",
    rootCause: "Redundant uplink configured without STP guard on access layer",
    resolutionSummary: "Disabled rogue uplink, re-enabled STP guard, and validated topology.",
    runbookSteps: [
      "Isolate impacted switchport",
      "Disable duplicate trunk path",
      "Enable BPDU guard and verify convergence"
    ],
    status: "Resolved",
    tags: ["network-core", "switching", "loop"],
    createdAt: daysAgo(45)
  },
  {
    id: "KB-1002",
    source: "Meraki",
    customer: "Blue Hospital",
    title: "Branch WAN packet loss",
    alertType: "PacketLoss",
    rootCause: "ISP edge saturation during backup window",
    resolutionSummary: "Applied QoS shaping and moved backup jobs outside peak period.",
    runbookSteps: [
      "Validate WAN utilization trend",
      "Apply temporary traffic shaping",
      "Reschedule high-bandwidth jobs"
    ],
    status: "Resolved",
    tags: ["wan", "qos", "isp"],
    createdAt: daysAgo(31)
  },
  {
    id: "KB-1003",
    source: "N-Central",
    customer: "Delta Finance",
    title: "Agent heartbeat delayed",
    alertType: "HeartbeatDelay",
    rootCause: "Agent update stuck due to stale local cache",
    resolutionSummary: "Cleared cache, restarted service, and pinned stable agent version.",
    runbookSteps: [
      "Validate service status",
      "Clear local agent cache",
      "Restart agent and verify telemetry"
    ],
    status: "Resolved",
    tags: ["agent-health", "endpoint", "telemetry"],
    createdAt: daysAgo(27)
  },
  {
    id: "KB-1004",
    source: "Auvik",
    customer: "Blue Hospital",
    title: "Core BGP adjacency down",
    alertType: "BgpDown",
    rootCause: "Neighbor keepalive mismatch after router maintenance",
    resolutionSummary: "Aligned keepalive timers and refreshed neighbor sessions.",
    runbookSteps: [
      "Check BGP session state and timers",
      "Apply standard keepalive policy",
      "Clear session and confirm stability"
    ],
    status: "Resolved",
    tags: ["routing", "bgp", "network-core"],
    createdAt: daysAgo(18)
  },
  {
    id: "KB-1005",
    source: "Meraki",
    customer: "Acme Retail",
    title: "Authentication error burst",
    alertType: "AuthFailure",
    rootCause: "RADIUS failover sequence misconfigured",
    resolutionSummary: "Fixed failover order and tuned retry backoff.",
    runbookSteps: [
      "Review auth server health",
      "Correct failover priority",
      "Tune retry and timeout settings"
    ],
    status: "Resolved",
    tags: ["wireless", "auth", "identity"],
    createdAt: daysAgo(10)
  }
];
