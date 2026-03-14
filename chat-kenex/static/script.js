// ── DOM Elements ──────────────────────────────────────────────────
const chatMessages = document.getElementById("chat-messages");
const alertInput = document.getElementById("alert-input");
const btnSend = document.getElementById("btn-send");
const btnIngest = document.getElementById("btn-ingest");
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
    // Remove loading indicator
    const loader = chatMessages.querySelector(".message.loading");
    if (loader) loader.remove();

    const div = document.createElement("div");
    div.className = "message assistant";

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
            ${formatResponse(text)}
            ${sourcesHtml}
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
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
            <span style="font-size:12px;color:var(--text-muted);">Analysing alert — retrieving context...</span>
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

        addAssistantMessage(data.answer, data.sources || []);
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
