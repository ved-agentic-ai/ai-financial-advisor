/**
 * Interactive Trade Book & PnL Analytics Engine
 * Provides local storage persistence, 3D page turning simulation,
 * strategy & psychology rule verification, and Chart.js analytics.
 */

let tradeBookState = [];
let currentPageIndex = 0;
let pnlGrowthChartInstance = null;
let psychologyChartInstance = null;

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  USDT: '₮',
  SEK: 'kr'
};

function getCurrencySymbol(curr) {
  return CURRENCY_SYMBOLS[curr] || '$';
}

// Initial sample trade for demonstration if user has empty journal
const DEMO_TRADES = [
  {
    id: 'tb_demo_1',
    date: '2026-07-15T10:30',
    symbol: 'BTC',
    currency: 'USD',
    direction: 'LONG',
    entryPrice: 65000,
    slPrice: 64500,
    targetPrice: 66500,
    positionSize: 1000,
    leverage: 25,
    status: 'TARGET_HIT', // 'TARGET_HIT', 'SL_HIT', 'OPEN'
    rrRatio: '1:3.0',
    pnl: 769.23,
    rulesFollowed: true,
    ruleChecklist: {
      maxTrades: true,
      minRR: true,
      leverage25x: true,
      strategySignal: true,
      noRevenge: true,
      setAndForget: true
    },
    psychology: 'Calm', // 'Calm', 'FOMO', 'Revenge', 'Random'
    notes: 'Clean 1H Heikin Ashi bullish candle close above resistance with RSI at 58. Held for 18 hours.'
  },
  {
    id: 'tb_demo_2',
    date: '2026-07-17T14:15',
    symbol: 'ETH',
    currency: 'USDT',
    direction: 'SHORT',
    entryPrice: 3500,
    slPrice: 3540,
    targetPrice: 3380,
    positionSize: 800,
    leverage: 25,
    status: 'TARGET_HIT',
    rrRatio: '1:3.0',
    pnl: 685.71,
    rulesFollowed: true,
    ruleChecklist: {
      maxTrades: true,
      minRR: true,
      leverage25x: true,
      strategySignal: true,
      noRevenge: true,
      setAndForget: true
    },
    psychology: 'Calm',
    notes: 'Support breakdown on 1H chart. RSI dropped to 44. Target hit smoothly without checking terminal.'
  }
];

