// State management
let videosData = [];
let timelineChartInstance = null;
let currentTradeTab = 'digital';
let growthChartInstance = null;
let sharkGrowthChartInstance = null;

// Shark Leverage Trade Simulator global state
let currentSharkMarginMode = 'isolated'; 
let currentSharkLeverage = 25;
let currentSharkAsset = 'crypto_eth'; 
let currentSharkDirection = 'long';
let currentSharkTPSLMode = 'price'; // price | pct
let currentSurvivalWinMode = 'slider'; // slider | ratio

const defaultAssetPrices = {
  INR: {
    crypto_eth: { entry: 170000, balance: 100000, margin: 25000, tp: 185000, sl: 165000 },
    crypto_btc: { entry: 5200000, balance: 10000000, margin: 2500000, tp: 5600000, sl: 5000000 },
    commodity_gold: { entry: 60000, balance: 100000, margin: 25000, tp: 65000, sl: 58000 }
  },
  USD: {
    crypto_eth: { entry: 2000, balance: 10000, margin: 2500, tp: 2176, sl: 1942 },
    crypto_btc: { entry: 60000, balance: 100000, margin: 25000, tp: 65280, sl: 58260 },
    commodity_gold: { entry: 2000, balance: 10000, margin: 2500, tp: 2176, sl: 1942 }
  },
  SEK: {
    crypto_eth: { entry: 21000, balance: 100000, margin: 25000, tp: 22850, sl: 20390 },
    crypto_btc: { entry: 630000, balance: 1000000, margin: 250000, tp: 685440, sl: 611730 },
    commodity_gold: { entry: 21000, balance: 100000, margin: 25000, tp: 22850, sl: 20390 }
  }
};

function getCurrencySymbol() {
  const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';
  if (currency === 'USD') return '$';
  if (currency === 'SEK') return 'kr';
  return '₹';
}

function formatLargeCurrency(val) {
  const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';
  const symbol = getCurrencySymbol();
  
  if (currency === 'INR') {
    if (val >= 10000000) {
      return symbol + (val / 10000000).toFixed(2) + ' Cr';
    }
    if (val >= 100000) {
      return symbol + (val / 100000).toFixed(2) + ' L';
    }
    return symbol + Math.round(val).toLocaleString('en-IN');
  } else {
    if (val >= 1000000000) {
      return symbol + (val / 1000000000).toFixed(2) + ' B';
    }
    if (val >= 1000000) {
      return symbol + (val / 1000000).toFixed(2) + ' M';
    }
    if (val >= 1000) {
      return symbol + (val / 1000).toFixed(1) + ' K';
    }
    return symbol + Math.round(val).toLocaleString('en-US');
  }
}

function formatPreciseCurrency(val) {
  const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';
  const symbol = getCurrencySymbol();
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  // Format based on currency type
  if (currency === 'SEK') {
    return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
  }
  return symbol + val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function applyCurrencyAndAssetDefaults() {
  const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';
  const asset = document.getElementById('sharkAssetSelect')?.value || 'crypto_eth';
  
  const defaults = defaultAssetPrices[currency]?.[asset];
  if (!defaults) return;
  
  const entryPrice = document.getElementById('sharkEntryPrice');
  const tpPrice = document.getElementById('sharkTargetProfitPrice');
  const slPrice = document.getElementById('sharkStopLossPrice');
  const balanceInput = document.getElementById('sharkAvailableBalance');
  const marginInput = document.getElementById('sharkMarginAmount');
  
  if (entryPrice) entryPrice.value = defaults.entry;
  if (balanceInput) balanceInput.value = defaults.balance;
  if (marginInput) marginInput.value = defaults.margin;
  
  if (currentSharkTPSLMode === 'price') {
    if (tpPrice) tpPrice.value = defaults.tp;
    if (slPrice) slPrice.value = defaults.sl;
  } else {
    if (tpPrice) tpPrice.value = 8.8;
    if (slPrice) slPrice.value = 2.9;
  }
}

// DOM Elements
const searchQueryInput = document.getElementById('searchQuery');
const channelFilterInput = document.getElementById('channelFilter');
const timeLimitSelect = document.getElementById('timeLimit');
const sortBySelect = document.getElementById('sortBy');
const videoTypeSelect = document.getElementById('videoType');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const videoGrid = document.getElementById('videoGrid');
const videoHeader = document.getElementById('videoHeader');
const videoGridContainer = document.getElementById('videoGridContainer');
const videoCollapseIcon = document.getElementById('videoCollapseIcon');
const tickerTrackNifty = document.getElementById('tickerTrackNifty');
const tickerTrackOmx = document.getElementById('tickerTrackOmx');

// Stats DOM Elements
const statTotalVideos = document.getElementById('statTotalVideos');
const statBullishCount = document.getElementById('statBullishCount');
const statBullishPct = document.getElementById('statBullishPct');
const statBearishCount = document.getElementById('statBearishCount');
const statBearishPct = document.getElementById('statBearishPct');
const statTotalViews = document.getElementById('statTotalViews');

// Gauge DOM Elements
const gaugeNeedle = document.getElementById('gaugeNeedle');
const gaugeValue = document.getElementById('gaugeValue');
const sentimentStatus = document.getElementById('sentimentStatus');

// MMI DOM Elements
const mmiNeedle = document.getElementById('mmiNeedle');
const mmiValue = document.getElementById('mmiValue');
const mmiStatus = document.getElementById('mmiStatus');

// Modals DOM Elements
const videoModal = document.getElementById('videoModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const videoIframe = document.getElementById('videoIframe');

const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');

// Export DOM Elements
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');

// Toast DOM Elements
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMsg = document.getElementById('toastMsg');

// Chatbot DOM Elements
const chatWidget = document.getElementById('chatWidget');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatWindow = document.getElementById('chatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatBadge = document.getElementById('chatBadge');
const chatSuggestions = document.getElementById('chatSuggestions');
const chatMicBtn = document.getElementById('chatMicBtn');

// Voice Assistant DOM Elements
const voiceWidget = document.getElementById('voiceWidget');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const voiceWindow = document.getElementById('voiceWindow');
const voiceCloseBtn = document.getElementById('voiceCloseBtn');

// Initialize API Key from localStorage
let youtubeApiKey = localStorage.getItem('youtube_api_key') || '';
apiKeyInput.value = youtubeApiKey;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  fetchVideos();
  
  // Initialize stock ticker
  fetchAndRenderTicker();
  setInterval(fetchAndRenderTicker, 60000);

  // Initialize Market Mood Index (MMI)
  fetchAndRenderMMI();
  setInterval(fetchAndRenderMMI, 300000);
  
  // Refresh and Filter actions
  refreshBtn.addEventListener('click', () => fetchVideos());
  applyFiltersBtn.addEventListener('click', () => fetchVideos());
  
  // Sort selection
  sortBySelect.addEventListener('change', () => {
    sortAndRenderVideos();
  });

  // Channel filter instant update
  channelFilterInput.addEventListener('input', () => {
    sortAndRenderVideos();
  });

  // Video type selector update
  videoTypeSelect.addEventListener('change', () => {
    sortAndRenderVideos();
  });
  
  // Modal closers
  modalCloseBtn.addEventListener('click', closeVideoModal);
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeVideoModal();
  });
  
  settingsBtn.addEventListener('click', () => openModal(settingsModal));
  settingsCloseBtn.addEventListener('click', () => closeModal(settingsModal));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeModal(settingsModal);
  });
  
  // Save/Clear API key
  saveApiKeyBtn.addEventListener('click', () => {
    youtubeApiKey = apiKeyInput.value.trim();
    localStorage.setItem('youtube_api_key', youtubeApiKey);
    closeModal(settingsModal);
    showToast('API Key saved successfully!', 'success');
    fetchVideos();
  });
  
  clearApiKeyBtn.addEventListener('click', () => {
    youtubeApiKey = '';
    apiKeyInput.value = '';
    localStorage.removeItem('youtube_api_key');
    closeModal(settingsModal);
    showToast('API Key cleared!', 'info');
    fetchVideos();
  });

  // Master Dashboard Tab Switcher
  const masterTabTrader = document.getElementById('masterTabTrader');
  const masterTabAI = document.getElementById('masterTabAI');
  const masterTabYoutube = document.getElementById('masterTabYoutube');

  const masterPanelTrader = document.getElementById('masterPanelTrader');
  const masterPanelAI = document.getElementById('masterPanelAI');
  const masterPanelYoutube = document.getElementById('masterPanelYoutube');

  function switchMasterTab(activeTab, activePanel) {
    const tabs = [masterTabTrader, masterTabAI, masterTabYoutube];
    const panels = [masterPanelTrader, masterPanelAI, masterPanelYoutube];

    const isCurrentlyActive = activeTab && activeTab.classList.contains('active');

    tabs.forEach(t => { if (t) t.classList.remove('active'); });
    panels.forEach(p => { if (p) p.style.display = 'none'; });

    if (!isCurrentlyActive && activeTab && activePanel) {
      activeTab.classList.add('active');
      activePanel.style.display = 'block';
      return true; // Opened
    }
    return false; // Closed
  }

  if (masterTabTrader && masterPanelTrader) {
    masterTabTrader.addEventListener('click', () => {
      switchMasterTab(masterTabTrader, masterPanelTrader);
    });
  }

  if (masterTabAI && masterPanelAI) {
    masterTabAI.addEventListener('click', () => {
      switchMasterTab(masterTabAI, masterPanelAI);
    });
  }

  if (masterTabYoutube && masterPanelYoutube) {
    masterTabYoutube.addEventListener('click', () => {
      switchMasterTab(masterTabYoutube, masterPanelYoutube);
    });
  }

  // Collapsible Inner Panels inside Active Trader tab
  const innerPlannerHeader = document.getElementById('innerPlannerHeader');
  const innerPlannerContainer = document.getElementById('innerPlannerContainer');
  const innerPlannerCollapseIcon = document.getElementById('innerPlannerCollapseIcon');

  if (innerPlannerHeader && innerPlannerContainer && innerPlannerCollapseIcon) {
    innerPlannerHeader.addEventListener('click', () => {
      const isCollapsed = innerPlannerContainer.classList.toggle('collapsed');
      if (isCollapsed) {
        innerPlannerCollapseIcon.classList.add('chevron-rotated');
      } else {
        innerPlannerCollapseIcon.classList.remove('chevron-rotated');
        setTimeout(() => {
          if (typeof calculateAndUpdateTradeSetup === 'function') calculateAndUpdateTradeSetup();
        }, 50);
      }
    });
  }

  const innerSimulatorHeader = document.getElementById('innerSimulatorHeader');
  const innerSimulatorContainer = document.getElementById('innerSimulatorContainer');
  const innerSimulatorCollapseIcon = document.getElementById('innerSimulatorCollapseIcon');

  if (innerSimulatorHeader && innerSimulatorContainer && innerSimulatorCollapseIcon) {
    innerSimulatorHeader.addEventListener('click', () => {
      const isCollapsed = innerSimulatorContainer.classList.toggle('collapsed');
      if (isCollapsed) {
        innerSimulatorCollapseIcon.classList.add('chevron-rotated');
      } else {
        innerSimulatorCollapseIcon.classList.remove('chevron-rotated');
        setTimeout(() => {
          if (typeof calculateSharkTrade === 'function') calculateSharkTrade();
        }, 50);
      }
    });
  }

  // Export actions (with propagation stopped)
  exportCsvBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportToCSV();
  });
  exportJsonBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportToJSON();
  });

  // Chatbot Toggles
  chatToggleBtn.addEventListener('click', toggleChat);
  chatCloseBtn.addEventListener('click', toggleChat);
  
  // Chat Submit Form
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleChatSubmit();
  });

  // Suggestion chips
  chatSuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const query = e.target.getAttribute('data-query');
      chatInput.value = query;
      handleChatSubmit();
    }
  });

  // Voice Assistant Toggles
  voiceToggleBtn.addEventListener('click', toggleVoice);
  voiceCloseBtn.addEventListener('click', toggleVoice);

  // Chatbot Voice Input Listener
  if (chatMicBtn) {
    chatMicBtn.addEventListener('click', toggleListening);
  }

  // Trade Setup elements
  const tradeSetupHeader = document.getElementById('tradeSetupHeader');
  const tradeSetupContainer = document.getElementById('tradeSetupContainer');
  const tradeSetupCollapseIcon = document.getElementById('tradeSetupCollapseIcon');
  const tabDigital = document.getElementById('tabDigital');
  const tabEquity = document.getElementById('tabEquity');
  
  const tradeCurrency = document.getElementById('tradeCurrency');
  const capitalLabel = document.getElementById('capitalLabel');
  
  const inputInitialCapital = document.getElementById('initialCapital');
  const inputWinRate = document.getElementById('winRate');
  const inputTradesPerMonth = document.getElementById('tradesPerMonth');
  const inputProjectionYears = document.getElementById('projectionYears');
  const inputRiskPct = document.getElementById('riskPct');
  const inputRewardPct = document.getElementById('rewardPct');
  
  const riskLabel = document.getElementById('riskLabel');
  const rewardLabel = document.getElementById('rewardLabel');
  const riskLimitNote = document.getElementById('riskLimitNote');
  
  const metricAllocation = document.getElementById('metricAllocation');
  const metricAllocationDesc = document.getElementById('metricAllocationDesc');
  const metricMaxLoss = document.getElementById('metricMaxLoss');
  const metricLossImpact = document.getElementById('metricLossImpact');
  const metricMaxProfit = document.getElementById('metricMaxProfit');
  const metricProfitImpact = document.getElementById('metricProfitImpact');
  const metricRatio = document.getElementById('metricRatio');
  const metricRatioAlert = document.getElementById('metricRatioAlert');
  const metricBlowup = document.getElementById('metricBlowup');
  const projectionSummary = document.getElementById('projectionSummary');
  const cryptoTaxBreakdown = document.getElementById('cryptoTaxBreakdown');
  const taxValue = document.getElementById('taxValue');
  const netProfitValue = document.getElementById('netProfitValue');

  // Leverage Elements
  const leverageSelect = document.getElementById('leverageSelect');
  const customLeverage = document.getElementById('customLeverage');
  const customLeverageWrapper = document.getElementById('customLeverageWrapper');
  const leverageInputWrapper = document.getElementById('leverageInputWrapper');
  const leverageWarning = document.getElementById('leverageWarning');
  const metricLeverageCard = document.getElementById('metricLeverageCard');
  const metricLeveragedPosition = document.getElementById('metricLeveragedPosition');
  const metricLiquidationLimit = document.getElementById('metricLiquidationLimit');



  if (tabDigital && tabEquity) {
    tabDigital.addEventListener('click', () => {
      currentTradeTab = 'digital';
      tabDigital.classList.add('active');
      tabEquity.classList.remove('active');
      
      riskLabel.textContent = 'Asset Stop Loss (%)';
      rewardLabel.textContent = 'Asset Take Profit (%)';
      riskLimitNote.style.display = 'none';
      
      // Show leverage options
      if (leverageInputWrapper) leverageInputWrapper.style.display = 'flex';
      if (leverageWarning) leverageWarning.style.display = 'flex';
      if (metricLeverageCard) metricLeverageCard.style.display = 'flex';
      if (leverageSelect && leverageSelect.value === 'custom') {
        if (customLeverageWrapper) customLeverageWrapper.style.display = 'flex';
      }
      
      inputRiskPct.value = 2;
      inputRewardPct.value = 6;
      
      calculateAndUpdateTradeSetup();
    });
    
    tabEquity.addEventListener('click', () => {
      currentTradeTab = 'equity';
      tabEquity.classList.add('active');
      tabDigital.classList.remove('active');
      
      riskLabel.textContent = 'Risk on Allocation (%) [Max 3%]';
      rewardLabel.textContent = 'Reward on Allocation (%)';
      riskLimitNote.style.display = 'block';
      
      // Hide leverage options
      if (leverageInputWrapper) leverageInputWrapper.style.display = 'none';
      if (customLeverageWrapper) customLeverageWrapper.style.display = 'none';
      if (leverageWarning) leverageWarning.style.display = 'none';
      if (metricLeverageCard) metricLeverageCard.style.display = 'none';
      
      inputRiskPct.value = 3;
      inputRewardPct.value = 9;
      
      calculateAndUpdateTradeSetup();
    });
  }

  if (leverageSelect) {
    leverageSelect.addEventListener('change', () => {
      if (leverageSelect.value === 'custom') {
        if (customLeverageWrapper) customLeverageWrapper.style.display = 'flex';
      } else {
        if (customLeverageWrapper) customLeverageWrapper.style.display = 'none';
      }
      calculateAndUpdateTradeSetup();
    });
  }

  if (customLeverage) {
    customLeverage.addEventListener('input', () => {
      let val = parseInt(customLeverage.value) || 1;
      if (val > 25) {
        customLeverage.value = 25;
        showToast('Leverage is capped at a maximum of 25x.', 'warning');
      }
      calculateAndUpdateTradeSetup();
    });
  }

  const inputsToWatch = [
    inputInitialCapital, inputWinRate, inputTradesPerMonth,
    inputProjectionYears, inputRiskPct, inputRewardPct, tradeCurrency
  ];
  inputsToWatch.forEach(input => {
    if (input) {
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        if (currentTradeTab === 'equity' && input === inputRiskPct) {
          let val = parseFloat(inputRiskPct.value);
          if (val > 3) {
            inputRiskPct.value = 3;
            showToast('Equity risk per trade is capped at 3% of allocated capital.', 'warning');
          }
        }
        calculateAndUpdateTradeSetup();
      });
    }
  });

  // Run initial calculations
  calculateAndUpdateTradeSetup();
});

