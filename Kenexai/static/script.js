// ============================================
//  KenexAI - Chat Frontend Logic
// ============================================

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const menuBtn = document.getElementById('menuBtn');
const welcomeContainer = document.getElementById('welcomeContainer');
const statusBadge = document.getElementById('statusBadge');
const sidebar = document.querySelector('.sidebar');

const API_URL = '';  // Same origin

// ---- Auto-resize textarea ----
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// ---- Send on Enter ----
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearChat);
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

// ---- Send message ----
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Hide welcome
    if (welcomeContainer) {
        welcomeContainer.style.display = 'none';
    }

    // Add user message
    addMessage(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingEl = showTyping();

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await res.json();
        removeTyping(typingEl);

        if (data.replies && data.replies.length > 0) {
            addMessage(data.replies[0], 'ai');
        } else {
            addMessage('⚠️ No response received.', 'ai');
        }

        setStatus('connected');
    } catch (err) {
        removeTyping(typingEl);
        addMessage('❌ Connection error. Make sure the server is running.', 'ai');
        setStatus('error');
    }

    sendBtn.disabled = false;
    chatInput.focus();
}

// ---- Suggestion chips ----
function sendSuggestion(text) {
    chatInput.value = text;
    sendMessage();
}

// ---- Add message bubble ----
function addMessage(text, role) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMessage(text);

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);
    chatMessages.appendChild(msgDiv);

    scrollToBottom();
}

// ---- Format message (markdown-like) ----
function formatMessage(text) {
    return text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Bullet points
        .replace(/^- (.+)/gm, '• $1');
}

// ---- Typing indicator ----
function showTyping() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai typing-msg';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';

    const content = document.createElement('div');
    content.className = 'message-content typing-indicator';
    content.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);
    chatMessages.appendChild(msgDiv);

    scrollToBottom();
    return msgDiv;
}

function removeTyping(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

// ---- Clear chat ----
function clearChat() {
    chatMessages.innerHTML = '';
    if (welcomeContainer) {
        chatMessages.appendChild(welcomeContainer);
        welcomeContainer.style.display = 'flex';
    }
}

// ---- Status badge ----
function setStatus(status) {
    if (status === 'connected') {
        statusBadge.className = 'status-badge';
        statusBadge.innerHTML = '<span class="status-dot"></span><span>Connected</span>';
    } else {
        statusBadge.className = 'status-badge error';
        statusBadge.innerHTML = '<span class="status-dot"></span><span>Disconnected</span>';
    }
}

// ---- Scroll to bottom ----
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ---- Health check on load ----
async function checkHealth() {
    try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
            setStatus('connected');
        } else {
            setStatus('error');
        }
    } catch {
        setStatus('error');
    }
}

checkHealth();
