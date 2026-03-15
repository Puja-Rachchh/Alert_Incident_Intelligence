interface ChatResponse {
  answer: string;
}

function localFallback(question: string, contextSummary: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("critical")) {
    return `Current critical-alert insight: ${contextSummary}. You can reduce alert fatigue by prioritizing unresolved incidents older than 2 hours.`;
  }

  if (lower.includes("source") || lower.includes("system")) {
    return `Source-level view from dashboard context: ${contextSummary}. If one source dominates, consider threshold tuning and connector health checks.`;
  }

  if (lower.includes("mttr") || lower.includes("resolve")) {
    return `MTTR-focused suggestion from current snapshot: ${contextSummary}. Review handoff points where incidents remain in investigating status for long durations.`;
  }

  return `I could not reach the backend assistant, so I am using dashboard context only: ${contextSummary}. Ask about critical alerts, source trends, or MTTR to get targeted guidance.`;
}

export async function askAssistant(question: string, contextSummary: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: question,
        contextSummary
      })
    });

    if (!response.ok) {
      return localFallback(question, contextSummary);
    }

    const payload = (await response.json()) as ChatResponse;
    return payload.answer || localFallback(question, contextSummary);
  } catch {
    return localFallback(question, contextSummary);
  }
}
