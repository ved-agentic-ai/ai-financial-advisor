// Application entry point, coordinator, and event listeners
window.copyLinkedInPost = function() {
  const textEl = document.getElementById('linkedinPostText');
  if (textEl) {
    navigator.clipboard.writeText(textEl.value).then(() => {
      showToast('LinkedIn Post copied to clipboard!', 'success');
      const btn = document.getElementById('copyPostBtn');
      if (btn) {
        btn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i> Copied!`;
        setTimeout(() => {
          btn.innerHTML = `<i data-lucide="copy" style="width: 14px; height: 14px;"></i> Copy Post`;
          if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
          }
        }, 2000);
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
          lucide.createIcons();
        }
      }
    }).catch(err => {
      showToast('Failed to copy: ' + err, 'error');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. YouTube videos scanning & indicators
  fetchVideos();
  
  // 2. Initialize stock ticker rates & interval updates
  fetchAndRenderTicker();
  setInterval(fetchAndRenderTicker, 60000);

  // 3. Initialize Market Mood Index (MMI) gauge
  fetchAndRenderMMI();
  setInterval(fetchAndRenderMMI, 300000);

  // 4. Bind video filters & sorting options
  const refreshBtn = document.getElementById('refreshBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const sortBySelect = document.getElementById('sortBy');
  const channelFilterInput = document.getElementById('channelFilter');
  const videoTypeSelect = document.getElementById('videoType');

  if (refreshBtn) refreshBtn.addEventListener('click', () => fetchVideos());
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => fetchVideos());
  
  if (sortBySelect) {
    sortBySelect.addEventListener('change', () => sortAndRenderVideos());
  }
  if (channelFilterInput) {
    channelFilterInput.addEventListener('input', () => sortAndRenderVideos());
  }
  if (videoTypeSelect) {
    videoTypeSelect.addEventListener('change', () => sortAndRenderVideos());
  }

  // 5. Video player Modal triggers
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const videoModal = document.getElementById('videoModal');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeVideoModal);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }

  // 6. Settings key management
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
  }
  if (settingsCloseBtn && settingsModal) {
    settingsCloseBtn.addEventListener('click', () => closeModal(settingsModal));
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeModal(settingsModal);
    });
  }

  // Initialize key input value on load
  if (apiKeyInput) {
    apiKeyInput.value = localStorage.getItem('youtube_api_key') || '';
  }

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const val = apiKeyInput.value.trim();
      localStorage.setItem('youtube_api_key', val);
      closeModal(settingsModal);
      showToast('API Key saved successfully!', 'success');
      fetchVideos();
    });
  }
  if (clearApiKeyBtn) {
    clearApiKeyBtn.addEventListener('click', () => {
      if (apiKeyInput) apiKeyInput.value = '';
      localStorage.removeItem('youtube_api_key');
      closeModal(settingsModal);
      showToast('API Key cleared!', 'info');
      fetchVideos();
    });
  }

  // 7. Video exporting
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToCSV();
    });
  }
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToJSON();
    });
  }

  // 8. Chat bot overlay bindings
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatForm = document.getElementById('chatForm');
  const chatSuggestions = document.getElementById('chatSuggestions');
  const chatMicBtn = document.getElementById('chatMicBtn');

  if (chatToggleBtn) chatToggleBtn.addEventListener('click', toggleChat);
  if (chatCloseBtn) chatCloseBtn.addEventListener('click', toggleChat);
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleChatSubmit();
    });
  }
  if (chatSuggestions) {
    chatSuggestions.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip')) {
        const query = e.target.getAttribute('data-query');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = query;
          handleChatSubmit();
        }
      }
    });
  }
  if (chatMicBtn) {
    chatMicBtn.addEventListener('click', toggleListening);
  }

  // 9. Multimodal voice widget bindings
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');
  const voiceCloseBtn = document.getElementById('voiceCloseBtn');
  if (voiceToggleBtn) voiceToggleBtn.addEventListener('click', toggleVoice);
  if (voiceCloseBtn) voiceCloseBtn.addEventListener('click', toggleVoice);

  // Voice recording & query hooks
  const voiceQueryBtn = document.getElementById('voiceQueryBtn');
  const voiceQueryInput = document.getElementById('voiceQueryInput');
  const voiceWaveform = document.getElementById('voiceWaveform');

  if (voiceQueryBtn && voiceQueryInput) {
    voiceQueryBtn.addEventListener('click', () => {
      const q = voiceQueryInput.value.trim();
      if (q) {
        appendVoiceMessage(q, 'user');
        voiceQueryInput.value = '';
        handleVoiceQuerySubmit(q);
      }
    });
    voiceQueryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = voiceQueryInput.value.trim();
        if (q) {
          appendVoiceMessage(q, 'user');
          voiceQueryInput.value = '';
          handleVoiceQuerySubmit(q);
        }
      }
    });
  }

  // Web Audio Recording Animation trigger
  const voiceRecordBtn = document.getElementById('voiceRecordBtn');
  if (voiceRecordBtn) {
    let recording = false;
    let recognitionInstance = null;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechReq = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionInstance = new SpeechReq();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        recording = true;
        voiceRecordBtn.classList.add('recording');
        if (voiceWaveform) voiceWaveform.classList.add('active');
        if (voiceQueryInput) voiceQueryInput.placeholder = 'Listening...';
      };

      recognitionInstance.onend = () => {
        recording = false;
        voiceRecordBtn.classList.remove('recording');
        if (voiceWaveform) voiceWaveform.classList.remove('active');
        if (voiceQueryInput) voiceQueryInput.placeholder = 'Type or speak Nifty queries...';
      };

      recognitionInstance.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (voiceQueryInput) {
          voiceQueryInput.value = text;
        }
        appendVoiceMessage(text, 'user');
        handleVoiceQuerySubmit(text);
      };
    }

    voiceRecordBtn.addEventListener('click', () => {
      if (!recognitionInstance) {
        showToast('Web Speech not supported in this browser.', 'error');
        return;
      }
      if (recording) {
        recognitionInstance.stop();
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        recognitionInstance.start();
      }
    });
  }

  // 10. Master Navigation tab switching
  const masterTabTrader = document.getElementById('masterTabTrader');
  const masterTabAI = document.getElementById('masterTabAI');
  const masterTabYoutube = document.getElementById('masterTabYoutube');
  const masterTabTradeBook = document.getElementById('masterTabTradeBook');
  const masterTabDesign = document.getElementById('masterTabDesign');

  const masterPanelTrader = document.getElementById('masterPanelTrader');
  const masterPanelAI = document.getElementById('masterPanelAI');
  const masterPanelYoutube = document.getElementById('masterPanelYoutube');
  const masterPanelTradeBook = document.getElementById('masterPanelTradeBook');
  const masterPanelDesign = document.getElementById('masterPanelDesign');

  function switchMasterTab(activeTab, activePanel) {
    const tabs = [masterTabTrader, masterTabAI, masterTabYoutube, masterTabTradeBook, masterTabDesign];
    const panels = [masterPanelTrader, masterPanelAI, masterPanelYoutube, masterPanelTradeBook, masterPanelDesign];

    const isCurrentlyActive = activeTab && activeTab.classList.contains('active');

    tabs.forEach(t => { if (t) t.classList.remove('active'); });
    panels.forEach(p => { if (p) p.style.display = 'none'; });

    if (!isCurrentlyActive && activeTab && activePanel) {
      activeTab.classList.add('active');
      activePanel.style.display = 'block';
      return true;
    }
    return false;
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
  if (masterTabTradeBook && masterPanelTradeBook) {
    masterTabTradeBook.addEventListener('click', () => {
      switchMasterTab(masterTabTradeBook, masterPanelTradeBook);
      if (typeof window.initTradeBook === 'function') {
        window.initTradeBook();
      }
    });
  }
  if (masterTabDesign && masterPanelDesign) {
    masterTabDesign.addEventListener('click', () => {
      switchMasterTab(masterTabDesign, masterPanelDesign);
    });
  }

  // 11. Compounding planner inner tab setup
  const tabDigital = document.getElementById('tabDigital');
  const tabEquity = document.getElementById('tabEquity');
  const riskLabel = document.getElementById('riskLabel');
  const rewardLabel = document.getElementById('rewardLabel');
  const riskLimitNote = document.getElementById('riskLimitNote');
  const inputRiskPct = document.getElementById('riskPct');
  const inputRewardPct = document.getElementById('rewardPct');

  const customLeverageWrapper = document.getElementById('customLeverageWrapper');
  const leverageInputWrapper = document.getElementById('leverageInputWrapper');
  const leverageWarning = document.getElementById('leverageWarning');
  const metricLeverageCard = document.getElementById('metricLeverageCard');

  if (tabDigital && tabEquity) {
    tabDigital.addEventListener('click', () => {
      window.currentTradeTab = 'digital';
      tabDigital.classList.add('active');
      tabEquity.classList.remove('active');
      
      if (riskLabel) riskLabel.textContent = 'Asset Stop Loss (%)';
      if (rewardLabel) rewardLabel.textContent = 'Asset Take Profit (%)';
      if (riskLimitNote) riskLimitNote.style.display = 'none';
      
      if (leverageInputWrapper) leverageInputWrapper.style.display = 'flex';
      if (leverageWarning) leverageWarning.style.display = 'flex';
      if (metricLeverageCard) metricLeverageCard.style.display = 'flex';
      
      if (inputRiskPct) inputRiskPct.value = 2;
      if (inputRewardPct) inputRewardPct.value = 6;
      
      calculateAndUpdateTradeSetup();
    });
    
    tabEquity.addEventListener('click', () => {
      window.currentTradeTab = 'equity';
      tabEquity.classList.add('active');
      tabDigital.classList.remove('active');
      
      if (riskLabel) riskLabel.textContent = 'Risk on Allocation (%) [Max 3%]';
      if (rewardLabel) rewardLabel.textContent = 'Reward on Allocation (%)';
      if (riskLimitNote) riskLimitNote.style.display = 'block';
      
      if (leverageInputWrapper) leverageInputWrapper.style.display = 'none';
      if (customLeverageWrapper) customLeverageWrapper.style.display = 'none';
      if (leverageWarning) leverageWarning.style.display = 'none';
      if (metricLeverageCard) metricLeverageCard.style.display = 'none';
      
      if (inputRiskPct) inputRiskPct.value = 3;
      if (inputRewardPct) inputRewardPct.value = 9;
      
      calculateAndUpdateTradeSetup();
    });
  }

  // 12. Leverage select
  const leverageSelect = document.getElementById('leverageSelect');
  const customLeverage = document.getElementById('customLeverage');
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

  // Bind compound watcher inputs
  const inputInitialCapital = document.getElementById('initialCapital');
  const inputWinRate = document.getElementById('winRate');
  const inputTradesPerMonth = document.getElementById('tradesPerMonth');
  const inputProjectionYears = document.getElementById('projectionYears');
  const tradeCurrency = document.getElementById('tradeCurrency');

  const inputsToWatch = [
    inputInitialCapital, inputWinRate, inputTradesPerMonth,
    inputProjectionYears, inputRiskPct, inputRewardPct, tradeCurrency
  ];
  inputsToWatch.forEach(input => {
    if (input) {
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        if (window.currentTradeTab === 'equity' && input === inputRiskPct) {
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

  // 13. Shark Leverage Trade Simulator DOM controls
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
      window.currentSharkMarginMode = 'isolated';
      sharkMarginIsolated.classList.add('active');
      sharkMarginCross.classList.remove('active');
      calculateSharkTrade();
    });

    sharkMarginCross.addEventListener('click', () => {
      window.currentSharkMarginMode = 'cross';
      sharkMarginCross.classList.add('active');
      sharkMarginIsolated.classList.remove('active');
      calculateSharkTrade();
    });
  }

  const sharkBtnLong = document.getElementById('sharkBtnLong');
  const sharkBtnShort = document.getElementById('sharkBtnShort');
  if (sharkBtnLong && sharkBtnShort) {
    sharkBtnLong.addEventListener('click', () => {
      window.currentSharkDirection = 'long';
      sharkBtnLong.classList.remove('inactive');
      sharkBtnShort.classList.add('inactive');
      calculateSharkTrade();
    });

    sharkBtnShort.addEventListener('click', () => {
      window.currentSharkDirection = 'short';
      sharkBtnShort.classList.remove('inactive');
      sharkBtnLong.classList.add('inactive');
      calculateSharkTrade();
    });
  }

  const sharkAssetSelect = document.getElementById('sharkAssetSelect');
  if (sharkAssetSelect) {
    sharkAssetSelect.addEventListener('change', (e) => {
      window.currentSharkAsset = e.target.value;
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
      if (window.currentSharkTPSLMode === 'price') return;
      
      const currentEntry = parseFloat(sharkEntryPrice.value) || 0;
      const tpPctVal = parseFloat(sharkTargetProfitPrice.value) || 0;
      const slPctVal = parseFloat(sharkStopLossPrice.value) || 0;

      window.currentSharkTPSLMode = 'price';
      sharkTPSLModePrice.classList.add('active');
      sharkTPSLModePct.classList.remove('active');

      if (sharkTPInputLabel) sharkTPInputLabel.textContent = 'Take Profit Price';
      if (sharkSLInputLabel) sharkSLInputLabel.textContent = 'Stop Loss Price';
      if (sharkTPInputSuffix) sharkTPInputSuffix.textContent = '₹';
      if (sharkSLInputSuffix) sharkSLInputSuffix.textContent = '₹';

      if (currentEntry > 0) {
        let tpPriceVal = 0;
        let slPriceVal = 0;
        if (window.currentSharkDirection === 'long') {
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
      if (window.currentSharkTPSLMode === 'pct') return;

      const currentEntry = parseFloat(sharkEntryPrice.value) || 0;
      const currentTp = parseFloat(sharkTargetProfitPrice.value) || 0;
      const currentSl = parseFloat(sharkStopLossPrice.value) || 0;

      window.currentSharkTPSLMode = 'pct';
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
      if (window.currentSurvivalWinMode === 'slider') return;
      window.currentSurvivalWinMode = 'slider';
      winModeSliderBtn.classList.add('active');
      winModeRatioBtn.classList.remove('active');
      winSliderContainer.style.display = 'flex';
      winRatioContainer.style.display = 'none';
      calculateSharkTrade();
    });

    winModeRatioBtn.addEventListener('click', () => {
      if (window.currentSurvivalWinMode === 'ratio') return;
      window.currentSurvivalWinMode = 'ratio';
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

  // 14. Collapsible Panels
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
          calculateAndUpdateTradeSetup();
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
          calculateSharkTrade();
        }, 50);
      }
    });
  }

  // 15. Active tabbed results in the Simulator Dashboard
  const simResultTabChart = document.getElementById('simResultTabChart');
  const simResultTabMatrix = document.getElementById('simResultTabMatrix');
  const simResultTabTable = document.getElementById('simResultTabTable');

  const simResultPaneChart = document.getElementById('simResultPaneChart');
  const simResultPaneMatrix = document.getElementById('simResultPaneMatrix');
  const simResultPaneTable = document.getElementById('simResultPaneTable');

  function switchSimResultTab(activeTab, activePane) {
    const tabs = [simResultTabChart, simResultTabMatrix, simResultTabTable];
    const panes = [simResultPaneChart, simResultPaneMatrix, simResultPaneTable];
    tabs.forEach(t => { if (t) t.classList.remove('active'); });
    panes.forEach(p => { if (p) p.style.display = 'none'; });
    if (activeTab && activePane) {
      activeTab.classList.add('active');
      activePane.style.display = 'block';
    }
  }

  if (simResultTabChart && simResultPaneChart) {
    simResultTabChart.addEventListener('click', () => switchSimResultTab(simResultTabChart, simResultPaneChart));
  }
  if (simResultTabMatrix && simResultPaneMatrix) {
    simResultTabMatrix.addEventListener('click', () => switchSimResultTab(simResultTabMatrix, simResultPaneMatrix));
  }
  if (simResultTabTable && simResultPaneTable) {
    simResultTabTable.addEventListener('click', () => switchSimResultTab(simResultTabTable, simResultPaneTable));
  }

  // 16. Legal Disclaimer modal listener
  const disclaimerModal = document.getElementById('disclaimerModal');
  const disclaimerAcceptBtn = document.getElementById('disclaimerAcceptBtn');
  if (disclaimerModal) {
    disclaimerModal.classList.add('active');
    if (disclaimerAcceptBtn) {
      disclaimerAcceptBtn.addEventListener('click', () => {
        disclaimerModal.classList.remove('active');
        showToast('Disclaimer accepted. Welcome to the Premium Suite!', 'success');
      });
    }
  }

  // 16.5. Design & Architecture accordion collapsible handler
  document.querySelectorAll('.design-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      const content = parent.querySelector('.design-accordion-content');
      const isActive = header.classList.contains('active');

      // Collapse all accordions
      document.querySelectorAll('.design-accordion-header').forEach(h => {
        h.classList.remove('active');
        const c = h.parentElement.querySelector('.design-accordion-content');
        if (c) c.style.display = 'none';
      });

      // Expand clicked one if it wasn't active
      if (!isActive) {
        header.classList.add('active');
        if (content) content.style.display = 'block';
      }
    });
  });

  // 17. Bootstraps Calculations
  applyCurrencyAndAssetDefaults();
  calculateAndUpdateTradeSetup();
  calculateSharkTrade();
  initVoiceAssistantUnlock();
  initSettingsTabsAndStats();
  if (typeof window.initTradeBook === 'function') {
    window.initTradeBook();
  }
});

function initSettingsTabsAndStats() {
  const tabSettingsBtn = document.getElementById('tabSettingsBtn');
  const tabStatsBtn = document.getElementById('tabStatsBtn');
  const settingsConfigContent = document.getElementById('settingsConfigContent');
  const settingsStatsContent = document.getElementById('settingsStatsContent');

  if (!tabSettingsBtn || !tabStatsBtn || !settingsConfigContent || !settingsStatsContent) return;

  // Tab switching helper
  const activateTab = (activeTabBtn, activeContent, inactiveTabBtn, inactiveContent) => {
    activeTabBtn.classList.add('active');
    activeTabBtn.style.color = 'var(--accent-blue)';
    activeTabBtn.style.border = '1px solid rgba(59, 130, 246, 0.2)';
    activeTabBtn.style.background = 'rgba(59, 130, 246, 0.05)';
    activeContent.style.display = 'block';

    inactiveTabBtn.classList.remove('active');
    inactiveTabBtn.style.color = 'var(--text-secondary)';
    inactiveTabBtn.style.border = '1px solid transparent';
    inactiveTabBtn.style.background = 'transparent';
    inactiveContent.style.display = 'none';
  };

  tabSettingsBtn.addEventListener('click', () => {
    activateTab(tabSettingsBtn, settingsConfigContent, tabStatsBtn, settingsStatsContent);
  });

  tabStatsBtn.addEventListener('click', () => {
    activateTab(tabStatsBtn, settingsStatsContent, tabSettingsBtn, settingsConfigContent);
    // Refresh stats if already unlocked
    if (localStorage.getItem('stats_tracker_unlocked') === 'true') {
      fetchViewsCount();
    }
  });

  // Track page views (once per session)
  if (!sessionStorage.getItem('page_view_recorded')) {
    fetch('/api/stats/views/increment', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          sessionStorage.setItem('page_view_recorded', 'true');
        }
      })
      .catch(err => console.error('Failed to increment visitor view count:', err));
  }

  // Stats Lock & Unlock logic
  const statsUnlockBtn = document.getElementById('statsUnlockBtn');
  const statsPasskeyInput = document.getElementById('statsPasskeyInput');
  const statsUnlockPanel = document.getElementById('statsUnlockPanel');
  const statsMainContent = document.getElementById('statsMainContent');
  const statsTotalViews = document.getElementById('statsTotalViews');
  const statsLockBtn = document.getElementById('statsLockBtn');

  if (!statsUnlockBtn || !statsPasskeyInput || !statsUnlockPanel || !statsMainContent || !statsTotalViews || !statsLockBtn) return;

  const fetchViewsCount = () => {
    fetch('/api/stats/views')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.views !== 'undefined') {
          statsTotalViews.textContent = data.views.toLocaleString();
        }
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        statsTotalViews.textContent = 'Error';
      });
  };

  const unlockStats = () => {
    statsUnlockPanel.style.display = 'none';
    statsMainContent.style.display = 'block';
    fetchViewsCount();
  };

  const lockStats = () => {
    localStorage.removeItem('stats_tracker_unlocked');
    statsPasskeyInput.value = '';
    statsMainContent.style.display = 'none';
    statsUnlockPanel.style.display = 'flex';
  };

  // Restore unlocked state
  if (localStorage.getItem('stats_tracker_unlocked') === 'true') {
    unlockStats();
  }

  const statsLockError = document.getElementById('statsLockError');

  statsUnlockBtn.addEventListener('click', () => {
    const val = statsPasskeyInput.value.trim();
    if (val === 'Welcome@123') {
      localStorage.setItem('stats_tracker_unlocked', 'true');
      if (statsLockError) statsLockError.style.display = 'none';
      statsPasskeyInput.style.borderColor = 'var(--border-color)';
      unlockStats();
      showToast('Analytics unlocked successfully!', 'success');
      // Trigger Lucide to render the user icon inside statistics
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    } else {
      if (statsLockError) statsLockError.style.display = 'block';
      statsPasskeyInput.style.borderColor = '#f87171';
      showToast('Invalid Passcode! Key does not match.', 'error');
    }
  });

  statsPasskeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      statsUnlockBtn.click();
    }
  });

  statsLockBtn.addEventListener('click', () => {
    lockStats();
  });
}

// 18. Direct Shark Leverage Log to Trade Book Listener
const sharkLogToBookBtn = document.getElementById('sharkLogToBookBtn');
if (sharkLogToBookBtn) {
  sharkLogToBookBtn.addEventListener('click', () => {
    // Extract values from Shark Leverage Calculator
    let entryPrice = parseFloat(document.getElementById('sharkEntryPrice')?.value || 170000);
    let marginAmount = parseFloat(document.getElementById('sharkMarginAmount')?.value || 25000);
    let rawTp = parseFloat(document.getElementById('sharkTargetProfitPrice')?.value || 185000);
    let rawSl = parseFloat(document.getElementById('sharkStopLossPrice')?.value || 165000);
    const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';

    // Detect Long vs Short active state
    const isShort = document.getElementById('sharkBtnShort')?.classList.contains('active');
    const direction = isShort ? 'SHORT' : 'LONG';

    // Check if TP/SL in Shark simulator is in % Move mode (or raw values are percentage < 100 while entry > 1000)
    const isPctMode = document.getElementById('sharkTPSLModePct')?.classList.contains('active') || (rawSl < 100 && entryPrice > 1000);

    let finalTp = rawTp;
    let finalSl = rawSl;

    if (isPctMode && entryPrice > 0) {
      if (direction === 'LONG') {
        finalTp = entryPrice * (1 + Math.abs(rawTp) / 100);
        finalSl = entryPrice * (1 - Math.abs(rawSl) / 100);
      } else {
        finalTp = entryPrice * (1 - Math.abs(rawTp) / 100);
        finalSl = entryPrice * (1 + Math.abs(rawSl) / 100);
      }
    }

    // Format numbers
    finalTp = parseFloat(finalTp.toFixed(2));
    finalSl = parseFloat(finalSl.toFixed(2));

    // Pre-populate Trade Book Logger Modal
    const tbSymbol = document.getElementById('tbSymbol');
    if (tbSymbol) tbSymbol.value = 'ETH';

    const tbCurrency = document.getElementById('tbCurrency');
    if (tbCurrency) tbCurrency.value = currency;

    const tbDirection = document.getElementById('tbDirection');
    if (tbDirection) tbDirection.value = direction;

    const tbEntry = document.getElementById('tbEntry');
    if (tbEntry) tbEntry.value = entryPrice;

    const tbSL = document.getElementById('tbSL');
    if (tbSL) tbSL.value = finalSl;

    const tbTarget = document.getElementById('tbTarget');
    if (tbTarget) tbTarget.value = finalTp;

    const tbPositionSize = document.getElementById('tbPositionSize');
    if (tbPositionSize) tbPositionSize.value = marginAmount;

    const tbStatus = document.getElementById('tbStatus');
    if (tbStatus) tbStatus.value = 'OPEN';

    // Switch to Trade Book Master Tab
    const masterTabTradeBook = document.getElementById('masterTabTradeBook');
    const masterPanelTradeBook = document.getElementById('masterPanelTradeBook');
    if (masterTabTradeBook && masterPanelTradeBook) {
      const tabs = [
        document.getElementById('masterTabTrader'),
        document.getElementById('masterTabAI'),
        document.getElementById('masterTabYoutube'),
        masterTabTradeBook,
        document.getElementById('masterTabDesign')
      ];
      const panels = [
        document.getElementById('masterPanelTrader'),
        document.getElementById('masterPanelAI'),
        document.getElementById('masterPanelYoutube'),
        masterPanelTradeBook,
        document.getElementById('masterPanelDesign')
      ];
      tabs.forEach(t => { if (t) t.classList.remove('active'); });
      panels.forEach(p => { if (p) p.style.display = 'none'; });

      masterTabTradeBook.classList.add('active');
      masterPanelTradeBook.style.display = 'block';

      if (typeof window.initTradeBook === 'function') {
        window.initTradeBook();
      }
    }

    // Open Trade Logger Form Modal
    if (typeof window.openTradeModal === 'function') {
      window.openTradeModal();
    }

    showToast('Shark Trade setup loaded! Review and click Save Entry.', 'info');
  });
}
