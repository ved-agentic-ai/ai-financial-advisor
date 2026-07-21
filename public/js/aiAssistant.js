/**
 * Antigravity AI Assistant & LLM Key Engine
 * Supports Personal API Key (Gemini/OpenAI) with real-time Token/RPM metrics
 * and App-Provided Key with 3-request/session quota.
 */

let aiState = {
  mode: 'PERSONAL_KEY', // 'PERSONAL_KEY' or 'APP_KEY'
  personalApiKey: localStorage.getItem('user_personal_llm_key') || '',
  appKeyQuotaRemaining: parseInt(sessionStorage.getItem('app_key_quota') || '3', 10),
  activeContext: 'General Advisor',
  totalTokensUsed: parseInt(localStorage.getItem('ai_total_tokens') || '0', 10),
  requestsThisMin: 0,
  rpmResetTimer: null
};

function initAIAssistant() {
  bindAIControls();
  updateAIMetricsUI();
}

function bindAIControls() {
  const modePersonal = document.getElementById('aiModePersonal');
  const modeApp = document.getElementById('aiModeApp');
  const apiKeyInput = document.getElementById('aiPersonalKeyInput');
  const saveKeyBtn = document.getElementById('aiSavePersonalKeyBtn');

  if (modePersonal && modeApp) {
    modePersonal.addEventListener('change', () => setAIMode('PERSONAL_KEY'));
    modeApp.addEventListener('change', () => setAIMode('APP_KEY'));
  }

  if (saveKeyBtn && apiKeyInput) {
    saveKeyBtn.addEventListener('click', () => {
      const keyVal = apiKeyInput.value.trim();
      if (!keyVal) {
        showToast('Please enter a valid API Key.', 'warning');
        return;
      }
      aiState.personalApiKey = keyVal;
      localStorage.setItem('user_personal_llm_key', keyVal);
      showToast('Personal API Key saved successfully!', 'success');
      updateAIMetricsUI();
    });
  }

  // Bind Section Context Triggers ("💡 Ask AI")
  document.querySelectorAll('.ask-ai-section-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = e.currentTarget.getAttribute('data-section') || 'General';
      openAIChatWithContext(section);
    });
  });

  // Bind Gemini Key Guide Modal
  const guideBtn = document.getElementById('aiGeminiGuideBtn');
  const guideModal = document.getElementById('geminiKeyGuideModal');
  const guideClose = document.getElementById('geminiGuideClose');

  if (guideBtn && guideModal) {
    guideBtn.addEventListener('click', () => guideModal.classList.add('active'));
  }
  if (guideClose && guideModal) {
    guideClose.addEventListener('click', () => guideModal.classList.remove('active'));
  }

  // Bind Main Chat Inputs
  const sendBtn = document.getElementById('aiSendBtn');
  const chatInput = document.getElementById('aiChatInput');

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', handleUserSendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserSendMessage();
      }
    });
  }
}

function setAIMode(mode) {
  aiState.mode = mode;
  updateAIMetricsUI();
}

function updateAIMetricsUI() {
  const personalPanel = document.getElementById('aiPersonalKeyPanel');
  const appPanel = document.getElementById('aiAppKeyPanel');
  const keyInput = document.getElementById('aiPersonalKeyInput');
  
  if (keyInput && aiState.personalApiKey) {
    keyInput.value = aiState.personalApiKey;
  }

  if (aiState.mode === 'PERSONAL_KEY') {
    if (personalPanel) personalPanel.style.display = 'block';
    if (appPanel) appPanel.style.display = 'none';
  } else {
    if (personalPanel) personalPanel.style.display = 'none';
    if (appPanel) appPanel.style.display = 'block';
  }

  // Update Metrics Badges
  const tokenBadge = document.getElementById('aiTokensUsedBadge');
  const rpmBadge = document.getElementById('aiRpmBadge');
  const quotaBadge = document.getElementById('aiAppQuotaBadge');

  if (tokenBadge) tokenBadge.textContent = `${aiState.totalTokensUsed.toLocaleString()} Tokens`;
  if (rpmBadge) rpmBadge.textContent = `${aiState.requestsThisMin} RPM`;
  if (quotaBadge) quotaBadge.textContent = `${aiState.appKeyQuotaRemaining} / 3 Left`;
}