async function loadTradeBookState() {
  try {
    const response = await fetch('/api/trade-book');
    if (response.ok) {
      const serverData = await response.json();
      if (Array.isArray(serverData)) {
        tradeBookState = serverData;
        try { localStorage.setItem('user_trade_book_v1', JSON.stringify(tradeBookState)); } catch(e){}
        if (serverData.length > 0 || localStorage.getItem('user_trade_book_has_initialized')) {
          return;
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch trade database from server API, reading local storage fallback:', e);
  }

  try {
    const data = localStorage.getItem('user_trade_book_v1');
    const initialized = localStorage.getItem('user_trade_book_has_initialized');
    
    if (data !== null || initialized) {
      tradeBookState = data ? JSON.parse(data) : [];
    } else {
      // First time initial load demo trades
      tradeBookState = [...DEMO_TRADES];
      localStorage.setItem('user_trade_book_has_initialized', 'true');
      saveTradeBookState();
    }
  } catch (e) {
    console.error('Failed to load trade book state:', e);
    tradeBookState = [];
  }
}

async function saveTradeBookState() {
  localStorage.setItem('user_trade_book_has_initialized', 'true');
  try {
    localStorage.setItem('user_trade_book_v1', JSON.stringify(tradeBookState));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }

  try {
    await fetch('/api/trade-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeBookState)
    });
  } catch (e) {
    console.error('Failed to sync trade book to project server:', e);
  }
}

function calculateTradeRR(entry, sl, target) {
  const entryNum = parseFloat(entry);
  let slNum = parseFloat(sl);
  let targetNum = parseFloat(target);

  if (!entryNum || !slNum || !targetNum) return '1:0.0';

  let risk = 0;
  let reward = 0;

  // Check if SL/Target inputs are percentage moves instead of absolute price levels
  if (slNum < 100 && entryNum > 1000) {
    risk = entryNum * (slNum / 100);
  } else {
    risk = Math.abs(entryNum - slNum);
  }

  if (targetNum < 100 && entryNum > 1000) {
    reward = entryNum * (targetNum / 100);
  } else {
    reward = Math.abs(targetNum - entryNum);
  }

  if (!risk || risk === 0) return '1:0.0';

  const ratio = (reward / risk).toFixed(1);
  return `1:${ratio}`;
}

function calculateTradePnL(entry, exit, positionSize, direction) {
  const e = parseFloat(entry);
  const x = parseFloat(exit);
  const p = parseFloat(positionSize);

  if (!e || !x || !p) return 0;

  const pctChange = direction === 'LONG' ? (x - e) / e : (e - x) / e;
  // 25x leverage calculation
  return p * 25 * pctChange;
}

function initTradeBook() {
  loadTradeBookState();
  bindTradeBookEvents();
  renderTradeBookUI();
  renderTradeBookCharts();
}

function bindTradeBookEvents() {
  const addTradeBtn = document.getElementById('addTradeBtn');
  const addTradeEmptyBtn = document.getElementById('addTradeEmptyBtn');
  const tradeModalClose = document.getElementById('tradeModalClose');
  const tradeForm = document.getElementById('tradeForm');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const exportJournalBtn = document.getElementById('exportJournalBtn');
  const importJournalBtn = document.getElementById('importJournalBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetJournalBtn = document.getElementById('resetJournalBtn');

  if (addTradeBtn) addTradeBtn.addEventListener('click', openTradeModal);
  if (addTradeEmptyBtn) addTradeEmptyBtn.addEventListener('click', openTradeModal);
  if (tradeModalClose) tradeModalClose.addEventListener('click', closeTradeModal);

  if (prevPageBtn) prevPageBtn.addEventListener('click', () => changeBookPage(-1));
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => changeBookPage(1));

  const exportJournalCSVBtn = document.getElementById('exportJournalCSVBtn');

  if (exportJournalBtn) exportJournalBtn.addEventListener('click', exportTradeJournalJSON);
  if (exportJournalCSVBtn) exportJournalCSVBtn.addEventListener('click', exportTradeJournalCSV);
  if (importJournalBtn && importFileInput) {
    importJournalBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importTradeJournalJSON);
  }

  if (resetJournalBtn) {
    resetJournalBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your Trade Book? All recorded trades will be wiped.')) {
        tradeBookState = [];
        saveTradeBookState();
        currentPageIndex = 0;
        renderTradeBookUI();
        renderTradeBookCharts();
        showToast('Trade Book reset successfully.', 'info');
      }
    });
  }

  // Resolution Modal Controls
  const resolutionModalClose = document.getElementById('resolutionModalClose');
  const resModalCancelBtn = document.getElementById('resModalCancelBtn');
  const resModalConfirmBtn = document.getElementById('resModalConfirmBtn');

  if (resolutionModalClose) resolutionModalClose.addEventListener('click', closeResolutionModal);
  if (resModalCancelBtn) resModalCancelBtn.addEventListener('click', closeResolutionModal);
  if (resModalConfirmBtn) resModalConfirmBtn.addEventListener('click', confirmTradeResolution);

  if (tradeForm) {
    tradeForm.addEventListener('submit', handleNewTradeSubmit);

    // Live Risk:Reward & PnL calculation inputs
    ['tbEntry', 'tbSL', 'tbTarget', 'tbDirection', 'tbCurrency'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateModalRRPreview);
        el.addEventListener('change', updateModalRRPreview);
      }
    });
  }

  // Touch Swipe Gesture for 3D Book
  const bookSpread = document.getElementById('tradeBookSpread');
  if (bookSpread) {
    let touchStartX = 0;
    bookSpread.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    bookSpread.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        changeBookPage(1); // Swipe Left -> Next Page
      } else if (touchEndX - touchStartX > 50) {
        changeBookPage(-1); // Swipe Right -> Prev Page
      }
    }, { passive: true });
  }
}

function updateModalRRPreview() {
  const entry = document.getElementById('tbEntry')?.value;
  const sl = document.getElementById('tbSL')?.value;
  const target = document.getElementById('tbTarget')?.value;
  const curr = document.getElementById('tbCurrency')?.value || 'USD';
  const sym = getCurrencySymbol(curr);
  const rrBadge = document.getElementById('tbRRPreview');

  // Dynamically update price labels with current currency symbol
  const labelCap = document.getElementById('tbLabelCapital');
  const labelEntry = document.getElementById('tbLabelEntry');
  const labelSL = document.getElementById('tbLabelSL');
  const labelTarget = document.getElementById('tbLabelTarget');

  if (labelCap) labelCap.textContent = `Position Capital (${sym})`;
  if (labelEntry) labelEntry.textContent = `Entry Price (${sym})`;
  if (labelSL) labelSL.textContent = `Stop Loss (${sym})`;
  if (labelTarget) labelTarget.textContent = `Target Price (${sym})`;

  if (rrBadge && entry && sl && target) {
    const rrStr = calculateTradeRR(entry, sl, target);
    rrBadge.textContent = rrStr;
    const ratioVal = parseFloat(rrStr.split(':')[1] || '0');
    if (ratioVal >= 3) {
      rrBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      rrBadge.style.color = '#34d399';
      rrBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } else {
      rrBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      rrBadge.style.color = '#f87171';
      rrBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
  }
}

function openTradeModal() {
  const modal = document.getElementById('tradeLogModal');
  if (!modal) return;
  modal.classList.add('active');

  // Set default timestamp to now
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16);
  const dateInput = document.getElementById('tbDate');
  if (dateInput) dateInput.value = dateStr;

  updateModalRRPreview();
}

