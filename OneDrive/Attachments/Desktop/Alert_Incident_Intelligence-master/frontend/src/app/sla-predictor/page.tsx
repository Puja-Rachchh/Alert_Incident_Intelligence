import { ChatAssistant } from "@/components/chat/chat-assistant";
import { PersonaNav } from "@/components/persona-nav";
import { SlaDashboard } from "@/components/sla-dashboard";

export const metadata = {
  title: "SLA Predictor - Alert Incident Intelligence",
  description: "Predict SLA breach probabilities using historical incident data.",
};

export default function SlaPredictorPage() {
  const contextSummary = "SLA Predictor Context: User is viewing historical SLA performance metrics and predicted risk across different clients.";

  return (
    <main className="dashboard-root">
      <div className="background-grid" />
      <header className="hero">
        <p className="eyebrow">Risk Management</p>
        <h1>SLA Analytics Dashboard</h1>
        <p>
          Analyze historical machine learning insights and predict the structural probability of SLA breaches per client.
        </p>
      </header>

      <PersonaNav />

      <section className="main-grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) 420px', alignItems: 'start', marginTop: '1.5rem' }}>
        <div className="left-column">
          <SlaDashboard />
        </div>

        <div className="right-column" style={{ position: 'sticky', top: '24px', height: 'calc(100vh - 48px)' }}>
          <ChatAssistant contextSummary={contextSummary} />
        </div>
      </section>
    </main>
  );
}
