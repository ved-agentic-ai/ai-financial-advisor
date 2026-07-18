// Voice recognition and TTS logic for assistant and chat
let lastVoiceTicker = '';
let isVoiceListening = false;
let voiceRecognition = null;
let wasLastQueryVoice = false;
let recognition = null;
let isListening = false;

function toggleVoice() {
  const voiceWindow = document.getElementById('voiceWindow');
  if (!voiceWindow) return;
  const isVoiceOpen = voiceWindow.classList.contains('active');
  voiceWindow.classList.toggle('active', !isVoiceOpen);
}

function initVoiceAssistantUnlock() {
  const unlockBtn = document.getElementById('voiceUnlockBtn');
  const passkeyInput = document.getElementById('voicePasskeyInput');
  const unlockPanel = document.getElementById('voiceUnlockPanel');
  const iframeHolder = document.getElementById('voiceIframeHolder');

  if (!unlockBtn || !passkeyInput || !unlockPanel || !iframeHolder) return;

  const loadIframe = () => {
    iframeHolder.innerHTML = `<iframe src="https://app.millis.ai/agents/embedded?id=-OxQWS7itWrs3dFFAZE9&k=16RkibRDzFmLMXJpA4tuBhpdkWlkyUeF" width="100%" height="100%" allow="microphone" style="border: none;"></iframe>`;
    unlockPanel.style.display = 'none';
    iframeHolder.style.display = 'block';
    
    const voiceHeader = document.querySelector('.voice-header');
    if (voiceHeader && !document.getElementById('voiceLockBtn')) {
      const lockBtn = document.createElement('button');
      lockBtn.id = 'voiceLockBtn';
      lockBtn.title = 'Lock Voice Assistant';
      lockBtn.style.background = 'none';
      lockBtn.style.border = 'none';
      lockBtn.style.color = 'var(--text-secondary)';
      lockBtn.style.cursor = 'pointer';
      lockBtn.style.marginRight = '0.5rem';
      lockBtn.style.display = 'flex';
      lockBtn.style.alignItems = 'center';
      lockBtn.innerHTML = `<i data-lucide="lock" style="width: 14px; height: 14px;"></i>`;
      
      const closeBtn = document.getElementById('voiceCloseBtn');
      if (closeBtn) {
        voiceHeader.insertBefore(lockBtn, closeBtn);
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          localStorage.removeItem('voice_assistant_unlocked');
          iframeHolder.innerHTML = '';
          iframeHolder.style.display = 'none';
          unlockPanel.style.display = 'flex';
          lockBtn.remove();
          showToast('Voice Assistant locked.', 'info');
        });
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
          lucide.createIcons();
        }
      }
    }
  };

  if (localStorage.getItem('voice_assistant_unlocked') === 'true') {
    loadIframe();
  }

  unlockBtn.addEventListener('click', () => {
    const enteredVal = passkeyInput.value.trim();
    if (enteredVal === 'Welcome@123') {
      localStorage.setItem('voice_assistant_unlocked', 'true');
      loadIframe();
      showToast('Voice Assistant unlocked successfully!', 'success');
    } else {
      showToast('Incorrect passkey. Please try again.', 'error');
    }
  });

  passkeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      unlockBtn.click();
    }
  });
}

