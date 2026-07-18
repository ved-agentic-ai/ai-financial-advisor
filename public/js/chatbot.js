// Chatbot overlay interaction and responses
let isChatOpen = false;
let unreadCount = 0;

function toggleChat() {
  const chatWindow = document.getElementById('chatWindow');
  const chatBadge = document.getElementById('chatBadge');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  isChatOpen = !isChatOpen;
  if (chatWindow) chatWindow.classList.toggle('active', isChatOpen);
  
  if (isChatOpen) {
    unreadCount = 0;
    if (chatBadge) chatBadge.style.display = 'none';
    if (chatInput) chatInput.focus();
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function handleChatSubmit() {
  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatInput.value = '';
  appendChatMessage(text, 'user');
  simulateBotResponse(text);
}

function appendChatMessage(text, sender) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `<p>${escapeHTML(text)}</p><span class="chat-msg-time">${now}</span>`;
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function simulateBotResponse(userText) {
  const chatMessages = document.getElementById('chatMessages');
  const chatBadge = document.getElementById('chatBadge');
  if (!chatMessages) return;

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typingIndicator';
  indicator.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  const botAnswer = generateBotAnswer(userText);
  
  setTimeout(() => {
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
    
    appendChatMessage(botAnswer, 'bot');
    
    if (window.wasLastQueryVoice) {
      speakText(botAnswer);
      window.wasLastQueryVoice = false;
    }
    
    if (!isChatOpen && chatBadge) {
      unreadCount++;
      chatBadge.textContent = unreadCount;
      chatBadge.style.display = 'block';
    }
  }, Math.max(600, Math.min(1800, botAnswer.length * 10)));
}

function generateBotAnswer(query) {
  const q = query.toLowerCase().trim();
  const total = window.videosData.length;
  const bullish = window.videosData.filter(v => v.sentiment === 'bullish').length;
  const bearish = window.videosData.filter(v => v.sentiment === 'bearish').length;
  const neutral = window.videosData.filter(v => v.sentiment === 'neutral').length;
  const totalViews = window.videosData.reduce((sum, v) => sum + (v.views || 0), 0);

  let targetChannel = '';
  const uniqueChannels = [...new Set(window.videosData.map(v => v.channelName))];
  for (const ch of uniqueChannels) {
    if (q.includes(ch.toLowerCase())) {
      targetChannel = ch;
      break;
    }
  }
  
  if (!targetChannel) {
    const match = q.match(/(?:from|by|of|links from|videos from)\s+([a-z0-9\s&]+?)(?:\s+channel)?$/i) ||
                  q.match(/(?:links from|videos from)\s+([a-z0-9\s&]+)/i);
    if (match) {
      const candidate = match[1].trim();
      if (candidate && candidate !== 'youtube' && candidate !== 'channel' && candidate !== 'video' && candidate !== 'videos') {
        const found = uniqueChannels.find(ch => ch.toLowerCase().includes(candidate) || candidate.includes(ch.toLowerCase()));
        targetChannel = found || candidate;
      }
    }
  }
  
  if (targetChannel) {
    const channelVideos = window.videosData.filter(v => 
      v.channelName.toLowerCase().includes(targetChannel.toLowerCase())
    );
    
    if (channelVideos.length > 0) {
      let resp = `Here are the video links from **${channelVideos[0].channelName}** in the last 24 hours:\n\n`;
      channelVideos.forEach((v, index) => {
        resp += `${index + 1}. [${v.title}](${v.url}) (${v.viewsFormatted}, uploaded ${v.ago})\n`;
      });
      return resp;
    } else if (q.includes('from') || q.includes('by') || q.includes('channel') || q.includes('links')) {
      return `I found a reference to the channel "${targetChannel}", but there are no videos from this creator in the current dashboard dataset (last 24 hours).\n\n💡 **Tip**: If you want to pull videos specifically from this channel, try typing "${targetChannel}" in the **Search Query** input in the filters panel and click **Apply**!`;
    }
  }

  if (q.includes('sentiment') || q.includes('outlook') || q.includes('view') && (q.includes('bull') || q.includes('bear'))) {
    if (total === 0) {
      return "There are no videos loaded in the dashboard right now. Please load some data first!";
    }
    const score = total > 0 ? Math.round((bullish / (bullish + bearish || 1)) * 100) : 50;
    let desc = "Neutral";
    if (score > 60) desc = "Bullish 📈";
    else if (score < 40) desc = "Bearish 📉";
    
    return `Based on the active dataset of ${total} videos from the last 24 hours, the Nifty Sentiment is **${desc}**.\n\n` + 
           `- **Bullish Outlooks**: ${bullish} videos (${Math.round((bullish/total)*100)}%)\n` +
           `- **Bearish Outlooks**: ${bearish} videos (${Math.round((bearish/total)*100)}%)\n` +
           `- **Neutral Outlooks**: ${neutral} videos (${Math.round((neutral/total)*100)}%)\n\n` +
           `The index score is **${score}% Bullish**.`;
  }
  
  if (q.includes('top') || q.includes('popular') || q.includes('views') || q.includes('best')) {
    if (total === 0) {
      return "No videos are available. Try refreshing the dashboard.";
    }
    const sorted = [...window.videosData].sort((a, b) => b.views - a.views).slice(0, 3);
    let resp = "Here are the top 3 Nifty analysis videos by views count:\n\n";
    sorted.forEach((v, index) => {
      resp += `${index + 1}. **${v.title}** by _${v.channelName}_ (${v.viewsFormatted})\n`;
    });
    return resp;
  }
  
  if (q.includes('active') || q.includes('channel') || q.includes('creator') || q.includes('analyst')) {
    if (total === 0) {
      return "No analysts found because no videos are loaded.";
    }
    const channelCounts = {};
    window.videosData.forEach(v => {
      channelCounts[v.channelName] = (channelCounts[v.channelName] || 0) + 1;
    });
    
    let maxChannel = "";
    let maxCount = 0;
    for (const [ch, count] of Object.entries(channelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxChannel = ch;
      }
    }
    
    return `The most active analyst on the dashboard is **${maxChannel}** with **${maxCount} video uploads** in the last 24 hours!`;
  }
  
  if (q.includes('rsi') || q.includes('relative strength')) {
    return "💡 **Relative Strength Index (RSI)** is a classic technical momentum indicator. It measures the speed and change of price movements on a scale of 0 to 100.\n\n" + 
           "- **Overbought (>70)**: Suggests the price has risen too fast and may be due for a downward correction or consolidation.\n" +
           "- **Oversold (<30)**: Suggests the price has dropped rapidly and might be due for a bullish trend reversal or technical bounce.\n\n" +
           "Nifty analysts often look for RSI divergence on 15-minute or daily charts to predict key reversals.";
  }
  
  if (q.includes('pcr') || q.includes('put call')) {
    return "💡 **Put-Call Ratio (PCR)** is a derivatives indicator computed by dividing the volume of open put options by call options.\n\n" +
           "- **PCR > 1**: More put options are traded than calls, indicating a bearish sentiment (investors are hedging or expecting a drop).\n" +
           "- **PCR < 1**: More calls are traded than puts, suggesting a bullish sentiment.\n" +
           "- **Contrarian Indicator**: In extreme market tops or bottoms, high PCR can flag oversold reversal points and vice versa.";
  }
  
  if (q.includes('nifty') && (q.includes('what') || q.includes('mean'))) {
    return "💼 The **Nifty 50** (National Stock Exchange Fifty) is the flagship index of the National Stock Exchange of India (NSE). " +
           "It tracks the performance of the 50 largest and most actively traded Indian companies across 13 sectors. " +
           "It acts as a primary barometer for the Indian economy and financial markets.";
  }
 
  if (q.includes('support') || q.includes('resistance') || q.includes('level') || q.includes('target')) {
    return "📈 **Support and Resistance Levels** are key price zones where trends frequently halt or reverse:\n\n" +
           "- **Support**: A price floor where buying interest is strong enough to overcome selling pressure. Often correlates with historical buying zones, key moving averages, or round psychological numbers.\n" +
           "- **Resistance**: A price ceiling where selling interest is strong enough to halt an upward trend. Traders look at resistance breakouts as buy signals.";
  }
  
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('help') || q.includes('start')) {
    return "👋 Hello! I am your Nifty Analysis assistant. I can answer questions about the current dashboard dashboard videos or technical analysis.\n\n" +
           "Try asking me things like:\n" +
           "- _'Overall sentiment'_ (Gets bullish/bearish summary statistics)\n" +
           "- _'List the top videos'_ (Shows the most popular videos)\n" +
           "- _'Who is the most active analyst?'_ (Identifies top uploaders)\n" +
           "- _'Explain RSI'_ or _'What is PCR?'_\n" +
           "- _'What is support and resistance?'_";
  }

  return "I'm not sure about that. I can summarize the current videos, list popular analysts, or explain market metrics like RSI, PCR, or Support levels. Try clicking one of the suggestion chips below!";
}