// Toast notification system
function showToast(message, type = 'success') {
  toastMsg.textContent = message;
  toast.className = 'toast active';
  
  // Icon and class styling
  if (type === 'success') {
    toast.classList.add('toast-success');
    toastIcon.setAttribute('data-lucide', 'check-circle');
    toastIcon.style.color = 'var(--bullish-color)';
  } else if (type === 'error') {
    toast.classList.add('toast-error');
    toastIcon.setAttribute('data-lucide', 'alert-circle');
    toastIcon.style.color = 'var(--bearish-color)';
  } else {
    toastIcon.setAttribute('data-lucide', 'info');
    toastIcon.style.color = 'var(--accent-blue)';
  }
  
  // Initialize Voice Assistant Native listeners
  const voiceMarketIN = document.getElementById('voiceMarketIN');
  const voiceMarketSE = document.getElementById('voiceMarketSE');
  const voiceMicPulseBtn = document.getElementById('voiceMicPulseBtn');
  const voiceMicPulseRing = document.getElementById('voiceMicPulseRing');
  const voiceMicStatus = document.getElementById('voiceMicStatus');
  const voiceChatLog = document.getElementById('voiceChatLog');
  const voiceMuteCheckbox = document.getElementById('voiceMuteCheckbox');

  if (voiceMarketIN && voiceMarketSE) {
    voiceMarketIN.addEventListener('click', () => {
      activeMarket = 'india';
      voiceMarketIN.classList.add('active');
      voiceMarketIN.style.background = 'rgba(16, 185, 129, 0.1)';
      voiceMarketIN.style.borderColor = 'rgba(16, 185, 129, 0.2)';
      voiceMarketIN.style.color = '#34d399';

      voiceMarketSE.classList.remove('active');
      voiceMarketSE.style.background = 'transparent';
      voiceMarketSE.style.borderColor = 'var(--border-color)';
      voiceMarketSE.style.color = 'var(--text-secondary)';
      
      appendVoiceMessage('System: Changed market focus to India (NSE).', 'system');
    });

    voiceMarketSE.addEventListener('click', () => {
      activeMarket = 'sweden';
      voiceMarketSE.classList.add('active');
      voiceMarketSE.style.background = 'rgba(16, 185, 129, 0.1)';
      voiceMarketSE.style.borderColor = 'rgba(16, 185, 129, 0.2)';
      voiceMarketSE.style.color = '#34d399';

      voiceMarketIN.classList.remove('active');
      voiceMarketIN.style.background = 'transparent';
      voiceMarketIN.style.borderColor = 'var(--border-color)';
      voiceMarketIN.style.color = 'var(--text-secondary)';
      
      appendVoiceMessage('System: Changed market focus to Sweden (Nasdaq Stockholm).', 'system');
    });
  }

  // Setup Speech Recognition specifically for the Voice Assistant
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = false;
    voiceRecognition.lang = 'en-US';

    voiceRecognition.onstart = () => {
      isVoiceListening = true;
      voiceMicPulseBtn.classList.add('listening');
      if (voiceMicPulseRing) {
        voiceMicPulseRing.classList.add('active');
        voiceMicPulseRing.style.opacity = '1';
      }
      voiceMicStatus.textContent = 'Listening...';
    };

    voiceRecognition.onend = () => {
      isVoiceListening = false;
      voiceMicPulseBtn.classList.remove('listening');
      if (voiceMicPulseRing) {
        voiceMicPulseRing.classList.remove('active');
        voiceMicPulseRing.style.opacity = '0';
      }
      voiceMicStatus.textContent = 'Ready. Click to talk';
    };

    voiceRecognition.onerror = (e) => {
      console.error('Voice assistant recognition error:', e.error);
      if (e.error !== 'no-speech') {
        appendVoiceMessage(`Error: ${e.error}. Try clicking the mic again.`, 'system');
      }
    };

    voiceRecognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      appendVoiceMessage(transcript, 'user');
      await handleVoiceQuerySubmit(transcript);
    };
  }

  if (voiceMicPulseBtn) {
    voiceMicPulseBtn.addEventListener('click', () => {
      if (!voiceRecognition) {
        appendVoiceMessage('Browser speech recognition not supported.', 'system');
        return;
      }
      if (isVoiceListening) {
        voiceRecognition.stop();
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        voiceRecognition.start();
      }
    });
  }

  // Text input fallback triggers for the native voice assistant panel
  const voiceTextInput = document.getElementById('voiceTextInput');
  const voiceSendBtn = document.getElementById('voiceSendBtn');

  function handleVoiceTextSubmit() {
    if (!voiceTextInput) return;
    const text = voiceTextInput.value.trim();
    if (!text) return;
    voiceTextInput.value = '';
    appendVoiceMessage(text, 'user');
    handleVoiceQuerySubmit(text);
  }

  if (voiceSendBtn) {
    voiceSendBtn.addEventListener('click', handleVoiceTextSubmit);
  }

  if (voiceTextInput) {
    voiceTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVoiceTextSubmit();
      }
    });
  }

  lucide.createIcons();
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Modal handling helper
function openModal(modalEl) {
  modalEl.classList.add('active');
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
}

function openVideoModal(videoId) {
  videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  openModal(videoModal);
}

function closeVideoModal() {
  videoIframe.src = '';
  closeModal(videoModal);
}

// Local Sentiment Classification
function classifySentiment(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  const bullishKeywords = [
    'bullish', 'rally', 'up', 'call', 'buy', 'green', 'breakout', 
    'target', 'levels', 'high', 'gain', 'profit', 'positive', 'boom',
    'support', 'fly', 'blast', 'gap up', 'break', 'strong', 'growth'
  ];
  
  const bearishKeywords = [
    'bearish', 'fall', 'crash', 'down', 'put', 'sell', 'red', 'panic', 
    'drop', 'correction', 'warning', 'danger', 'negative', 'dump',
    'resistance', 'collapse', 'gap down', 'breakdown', 'weak', 'risk'
  ];

  let bullScore = 0;
  let bearScore = 0;

  bullishKeywords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) bullScore += matches.length;
  });

  bearishKeywords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) bearScore += matches.length;
  });

  if (bullScore > bearScore) return 'bullish';
  if (bearScore > bullScore) return 'bearish';
  return 'neutral';
}

/**
 * Fetch Videos from Node.js Express API
 */