function closeTradeModal() {
  const modal = document.getElementById('tradeLogModal');
  if (modal) modal.classList.remove('active');
}

function handleNewTradeSubmit(e) {
  e.preventDefault();

  const symbol = document.getElementById('tbSymbol')?.value || 'BTC';
  const currency = document.getElementById('tbCurrency')?.value || 'USD';
  const direction = document.getElementById('tbDirection')?.value || 'LONG';
  const date = document.getElementById('tbDate')?.value || new Date().toISOString();
  const entryPrice = parseFloat(document.getElementById('tbEntry')?.value || 0);
  const slPrice = parseFloat(document.getElementById('tbSL')?.value || 0);
  const targetPrice = parseFloat(document.getElementById('tbTarget')?.value || 0);
  const positionSize = parseFloat(document.getElementById('tbPositionSize')?.value || 1000);
  const status = document.getElementById('tbStatus')?.value || 'TARGET_HIT';
  const psychology = document.getElementById('tbPsychology')?.value || 'Calm';
  const notes = document.getElementById('tbNotes')?.value.trim() || '';

  // Calculate R:R
  const rrRatio = calculateTradeRR(entryPrice, slPrice, targetPrice);

  // Calculate PnL
  let exitPrice = status === 'TARGET_HIT' ? targetPrice : slPrice;
  let pnl = 0;
  if (status !== 'OPEN') {
    pnl = calculateTradePnL(entryPrice, exitPrice, positionSize, direction);
  }

  // Check Rule Compliance
  const maxTrades = document.getElementById('ruleCheckMaxTrades')?.checked ?? true;
  const minRR = document.getElementById('ruleCheckMinRR')?.checked ?? true;
  const leverage25x = document.getElementById('ruleCheckLeverage')?.checked ?? true;
  const strategySignal = document.getElementById('ruleCheckStrategy')?.checked ?? true;
  const noRevenge = document.getElementById('ruleCheckNoRevenge')?.checked ?? true;
  const setAndForget = document.getElementById('ruleCheckSetForget')?.checked ?? true;

  const rulesFollowed = maxTrades && minRR && leverage25x && strategySignal && noRevenge && setAndForget && (psychology === 'Calm');

  const newTrade = {
    id: 'tb_' + Date.now(),
    date,
    symbol,
    currency,
    direction,
    entryPrice,
    slPrice,
    targetPrice,
    positionSize,
    leverage: 25,
    status,
    rrRatio,
    pnl,
    rulesFollowed,
    ruleChecklist: {
      maxTrades,
      minRR,
      leverage25x,
      strategySignal,
      noRevenge,
      setAndForget
    },
    psychology,
    notes
  };

  tradeBookState.unshift(newTrade);
  saveTradeBookState();
  closeTradeModal();

  currentPageIndex = 0; // Jump to latest page
  renderTradeBookUI();
  renderTradeBookCharts();

  showToast('New Trade logged in your Trade Book!', 'success');
}

function deleteTrade(id) {
  if (confirm('Delete this trade entry from your journal?')) {
    tradeBookState = tradeBookState.filter(t => t.id !== id);
    saveTradeBookState();
    renderTradeBookUI();
    renderTradeBookCharts();
    showToast('Trade entry deleted.', 'info');
  }
}

function changeBookPage(delta) {
  const totalPages = Math.ceil(tradeBookState.length / 2) || 1;
  const newIndex = currentPageIndex + delta;

  if (newIndex >= 0 && newIndex < totalPages) {
    currentPageIndex = newIndex;
    
    // Add page flip animation class
    const bookSpread = document.getElementById('tradeBookSpread');
    if (bookSpread) {
      bookSpread.classList.add('flipping');
      setTimeout(() => {
        renderTradeBookUI();
        bookSpread.classList.remove('flipping');
      }, 200);
    } else {
      renderTradeBookUI();
    }
  }
}

function update100TradeTracker() {
  const badge = document.getElementById('trackerPctBadge');
  const bar = document.getElementById('trackerProgressBar');
  const executedTxt = document.getElementById('trackerExecutedText');
  const remainingTxt = document.getElementById('trackerRemainingText');

  if (!badge || !bar || !executedTxt || !remainingTxt) return;

  const totalTarget = 100;
  const executed = tradeBookState.length;
  const pct = Math.min(100, Math.round((executed / totalTarget) * 100));
  const remaining = Math.max(0, totalTarget - executed);

  badge.textContent = `${executed} / ${totalTarget} (${pct}%)`;
  bar.style.width = `${pct}%`;
  executedTxt.textContent = `Took: ${executed} trade${executed === 1 ? '' : 's'}`;

  if (remaining > 0) {
    remainingTxt.textContent = `${remaining} Left to Complete`;
    remainingTxt.style.color = '#60a5fa';
  } else {
    remainingTxt.textContent = `🎉 100-Trade Discipline Complete!`;
    remainingTxt.style.color = '#34d399';
  }
}