function openAIChatWithContext(sectionName) {
  aiState.activeContext = sectionName;
  
  // Update Context Badge in AI Drawer / Section
  const contextBadge = document.getElementById('aiActiveContextBadge');
  if (contextBadge) {
    contextBadge.textContent = `Context: ${sectionName}`;
  }

  // Switch to AI Master Tab or Open Floating Widget
  const masterTabAI = document.getElementById('masterTabAI');
  const masterPanelAI = document.getElementById('masterPanelAI');

  if (masterTabAI && masterPanelAI) {
    masterTabAI.click();
    masterPanelAI.scrollIntoView({ behavior: 'smooth' });
  }

  showToast(`AI Assistant loaded with [Context: ${sectionName}]`, 'info');
}

async function handleUserSendMessage() {
  const inputEl = document.getElementById('aiChatInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  if (!inputEl || !messagesContainer) return;

  const promptText = inputEl.value.trim();
  if (!promptText) return;

  // Enforce Mode Checks
  if (aiState.mode === 'PERSONAL_KEY' && !aiState.personalApiKey) {
    showToast('Please enter and save your Gemini/OpenAI API Key first.', 'warning');
    return;
  }

  if (aiState.mode === 'APP_KEY' && aiState.appKeyQuotaRemaining <= 0) {
    showToast('⚠️ App-Provided Key session quota exhausted (0/3 remaining). Switch to Personal Key option to continue unlimited.', 'error');
    return;
  }

  // Append User Message to UI
  appendChatMessage('user', promptText);
  inputEl.value = '';

  // Show Typing Indicator
  const typingId = appendChatMessage('ai', 'Thinking and analyzing section context...');

  // Track RPM
  aiState.requestsThisMin++;
  if (!aiState.rpmResetTimer) {
    aiState.rpmResetTimer = setTimeout(() => {
      aiState.requestsThisMin = 0;
      aiState.rpmResetTimer = null;
      updateAIMetricsUI();
    }, 60000);
  }
  updateAIMetricsUI();

  try {
    const payload = {
      prompt: promptText,
      sectionContext: aiState.activeContext,
      userKey: aiState.mode === 'PERSONAL_KEY' ? aiState.personalApiKey : '',
      mode: aiState.mode
    };

    const res = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (res.ok && data.text) {
      appendChatMessage('ai', data.text);

      // Deduct App Quota if APP_KEY mode
      if (aiState.mode === 'APP_KEY') {
        aiState.appKeyQuotaRemaining = Math.max(0, aiState.appKeyQuotaRemaining - 1);
        sessionStorage.setItem('app_key_quota', aiState.appKeyQuotaRemaining.toString());
      }

      // Update Token Usage
      if (data.usageMetadata && data.usageMetadata.totalTokenCount) {
        aiState.totalTokensUsed += data.usageMetadata.totalTokenCount;
        localStorage.setItem('ai_total_tokens', aiState.totalTokensUsed.toString());
      }

      updateAIMetricsUI();
    } else {
      appendChatMessage('ai', `⚠️ Error: ${data.error || 'Could not fetch response from AI provider.'}`);
    }
  } catch (err) {
    console.error('AI Request Error:', err);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    appendChatMessage('ai', '⚠️ Failed to connect to AI server proxy. Please try again.');
  }
}

function appendChatMessage(sender, text) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const isUser = sender === 'user';

  const msgDiv = document.createElement('div');
  msgDiv.id = msgId;
  msgDiv.style.cssText = `
    display: flex;
    gap: 0.65rem;
    margin-bottom: 0.85rem;
    align-items: flex-start;
    ${isUser ? 'flex-direction: row-reverse;' : ''}
  `;

  const avatarHtml = isUser ? `
    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #fff;">
      YOU
    </div>
  ` : `
    <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); display: flex; align-items: center; justify-content: center; color: #34d399;">
      <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
    </div>
  `;

  const textHtml = `
    <div style="max-width: 80%; background: ${isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.6)'}; border: 1px solid ${isUser ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}; padding: 0.75rem 0.9rem; border-radius: 12px; font-size: 0.82rem; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap;">
      ${text}
    </div>
  `;

  msgDiv.innerHTML = isUser ? avatarHtml + textHtml : avatarHtml + textHtml;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;

  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

  return msgId;
}

// Expose globally
window.initAIAssistant = initAIAssistant;
window.openAIChatWithContext = openAIChatWithContext;