function appendVoiceMessage(text, sender) {
  const log = document.getElementById('voiceChatLog');
  if (!log) return;

  const bubble = document.createElement('div');
  if (sender === 'user') {
    bubble.className = 'voice-bubble user';
    bubble.style.background = 'rgba(59, 130, 246, 0.1)';
    bubble.style.border = '1px solid rgba(59, 130, 246, 0.2)';
    bubble.style.padding = '0.75rem';
    bubble.style.borderRadius = '12px 12px 0px 12px';
    bubble.style.fontSize = '0.8rem';
    bubble.style.lineHeight = '1.4';
    bubble.style.color = 'var(--text-primary)';
    bubble.style.maxWidth = '90%';
    bubble.style.alignSelf = 'flex-end';
    bubble.style.textAlign = 'right';
  } else if (sender === 'system') {
    bubble.className = 'voice-bubble system';
    bubble.style.padding = '0.4rem';
    bubble.style.fontSize = '0.72rem';
    bubble.style.color = 'var(--text-secondary)';
    bubble.style.opacity = '0.8';
    bubble.style.alignSelf = 'center';
    bubble.style.fontStyle = 'italic';
  } else {
    bubble.className = 'voice-bubble assistant';
    bubble.style.background = 'rgba(255,255,255,0.03)';
    bubble.style.border = '1px solid var(--border-color)';
    bubble.style.padding = '0.75rem';
    bubble.style.borderRadius = '12px 12px 12px 0px';
    bubble.style.fontSize = '0.8rem';
    bubble.style.lineHeight = '1.4';
    bubble.style.color = 'var(--text-secondary)';
    bubble.style.maxWidth = '90%';
    bubble.style.alignSelf = 'flex-start';
    bubble.style.textAlign = 'left';
  }

  bubble.innerHTML = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

async function handleVoiceQuerySubmit(queryText) {
  const activeMarket = document.querySelector('.market-btn.active')?.dataset.market || 'indian';
  try {
    const response = await fetch('/api/voice-assistant/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: queryText,
        market: activeMarket,
        lastTicker: lastVoiceTicker
      })
    });

    const data = await response.json();
    if (data.ticker) {
      lastVoiceTicker = data.ticker;
    }

    let responseHtml = data.speech;
    
    if (data.insights) {
      const isPositive = data.insights.changePercent >= 0;
      const changeSym = isPositive ? '+' : '';
      const changeStyle = isPositive ? 'color: #34d399;' : 'color: #f87171;';
      
      responseHtml += `
        <div style="margin-top: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.6rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.4rem; margin-bottom: 0.4rem;">
            <div>
              <strong style="color: var(--text-primary); font-size: 0.8rem; display: block;">${data.insights.name}</strong>
              <span style="font-size: 0.7rem; color: var(--text-secondary);">${data.insights.ticker}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block;">${data.insights.price ? data.insights.price.toFixed(2) : 'N/A'} ${data.insights.currency}</span>
              <span style="font-size: 0.7rem; font-weight: 600; ${changeStyle}">${changeSym}${data.insights.changePercent ? data.insights.changePercent.toFixed(2) : '0.00'}%</span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.68rem; color: var(--text-secondary);">
            <div><strong>Sector:</strong> ${data.insights.sector}</div>
            <div><strong>Range:</strong> ${data.insights.fiftyTwoWeekLow ? data.insights.fiftyTwoWeekLow.toFixed(1) : 'N/A'} - ${data.insights.fiftyTwoWeekHigh ? data.insights.fiftyTwoWeekHigh.toFixed(1) : 'N/A'}</div>
          </div>
        </div>
      `;
    }

    if (data.competitors && data.competitors.length > 0) {
      let tableRows = '';
      data.competitors.forEach(p => {
        const isPositive = p.changePercent >= 0;
        const changeSym = isPositive ? '+' : '';
        const changeStyle = isPositive ? 'color: #34d399;' : 'color: #f87171;';
        tableRows += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 0.3rem 0; font-weight: 500; color: var(--text-primary);">${p.name}</td>
            <td style="padding: 0.3rem 0; text-align: right; font-family: monospace;">${p.price ? p.price.toFixed(2) : 'N/A'} ${p.currency}</td>
            <td style="padding: 0.3rem 0; text-align: right; font-family: monospace; ${changeStyle}">${changeSym}${p.changePercent ? p.changePercent.toFixed(2) : '0.00'}%</td>
          </tr>
        `;
      });

      responseHtml += `
        <div style="margin-top: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.6rem; text-align: left;">
          <strong style="color: var(--text-primary); font-size: 0.75rem; display: block; margin-bottom: 0.4rem; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.3rem;">Competitors Comparison</strong>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.68rem; color: var(--text-secondary);">
            <thead>
              <tr style="color: var(--text-secondary); opacity: 0.7; font-weight: 600;">
                <th style="text-align: left; padding-bottom: 0.2rem;">Company</th>
                <th style="text-align: right; padding-bottom: 0.2rem;">Price</th>
                <th style="text-align: right; padding-bottom: 0.2rem;">Change</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    }

    if (data.events) {
      responseHtml += `
        <div style="margin-top: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.6rem; text-align: left; font-size: 0.68rem; color: var(--text-secondary);">
          <strong style="color: var(--text-primary); font-size: 0.75rem; display: block; margin-bottom: 0.4rem; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.3rem;">Upcoming Corporate Events</strong>
          <div style="margin-bottom: 0.3rem;"><strong>Next Event:</strong> ${data.events.nextReport}</div>
          <div style="margin-bottom: 0.3rem;"><strong>Est. Date:</strong> ${data.events.estimatedDate}</div>
          <div style="line-height: 1.3;"><strong>Dividends:</strong> ${data.events.dividendInfo}</div>
        </div>
      `;
    }

    appendVoiceMessage(responseHtml, 'assistant');

    const voiceMuteCheckbox = document.getElementById('voiceMuteCheckbox');
    const isMuted = voiceMuteCheckbox ? voiceMuteCheckbox.checked : false;
    if (!isMuted) {
      speakVoiceAssistantText(data.speech);
    }

  } catch (err) {
    console.error('Error handling voice query:', err);
    appendVoiceMessage('System: Failed to fetch insights. Please check connection.', 'system');
  }
}

function speakVoiceAssistantText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    let cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ');
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
}

// Setup Speech Recognition
const chatMicBtn = document.getElementById('chatMicBtn');
const chatInput = document.getElementById('chatInput');

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    if (chatMicBtn) chatMicBtn.classList.add('listening');
    if (chatInput) chatInput.placeholder = 'Listening... Speak now';
  };

  recognition.onend = () => {
    isListening = false;
    if (chatMicBtn) chatMicBtn.classList.remove('listening');
    if (chatInput) chatInput.placeholder = 'Ask a question...';
  };

  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    if (e.error !== 'no-speech') {
      showToast('Speech error: ' + e.error, 'error');
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (chatInput) chatInput.value = transcript;
    wasLastQueryVoice = true;
    if (typeof handleChatSubmit === 'function') {
      handleChatSubmit();
    }
  };
} else {
  if (chatMicBtn) {
    chatMicBtn.style.display = 'none';
  }
}

function toggleListening() {
  if (!recognition) {
    showToast('Speech recognition not supported in this browser.', 'error');
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    recognition.start();
  }
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    let cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ');
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en'));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
}