function renderTradeBookUI() {
  const leftPageContent = document.getElementById('bookLeftPageContent');
  const rightPageContent = document.getElementById('bookRightPageContent');
  const pageCounter = document.getElementById('bookPageCounter');
  const dateTree = document.getElementById('bookDateTree');

  // Update 100-Trade Discipline Tracker
  update100TradeTracker();

  if (!leftPageContent || !rightPageContent) return;

  const totalTrades = tradeBookState.length;
  const totalPages = Math.ceil(totalTrades / 2) || 1;

  if (pageCounter) {
    pageCounter.textContent = `Page ${currentPageIndex + 1} of ${totalPages}`;
  }

  // Render Date Hierarchy Tree on Sidebar
  if (dateTree) {
    renderDateTree(dateTree);
  }

  if (totalTrades === 0) {
    leftPageContent.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <i data-lucide="book-open" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 1rem; color: var(--accent-blue);"></i>
        <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Your Trade Book is Empty</h4>
        <p style="font-size: 0.8rem; line-height: 1.5; margin-bottom: 1.5rem;">Log your daily trades to track strategy rules, discipline, and performance over time.</p>
        <button class="btn btn-primary" onclick="openTradeModal()"><i data-lucide="plus"></i> Log First Trade</button>
      </div>
    `;
    rightPageContent.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <i data-lucide="shield-check" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 1rem; color: #34d399;"></i>
        <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Strict Discipline Goal</h4>
        <p style="font-size: 0.8rem; line-height: 1.5;">Follow Heikin Ashi 1H strategy rules for 100 consecutive trades to evaluate true expectancy.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    return;
  }

  // Each spread shows 2 trades (Left Page = Trade A, Right Page = Trade B)
  const tradeAIndex = currentPageIndex * 2;
  const tradeBIndex = tradeAIndex + 1;

  const tradeA = tradeBookState[tradeAIndex];
  const tradeB = tradeBookState[tradeBIndex];

  leftPageContent.innerHTML = tradeA ? renderSingleTradePage(tradeA, tradeAIndex + 1) : '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-style: italic;">End of pages</div>';
  rightPageContent.innerHTML = tradeB ? renderSingleTradePage(tradeB, tradeBIndex + 1) : '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-style: italic;">Blank Page</div>';

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function renderSingleTradePage(trade, indexNum) {
  const isTargetHit = trade.status === 'TARGET_HIT';
  const isOpen = trade.status === 'OPEN';
  const sym = getCurrencySymbol(trade.currency || 'USD');
  
  const statusColor = isOpen ? '#60a5fa' : (isTargetHit ? '#34d399' : '#f87171');
  const statusBg = isOpen ? 'rgba(59, 130, 246, 0.15)' : (isTargetHit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)');
  const statusText = isOpen ? 'OPEN TRADE IN PROGRESS' : (isTargetHit ? 'TARGET HIT (+WIN)' : 'STOP LOSS HIT (-LOSS)');

  const dirBg = trade.direction === 'LONG' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const dirColor = trade.direction === 'LONG' ? '#34d399' : '#f87171';

  const psychBg = trade.psychology === 'Calm' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
  const psychColor = trade.psychology === 'Calm' ? '#34d399' : '#fbbf24';

  const formattedDate = new Date(trade.date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
    <div class="trade-page-card" style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
      <div>
        <!-- Card Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.6rem; margin-bottom: 0.8rem;">
          <div>
            <span style="font-size: 0.68rem; color: var(--text-secondary); font-family: monospace;">ENTRY #${indexNum}</span>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <strong style="font-size: 1.1rem; color: var(--text-primary);">${trade.symbol}</strong>
              <span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; background: ${dirBg}; color: ${dirColor};">${trade.direction}</span>
              <span style="font-size: 0.68rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(255,255,255,0.05); color: var(--text-secondary);">25x</span>
              <span style="font-size: 0.68rem; opacity: 0.8; color: var(--accent-blue); font-weight: 600;">(${trade.currency || 'USD'})</span>
            </div>
          </div>
          <button onclick="deleteTrade('${trade.id}')" style="background: none; border: none; color: var(--text-secondary); opacity: 0.6; cursor: pointer; padding: 0.2rem;" title="Delete Entry">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>

        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.8rem;">
          <i data-lucide="calendar" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 0.2rem;"></i> ${formattedDate}
        </div>

        <!-- Outcome Badge & Interactive Resolution Triggers -->
        ${isOpen ? `
          <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #60a5fa; box-shadow: 0 0 8px #60a5fa; display: inline-block;"></span>
              LIVE TRADE IN PROGRESS
            </span>
            <span style="font-size: 0.7rem; opacity: 0.8;">Active</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
            <button onclick="resolveOpenTrade('${trade.id}', 'TARGET_HIT')" class="btn" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 0.72rem; font-weight: 700; padding: 0.45rem 0.2rem; cursor: pointer; text-align: center; border-radius: 6px; transition: all 0.2s;">
              🎯 Target Hit (+WIN)
            </button>
            <button onclick="resolveOpenTrade('${trade.id}', 'SL_HIT')" class="btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size: 0.72rem; font-weight: 700; padding: 0.45rem 0.2rem; cursor: pointer; text-align: center; border-radius: 6px; transition: all 0.2s;">
              🛑 SL Hit (-LOSS)
            </button>
          </div>
        ` : `
          <div style="background: ${statusBg}; border: 1px solid ${statusColor}; color: ${statusColor}; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span>${statusText}</span>
            <span style="font-family: monospace; font-size: 0.85rem;">${trade.pnl >= 0 ? '+' : ''}${sym}${trade.pnl.toFixed(2)}</span>
          </div>
        `}

        <!-- Metric Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: 8px; font-size: 0.7rem; margin-bottom: 1rem;">
          <div>
            <span style="color: var(--text-secondary); display: block;">Entry</span>
            <strong style="color: var(--text-primary); font-family: monospace;">${sym}${trade.entryPrice}</strong>
          </div>
          <div>
            <span style="color: var(--text-secondary); display: block;">Stop Loss</span>
            <strong style="color: #f87171; font-family: monospace;">${sym}${trade.slPrice}</strong>
          </div>
          <div>
            <span style="color: var(--text-secondary); display: block;">Target</span>
            <strong style="color: #34d399; font-family: monospace;">${sym}${trade.targetPrice}</strong>
          </div>
        </div>

        <!-- Rules & Psychology Summary -->
        <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.72rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">Risk : Reward Ratio</span>
            <strong style="color: var(--accent-blue); font-family: monospace;">${trade.rrRatio}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">Rules Compliant</span>
            <span style="color: ${trade.rulesFollowed ? '#34d399' : '#f87171'}; font-weight: 600;">
              ${trade.rulesFollowed ? '✓ 100% Compliant' : '⚠ Rule Violation'}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">Psychology Mindset</span>
            <span style="padding: 0.1rem 0.4rem; border-radius: 4px; background: ${psychBg}; color: ${psychColor}; font-weight: 600;">
              ${trade.psychology}
            </span>
          </div>
        </div>

        <!-- Journal Notes -->
        ${trade.notes ? `
          <div style="background: rgba(255,255,255,0.015); border-left: 2px solid var(--accent-blue); padding: 0.5rem 0.6rem; border-radius: 0 6px 6px 0; font-size: 0.72rem; color: var(--text-secondary); line-height: 1.4;">
            <strong style="color: var(--text-primary); display: block; margin-bottom: 0.2rem;">Lesson / Takeaway:</strong>
            ${trade.notes}
          </div>
        ` : ''}
      </div>

      <div style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.8rem; text-align: right; font-size: 0.65rem; color: var(--text-secondary); font-family: monospace;">
        JOURNAL REF ID: ${trade.id}
      </div>
    </div>
  `;
}

function renderDateTree(container) {
  if (tradeBookState.length === 0) {
    container.innerHTML = '<span style="font-size: 0.72rem; color: var(--text-secondary); font-style: italic;">No trades logged yet</span>';
    return;
  }

  // Group trades by Year -> Month
  const treeData = {};
  tradeBookState.forEach(trade => {
    const d = new Date(trade.date);
    const year = d.getFullYear();
    const month = d.toLocaleString(undefined, { month: 'short' });

    if (!treeData[year]) treeData[year] = {};
    if (!treeData[year][month]) treeData[year][month] = 0;
    treeData[year][month]++;
  });

  let treeHtml = '';
  Object.keys(treeData).sort((a, b) => b - a).forEach(year => {
    treeHtml += `
      <div style="margin-bottom: 0.5rem;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.3rem;">
          <i data-lucide="folder" style="width: 12px; height: 12px; color: var(--accent-blue);"></i> ${year}
        </span>
        <div style="padding-left: 0.8rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.2rem;">
    `;
    Object.keys(treeData[year]).forEach(month => {
      const count = treeData[year][month];
      treeHtml += `
        <div style="font-size: 0.7rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
          <span>• ${month}</span>
          <span style="background: rgba(255,255,255,0.05); padding: 0.05rem 0.35rem; border-radius: 4px; font-family: monospace;">${count} trades</span>
        </div>
      `;
    });
    treeHtml += `
        </div>
      </div>
    `;
  });

  container.innerHTML = treeHtml;
}

const LOSS_WISDOM_QUOTES = [
  "Trading is purely a game of probability. A single stop loss is just an operational cost of doing business. Keep executing your edge — the math is in your favor over 100 trades!",
  "Loss accepted with zero emotion. No revenge trading! Take a step back, stay calm, and wait patiently for the next high-confluence setup.",
  "Master traders protect capital first. You respected your Stop Loss today — that is true discipline. Keep playing the long game!",
  "Every stop loss respected protects your portfolio for the big trending wins. Stay patient and trust your risk-to-reward ratio."
];

const WIN_WISDOM_QUOTES = [
  "Target hit! Excellent execution, but stay humble. Never assume you know the market or are superior to it. Market humility protects your profits.",
  "Great profit booked! Remember: Overconfidence is a trader's biggest enemy. Stick strictly to your max 2 trades/day rule.",
  "A winning trade is just 1 data point in your 100-trade sample. Stay calm, disciplined, and follow the exact same process next time.",
  "Profits compound when you stay emotionally detached. Enjoy the win, shut the terminal, and protect your emotional capital."
];

let pendingResolution = null;

function resolveOpenTrade(tradeId, outcome) {
  const trade = tradeBookState.find(t => t.id === tradeId);
  if (!trade) return;

  const isWin = outcome === 'TARGET_HIT';
  const exitPrice = isWin ? trade.targetPrice : trade.slPrice;
  const pnl = calculateTradePnL(trade.entryPrice, exitPrice, trade.positionSize, trade.direction);
  const sym = getCurrencySymbol(trade.currency || 'USD');

  pendingResolution = { trade, outcome, exitPrice, pnl, sym, isWin };

  // Populate Resolution Modal Elements
  const modal = document.getElementById('tradeResolutionModal');
  const title = document.getElementById('resModalTitle');
  const subtitle = document.getElementById('resModalSubtitle');
  const outcomeBadge = document.getElementById('resModalOutcomeBadge');
  const exitPriceEl = document.getElementById('resModalExitPrice');
  const pnlEl = document.getElementById('resModalPnL');
  const quoteEl = document.getElementById('resModalQuote');
  const iconContainer = document.getElementById('resModalIconContainer');
  const iconEl = document.getElementById('resModalIcon');
  const coachingHeader = document.getElementById('resModalCoachingHeader');

  if (!modal) return;

  if (title) title.textContent = isWin ? 'Target Hit — Profit Booked!' : 'Stop Loss Hit — Capital Protected!';
  if (subtitle) subtitle.textContent = `Asset: ${trade.symbol} (${trade.direction}) • Entry Price: ${sym}${trade.entryPrice}`;

  if (outcomeBadge) {
    outcomeBadge.textContent = isWin ? 'TARGET HIT (+WIN)' : 'STOP LOSS HIT (-LOSS)';
    outcomeBadge.style.background = isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    outcomeBadge.style.color = isWin ? '#34d399' : '#f87171';
    outcomeBadge.style.border = isWin ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
  }

  if (exitPriceEl) exitPriceEl.textContent = `${sym}${exitPrice.toLocaleString()}`;
  if (pnlEl) {
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${sym}${pnl.toFixed(2)}`;
    pnlEl.style.color = pnl >= 0 ? '#34d399' : '#f87171';
  }

  if (iconContainer) {
    iconContainer.style.background = isWin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    iconContainer.style.border = isWin ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid rgba(239, 68, 68, 0.4)';
    iconContainer.style.boxShadow = isWin ? '0 0 20px rgba(16, 185, 129, 0.3)' : '0 0 20px rgba(239, 68, 68, 0.3)';
  }

  if (iconEl) {
    iconEl.setAttribute('data-lucide', isWin ? 'trophy' : 'shield-alert');
    iconEl.style.color = isWin ? '#34d399' : '#f87171';
  }

  if (coachingHeader) {
    coachingHeader.textContent = isWin ? '🧠 Winner Discipline Protocol' : '🛡️ Probability & Resiliency Mindset';
    coachingHeader.style.color = isWin ? '#34d399' : '#60a5fa';
  }

  // Pick random psychological quote
  const quotesList = isWin ? WIN_WISDOM_QUOTES : LOSS_WISDOM_QUOTES;
  const selectedQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
  if (quoteEl) quoteEl.textContent = `"${selectedQuote}"`;

  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

  modal.classList.add('active');
}

function confirmTradeResolution() {
  if (!pendingResolution) return;

  const { trade, outcome, pnl, sym, isWin } = pendingResolution;
  trade.status = outcome;
  trade.pnl = pnl;

  saveTradeBookState();
  closeResolutionModal();
  renderTradeBookUI();
  renderTradeBookCharts();

  showToast(`Trade #${trade.symbol} resolved with ${isWin ? 'WIN' : 'LOSS'} (${pnl >= 0 ? '+' : ''}${sym}${pnl.toFixed(2)})`, isWin ? 'success' : 'error');
  pendingResolution = null;
}

function closeResolutionModal() {
  const modal = document.getElementById('tradeResolutionModal');
  if (modal) modal.classList.remove('active');
  pendingResolution = null;
}

function getFilteredTradesByPeriod(period) {
  if (!period || period === 'ALL') return tradeBookState;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return tradeBookState.filter(t => {
    const tDate = new Date(t.date).getTime();
    if (isNaN(tDate)) return true;

    if (period === 'TODAY') {
      return tDate >= startOfToday;
    } else if (period === 'WEEK') {
      const startOfWeek = startOfToday - (6 * 24 * 60 * 60 * 1000);
      return tDate >= startOfWeek;
    } else if (period === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return tDate >= startOfMonth;
    } else if (period === '30DAYS') {
      const startOf30Days = startOfToday - (30 * 24 * 60 * 60 * 1000);
      return tDate >= startOf30Days;
    } else if (period === 'YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      return tDate >= startOfYear;
    } else if (period === 'CUSTOM') {
      const startEl = document.getElementById('tbStartDateInput');
      const endEl = document.getElementById('tbEndDateInput');
      const startMs = startEl && startEl.value ? new Date(startEl.value).getTime() : 0;
      const endMs = endEl && endEl.value ? new Date(endEl.value + 'T23:59:59').getTime() : Date.now();
      return tDate >= startMs && tDate <= endMs;
    }
    return true;
  });
}

function renderTradeBookCharts() {
  const pnlCanvas = document.getElementById('pnlGrowthChart');
  const psychCanvas = document.getElementById('psychologyChart');

  if (!pnlCanvas || !psychCanvas || typeof Chart === 'undefined') return;

  const periodSelect = document.getElementById('tbTimeFilter');
  const periodVal = periodSelect ? periodSelect.value : 'ALL';
  const filteredTrades = getFilteredTradesByPeriod(periodVal);

  // Compute metrics
  const totalTrades = filteredTrades.length;
  const closedTrades = filteredTrades.filter(t => t.status !== 'OPEN');
  const wins = closedTrades.filter(t => t.status === 'TARGET_HIT').length;
  const losses = closedTrades.filter(t => t.status === 'SL_HIT').length;
  const openCount = filteredTrades.filter(t => t.status === 'OPEN').length;

  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '0.0';
  const netPnL = filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const totalCapital = filteredTrades.reduce((acc, t) => acc + (t.positionSize || 0), 0);
  const capitalReturn = totalCapital > 0 ? ((netPnL / totalCapital) * 100).toFixed(1) : '0.0';

  const defaultSym = filteredTrades.length > 0 ? getCurrencySymbol(filteredTrades[0].currency) : '$';

  // Update DOM Metric Badges
  const metricNetPnL = document.getElementById('tbMetricNetPnL');
  const metricWinRate = document.getElementById('tbMetricWinRate');
  const metricTotalTrades = document.getElementById('tbMetricTotalTrades');
  const metricCapitalImpact = document.getElementById('tbMetricCapitalImpact');

  if (metricNetPnL) {
    metricNetPnL.textContent = `${netPnL >= 0 ? '+' : ''}${defaultSym}${netPnL.toFixed(2)}`;
    metricNetPnL.style.color = netPnL >= 0 ? '#34d399' : '#f87171';
  }
  if (metricWinRate) metricWinRate.textContent = `${winRate}% (${wins}W / ${losses}L)`;
  if (metricTotalTrades) metricTotalTrades.textContent = `${totalTrades} (${openCount} Open)`;
  if (metricCapitalImpact) {
    metricCapitalImpact.textContent = `${capitalReturn >= 0 ? '+' : ''}${capitalReturn}% Return`;
    metricCapitalImpact.style.color = capitalReturn >= 0 ? '#60a5fa' : '#f87171';
  }

  // 1. Render PnL Growth Chart
  const chronTrades = [...filteredTrades].reverse();
  let cumPnL = 0;
  const labels = chronTrades.map((t, idx) => `#${idx + 1} (${t.symbol})`);
  const pnlData = chronTrades.map(t => {
    cumPnL += (t.pnl || 0);
    return cumPnL;
  });

  if (pnlGrowthChartInstance) pnlGrowthChartInstance.destroy();
  const ctx1 = pnlCanvas.getContext('2d');
  const grad1 = ctx1.createLinearGradient(0, 0, 0, 200);
  grad1.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
  grad1.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

  pnlGrowthChartInstance = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Start'],
      datasets: [{
        label: `Cumulative Net PnL (${defaultSym})`,
        data: pnlData.length > 0 ? pnlData : [0],
        borderColor: '#3b82f6',
        backgroundColor: grad1,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
      }
    }
  });

  // 2. Render Psychology & Emotional State Breakdown
  const psychCounts = { Calm: 0, FOMO: 0, Revenge: 0, Random: 0 };
  tradeBookState.forEach(t => {
    if (psychCounts[t.psychology] !== undefined) {
      psychCounts[t.psychology]++;
    } else {
      psychCounts.Calm++;
    }
  });

  if (psychologyChartInstance) psychologyChartInstance.destroy();
  const ctx2 = psychCanvas.getContext('2d');
  psychologyChartInstance = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Calm & Disciplined', 'FOMO Entry', 'Revenge Trade', 'Random / Impulsive'],
      datasets: [{
        data: [psychCounts.Calm, psychCounts.FOMO, psychCounts.Revenge, psychCounts.Random],
        backgroundColor: ['#34d399', '#fbbf24', '#ef4444', '#a855f7'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 }
        }
      }
    }
  });
}

