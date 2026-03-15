import Link from "next/link";
import { ChatAssistant } from "@/components/chat/chat-assistant";
import { PersonaNav } from "@/components/persona-nav";

const personaCards = [
  {
    href: "/operations",
    title: "Operations Engineer",
    description: "Live alert feed, correlated incidents, customer severity pressure, and MTTR movement.",
    metrics: ["Live triage", "Dedup savings", "Correlation clusters"]
  },
  {
    href: "/executive",
    title: "Executive / Account Manager",
    description: "Customer health view, SLA breach risk posture, recurring issue patterns, and weekly alert volume.",
    metrics: ["Health score", "SLA risk", "Recurring alerts"]
  },
  {
    href: "/data-quality",
    title: "Data Quality / Admin",
    description: "Completeness tracking, schema validation status, source health, and alert distribution checks.",
    metrics: ["Data completeness", "Validation pass/fail", "Distribution plots"]
  },
  {
    href: "/tickets",
    title: "Ticketing System",
    description: "Severity-tagged tickets with similar-incident analytics and auto Mark for Review suggestions.",
    metrics: ["Auto severity tags", "Similarity analysis", "Approve to resolve"]
  }
];

export default function Home() {
  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Alert Incident Intelligence</p>
        <h1>Persona Dashboards</h1>
        <p>Choose a role to open the right dashboard instantly, or ask the AI copilot from this landing page.</p>
      </header>

      <PersonaNav />

      <section className="landing-grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) 400px', alignItems: 'start' }}>
        <div className="landing-cards">
          {personaCards.map((card) => (
            <Link key={card.href} href={card.href} className="landing-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <ul>
                {card.metrics.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <span className="landing-card-cta">Open dashboard</span>
            </Link>
          ))}
        </div>

        <div className="landing-chat" style={{ height: '600px' }}>
          <ChatAssistant contextSummary="Landing context: user is selecting persona dashboards and needs guidance on ops, executive, and data quality insights." />
        </div>
      </section>
    </main>
  );
}
