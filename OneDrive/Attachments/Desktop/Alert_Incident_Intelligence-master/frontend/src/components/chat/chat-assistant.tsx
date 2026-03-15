"use client";

import { FormEvent, useState } from "react";
import { askAssistant } from "@/services/chat-service";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface ChatAssistantProps {
  contextSummary: string;
}

export function ChatAssistant({ contextSummary }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: "WELCOME_MESSAGE"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    if (event) {
      event.preventDefault();
    }
    const prompt = input.trim();
    if (!prompt || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: prompt
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsLoading(true);

    const answer = await askAssistant(prompt, contextSummary);

    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: answer
    };

    setMessages((previous) => [...previous, assistantMessage]);
    setIsLoading(false);
  }

  const quickAlerts = [
    { label: "🔴 CPU Spike", text: "ALERT: Server web-prod-01 CPU usage at 98% for the last 15 minutes. Response times degraded to 5s." },
    { label: "🟠 DB Replication Lag", text: "ALERT: Database replication lag on db-replica-03 exceeded 120 seconds. Analytics dashboard showing stale data." },
    { label: "🔴 502 Errors", text: "ALERT: HTTP 502 Bad Gateway errors at 60% on api-gateway for 5 minutes. Multiple services reporting failures." },
    { label: "🟡 Cache Miss", text: "ALERT: Redis cache hit ratio dropped to 35% on redis-cache-01. Application latency increased 3x." },
    { label: "🟡 Disk Full", text: "ALERT: Disk usage on log-server-01 at 92%. Risk of service outage if not addressed." },
    { label: "🔴 DNS Failure", text: "ALERT: DNS resolution failures across multiple services. 40% of internal queries failing on dns-resolver-01." },
    { label: "🔴 DB Pool Full", text: "ALERT: Database connection pool exhausted on db-primary-01. Active connections at 100/100. New queries queuing with 30s timeout." }
  ];

  return (
    <section className="chat-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden' }}>
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <h2>Incident Intelligence Console</h2>
        </div>
        <div className="header-badges">
            <span className="badge badge-ai">AI-Powered</span>
            <span className="badge badge-rag">RAG Pipeline</span>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((message) => {
          if (message.content === "WELCOME_MESSAGE") {
            return (
              <div key={message.id} className="welcome-message">
                  <div className="welcome-icon">🛡️</div>
                  <h2>SRE AI Copilot</h2>
                  <p>Paste an alert or describe an incident below. I'll analyse it using past incidents, runbooks, and resolution docs to provide actionable guidance.</p>
                  <div className="welcome-features">
                      <div className="feature"><span>🔴</span> Incident Summary</div>
                      <div className="feature"><span>🔍</span> Root Cause Analysis</div>
                      <div className="feature"><span>🛠️</span> Resolution Steps</div>
                      <div className="feature"><span>⚠️</span> Escalation Advice</div>
                  </div>
                  
                  <div style={{ marginTop: '32px', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Quick Alerts</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      {quickAlerts.map((alert, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setInput(alert.text)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--glass-bg)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'var(--glass-border)';
                          }}
                        >
                          {alert.label}
                        </button>
                      ))}
                    </div>
                  </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'assistant' ? '🛡️' : '👤'}
              </div>
              <div className="message-bubble" dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
            </div>
          );
        })}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🛡️</div>
            <div className="message-bubble">
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-area">
          <div className="input-wrapper">
              <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste an alert or describe an incident...&#10;Example: ALERT: Server web-prod-01 CPU at 98% for 15 minutes"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
              ></textarea>
              <button className="btn-send" onClick={() => handleSubmit()} disabled={isLoading || !input.trim()} title="Analyse alert">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/>
                  </svg>
              </button>
          </div>
          <p className="input-hint">Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send</p>
      </div>
    </section>
  );
}

// Helper to convert basic markdown/linebreaks to HTML for the bubble view
function formatMessageContent(content: string) {
  // Very basic markdown formatting to reflect backend structure
  let html = content.replace(/\n/g, '<br/>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/---/g, '<hr/>');
  html = html.replace(/(🔴|🔍|🛠️|⚠️|📚)(.*?)<br\/>/g, '<h3>$1 $2</h3>');
  return html;
}