function exportTradeJournalJSON() {
  const exportData = (tradeBookState && tradeBookState.length > 0) ? tradeBookState : DEMO_TRADES;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Trade_Book_Backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Trade Book exported to JSON successfully!', 'success');
}

function exportTradeJournalCSV() {
  const tradesToExport = (tradeBookState && tradeBookState.length > 0) ? tradeBookState : DEMO_TRADES;
  if (!tradesToExport || tradesToExport.length === 0) {
    showToast('No trade records to export.', 'warning');
    return;
  }

  const headers = ['Trade ID', 'Date', 'Symbol', 'Direction', 'Currency', 'Position Capital', 'Entry Price', 'Stop Loss', 'Target Price', 'Status', 'Calculated PnL', 'Psychology', 'Notes'];
  
  const csvRows = [];
  csvRows.push(headers.join(','));

  tradesToExport.forEach(trade => {
    const row = [
      `"${trade.id || ''}"`,
      `"${trade.date || ''}"`,
      `"${trade.symbol || ''}"`,
      `"${trade.direction || ''}"`,
      `"${trade.currency || 'USD'}"`,
      trade.positionSize || 0,
      trade.entryPrice || 0,
      trade.slPrice || 0,
      trade.targetPrice || 0,
      `"${trade.status || 'OPEN'}"`,
      trade.pnl || 0,
      `"${(trade.psychology || '').replace(/"/g, '""')}"`,
      `"${(trade.notes || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Trade_Journal_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Trade Journal exported to CSV / Excel format successfully!', 'success');
}

function importTradeJournalJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        tradeBookState = importedData;
        saveTradeBookState();
        currentPageIndex = 0;
        renderTradeBookUI();
        renderTradeBookCharts();
        showToast(`Imported ${importedData.length} trades into your Trade Book!`, 'success');
      } else {
        showToast('Invalid JSON file format.', 'error');
      }
    } catch (err) {
      console.error('Import error:', err);
      showToast('Failed to parse JSON file.', 'error');
    }
  };
  reader.readAsText(file);
}

function initTradeBook() {
  loadTradeBookState();
  bindTradeBookEvents();
  renderTradeBookUI();
  renderTradeBookCharts();

  const periodSelect = document.getElementById('tbTimeFilter');
  const customContainer = document.getElementById('tbCustomDateContainer');
  const applyCustomBtn = document.getElementById('tbApplyCustomDateBtn');

  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      if (periodSelect.value === 'CUSTOM') {
        if (customContainer) customContainer.style.display = 'flex';
      } else {
        if (customContainer) customContainer.style.display = 'none';
        renderTradeBookCharts();
      }
    });
  }

  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      renderTradeBookCharts();
      showToast('Custom date range applied to Trade Book analytics!', 'info');
    });
  }
}

// Expose globally
window.initTradeBook = initTradeBook;
window.renderTradeBookUI = renderTradeBookUI;
window.renderTradeBookCharts = renderTradeBookCharts;
window.openTradeResolutionModal = openTradeResolutionModal;
window.closeResolutionModal = closeResolutionModal;
window.confirmTradeResolution = confirmTradeResolution;
window.exportTradeJournalJSON = exportTradeJournalJSON;
window.exportTradeJournalCSV = exportTradeJournalCSV;
window.importTradeJournalJSON = importTradeJournalJSON; 
window.closeTradeModal = closeTradeModal;
window.deleteTrade = deleteTrade;
window.resolveOpenTrade = resolveOpenTrade;
