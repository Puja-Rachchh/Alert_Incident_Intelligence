// ── DOM Elements ──────────────────────────────────────────────────
const chatMessages = document.getElementById("chat-messages");
const alertInput = document.getElementById("alert-input");
const btnSend = document.getElementById("btn-send");
const btnIngest = document.getElementById("btn-ingest");
const btnExport = document.getElementById("btn-export");
const btnClear = document.getElementById("btn-clear");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const quickAlerts = document.querySelectorAll(".quick-alert");

// ── State ─────────────────────────────────────────────────────────
let isProcessing = false;

// ── Helpers ───────────────────────────────────────────────────────
function setStatus(state, text) {
    statusText.textContent = text;
    statusDot.className = "status-dot";
    if (state === "busy") statusDot.classList.add("busy");
    if (state === "error") statusDot.classList.add("error");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function scrollToBottom() {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

function removeWelcome() {
    const welcome = chatMessages.querySelector(".welcome-message");
    if (welcome) welcome.remove();
}

function saveChatHistory() {
    localStorage.setItem("sreCopilotChatHistory", chatMessages.innerHTML);
}

function loadChatHistory() {
    const history = localStorage.getItem("sreCopilotChatHistory");
    if (history) {
        chatMessages.innerHTML = history;
        scrollToBottom();
    }
}

// ── Format AI Response ────────────────────────────────────────────
function formatResponse(text) {
    // Replace section headers with styled HTML
    let html = text
        // Bold section emojis + titles
        .replace(/🔴\s*INCIDENT SUMMARY/g, '<h3>🔴 Incident Summary</h3>')
        .replace(/🔍\s*ROOT CAUSE ANALYSIS/g, '<h3>🔍 Root Cause Analysis</h3>')
        .replace(/🛠️\s*RESOLUTION STEPS/g, '<h3>🛠️ Resolution Steps</h3>')
        .replace(/⚠️\s*ESCALATION ADVICE/g, '<h3>⚠️ Escalation Advice</h3>')
        .replace(/📚\s*RELATED PAST INCIDENTS/g, '<h3>📚 Related Past Incidents</h3>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Line breaks
        .replace(/\n/g, '<br>');

    return html;
}

// ── Confidence Badge Builder ──────────────────────────────────────
function buildConfidenceBadge(confidence, contextCount, docTypes, services) {
    const labels = {
        high: { text: "High Confidence", icon: "🟢" },
        medium: { text: "Medium Confidence", icon: "🟡" },
        low: { text: "Low Confidence", icon: "🔴" },
    };
    const info = labels[confidence] || labels["low"];

    let metaHtml = `<span class="confidence-badge confidence-${confidence}">${info.icon} ${info.text}</span>`;
    metaHtml += `<span class="context-count">${contextCount} context doc${contextCount !== 1 ? 's' : ''} retrieved</span>`;

    if (services && services.length > 0) {
        const svcTags = services.map(s => `<span class="service-tag">${escapeHtml(s)}</span>`).join("");
        metaHtml += `<div class="meta-services">${svcTags}</div>`;
    }

    return `<div class="response-meta">${metaHtml}</div>`;
}

// ── Add Messages ──────────────────────────────────────────────────
function addUserMessage(text) {
    removeWelcome();
    const div = document.createElement("div");
    div.className = "message user";
    div.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-bubble">${escapeHtml(text)}</div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addAssistantMessage(text, sources = []) {
    saveChatHistory();
}

function addAssistantMessage(text, sources = [], confidence = null, contextCount = 0, docTypes = [], services = []) {
    // Remove loading indicator
    const loader = chatMessages.querySelector(".message.loading");
    if (loader) loader.remove();

    const div = document.createElement("div");
    div.className = "message assistant";

    // Build confidence/meta section
    let metaHtml = "";
    if (confidence) {
        metaHtml = buildConfidenceBadge(confidence, contextCount, docTypes, services);
    }

    // Build sources section
    let sourcesHtml = "";
    if (sources.length > 0) {
        const tags = sources.map(s => `<span class="source-tag">${escapeHtml(s)}</span>`).join("");
        sourcesHtml = `
            <div class="message-sources">
                <span class="source-label">Sources:</span>
                ${tags}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="message-avatar">🛡️</div>
        <div class="message-bubble">
            ${metaHtml}
            ${formatResponse(text)}
            ${sourcesHtml}
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    saveChatHistory();
}

function addLoadingMessage() {
    const div = document.createElement("div");
    div.className = "message assistant loading";
    div.innerHTML = `
        <div class="message-avatar">🛡️</div>
        <div class="message-bubble">
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
            <span style="font-size:12px;color:var(--text-muted);">Analysing alert — retrieving context from knowledge base...</span>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
}

// ── API Calls ─────────────────────────────────────────────────────
async function sendQuery(query) {
    if (isProcessing || !query.trim()) return;
    isProcessing = true;

    addUserMessage(query);
    addLoadingMessage();
    setStatus("busy", "Analysing...");
    btnSend.disabled = true;

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Server error");
        }

        addAssistantMessage(
            data.answer,
            data.sources || [],
            data.confidence || null,
            data.context_count || 0,
            data.doc_types || [],
            data.services || []
        );
        setStatus("ok", "Ready");
    } catch (err) {
        // Remove loader
        const loader = chatMessages.querySelector(".message.loading");
        if (loader) loader.remove();

        addAssistantMessage(`❌ Error: ${err.message}. Please try again.`);
        setStatus("error", "Error");
        showToast(err.message, "error");
    } finally {
        isProcessing = false;
        btnSend.disabled = false;
        alertInput.value = "";
        alertInput.focus();
    }
}

async function ingestDocuments() {
    if (isProcessing) return;
    isProcessing = true;
    setStatus("busy", "Ingesting...");
    btnIngest.classList.add("loading");
    showToast("Starting document ingestion...", "info");

    try {
        const res = await fetch("/api/ingest", { method: "POST" });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Ingest failed");

        showToast(data.message, "success");
        setStatus("ok", "Ready");
    } catch (err) {
        showToast(`Ingest error: ${err.message}`, "error");
        setStatus("error", "Error");
    } finally {
        isProcessing = false;
        btnIngest.classList.remove("loading");
    }
}

// ── Event Listeners ───────────────────────────────────────────────
btnSend.addEventListener("click", () => {
    sendQuery(alertInput.value);
});

alertInput.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        sendQuery(alertInput.value);
    }
});