async function fetchVideos() {
  const query = searchQueryInput.value.trim() || 'nifty analysis';
  const hours = timeLimitSelect.value;
  
  // Visual Loading indicator on Refresh Button
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block;"></i> Fetching...`;
  lucide.createIcons();
  
  videoGrid.innerHTML = `
    <div class="state-message">
      <div class="spinner"></div>
      <p>Scanning YouTube for Nifty analysis videos published in the last ${hours} hours...</p>
    </div>
  `;

  try {
    const url = `/api/videos?q=${encodeURIComponent(query)}&hours=${hours}&key=${encodeURIComponent(youtubeApiKey)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'API request failed');
    }
    
    const result = await response.json();
    
    // Classify sentiment local enrichment
    videosData = (result.videos || []).map(v => {
      return {
        ...v,
        sentiment: classifySentiment(v.title, v.description)
      };
    });
    
    showToast(`Successfully loaded ${videosData.length} videos in ${result.mode === 'api' ? 'Official API' : 'Scraper'} mode.`, 'success');
    sortAndRenderVideos();
    
  } catch (error) {
    console.error('Failed to load videos:', error);
    showToast(`Error: ${error.message}`, 'error');
    
    let errorTitle = 'Failed to retrieve data';
    let errorDesc = error.message || 'An unknown network error occurred.';
    let actionTip = 'Please check your connection and retry.';

    if (errorDesc.includes('302') || errorDesc.includes('limit') || errorDesc.includes('quota') || errorDesc.includes('403') || errorDesc.toLowerCase().includes('failed')) {
      errorTitle = 'YouTube Rate Limit / API Quota Restrict';
      errorDesc = 'YouTube has temporarily restricted requests from this server IP (HTTP 302 captcha redirection block) or your daily official API key quota has been exhausted.';
      actionTip = `
        <div style="text-align: left; max-width: 500px; margin: 1rem auto; padding: 1rem; background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 8px; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
          <strong style="color: #fbbf24; display: block; margin-bottom: 0.5rem; font-size: 0.85rem;"><i data-lucide="alert-triangle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> Recommended Actions:</strong>
          <ol style="margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Use your own API Key:</strong> Click the settings gear icon in the top-right of the dashboard and paste a personal YouTube API Key for a stable, dedicated quota.</li>
            <li><strong>Wait for automatic reset:</strong> YouTube's official API quota resets daily at midnight PT (approx. 1:30 PM IST / 9:00 AM CET). Temporary IP blocks reset within 15-60 minutes.</li>
            <li><strong>Avoid excessive refreshing:</strong> Keep page reloads spaced apart to prevent triggering YouTube's automated scraper bot detection.</li>
          </ol>
        </div>
      `;
    }

    videoGrid.innerHTML = `
      <div class="state-message" style="border-color: #f87171; padding: 2rem; background: rgba(248, 113, 113, 0.02); max-width: 600px; margin: 0 auto; border-radius: 12px; text-align: center;">
        <i data-lucide="alert-octagon" style="width: 48px; height: 48px; color: #f87171; margin-bottom: 1rem;"></i>
        <h3 style="color: var(--text-primary); font-size: 1.1rem; margin-bottom: 0.5rem;">${errorTitle}</h3>
        <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">${errorDesc}</p>
        ${actionTip}
        <button onclick="fetchVideos()" class="btn" style="margin-top: 1rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem 1.25rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.2s;"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Retry Connection</button>
      </div>
    `;
    lucide.createIcons();
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = `<i data-lucide="refresh-cw"></i> Refresh`;
    lucide.createIcons();
  }
}

/**
 * Sorts and Renders Videos to the Grid
 */
function sortAndRenderVideos() {
  const sortBy = sortBySelect.value;
  const channelQuery = channelFilterInput.value.trim().toLowerCase();
  const selectedType = videoTypeSelect.value;
  
  // Filter by channel client-side
  let filteredVideos = [...videosData];
  if (channelQuery) {
    filteredVideos = filteredVideos.filter(v => 
      v.channelName.toLowerCase().includes(channelQuery)
    );
  }

  // Filter by format/type client-side
  if (selectedType === 'long') {
    filteredVideos = filteredVideos.filter(v => v.durationSeconds > 60);
  } else if (selectedType === 'shorts') {
    filteredVideos = filteredVideos.filter(v => v.durationSeconds <= 60);
  }
  
  // Sorting implementation
  if (sortBy === 'views') {
    filteredVideos.sort((a, b) => b.views - a.views);
  } else if (sortBy === 'sentiment') {
    // Sort order: Bullish first, Neutral second, Bearish third
    const weight = { bullish: 3, neutral: 2, bearish: 1 };
    filteredVideos.sort((a, b) => weight[b.sentiment] - weight[a.sentiment]);
  } else {
    // default: date (newest first based on publishedAt timestamp)
    filteredVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  
  renderDashboard(filteredVideos);
}

/**
 * Main dashboard renderer
 */
function renderDashboard(data = videosData) {
  renderStats(data);
  renderGauge(data);
  renderTimelineChart(data);
  renderVideoCards(data);
}

/**
 * Render Summary Stat Cards
 */
function renderStats(data = videosData) {
  const total = data.length;
  const bullish = data.filter(v => v.sentiment === 'bullish').length;
  const bearish = data.filter(v => v.sentiment === 'bearish').length;
  const totalViewsVal = data.reduce((sum, v) => sum + (v.views || 0), 0);

  statTotalVideos.textContent = total;
  statBullishCount.textContent = bullish;
  statBearishCount.textContent = bearish;
  
  // Format aggregate views
  if (totalViewsVal >= 1e6) {
    statTotalViews.textContent = `${(totalViewsVal / 1e6).toFixed(2)}M`;
  } else if (totalViewsVal >= 1e3) {
    statTotalViews.textContent = `${(totalViewsVal / 1e3).toFixed(1)}K`;
  } else {
    statTotalViews.textContent = totalViewsVal;
  }

  // Bullish and Bearish Percentages
  if (total > 0) {
    statBullishPct.textContent = `${Math.round((bullish / total) * 100)}% of total`;
    statBearishPct.textContent = `${Math.round((bearish / total) * 100)}% of total`;
  } else {
    statBullishPct.textContent = '0% of total';
    statBearishPct.textContent = '0% of total';
  }
}

/**
 * Render Sentiment Gauge Needle & Texts
 */
function renderGauge(data = videosData) {
  const bullish = data.filter(v => v.sentiment === 'bullish').length;
  const bearish = data.filter(v => v.sentiment === 'bearish').length;
  const total = bullish + bearish;

  let score = 50; // Neutral default
  
  if (total > 0) {
    score = Math.round((bullish / total) * 100);
  }

  // Gauge needle rotation bounds: -90deg (0% Bullish/100% Bearish) to 90deg (100% Bullish/0% Bearish)
  const rotationDegrees = (score / 100) * 180 - 90;
  gaugeNeedle.style.transform = `rotate(${rotationDegrees}deg)`;
  gaugeValue.textContent = `${score}%`;

  // Status text determination
  if (score > 60) {
    sentimentStatus.textContent = 'Bullish';
    sentimentStatus.style.color = 'var(--bullish-color)';
  } else if (score < 40) {
    sentimentStatus.textContent = 'Bearish';
    sentimentStatus.style.color = 'var(--bearish-color)';
  } else {
    sentimentStatus.textContent = 'Neutral';
    sentimentStatus.style.color = 'var(--neutral-color)';
  }
}

/**
 * Render Upload Activity and Views Over Time Chart
 */
function getApproximateHoursAgoGlobal(agoString) {
  if (!agoString) return 999999;
  const s = agoString.toLowerCase();
  
  if (s.includes('now') || s.includes('second') || s.includes('minute') || s.endsWith('m')) {
    return 0.5; // Less than an hour
  }
  if (s.includes('hour') || s.endsWith('h')) {
    const match = s.match(/(\d+)\s*(?:hour|h)/);
    return match ? parseInt(match[1], 10) : 1;
  }
  if (s.includes('day') || s.endsWith('d')) {
    const match = s.match(/(\d+)\s*(?:day|d)/);
    return match ? parseInt(match[1], 10) * 24 : 24;
  }
  if (s.includes('week') || s.endsWith('w')) {
    const match = s.match(/(\d+)\s*(?:week|w)/);
    return match ? parseInt(match[1], 10) * 24 * 7 : 168;
  }
  if (s.includes('month') || s.includes('mo')) {
    const match = s.match(/(\d+)\s*(?:month|mo)/);
    return match ? parseInt(match[1], 10) * 24 * 30 : 720;
  }
  if (s.includes('year') || s.endsWith('y')) {
    const match = s.match(/(\d+)\s*(?:year|y)/);
    return match ? parseInt(match[1], 10) * 24 * 365 : 8760;
  }
  return 999999;
}

/**
 * Render Upload Activity and Views Over Time Chart
 */
function renderTimelineChart(data = videosData) {
  const ctx = document.getElementById('timelineChart').getContext('2d');
  const hours = parseInt(timeLimitSelect.value, 10);
  
  let slots = [];
  let videoCounts = [];
  let viewCounts = [];

  if (hours <= 24) {
    slots = ['0-4h ago', '4-8h ago', '8-12h ago', '12-16h ago', '16-20h ago', '20-24h ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 4));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 168) {
    slots = ['1d ago', '2d ago', '3d ago', '4d ago', '5d ago', '6d ago', '7d ago'];
    videoCounts = [0, 0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(6, Math.floor(h / 24));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 720) {
    slots = ['5d ago', '10d ago', '15d ago', '20d ago', '25d ago', '30d ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 120));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 8760) {
    slots = ['2m ago', '4m ago', '6m ago', '8m ago', '10m ago', '12m ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 1460));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else {
    slots = ['1y ago', '2y ago', '3y ago', '4y ago', '5y ago'];
    videoCounts = [0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(4, Math.floor(h / 8760));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  }

  // Destroy previous instance to re-render
  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  timelineChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: slots.reverse(), // Show oldest to newest (left to right)
      datasets: [
        {
          label: 'Videos Uploaded',
          data: videoCounts.reverse(),
          backgroundColor: 'rgba(59, 130, 246, 0.65)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'yVideo',
          borderRadius: 6
        },
        {
          label: 'Total Views',
          data: viewCounts.reverse(),
          type: 'line',
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
          yAxisID: 'yViews'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit' }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' }
          }
        },
        yVideo: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          title: {
            display: true,
            text: 'Videos Count',
            color: '#9ca3af',
            font: { family: 'Outfit' }
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' },
            stepSize: 1
          }
        },
        yViews: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false }, // Avoid duplicate grid lines
          title: {
            display: true,
            text: 'Views Reach',
            color: '#9ca3af',
            font: { family: 'Outfit' }
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' },
            callback: (val) => {
              if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
              if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
              return val;
            }
          }
        }
      }
    }
  });
}

/**
 * Render Video Cards Grid
 */
function renderVideoCards(data = videosData) {
  videoGrid.innerHTML = '';
  
  if (data.length === 0) {
    videoGrid.innerHTML = `
      <div class="state-message">
        <i data-lucide="frown" style="width: 48px; height: 48px; color: var(--text-secondary); margin-bottom: 1rem;"></i>
        <h3>No videos found</h3>
        <p>Try modifying your query or increasing the time limit.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  data.forEach(video => {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    card.innerHTML = `
      <div class="video-thumbnail-wrapper" onclick="openVideoModal('${video.videoId}')">
        <img class="video-thumbnail" src="${video.thumbnail}" alt="${escapeHTML(video.title)}">
        <span class="duration-badge">${escapeHTML(video.duration)}</span>
        <span class="sentiment-badge ${video.sentiment}">${escapeHTML(video.sentiment)}</span>
      </div>
      <div class="video-info">
        <h3 class="video-title" onclick="openVideoModal('${video.videoId}')">${escapeHTML(video.title)}</h3>
        <p class="video-description">${escapeHTML(video.description)}</p>
        
        <div class="video-metadata">
          <div class="metadata-row">
            <span class="channel-name">
              <i data-lucide="user" style="width: 12px; height: 12px; color: var(--accent-blue);"></i>
              ${escapeHTML(video.channelName)}
            </span>
            <span class="view-count">${escapeHTML(video.viewsFormatted)}</span>
          </div>
          <div class="metadata-row">
            <span class="publish-time">${escapeHTML(video.ago)}</span>
            <a href="${video.url}" target="_blank" class="btn btn-icon" style="padding: 0.2rem; border-radius: 6px; font-size: 0.7rem;" title="Watch on YouTube">
              <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
            </a>
          </div>
        </div>
      </div>
    `;
    
    videoGrid.appendChild(card);
  });
  
  // Re-draw lucide icons injected in card DOMs
  lucide.createIcons();
}

// Simple HTML escaping helper
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * EXPORT TO CSV
 */
function exportToCSV() {
  if (videosData.length === 0) {
    showToast('No data to export!', 'error');
    return;
  }

  const headers = ['Video ID', 'Title', 'Channel', 'Views', 'Upload Age', 'Sentiment', 'Published At', 'URL'];
  const rows = videosData.map(v => [
    v.videoId,
    `"${v.title.replace(/"/g, '""')}"`,
    `"${v.channelName.replace(/"/g, '""')}"`,
    v.views,
    v.ago,
    v.sentiment,
    v.publishedAt,
    v.url
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `nifty_youtube_analysis_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('CSV file downloaded.', 'success');
}

/**
 * EXPORT TO JSON
 */
function exportToJSON() {
  if (videosData.length === 0) {
    showToast('No data to export!', 'error');
    return;
  }

  const jsonStr = JSON.stringify(videosData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
  
  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `nifty_youtube_analysis_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('JSON file downloaded.', 'success');
}

/**
 * CHATBOT FUNCTIONS
 */
let isChatOpen = false;
let unreadCount = 0;

function toggleChat() {
  isChatOpen = !isChatOpen;
  chatWindow.classList.toggle('active', isChatOpen);
  
  if (isChatOpen) {
    unreadCount = 0;
    chatBadge.style.display = 'none';
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function handleChatSubmit() {
  const text = chatInput.value.trim();
  if (!text) return;
  
  // Clear input
  chatInput.value = '';
  
  // Append user message
  appendChatMessage(text, 'user');
  
  // Trigger bot response
  simulateBotResponse(text);
}

function appendChatMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `<p>${escapeHTML(text)}</p><span class="chat-msg-time">${now}</span>`;
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function simulateBotResponse(userText) {
  // Show typing indicator
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
  
  // Generate response
  const botAnswer = generateBotAnswer(userText);
  
  // Simulate delay
  setTimeout(() => {
    // Remove typing indicator
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
    
    // Append answer
    appendChatMessage(botAnswer, 'bot');
    
    // If the query was triggered by voice, speak the response!
    if (wasLastQueryVoice) {
      speakText(botAnswer);
      wasLastQueryVoice = false;
    }
    
    // If chat is closed, increment unread badge
    if (!isChatOpen) {
      unreadCount++;
      chatBadge.textContent = unreadCount;
      chatBadge.style.display = 'block';
    }
  }, Math.max(600, Math.min(1800, botAnswer.length * 10)));
}

function generateBotAnswer(query) {
  const q = query.toLowerCase().trim();
  
  const total = videosData.length;
  const bullish = videosData.filter(v => v.sentiment === 'bullish').length;
  const bearish = videosData.filter(v => v.sentiment === 'bearish').length;
  const neutral = videosData.filter(v => v.sentiment === 'neutral').length;
  const totalViews = videosData.reduce((sum, v) => sum + (v.views || 0), 0);

  // Channel-specific video lookup (e.g. "give me the youtube video links from wealth saga channel")
  let targetChannel = '';
  
  // Method 1: Check if query contains any of the exact channel names loaded
  const uniqueChannels = [...new Set(videosData.map(v => v.channelName))];
  for (const ch of uniqueChannels) {
    if (q.includes(ch.toLowerCase())) {
      targetChannel = ch;
      break;
    }
  }
  
  // Method 2: Extract candidate channel name using regex patterns
  if (!targetChannel) {
    // Patterns like "from X channel", "from X", "by X", "videos of X", "links from X"
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
    const channelVideos = videosData.filter(v => 
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

  // 1. Sentiment responses
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
  
  // 2. Top videos query
  if (q.includes('top') || q.includes('popular') || q.includes('views') || q.includes('best')) {
    if (total === 0) {
      return "No videos are available. Try refreshing the dashboard.";
    }
    // Sort by views descending
    const sorted = [...videosData].sort((a, b) => b.views - a.views).slice(0, 3);
    let resp = "Here are the top 3 Nifty analysis videos by views count:\n\n";
    sorted.forEach((v, index) => {
      resp += `${index + 1}. **${v.title}** by _${v.channelName}_ (${v.viewsFormatted})\n`;
    });
    return resp;
  }
  
  // 3. Most active channel
  if (q.includes('active') || q.includes('channel') || q.includes('creator') || q.includes('analyst')) {
    if (total === 0) {
      return "No analysts found because no videos are loaded.";
    }
    // Group and count
    const channelCounts = {};
    videosData.forEach(v => {
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
  
  // 4. RSI explanation
  if (q.includes('rsi') || q.includes('relative strength')) {
    return "💡 **Relative Strength Index (RSI)** is a classic technical momentum indicator. It measures the speed and change of price movements on a scale of 0 to 100.\n\n" + 
           "- **Overbought (>70)**: Suggests the price has risen too fast and may be due for a downward correction or consolidation.\n" +
           "- **Oversold (<30)**: Suggests the price has dropped rapidly and might be due for a bullish trend reversal or technical bounce.\n\n" +
           "Nifty analysts often look for RSI divergence on 15-minute or daily charts to predict key reversals.";
  }
  
  // 5. PCR explanation
  if (q.includes('pcr') || q.includes('put call')) {
    return "💡 **Put-Call Ratio (PCR)** is a derivatives indicator computed by dividing the volume of open put options by call options.\n\n" +
           "- **PCR > 1**: More put options are traded than calls, indicating a bearish sentiment (investors are hedging or expecting a drop).\n" +
           "- **PCR < 1**: More calls are traded than puts, suggesting a bullish sentiment.\n" +
           "- **Contrarian Indicator**: In extreme market tops or bottoms, high PCR can flag oversold reversal points and vice versa.";
  }
  
  // 6. Nifty explanation
  if (q.includes('nifty') && (q.includes('what') || q.includes('mean'))) {
    return "💼 The **Nifty 50** (National Stock Exchange Fifty) is the flagship index of the National Stock Exchange of India (NSE). " +
           "It tracks the performance of the 50 largest and most actively traded Indian companies across 13 sectors. " +
           "It acts as a primary barometer for the Indian economy and financial markets.";
  }

  // 7. Support & Resistance
  if (q.includes('support') || q.includes('resistance') || q.includes('level') || q.includes('target')) {
    return "📈 **Support and Resistance Levels** are key price zones where trends frequently halt or reverse:\n\n" +
           "- **Support**: A price floor where buying interest is strong enough to overcome selling pressure. Often correlates with historical buying zones, key moving averages, or round psychological numbers.\n" +
           "- **Resistance**: A price ceiling where selling interest is strong enough to halt an upward trend. Traders look at resistance breakouts as buy signals.";
  }
  
  // 8. Help / Greeters
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('help') || q.includes('start')) {
    return "👋 Hello! I am your Nifty Analysis assistant. I can answer questions about the current dashboard dashboard videos or technical analysis.\n\n" +
           "Try asking me things like:\n" +
           "- _'Overall sentiment'_ (Gets bullish/bearish summary statistics)\n" +
           "- _'List the top videos'_ (Shows the most popular videos)\n" +
           "- _'Who is the most active analyst?'_ (Identifies top uploaders)\n" +
           "- _'Explain RSI'_ or _'What is PCR?'_\n" +
           "- _'What is support and resistance?'_";
  }

  // 9. Fallback
  return "I'm not sure about that. I can summarize the current videos, list popular analysts, or explain market metrics like RSI, PCR, or Support levels. Try clicking one of the suggestion chips below!";
}

/**
 * STOCK TICKER FUNCTIONS
 */
async function fetchAndRenderTicker() {
  try {
    const response = await fetch('/api/ticker');
    const data = await response.json();
    if (data.success) {
      if (data.nifty) {
        renderTicker(data.nifty, tickerTrackNifty, 'en-IN');
      }
      if (data.omx) {
        renderTicker(data.omx, tickerTrackOmx, 'sv-SE');
      }
    }
  } catch (error) {
    console.error('Error fetching tickers:', error);
  }
}

function renderTicker(tickers, trackElement, locale = 'en-US') {
  if (!trackElement) return;
  if (!tickers || tickers.length === 0) {
    trackElement.innerHTML = '<span class="ticker-loading">Market rates unavailable</span>';
    return;
  }
  let trackHTML = '';
  tickers.forEach(t => {
    const isUp = t.change >= 0;
    const arrow = isUp ? '▲' : '▼';
    const changeClass = isUp ? 'up' : 'down';
    const sign = isUp ? '+' : '';
    
    // Format currency symbol depending on market
    let currencySymbol = '₹';
    if (locale === 'sv-SE') {
      currencySymbol = 'kr ';
    }
    
    trackHTML += `
      <div class="ticker-item">
        <span class="ticker-name">${escapeHTML(t.name)}</span>
        <span class="ticker-price">${currencySymbol}${t.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="ticker-change ${changeClass}">
          ${arrow} ${sign}${t.change.toFixed(2)} (${sign}${t.changePercent.toFixed(2)}%)
        </span>
      </div>
    `;
  });
  trackElement.innerHTML = trackHTML + trackHTML;
}

/**
 * MARKET MOOD INDEX (MMI) FUNCTIONS
 */
async function fetchAndRenderMMI() {
  if (!mmiNeedle || !mmiValue || !mmiStatus) return;
  try {
    const response = await fetch('/api/mmi');
    const resData = await response.json();
    if (resData.success && resData.data) {
      renderMMI(resData.data);
    } else {
      mmiStatus.textContent = 'ERROR';
      mmiStatus.style.color = 'var(--bearish-color)';
    }
  } catch (error) {
    console.error('Error fetching MMI:', error);
    mmiStatus.textContent = 'UNAVAILABLE';
    mmiStatus.style.color = 'var(--bearish-color)';
  }
}

function renderMMI(data) {
  const value = data.currentValue || 50;
  mmiValue.textContent = value.toFixed(1);
  
  // Rotate needle (-90deg to +90deg)
  const deg = (value / 100) * 180 - 90;
  mmiNeedle.style.transform = `rotate(${deg}deg)`;
  
  // Determine state label and color
  let state = 'NEUTRAL';
  let color = 'var(--text-secondary)';
  if (value < 30) {
    state = 'EXTREME FEAR';
    color = '#ef4444';
  } else if (value >= 30 && value < 50) {
    state = 'FEAR';
    color = '#f97316';
  } else if (value >= 50 && value < 70) {
    state = 'GREED';
    color = '#eab308';
  } else if (value >= 70) {
    state = 'EXTREME GREED';
    color = '#10b981';
  }
  
  mmiStatus.textContent = state;
  mmiStatus.style.color = color;
}

/**
 * VOICE ASSISTANT FUNCTIONS
 */
let isVoiceOpen = false;
let activeMarket = 'india';
let lastVoiceTicker = '';
let isVoiceListening = false;
let voiceRecognition = null;

function toggleVoice() {
  isVoiceOpen = !isVoiceOpen;
  voiceWindow.classList.toggle('active', isVoiceOpen);
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
    
    // Inject insights card details directly into the bubble if they exist!
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

    // Inject competitor comparative data directly into the bubble!
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

    // Inject events info directly into the bubble!
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

    // Speech output
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
    
    // Choose a friendly English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * CHATBOT VOICE SPEECH-TO-TEXT AND TEXT-TO-SPEECH
 */
let wasLastQueryVoice = false;
let recognition = null;
let isListening = false;

// Setup Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    chatMicBtn.classList.add('listening');
    chatInput.placeholder = 'Listening... Speak now';
  };

  recognition.onend = () => {
    isListening = false;
    chatMicBtn.classList.remove('listening');
    chatInput.placeholder = 'Ask a question...';
  };

  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    if (e.error !== 'no-speech') {
      showToast('Speech error: ' + e.error, 'error');
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    wasLastQueryVoice = true;
    // Auto-submit the query
    handleChatSubmit();
  };
} else {
  // If not supported, hide mic button
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
    // Cancel any active Speech Synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    recognition.start();
  }
}

// Setup Speech Synthesis
function speakText(text) {
  if ('speechSynthesis' in window) {
    // Cancel previous speech
    window.speechSynthesis.cancel();
    
    // Clean markdown structures from text for cleaner voice output
    let cleanText = text
      .replace(/[*#_`~]/g, '')                // Remove styling chars
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace markdown links with their text
      .replace(/\n+/g, ' ');                  // Replace line breaks with spaces
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Attempt to set a friendly natural voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en'));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * TRADE SETUP CALCULATIONS
 */
/**
 * Helper: Format numbers in Indian Lakh/Crore standard format
 */
function formatLakhCrore(amount, currencyCode) {
  let symbol = '';
  if (currencyCode === 'INR') {
    symbol = '₹';
  } else if (currencyCode === 'SEK') {
    symbol = 'kr ';
  } else if (currencyCode === 'USD') {
    symbol = '$';
  }

  const absVal = Math.abs(amount);
  let formatted = '';
  if (absVal >= 10000000) { // 1 Crore = 10,000,000
    const crVal = amount / 10000000;
    if (crVal >= 100) {
      formatted = Math.round(crVal).toLocaleString('en-IN') + ' Cr';
    } else {
      formatted = crVal.toFixed(2) + ' Cr';
    }
  } else if (absVal >= 100000) { // 1 Lakh = 100,000
    const lakhVal = amount / 100000;
    if (lakhVal >= 100) {
      formatted = Math.round(lakhVal).toLocaleString('en-IN') + ' Lakh';
    } else {
      formatted = lakhVal.toFixed(2) + ' Lakh';
    }
  } else {
    formatted = amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  return symbol + formatted;
}

/**
 * TRADE SETUP CALCULATIONS
 */
function calculateAndUpdateTradeSetup() {
  const inputInitialCapital = document.getElementById('initialCapital');
  const inputWinRate = document.getElementById('winRate');
  const inputTradesPerMonth = document.getElementById('tradesPerMonth');
  const inputProjectionYears = document.getElementById('projectionYears');
  const inputRiskPct = document.getElementById('riskPct');
  const inputRewardPct = document.getElementById('rewardPct');
  const tradeCurrency = document.getElementById('tradeCurrency');
  const capitalLabel = document.getElementById('capitalLabel');
  const tradesHelperNote = document.getElementById('tradesHelperNote');
  
  const metricAllocation = document.getElementById('metricAllocation');
  const metricAllocationDesc = document.getElementById('metricAllocationDesc');
  const metricMaxLoss = document.getElementById('metricMaxLoss');
  const metricLossImpact = document.getElementById('metricLossImpact');
  const metricMaxProfit = document.getElementById('metricMaxProfit');
  const metricProfitImpact = document.getElementById('metricProfitImpact');
  const metricRatio = document.getElementById('metricRatio');
  const metricRatioAlert = document.getElementById('metricRatioAlert');
  const metricBlowup = document.getElementById('metricBlowup');
  const projectionSummary = document.getElementById('projectionSummary');

  if (!inputInitialCapital) return;

  const capital = parseFloat(inputInitialCapital.value) || 0;
  const winRate = (parseFloat(inputWinRate.value) || 0) / 100;
  const tradesPerMonth = parseInt(inputTradesPerMonth.value) || 0;
  const tradesPerYear = tradesPerMonth * 12;
  const years = parseInt(inputProjectionYears.value) || 0;
  let riskPct = parseFloat(inputRiskPct.value) || 0;
  let rewardPct = parseFloat(inputRewardPct.value) || 0;

  if (tradesHelperNote) {
    tradesHelperNote.textContent = `${tradesPerMonth} trades/month (${tradesPerYear} trades/year)`;
  }
  
  // Set formatting codes based on selected currency
  const currencyCode = tradeCurrency ? tradeCurrency.value : 'USD';
  let currencySymbol = '$';
  let localeCode = 'en-US';
  
  if (currencyCode === 'INR') {
    currencySymbol = '₹';
    localeCode = 'en-IN';
  } else if (currencyCode === 'SEK') {
    currencySymbol = 'kr ';
    localeCode = 'sv-SE';
  }
  
  if (capitalLabel) {
    capitalLabel.textContent = `Initial Capital (${currencySymbol.trim()})`;
  }
  
  function formatCurrency(amount) {
    if (currencyCode === 'SEK') {
      return `kr ${amount.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currencyCode === 'INR') {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  
  function formatCurrencyShort(amount) {
    if (currencyCode === 'SEK') {
      return `kr ${amount.toLocaleString('sv-SE')}`;
    } else if (currencyCode === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    } else {
      return `$${amount.toLocaleString('en-US')}`;
    }
  }
  
  // Position allocation sizing and leverage
  let allocationPct = 0.25; // Digital defaults to 25%
  let leverage = 1;
  
  if (currentTradeTab === 'equity') {
    allocationPct = 0.10; // Equity defaults to 10%
    if (riskPct > 3) {
      riskPct = 3;
    }
  } else {
    // Digital Asset Leverage reading
    const leverageSelect = document.getElementById('leverageSelect');
    const customLeverage = document.getElementById('customLeverage');
    if (leverageSelect) {
      if (leverageSelect.value === 'custom') {
        leverage = parseInt(customLeverage.value) || 1;
      } else {
        leverage = parseInt(leverageSelect.value) || 1;
      }
    }
    if (leverage > 25) leverage = 25;
  }
  
  const allocatedAmount = capital * allocationPct;
  metricAllocation.textContent = formatCurrency(allocatedAmount);
  metricAllocationDesc.textContent = `${(allocationPct * 100).toFixed(0)}% of overall capital (${formatCurrencyShort(capital)})`;
  
  // Leveraged Position Metric updates
  const metricLeveragedPosition = document.getElementById('metricLeveragedPosition');
  const metricLiquidationLimit = document.getElementById('metricLiquidationLimit');
  if (metricLeveragedPosition) {
    metricLeveragedPosition.textContent = formatCurrency(allocatedAmount * leverage);
  }
  if (metricLiquidationLimit) {
    if (leverage > 1) {
      const liqPct = (100 / leverage).toFixed(1);
      metricLiquidationLimit.textContent = `Liquidation boundary: -${liqPct}% asset price move`;
    } else {
      metricLiquidationLimit.textContent = 'Spot position (No liquidation risk)';
    }
  }
  
  // Max Loss and Max Profit (multiplying asset move by leverage)
  let lossFraction = riskPct / 100;
  let profitFraction = rewardPct / 100;
  
  if (currentTradeTab === 'digital') {
    lossFraction = (riskPct * leverage) / 100;
    profitFraction = (rewardPct * leverage) / 100;
  }
  
  let isLiquidated = false;
  if (lossFraction >= 1) {
    lossFraction = 1;
    isLiquidated = true;
  }
  
  const maxLoss = allocatedAmount * lossFraction;
  const maxProfit = allocatedAmount * profitFraction;
  
  metricMaxLoss.textContent = formatCurrency(maxLoss) + (isLiquidated ? ' (LIQUIDATED)' : '');
  const lossImpactPct = capital > 0 ? (maxLoss / capital) * 100 : 0;
  metricLossImpact.textContent = `${lossImpactPct.toFixed(2)}% of overall capital`;
  
  metricMaxProfit.textContent = formatCurrency(maxProfit);
  const profitImpactPct = capital > 0 ? (maxProfit / capital) * 100 : 0;
  metricProfitImpact.textContent = `${profitImpactPct.toFixed(2)}% of overall capital`;

  // Tax Breakdown Calculation (30% VDA flat tax)
  const cryptoTaxBreakdown = document.getElementById('cryptoTaxBreakdown');
  const taxValue = document.getElementById('taxValue');
  const netProfitValue = document.getElementById('netProfitValue');

  if (cryptoTaxBreakdown && taxValue && netProfitValue) {
    if (currentTradeTab === 'digital') {
      const taxAmount = maxProfit * 0.30;
      const netProfitAmount = maxProfit * 0.70;
      taxValue.textContent = `Tax (30%): ${formatCurrency(taxAmount)}`;
      netProfitValue.textContent = `Net: ${formatCurrency(netProfitAmount)}`;
      cryptoTaxBreakdown.style.display = 'block';
    } else {
      cryptoTaxBreakdown.style.display = 'none';
    }
  }
  
  // Risk-to-Reward ratio
  const rrRatio = riskPct > 0 ? (rewardPct / riskPct) : 0;
  metricRatio.textContent = `1 : ${rrRatio.toFixed(2)}`;
  
  if (rrRatio >= 3) {
    metricRatioAlert.textContent = 'Target: Min 1:3 ratio met';
    metricRatioAlert.style.color = 'var(--bullish-color)';
  } else {
    metricRatioAlert.textContent = 'Warning: Ratio is below 1:3 target';
    metricRatioAlert.style.color = '#ef4444';
  }
  
  // Consecutive losses to blow up
  const lossesToBlowup = maxLoss > 0 ? Math.floor(capital / maxLoss) : Infinity;
  if (isFinite(lossesToBlowup)) {
    metricBlowup.textContent = `${lossesToBlowup} Trades`;
  } else {
    metricBlowup.textContent = 'Infinite Trades';
  }
  
  // Yearly compounding projection
  const expectedReturnFactorPerTrade = (winRate * (maxProfit / capital)) - ((1 - winRate) * (maxLoss / capital));
  const annualReturnRate = expectedReturnFactorPerTrade * tradesPerYear;
  
  const yearsLabels = ['Year 0'];
  const chartData = [capital];
  
  let currentCapital = capital;
  for (let i = 1; i <= years; i++) {
    currentCapital = currentCapital * (1 + annualReturnRate);
    if (currentCapital < 0) currentCapital = 0;
    yearsLabels.push(`Year ${i}`);
    chartData.push(Math.round(currentCapital));
  }
  
  const totalGrowth = capital > 0 ? ((currentCapital - capital) / capital) * 100 : 0;
  if (currentTradeTab === 'digital') {
    const netGrowth = (currentCapital - capital) * 0.70;
    const netCapitalValue = capital + netGrowth;
    projectionSummary.textContent = `Projected Capital after ${years} years: ${formatLakhCrore(Math.round(currentCapital), currencyCode)} (Growth: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%) | Net Post-Tax (30% VDA): ${formatLakhCrore(Math.round(netCapitalValue), currencyCode)}`;
  } else {
    projectionSummary.textContent = `Projected Capital after ${years} years: ${formatLakhCrore(Math.round(currentCapital), currencyCode)} (Growth: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%)`;
  }
  
  // Render the Growth Chart
  renderGrowthChart(yearsLabels, chartData);

  // Update Rules Status
  updateRulesCompliance({
    allocationPct: allocationPct,
    rrRatio: rrRatio,
    leverage: leverage,
    riskPct: riskPct,
    lossesToBlowup: lossesToBlowup
  });
}

/**
 * Interactive Compliance Check for Trading Rules
 */
function updateRulesCompliance(params) {
  const ruleAllocation = document.getElementById('ruleAllocation');
  const textAllocation = document.getElementById('textAllocation');
  const iconAllocation = document.getElementById('iconAllocation');
  
  const ruleRR = document.getElementById('ruleRR');
  const textRR = document.getElementById('textRR');
  const iconRR = document.getElementById('iconRR');
  
  const ruleRiskLimit = document.getElementById('ruleRiskLimit');
  const textRiskLimit = document.getElementById('textRiskLimit');
  const iconRiskLimit = document.getElementById('iconRiskLimit');
  
  const ruleCapitalPreservation = document.getElementById('ruleCapitalPreservation');
  const textCapitalPreservation = document.getElementById('textCapitalPreservation');
  const iconCapitalPreservation = document.getElementById('iconCapitalPreservation');

  const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const failIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;

  // 1. Position Sizing
  if (ruleAllocation && textAllocation && iconAllocation) {
    if (currentTradeTab === 'digital') {
      textAllocation.textContent = `Size: Exactly 25% allocated (${(params.allocationPct * 100).toFixed(0)}%)`;
      ruleAllocation.className = 'rule-item passed';
      iconAllocation.innerHTML = checkIcon;
    } else {
      textAllocation.textContent = `Size: Exactly 10% allocated (${(params.allocationPct * 100).toFixed(0)}%)`;
      ruleAllocation.className = 'rule-item passed';
      iconAllocation.innerHTML = checkIcon;
    }
  }

  // 2. Risk-to-Reward Ratio
  if (ruleRR && textRR && iconRR) {
    if (params.rrRatio >= 3) {
      textRR.textContent = `Reward Ratio: 1:${params.rrRatio.toFixed(1)} (Min 1:3 Met)`;
      ruleRR.className = 'rule-item passed';
      iconRR.innerHTML = checkIcon;
    } else {
      textRR.textContent = `Reward Ratio: 1:${params.rrRatio.toFixed(1)} (Below 1:3!)`;
      ruleRR.className = 'rule-item failed';
      iconRR.innerHTML = failIcon;
    }
  }

  // 3. Leverage / Risk Caps
  if (ruleRiskLimit && textRiskLimit && iconRiskLimit) {
    if (currentTradeTab === 'digital') {
      if (params.leverage <= 25) {
        textRiskLimit.textContent = `Leverage Safe: ${params.leverage}x (Max 25x)`;
        ruleRiskLimit.className = 'rule-item passed';
        iconRiskLimit.innerHTML = checkIcon;
      } else {
        textRiskLimit.textContent = `Leverage Alert: ${params.leverage}x (Over 25x!)`;
        ruleRiskLimit.className = 'rule-item failed';
        iconRiskLimit.innerHTML = failIcon;
      }
    } else {
      if (params.riskPct <= 3) {
        textRiskLimit.textContent = `Risk Safe: ${params.riskPct.toFixed(1)}% of capital (Max 3%)`;
        ruleRiskLimit.className = 'rule-item passed';
        iconRiskLimit.innerHTML = checkIcon;
      } else {
        textRiskLimit.textContent = `Risk Alert: ${params.riskPct.toFixed(1)}% (Over 3% Cap!)`;
        ruleRiskLimit.className = 'rule-item failed';
        iconRiskLimit.innerHTML = failIcon;
      }
    }
  }

  // 4. Capital Preservation
  if (ruleCapitalPreservation && textCapitalPreservation && iconCapitalPreservation) {
    if (params.lossesToBlowup >= 10) {
      textCapitalPreservation.textContent = `Survival: ${params.lossesToBlowup === Infinity ? 'Infinite' : params.lossesToBlowup} losses to blowup (Safe)`;
      ruleCapitalPreservation.className = 'rule-item passed';
      iconCapitalPreservation.innerHTML = checkIcon;
    } else {
      textCapitalPreservation.textContent = `Survival Alert: blows up in ${params.lossesToBlowup} losses!`;
      ruleCapitalPreservation.className = 'rule-item failed';
      iconCapitalPreservation.innerHTML = failIcon;
    }
  }
}

function renderGrowthChart(labels, data) {
  const chartCanvas = document.getElementById('growthChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (growthChartInstance) {
    growthChartInstance.destroy();
  }
  
  const currencyCode = document.getElementById('tradeCurrency')?.value || 'USD';
  
  growthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projected Capital',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#1e3a8a',
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Capital: ${formatLakhCrore(context.raw, currencyCode)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            callback: function(value) {
              return formatLakhCrore(value, currencyCode);
            }
          }
        }
      }
    }
  });
}

/**
 * SHARK LEVERAGE TRADE SIMULATOR FUNCTIONS
 */
function calculateSharkTrade() {
  const marginMode = currentSharkMarginMode;
  const leverage = currentSharkLeverage;
  const asset = currentSharkAsset;
  const direction = currentSharkDirection;

  const balance = parseFloat(document.getElementById('sharkAvailableBalance').value) || 0;
  const entryPrice = parseFloat(document.getElementById('sharkEntryPrice').value) || 0;
  const marginAmount = parseFloat(document.getElementById('sharkMarginAmount').value) || 0;
  const isTPSLActive = document.getElementById('sharkSetTPSL').checked;
  let tpPrice = 0;
  let slPrice = 0;

  const rawTpVal = parseFloat(document.getElementById('sharkTargetProfitPrice').value) || 0;
  const rawSlVal = parseFloat(document.getElementById('sharkStopLossPrice').value) || 0;

  if (currentSharkTPSLMode === 'price') {
    tpPrice = rawTpVal;
    slPrice = rawSlVal;
  } else {
    if (direction === 'long') {
      tpPrice = entryPrice * (1 + rawTpVal / 100);
      slPrice = entryPrice * (1 - rawSlVal / 100);
    } else {
      tpPrice = entryPrice * (1 - rawTpVal / 100);
      slPrice = entryPrice * (1 + rawSlVal / 100);
    }
  }

  // 1. Calculate Quantity
  // Position Value = Margin * Leverage
  const positionValue = marginAmount * leverage;
  const qty = entryPrice > 0 ? (positionValue / entryPrice) : 0;

  // Display Quantity label
  const qtyCalculated = document.getElementById('sharkQtyCalculated');
  const assetLabel = asset === 'crypto_eth' ? 'ETH' : (asset === 'crypto_btc' ? 'BTC' : 'Oz Gold');
  if (qtyCalculated) {
    qtyCalculated.textContent = `Position: ${qty.toFixed(4)} ${assetLabel}`;
  }

  // 2. Transaction Fees: 0.05% maker/taker entry & exit
  const entryFee = positionValue * 0.0005;
  let exitFee = positionValue * 0.0005; 
  
  // 3. Liquidation Price
  const mm = 0.01; 
  let liqPrice = 0;
  if (direction === 'long') {
    if (marginMode === 'isolated') {
      liqPrice = entryPrice * (1 - 1 / leverage + mm);
    } else {
      liqPrice = entryPrice * (1 - balance / positionValue + mm);
    }
    if (liqPrice < 0) liqPrice = 0;
  } else {
    if (marginMode === 'isolated') {
      liqPrice = entryPrice * (1 + 1 / leverage - mm);
    } else {
      liqPrice = entryPrice * (1 + balance / positionValue - mm);
    }
  }

  // 4. Calculate TP / SL Projections
  let targetProfitVal = 0;
  let stopLossVal = 0;
  let rrRatio = 'N/A';
  let netGain = 0;
  let tax = 0;

  const tpPct = entryPrice > 0 ? (direction === 'long' 
    ? ((tpPrice - entryPrice) / entryPrice * 100) 
    : ((entryPrice - tpPrice) / entryPrice * 100)) : 0;
    
  const slPct = entryPrice > 0 ? (direction === 'long'
    ? ((entryPrice - slPrice) / entryPrice * 100)
    : ((slPrice - entryPrice) / entryPrice * 100)) : 0;
  
  const tpAstPct = document.getElementById('sharkTPAstPct');
  const slAstPct = document.getElementById('sharkSLAstPct');
  if (tpAstPct) {
    if (currentSharkTPSLMode === 'price') {
      tpAstPct.textContent = `${tpPct >= 0 ? '+' : ''}${tpPct.toFixed(1)}%`;
      tpAstPct.style.color = tpPct >= 0 ? '#34d399' : '#f87171';
    } else {
      tpAstPct.textContent = formatPreciseCurrency(tpPrice);
      tpAstPct.style.color = '#34d399';
    }
  }
  if (slAstPct) {
    if (currentSharkTPSLMode === 'price') {
      slAstPct.textContent = `-${slPct.toFixed(1)}%`;
      slAstPct.style.color = '#f87171';
    } else {
      slAstPct.textContent = formatPreciseCurrency(slPrice);
      slAstPct.style.color = '#f87171';
    }
  }

  if (isTPSLActive && entryPrice > 0) {
    let rawTpGain = 0;
    let rawSlLoss = 0;

    if (direction === 'long') {
      rawTpGain = qty * (tpPrice - entryPrice);
      rawSlLoss = qty * (entryPrice - slPrice);
    } else {
      rawTpGain = qty * (entryPrice - tpPrice);
      rawSlLoss = qty * (slPrice - entryPrice);
    }

    targetProfitVal = rawTpGain;
    stopLossVal = rawSlLoss;

    const actualTpExitFee = qty * tpPrice * 0.0005;
    const actualSlExitFee = qty * slPrice * 0.0005;
    
    const tpNetGross = targetProfitVal - (entryFee + actualTpExitFee);
    const slNetGross = -stopLossVal - (entryFee + actualSlExitFee);

    if (rawSlLoss > 0) {
      rrRatio = `1 : ${(rawTpGain / rawSlLoss).toFixed(1)}`;
    }

    const taxRate = asset.startsWith('crypto') ? 0.30 : 0.15;
    const taxLabel = document.getElementById('sharkTaxLabel');
    if (taxLabel) {
      taxLabel.textContent = asset.startsWith('crypto') ? 'Est. VDA Tax (30%)' : 'Est. STCG Tax (15%)';
    }

    if (tpNetGross > 0) {
      tax = tpNetGross * taxRate;
      netGain = tpNetGross - tax;
    } else {
      tax = 0;
      netGain = tpNetGross; 
    }
    
    exitFee = actualTpExitFee;
  }

  document.getElementById('sharkResMarginRequired').textContent = formatPreciseCurrency(marginAmount);
  document.getElementById('sharkResPositionValue').textContent = formatPreciseCurrency(positionValue);
  document.getElementById('sharkResLiquidationPrice').textContent = formatPreciseCurrency(liqPrice);
  
  const rrElement = document.getElementById('sharkResRiskReward');
  if (rrElement) {
    rrElement.textContent = rrRatio;
    rrElement.className = 'shark-metric-val';
    if (rrRatio !== 'N/A') {
      const parsedRatio = parseFloat(rrRatio.split(':')[1]);
      if (parsedRatio >= 3) {
        rrElement.classList.add('green');
      } else {
        rrElement.classList.add('red');
      }
    }
  }

  const totalFees = entryFee + exitFee;
  
  const grossPnlEl = document.getElementById('sharkResGrossPnl');
  if (grossPnlEl) {
    grossPnlEl.textContent = formatPreciseCurrency(targetProfitVal);
  }
  
  const feesEl = document.getElementById('sharkResFees');
  if (feesEl) {
    feesEl.textContent = `-${formatPreciseCurrency(totalFees)}`;
  }
  
  const taxEl = document.getElementById('sharkResTax');
  if (taxEl) {
    taxEl.textContent = `-${formatPreciseCurrency(tax)}`;
  }
  
  const netIncomeEl = document.getElementById('sharkResNetIncome');
  if (netIncomeEl) {
    const sign = netGain >= 0 ? '+' : '-';
    const displayVal = Math.abs(netGain);
    netIncomeEl.textContent = `${sign}${formatPreciseCurrency(displayVal)}`;
    netIncomeEl.style.color = netGain >= 0 ? '#34d399' : '#f87171';
  }

  const endCapitalEl = document.getElementById('sharkResEndCapital');
  if (endCapitalEl) {
    const endCapital = balance + netGain;
    endCapitalEl.textContent = formatPreciseCurrency(endCapital);
  }

  renderSharkScenarios(entryPrice, qty, leverage, direction, marginMode, balance, tpPrice, slPrice, liqPrice, asset);
  calculateSharkSurvivalAndGrowth(balance, marginAmount, leverage, direction, entryPrice, qty, liqPrice, isTPSLActive, slPrice, tpPrice, asset, entryFee, netGain);
}

function renderSharkScenarios(entryPrice, qty, leverage, direction, marginMode, balance, tpPrice, slPrice, liqPrice, asset) {
  const tbody = document.getElementById('sharkScenarioBody');
  if (!tbody || entryPrice <= 0) return;

  tbody.innerHTML = '';
  
  const shifts = [25, 10, 5, 2, 1, -1, -2, -5, -10, -25];
  
  if (direction === 'short') {
    shifts.reverse();
  }

  const taxRate = asset.startsWith('crypto') ? 0.30 : 0.15;
  const entryFee = qty * entryPrice * 0.0005;

  shifts.forEach(pct => {
    const targetPrice = entryPrice * (1 + pct / 100);
    
    let outcome = 'Normal';
    let outcomeClass = 'normal';
    
    let isLiquidated = false;
    let isSLHit = false;
    let isTPHit = false;

    if (direction === 'long') {
      if (targetPrice <= liqPrice) {
        isLiquidated = true;
      } else if (slPrice > 0 && targetPrice <= slPrice) {
        isSLHit = true;
      } else if (tpPrice > 0 && targetPrice >= tpPrice) {
        isTPHit = true;
      }
    } else {
      if (targetPrice >= liqPrice) {
        isLiquidated = true;
      } else if (slPrice > 0 && targetPrice >= slPrice) {
        isSLHit = true;
      } else if (tpPrice > 0 && targetPrice <= tpPrice) {
        isTPHit = true;
      }
    }

    let pnl = 0;
    let roi = 0;

    if (isLiquidated) {
      outcome = 'LIQUIDATED 💀';
      outcomeClass = 'liq';
      pnl = -qty * entryPrice / leverage; 
      roi = -100;
    } else {
      if (direction === 'long') {
        pnl = qty * (targetPrice - entryPrice);
      } else {
        pnl = qty * (entryPrice - targetPrice);
      }
      
      const exitFee = qty * targetPrice * 0.0005;
      pnl = pnl - (entryFee + exitFee);

      if (pnl > 0) {
        const scenarioTax = pnl * taxRate;
        pnl = pnl - scenarioTax;
      }

      const initialMargin = (qty * entryPrice) / leverage;
      roi = (pnl / initialMargin) * 100;

      if (isTPHit) {
        outcome = 'Take Profit 🎯';
        outcomeClass = 'tp';
      } else if (isSLHit) {
        outcome = 'Stop Loss 🛑';
        outcomeClass = 'sl';
      }
    }

    const pnlSign = pnl >= 0 ? '+' : '';
    const roiSign = roi >= 0 ? '+' : '';
    const rowColor = pnl >= 0 ? 'color: #34d399;' : 'color: #f87171;';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; ${rowColor}">${pct >= 0 ? '+' : ''}${pct}%</td>
      <td>${formatPreciseCurrency(targetPrice)}</td>
      <td style="${rowColor}">${pnlSign}${formatPreciseCurrency(Math.abs(pnl))}</td>
      <td style="${rowColor}">${roiSign}${roi.toFixed(1)}%</td>
      <td><span class="shark-outcome-badge ${outcomeClass}">${outcome}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Global helpers for quick leverage click
window.setSharkLeverage = function(val) {
  currentSharkLeverage = val;
  const sharkLeverageSlider = document.getElementById('sharkLeverageSlider');
  const sharkLeverageSliderVal = document.getElementById('sharkLeverageSliderVal');
  const sharkLeverageLabel = document.getElementById('sharkLeverageLabel');
  
  if (sharkLeverageSlider) sharkLeverageSlider.value = val;
  if (sharkLeverageSliderVal) sharkLeverageSliderVal.textContent = `${val}x`;
  if (sharkLeverageLabel) sharkLeverageLabel.textContent = `${val}x`;
  calculateSharkTrade();
};

// Wire up events in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const sharkLeverageTriggerBtn = document.getElementById('sharkLeverageTriggerBtn');
  const sharkLeveragePopup = document.getElementById('sharkLeveragePopup');
  const sharkLeverageSlider = document.getElementById('sharkLeverageSlider');
  
  if (sharkLeverageTriggerBtn && sharkLeveragePopup) {
    sharkLeverageTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = sharkLeveragePopup.style.display === 'flex';
      sharkLeveragePopup.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (sharkLeveragePopup.style.display === 'flex' && !sharkLeveragePopup.contains(e.target) && e.target !== sharkLeverageTriggerBtn) {
        sharkLeveragePopup.style.display = 'none';
      }
    });
  }

  if (sharkLeverageSlider) {
    sharkLeverageSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      setSharkLeverage(val);
    });
  }

  const sharkMarginIsolated = document.getElementById('sharkMarginIsolated');
  const sharkMarginCross = document.getElementById('sharkMarginCross');
  
  if (sharkMarginIsolated && sharkMarginCross) {
    sharkMarginIsolated.addEventListener('click', () => {
      currentSharkMarginMode = 'isolated';
      sharkMarginIsolated.classList.add('active');
      sharkMarginCross.classList.remove('active');
      calculateSharkTrade();
    });

    sharkMarginCross.addEventListener('click', () => {
      currentSharkMarginMode = 'cross';
      sharkMarginCross.classList.add('active');
      sharkMarginIsolated.classList.remove('active');
      calculateSharkTrade();
    });
  }

  const sharkBtnLong = document.getElementById('sharkBtnLong');
  const sharkBtnShort = document.getElementById('sharkBtnShort');
  
  if (sharkBtnLong && sharkBtnShort) {
    sharkBtnLong.addEventListener('click', () => {
      currentSharkDirection = 'long';
      sharkBtnLong.classList.remove('inactive');
      sharkBtnShort.classList.add('inactive');
      calculateSharkTrade();
    });

    sharkBtnShort.addEventListener('click', () => {
      currentSharkDirection = 'short';
      sharkBtnShort.classList.remove('inactive');
      sharkBtnLong.classList.add('inactive');
      calculateSharkTrade();
    });
  }

  const sharkAssetSelect = document.getElementById('sharkAssetSelect');
  if (sharkAssetSelect) {
    sharkAssetSelect.addEventListener('change', (e) => {
      currentSharkAsset = e.target.value;
      applyCurrencyAndAssetDefaults();
      calculateSharkTrade();
    });
  }

  const sharkPct25 = document.getElementById('sharkPct25');
  const sharkPct50 = document.getElementById('sharkPct50');
  const sharkPct75 = document.getElementById('sharkPct75');
  const sharkPctMax = document.getElementById('sharkPctMax');
  const sharkAvailableBalance = document.getElementById('sharkAvailableBalance');
  const sharkMarginAmount = document.getElementById('sharkMarginAmount');

  function setSharkMarginPct(pct) {
    const bal = parseFloat(sharkAvailableBalance.value) || 0;
    const amount = bal * pct;
    sharkMarginAmount.value = Math.round(amount);
    calculateSharkTrade();
  }

  if (sharkPct25) sharkPct25.addEventListener('click', () => setSharkMarginPct(0.25));
  if (sharkPct50) sharkPct50.addEventListener('click', () => setSharkMarginPct(0.50));
  if (sharkPct75) sharkPct75.addEventListener('click', () => setSharkMarginPct(0.75));
  if (sharkPctMax) sharkPctMax.addEventListener('click', () => setSharkMarginPct(1.0));

  const sharkSetTPSL = document.getElementById('sharkSetTPSL');
  const sharkTPSLInputs = document.getElementById('sharkTPSLInputs');
  if (sharkSetTPSL && sharkTPSLInputs) {
    sharkSetTPSL.addEventListener('change', (e) => {
      sharkTPSLInputs.style.display = e.target.checked ? 'flex' : 'none';
      calculateSharkTrade();
    });
  }

  const sharkTPSLModePrice = document.getElementById('sharkTPSLModePrice');
  const sharkTPSLModePct = document.getElementById('sharkTPSLModePct');
  const sharkTPInputLabel = document.getElementById('sharkTPInputLabel');
  const sharkSLInputLabel = document.getElementById('sharkSLInputLabel');
  const sharkTPInputSuffix = document.getElementById('sharkTPInputSuffix');
  const sharkSLInputSuffix = document.getElementById('sharkSLInputSuffix');
  const sharkTargetProfitPrice = document.getElementById('sharkTargetProfitPrice');
  const sharkStopLossPrice = document.getElementById('sharkStopLossPrice');
  const sharkEntryPrice = document.getElementById('sharkEntryPrice');

  if (sharkTPSLModePrice && sharkTPSLModePct) {
    sharkTPSLModePrice.addEventListener('click', () => {
      if (currentSharkTPSLMode === 'price') return;
      
      const currentEntry = parseFloat(sharkEntryPrice.value) || 0;
      const tpPctVal = parseFloat(sharkTargetProfitPrice.value) || 0;
      const slPctVal = parseFloat(sharkStopLossPrice.value) || 0;

      currentSharkTPSLMode = 'price';
      sharkTPSLModePrice.classList.add('active');
      sharkTPSLModePct.classList.remove('active');

      if (sharkTPInputLabel) sharkTPInputLabel.textContent = 'Take Profit Price';
      if (sharkSLInputLabel) sharkSLInputLabel.textContent = 'Stop Loss Price';
      if (sharkTPInputSuffix) sharkTPInputSuffix.textContent = '₹';
      if (sharkSLInputSuffix) sharkSLInputSuffix.textContent = '₹';

      if (currentEntry > 0) {
        let tpPriceVal = 0;
        let slPriceVal = 0;
        if (currentSharkDirection === 'long') {
          tpPriceVal = currentEntry * (1 + tpPctVal / 100);
          slPriceVal = currentEntry * (1 - slPctVal / 100);
        } else {
          tpPriceVal = currentEntry * (1 - tpPctVal / 100);
          slPriceVal = currentEntry * (1 + slPctVal / 100);
        }
        sharkTargetProfitPrice.value = Math.round(tpPriceVal);
        sharkStopLossPrice.value = Math.round(slPriceVal);
      }
      calculateSharkTrade();
    });

    sharkTPSLModePct.addEventListener('click', () => {
      if (currentSharkTPSLMode === 'pct') return;

      const currentEntry = parseFloat(sharkEntryPrice.value) || 0;
      const currentTp = parseFloat(sharkTargetProfitPrice.value) || 0;
      const currentSl = parseFloat(sharkStopLossPrice.value) || 0;

      currentSharkTPSLMode = 'pct';
      sharkTPSLModePct.classList.add('active');
      sharkTPSLModePrice.classList.remove('active');

      if (sharkTPInputLabel) sharkTPInputLabel.textContent = 'Take Profit %';
      if (sharkSLInputLabel) sharkSLInputLabel.textContent = 'Stop Loss %';
      if (sharkTPInputSuffix) sharkTPInputSuffix.textContent = '%';
      if (sharkSLInputSuffix) sharkSLInputSuffix.textContent = '%';

      if (currentEntry > 0) {
        const tpPctVal = Math.abs((currentTp - currentEntry) / currentEntry * 100).toFixed(1);
        const slPctVal = Math.abs((currentEntry - currentSl) / currentEntry * 100).toFixed(1);
        sharkTargetProfitPrice.value = tpPctVal;
        sharkStopLossPrice.value = slPctVal;
      }
      calculateSharkTrade();
    });
  }

  const inputs = ['sharkAvailableBalance', 'sharkEntryPrice', 'sharkMarginAmount', 'sharkTargetProfitPrice', 'sharkStopLossPrice', 'survivalWinRateSlider', 'survivalTradesPerDay', 'survivalDaysPerMonth', 'survivalYearsSlider', 'survivalCompoundProfits', 'survivalRatioWinTrades', 'survivalRatioTotalTrades', 'survivalSimulateSpikes', 'survivalSpikeProb', 'survivalSlippagePct'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventName = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        if (id === 'survivalWinRateSlider') {
          const lbl = document.getElementById('survivalWinRateLabel');
          if (lbl) lbl.textContent = `${el.value}%`;
        } else if (id === 'survivalYearsSlider') {
          const lbl = document.getElementById('survivalYearsLabel');
          if (lbl) lbl.textContent = `${el.value} Year${el.value > 1 ? 's' : ''}`;
        }
        calculateSharkTrade();
      });
    }
  });

  const survivalCurrencySelect = document.getElementById('survivalCurrencySelect');
  if (survivalCurrencySelect) {
    survivalCurrencySelect.addEventListener('change', () => {
      const symbol = getCurrencySymbol();
      document.querySelectorAll('.shark-currency-suffix').forEach(el => {
        el.textContent = symbol;
      });
      
      const currency = survivalCurrencySelect.value;
      if (sharkAssetSelect) {
        sharkAssetSelect.options[0].textContent = `ETH-${currency} (Ethereum)`;
        sharkAssetSelect.options[1].textContent = `BTC-${currency} (Bitcoin)`;
        sharkAssetSelect.options[2].textContent = `XAU-${currency} (Gold / Commodity)`;
      }
      
      applyCurrencyAndAssetDefaults();
      calculateSharkTrade();
    });
  }

  const winModeSliderBtn = document.getElementById('survivalWinModeSlider');
  const winModeRatioBtn = document.getElementById('survivalWinModeRatio');
  const winSliderContainer = document.getElementById('survivalWinSliderContainer');
  const winRatioContainer = document.getElementById('survivalWinRatioContainer');

  if (winModeSliderBtn && winModeRatioBtn && winSliderContainer && winRatioContainer) {
    winModeSliderBtn.addEventListener('click', () => {
      if (currentSurvivalWinMode === 'slider') return;
      currentSurvivalWinMode = 'slider';
      winModeSliderBtn.classList.add('active');
      winModeRatioBtn.classList.remove('active');
      winSliderContainer.style.display = 'flex';
      winRatioContainer.style.display = 'none';
      calculateSharkTrade();
    });

    winModeRatioBtn.addEventListener('click', () => {
      if (currentSurvivalWinMode === 'ratio') return;
      currentSurvivalWinMode = 'ratio';
      winModeRatioBtn.classList.add('active');
      winModeSliderBtn.classList.remove('active');
      winSliderContainer.style.display = 'none';
      winRatioContainer.style.display = 'flex';
      calculateSharkTrade();
    });
  }

  const simulateSpikesCheck = document.getElementById('survivalSimulateSpikes');
  const spikeControlsDiv = document.getElementById('survivalSpikeControls');
  if (simulateSpikesCheck && spikeControlsDiv) {
    simulateSpikesCheck.addEventListener('change', () => {
      spikeControlsDiv.style.display = simulateSpikesCheck.checked ? 'flex' : 'none';
      calculateSharkTrade();
    });
  }

  // Initial calculation trigger
  calculateSharkTrade();
});

function calculateSharkSurvivalAndGrowth(balance, marginAmount, leverage, direction, entryPrice, qty, liqPrice, isTPSLActive, slPrice, tpPrice, asset, entryFee, netGain) {
  const marginMode = currentSharkMarginMode;
  
  // 1. Calculate Liquidation blow-out move %
  const liqMovePct = entryPrice > 0 ? (Math.abs(liqPrice - entryPrice) / entryPrice * 100) : 0;
  const liqMoveEl = document.getElementById('survivalLiquidationBlowMove');
  if (liqMoveEl) {
    const sign = (direction === 'long') ? '-' : '+';
    liqMoveEl.textContent = `${sign}${liqMovePct.toFixed(2)}%`;
  }

  // 1b. Worst-Case Spike Scenarios & Historical Volatility
  const spikeWorstMsgEl = document.getElementById('survivalSpikeWorstCaseMsg');
  const spikeMatrixRowsEl = document.getElementById('survivalSpikeMatrixRows');
  const spikeHistoryRefEl = document.getElementById('survivalSpikeHistoryRef');

  if (spikeWorstMsgEl && spikeMatrixRowsEl && spikeHistoryRefEl) {
    const symbol = getCurrencySymbol();
    
    // Liquidation message
    spikeWorstMsgEl.innerHTML = `An adverse price move of <strong>${liqMovePct.toFixed(2)}%</strong> (price reaching <strong>${symbol}${formatPreciseCurrency(liqPrice)}</strong>) will trigger <strong>100% Instant Liquidation</strong>.`;
    
    // Scenarios to show
    let scenarios = [];
    if (asset.includes('gold')) {
      scenarios = [1, 2, 5, 10];
    } else {
      scenarios = [2, 5, 10, 20];
    }
    
    // Include the actual Stop Loss move if active
    let slMovePct = 0;
    if (isTPSLActive && entryPrice > 0 && slPrice > 0) {
      slMovePct = Math.abs(entryPrice - slPrice) / entryPrice * 100;
      // Insert in sorted order if not already close
      if (!scenarios.some(v => Math.abs(v - slMovePct) < 0.1)) {
        scenarios.push(slMovePct);
        scenarios.sort((a, b) => a - b);
      }
    }
    
    // Clear old rows
    spikeMatrixRowsEl.innerHTML = '';
    
    scenarios.forEach(advPct => {
      // Calculate target price for this move
      const targetPrice = (direction === 'long') ? (entryPrice * (1 - advPct / 100)) : (entryPrice * (1 + advPct / 100));
      
      let outcome = '';
      let outcomeColor = '';
      let capitalLoss = 0;
      
      const isLiq = advPct >= liqMovePct;
      
      if (isLiq) {
        outcome = '💥 Liquidated';
        outcomeColor = '#f87171';
        capitalLoss = (marginMode === 'isolated') ? marginAmount : balance;
      } else if (isTPSLActive && advPct >= slMovePct) {
        outcome = '🛑 Stop Loss Hit';
        outcomeColor = '#fbbf24';
        const slippageVal = parseFloat(document.getElementById('survivalSlippagePct')?.value) || 15;
        let loss = (qty * Math.abs(entryPrice - slPrice) + entryFee + (qty * slPrice * 0.0005)) * (1 + slippageVal / 100);
        if (marginMode === 'isolated') {
          loss = Math.min(loss, marginAmount);
        }
        capitalLoss = loss;
      } else {
        outcome = '📉 Floating Loss';
        outcomeColor = 'var(--text-secondary)';
        capitalLoss = qty * entryPrice * (advPct / 100);
        if (marginMode === 'isolated') {
          capitalLoss = Math.min(capitalLoss, marginAmount);
        }
      }
      
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'grid';
      rowDiv.style.gridTemplateColumns = '1.2fr 1.5fr 1.8fr 1.5fr';
      rowDiv.style.padding = '0.3rem 0.4rem';
      rowDiv.style.borderTop = '1px solid rgba(255,255,255,0.03)';
      rowDiv.style.alignItems = 'center';
      
      // Highlight row if it is the user's active stop loss
      const isUserSL = isTPSLActive && Math.abs(advPct - slMovePct) < 0.1;
      if (isUserSL) {
        rowDiv.style.background = 'rgba(251, 191, 36, 0.04)';
      }
      
      const formatLoss = formatPreciseCurrency(capitalLoss);
      
      rowDiv.innerHTML = `
        <span style="font-weight: 600; color: ${isLiq ? '#f87171' : 'var(--text-primary)'};">${advPct.toFixed(1)}% ${isUserSL ? ' (SL)' : ''}</span>
        <span style="font-family: monospace; color: var(--text-secondary);">${symbol}${formatPreciseCurrency(targetPrice)}</span>
        <span style="color: ${outcomeColor}; font-weight: 600;">${outcome}</span>
        <span style="font-family: monospace; font-weight: 700; color: #f87171;">${symbol}${formatLoss}</span>
      `;
      spikeMatrixRowsEl.appendChild(rowDiv);
    });
    
    // Historical reference texts
    let historyText = '';
    if (asset.includes('btc')) {
      historyText = `
        <strong>Bitcoin (BTC) Past History</strong>:<br>
        • <strong>Typical Spikes (3% - 5%)</strong>: Happen <strong>weekly</strong> (caused by leverage liquidations & high perpetual funding rates).<br>
        • <strong>Medium Flash Crashes (8% - 12%)</strong>: Happen <strong>monthly</strong> (usually long/short squeezes).<br>
        • <strong>Black Swans (15% - 30%)</strong>: Happen <strong>1-2 times a year</strong> (e.g., FTX crash: -22% in 2 days; COVID crash: -38% in 24 hours).
      `;
    } else if (asset.includes('eth')) {
      historyText = `
        <strong>Ethereum (ETH) Past History</strong>:<br>
        • <strong>Typical Spikes (4% - 6%)</strong>: Happen <strong>weekly</strong> (highly volatile altcoin perpetual swaps).<br>
        • <strong>Medium Flash Crashes (10% - 15%)</strong>: Happen <strong>monthly</strong> (liquidation cascades on decentralized protocols).<br>
        • <strong>Black Swans (20% - 40%)</strong>: Happen <strong>1-2 times a year</strong> (steeper crashes than BTC due to thinner order book liquidity).
      `;
    } else {
      historyText = `
        <strong>Gold (XAU) Past History</strong>:<br>
        • <strong>Macro Spikes (1% - 1.5%)</strong>: Happen <strong>monthly</strong> during major CPI, non-farm payrolls, or Fed rate decisions.<br>
        • <strong>Volatility Events (2% - 4%)</strong>: Happen <strong>3-4 times a year</strong> (geopolitical escalation or banking crises).<br>
        • <strong>Liquidation Crashes (5% - 8%)</strong>: Extremely <strong>rare</strong> (e.g. the March 2020 liquidity squeeze, where gold dropped 5% in hours before skyrocketing).
      `;
    }
    spikeHistoryRefEl.innerHTML = historyText;
  }

  // 2. Risk per trade
  let totalRisk = 0;
  if (isTPSLActive && entryPrice > 0 && slPrice > 0) {
    const stopLossLoss = qty * Math.abs(entryPrice - slPrice);
    const slExitFee = qty * slPrice * 0.0005;
    totalRisk = stopLossLoss + entryFee + slExitFee;
  } else {
    totalRisk = (marginMode === 'isolated') ? marginAmount : balance;
  }
  
  const riskPerTradeEl = document.getElementById('survivalRiskPerTrade');
  if (riskPerTradeEl) {
    riskPerTradeEl.textContent = formatPreciseCurrency(totalRisk);
  }

  // 3. Consecutive losses to blow capital
  const consecutiveLosses = totalRisk > 0 ? Math.floor(balance / totalRisk) : 1;
  const consecutiveLossesEl = document.getElementById('survivalConsecutiveLosses');
  if (consecutiveLossesEl) {
    consecutiveLossesEl.textContent = consecutiveLosses <= 0 ? 'Instant' : `${consecutiveLosses} trades`;
  }

  // 4. Position size vs capital exposure
  const capitalExposure = balance > 0 ? (totalRisk / balance * 100) : 0;
  const exposureEl = document.getElementById('survivalCapitalExposure');
  if (exposureEl) {
    exposureEl.textContent = `${capitalExposure.toFixed(2)}%`;
  }

  // 5. Ruin Risk Warning Cards
  const warningCard = document.getElementById('survivalWarningCard');
  const warningText = document.getElementById('survivalWarningText');
  if (warningCard && warningText) {
    if (leverage >= 50 || capitalExposure >= 25 || consecutiveLosses <= 4) {
      warningCard.style.display = 'block';
      let msg = '';
      if (leverage >= 50) {
        msg += `⚠️ <strong>High Leverage Danger</strong>: At <strong>${leverage}x leverage</strong>, a tiny ${liqMovePct.toFixed(1)}% price move will trigger <strong>100% liquidation</strong>. `;
      } else if (capitalExposure >= 25) {
        msg += `⚠️ <strong>High Exposure Risk</strong>: You are risking <strong>${capitalExposure.toFixed(1)}%</strong> of your capital per trade. Just <strong>${consecutiveLosses}</strong> consecutive losing trades will blow your entire balance! `;
      } else {
        msg += `⚠️ <strong>Low Survival Buffer</strong>: Your stop loss or position margin size allows only <strong>${consecutiveLosses}</strong> losing trades before your capital is blown. `;
      }
      msg += `To survive, consider reducing leverage or position margin size, or setting a tighter Stop Loss.`;
      warningText.innerHTML = msg;
    } else {
      warningCard.style.display = 'none';
    }
  }

  // 6. Multi-Year Growth Simulation based on trades/day, trades/month and configured years
  let winRate = 50;
  if (currentSurvivalWinMode === 'slider') {
    const winRateSlider = document.getElementById('survivalWinRateSlider');
    winRate = winRateSlider ? (parseFloat(winRateSlider.value) || 50) : 50;
  } else {
    const winT = parseFloat(document.getElementById('survivalRatioWinTrades').value) || 0;
    const totT = parseFloat(document.getElementById('survivalRatioTotalTrades').value) || 1;
    winRate = totT > 0 ? (winT / totT * 100) : 0;
    const ratioLabel = document.getElementById('survivalWinRateRatioLabel');
    if (ratioLabel) {
      ratioLabel.textContent = `${winRate.toFixed(1)}%`;
    }
  }
  const W = winRate / 100;

  const tradesPerDay = parseFloat(document.getElementById('survivalTradesPerDay').value) || 2;
  const daysPerMonth = parseFloat(document.getElementById('survivalDaysPerMonth').value) || 22;
  const yearsSlider = document.getElementById('survivalYearsSlider');
  const years = yearsSlider ? (parseFloat(yearsSlider.value) || 1) : 1;

  const tradesPerMonth = Math.round(tradesPerDay * daysPerMonth);
  const totalTrades = Math.round(tradesPerMonth * 12 * years);

  const sliderEquivEl = document.getElementById('survivalWinRateSliderEquiv');
  if (sliderEquivEl) {
    const sliderWinRate = parseFloat(document.getElementById('survivalWinRateSlider')?.value) || 50;
    const equivWins = Math.round((sliderWinRate / 100) * tradesPerMonth);
    sliderEquivEl.innerHTML = `This corresponds to <strong>${equivWins} profitable trade${equivWins !== 1 ? 's' : ''}</strong> out of <strong>${tradesPerMonth} trades/month</strong>.`;
  }

  const simulateSpikes = document.getElementById('survivalSimulateSpikes')?.checked || false;
  const spikeProb = parseFloat(document.getElementById('survivalSpikeProb')?.value) || 2;
  const slippagePct = parseFloat(document.getElementById('survivalSlippagePct')?.value) || 15;

  const winPayout = isTPSLActive ? netGain : (totalRisk * 1.5);
  const lossPayout = -totalRisk;
  
  let expectedChangePerTrade = (W * winPayout) + ((1 - W) * lossPayout);
  if (simulateSpikes) {
    const normalLossProb = (1 - W) * (1 - (spikeProb / 100));
    const spikeLossProb = (1 - W) * (spikeProb / 100);
    
    let spikeLossPayout = -totalRisk * (1 + slippagePct / 100);
    if (marginMode === 'isolated') {
      spikeLossPayout = -Math.min(totalRisk * (1 + slippagePct / 100), marginAmount);
    }
    
    expectedChangePerTrade = (W * winPayout) + (normalLossProb * lossPayout) + (spikeLossProb * spikeLossPayout);
  }

  const isCompounding = document.getElementById('survivalCompoundProfits')?.checked;
  const riskFraction = balance > 0 ? (totalRisk / balance) : 0;
  const rewardFraction = balance > 0 ? (winPayout / balance) : 0;

  const labels = ['Start'];
  const expectedData = [balance];
  const simulatedData = [balance];

  let currentExpected = balance;
  let currentSimulated = balance;
  let simulatedBankruptcy = false;
  let simulatedBankruptcyTrade = -1;
  let simulatedSpikesCount = 0;
  let bankruptcyBySpike = false;

  let seed = 12345;
  function prng() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const totalMonths = years * 12;
  let tradeIndex = 0;

  for (let m = 1; m <= totalMonths; m++) {
    for (let t = 0; t < tradesPerMonth; t++) {
      tradeIndex++;

      // 1. Calculate trade-level payouts
      let expectedChange = expectedChangePerTrade;
      let currentRiskSimulated = totalRisk;
      let currentWinSimulated = winPayout;

      if (isCompounding) {
        // Compound expected values
        const currentRiskExpected = currentExpected * riskFraction;
        const currentWinExpected = currentExpected * rewardFraction;
        const currentMarginExpected = currentExpected * (marginAmount / balance);

        if (simulateSpikes) {
          const normalLossProb = (1 - W) * (1 - (spikeProb / 100));
          const spikeLossProb = (1 - W) * (spikeProb / 100);

          let spikeLossPayout = -currentRiskExpected * (1 + slippagePct / 100);
          if (marginMode === 'isolated') {
            spikeLossPayout = -Math.min(currentRiskExpected * (1 + slippagePct / 100), currentMarginExpected);
          }

          expectedChange = (W * currentWinExpected) + (normalLossProb * (-currentRiskExpected)) + (spikeLossProb * spikeLossPayout);
        } else {
          expectedChange = (W * currentWinExpected) - ((1 - W) * currentRiskExpected);
        }

        // Compound simulated values
        currentRiskSimulated = currentSimulated * riskFraction;
        currentWinSimulated = currentSimulated * rewardFraction;
      }

      // Expected Capital Path
      if (currentExpected > 0) {
        currentExpected += expectedChange;
        if (currentExpected < 0) currentExpected = 0;
      }

      // Simulated Random Capital Path
      if (currentSimulated > currentRiskSimulated && currentSimulated > 0) {
        const isWin = prng() < W;
        if (isWin) {
          currentSimulated += currentWinSimulated;
        } else {
          let isSpike = false;
          if (simulateSpikes && prng() < (spikeProb / 100)) {
            isSpike = true;
          }

          if (isSpike) {
            simulatedSpikesCount++;
            let spikedLoss = currentRiskSimulated * (1 + slippagePct / 100);
            if (marginMode === 'isolated') {
              const currentMarginSimulated = isCompounding ? (currentSimulated * (marginAmount / balance)) : marginAmount;
              spikedLoss = Math.min(spikedLoss, currentMarginSimulated);
            }
            currentSimulated -= spikedLoss;
            if (currentSimulated <= 0) {
              bankruptcyBySpike = true;
            }
          } else {
            currentSimulated -= currentRiskSimulated;
          }
        }
        if (currentSimulated < 0) currentSimulated = 0;
      } else if (!simulatedBankruptcy && (currentSimulated <= currentRiskSimulated || currentSimulated <= 0)) {
        simulatedBankruptcy = true;
        simulatedBankruptcyTrade = tradeIndex;
        currentSimulated = 0;
      } else {
        currentSimulated = 0;
      }
    }

    if (m % 12 === 0) {
      labels.push(`Year ${m / 12}`);
      expectedData.push(Math.round(currentExpected));
      simulatedData.push(Math.round(currentSimulated));
    }
  }

  renderSharkGrowthChart(labels, expectedData, simulatedData);

  // 7. Populating the Yearly Breakdown Table & Statistics
  const tableBody = document.getElementById('survivalYearlyTableBody');
  if (tableBody) {
    tableBody.innerHTML = '';

    const infoDiv = document.createElement('div');
    infoDiv.style.display = 'flex';
    infoDiv.style.justify = 'space-between';
    infoDiv.style.fontWeight = '700';
    infoDiv.style.marginBottom = '0.4rem';
    infoDiv.style.color = 'var(--accent-blue)';
    infoDiv.innerHTML = `<span>Total Trades Simulated:</span><span>${totalTrades} trades</span>`;
    tableBody.appendChild(infoDiv);

    let prevExpected = balance;
    for (let y = 1; y <= years; y++) {
      const yearEndExpected = expectedData[y];
      const netProfit = yearEndExpected - prevExpected;
      const growthPct = prevExpected > 0 ? (netProfit / prevExpected * 100) : 0;
      
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justify = 'space-between';
      row.style.fontSize = '0.74rem';
      
      const profitSign = netProfit >= 0 ? '+' : '';
      const profitColor = netProfit >= 0 ? '#34d399' : '#f87171';
      
      row.innerHTML = `
        <span style="color: var(--text-secondary);">Year ${y}:</span>
        <span style="font-family: monospace;">
          ${formatLargeCurrency(prevExpected)} → 
          ${formatLargeCurrency(yearEndExpected)} 
          (<span style="color: ${profitColor}; font-weight: 600;">${profitSign}${growthPct.toFixed(1)}%</span>)
        </span>
      `;
      tableBody.appendChild(row);
      prevExpected = yearEndExpected;
    }

    if (simulatedBankruptcy) {
      const alertDiv = document.createElement('div');
      alertDiv.style.marginTop = '0.4rem';
      alertDiv.style.padding = '0.4rem';
      alertDiv.style.borderRadius = '4px';
      alertDiv.style.background = 'rgba(248, 113, 113, 0.1)';
      alertDiv.style.border = '1px solid rgba(248, 113, 113, 0.2)';
      alertDiv.style.color = '#f87171';
      alertDiv.style.fontSize = '0.7rem';
      
      let msg = `💥 <strong>Simulated path went bankrupt</strong> at trade <strong>#${simulatedBankruptcyTrade}</strong>!`;
      if (simulateSpikes && bankruptcyBySpike) {
        msg = `⚡ <strong>Instant Liquidation</strong>: Your simulated path got liquidated due to a market spike/slippage at trade <strong>#${simulatedBankruptcyTrade}</strong>!`;
      }
      alertDiv.innerHTML = msg;
      tableBody.appendChild(alertDiv);
    }
  }

  const summaryEl = document.getElementById('survivalProjectionSummary');
  if (summaryEl) {
    const finalExpected = expectedData[expectedData.length - 1];
    const totalNetGain = finalExpected - balance;
    const totalGrowthPct = balance > 0 ? (totalNetGain / balance * 100) : 0;
    const sign = totalNetGain >= 0 ? '+' : '';
    
    let spikeMsg = '';
    if (simulateSpikes && simulatedSpikesCount > 0) {
      spikeMsg = ` | <span style="color: #f87171; font-weight: 600;">⚠️ ${simulatedSpikesCount} Volatility Spike${simulatedSpikesCount > 1 ? 's' : ''} occurred (slippage applied)</span>`;
    }
    
    summaryEl.innerHTML = `Expected Capital after <strong>${years} Year${years > 1 ? 's' : ''}</strong>: <strong>${formatLargeCurrency(finalExpected)}</strong> (Total Growth: <span style="color: ${totalNetGain >= 0 ? '#34d399' : '#f87171'}">${sign}${totalGrowthPct.toFixed(1)}%</span>)${spikeMsg}`;
  }

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function renderSharkGrowthChart(labels, expectedData, simulatedData) {
  const chartCanvas = document.getElementById('sharkGrowthChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (sharkGrowthChartInstance) {
    sharkGrowthChartInstance.destroy();
  }
  
  sharkGrowthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Expected (Average)',
          data: expectedData,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Simulated Path',
          data: simulatedData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: {
              size: 10,
              family: 'Outfit'
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatLargeCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255,255,255,0.03)'
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 9
            },
            maxTicksLimit: 10
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.03)'
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 9
            },
            callback: function(value) {
              return formatLargeCurrency(value);
            }
          }
        }
      }
    }
  });
}
