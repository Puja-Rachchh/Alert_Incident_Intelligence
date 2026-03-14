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
      content: "Ask me about incident spikes, critical risk, source behavior, or MTTR drivers."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <section className="chat-card">
      <header className="chat-header">
        <h3>AI Copilot</h3>
        <span>Context-aware analyst</span>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <p>{message.content}</p>
          </article>
        ))}
        {isLoading ? <p className="typing">Assistant is analyzing your telemetry...</p> : null}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for insights, anomalies, or recommended actions"
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