btnIngest.addEventListener("click", ingestDocuments);

btnExport.addEventListener("click", () => {
    // Find the last assistant message
    const assistantMessages = document.querySelectorAll('.message.assistant .message-bubble');
    if (assistantMessages.length === 0) {
        showToast("No analysis to export yet.", "info");
        return;
    }

    const lastMessage = assistantMessages[assistantMessages.length - 1];
    
    // Extract raw text, format slightly for markdown
    let rawText = lastMessage.innerText;
    
    // Create a blob and download
    const blob = new Blob([rawText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-analysis-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Exported to Markdown", "success");
});

btnClear.addEventListener("click", () => {
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">🛡️</div>
            <h2>SRE AI Copilot</h2>
            <p>Paste an alert or describe an incident below. I'll analyse it using past incidents, runbooks, and resolution docs to provide actionable guidance.</p>
            <div class="welcome-features">
                <div class="feature"><span>🔴</span> Incident Summary</div>
                <div class="feature"><span>🔍</span> Root Cause Analysis</div>
                <div class="feature"><span>🛠️</span> Resolution Steps</div>
                <div class="feature"><span>⚠️</span> Escalation Advice</div>
            </div>
        </div>
    `;
    saveChatHistory();
    showToast("Chat cleared", "info");
});

quickAlerts.forEach((btn) => {
    btn.addEventListener("click", () => {
        const alert = btn.dataset.alert;
        alertInput.value = alert;
        alertInput.focus();
    });
});

// Auto-resize textarea
alertInput.addEventListener("input", () => {
    alertInput.style.height = "auto";
    alertInput.style.height = Math.min(alertInput.scrollHeight, 120) + "px";
});

// Load history on startup
window.addEventListener('DOMContentLoaded', loadChatHistory);
