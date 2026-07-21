// TradingView Interactive Charting & Multi-Market Watchlist Module

window.tvState = {
  currentSymbol: 'NASDAQ:NVDA',
  currentRegionFilter: 'ALL',
  searchQuery: '',
  watchlists: {
    'default': { id: 'default', name: '⭐ Master Default Watchlist', items: [] }
  },
  activeWatchlistId: 'default',
  isFullscreen: false
};

// Curated Default Multi-Market Presets
window.defaultMarketPresets = [
  // 🇸🇪 Sweden Market (OMXSTO)
  { symbol: 'OMXSTO:OMXS30', name: 'OMXS30 Index', region: 'SE', desc: 'Stockholm 30 Index' },
  { symbol: 'OMXSTO:VOLV_B', name: 'Volvo B', region: 'SE', desc: 'Volvo Group Class B' },
  { symbol: 'OMXSTO:ERIC_B', name: 'Ericsson B', region: 'SE', desc: 'Telefonaktiebolaget LM Ericsson' },
  { symbol: 'OMXSTO:INVE_B', name: 'Investor B', region: 'SE', desc: 'Investor AB' },
  { symbol: 'OMXSTO:SEB_A', name: 'SEB A', region: 'SE', desc: 'Skandinaviska Enskilda Banken' },
  { symbol: 'OMXSTO:HM_B', name: 'H&M B', region: 'SE', desc: 'Hennes & Mauritz AB' },
  { symbol: 'OMXSTO:AZN', name: 'AstraZeneca (SE)', region: 'SE', desc: 'AstraZeneca PLC (Stockholm)' },
  { symbol: 'OMXSTO:SWED_A', name: 'Swedbank A', region: 'SE', desc: 'Swedbank AB' },

  // 🇺🇸 US Equities & Indices
  { symbol: 'NASDAQ:AAPL', name: 'Apple Inc.', region: 'US', desc: 'Consumer Tech & Hardware' },
  { symbol: 'NASDAQ:NVDA', name: 'NVIDIA Corp.', region: 'US', desc: 'AI Semiconductors & GPU' },
  { symbol: 'NASDAQ:TSLA', name: 'Tesla Inc.', region: 'US', desc: 'EV & Clean Energy' },
  { symbol: 'NYSE:SPY', name: 'SPDR S&P 500 ETF', region: 'US', desc: 'S&P 500 Index ETF' },
  { symbol: 'NASDAQ:QQQ', name: 'Invesco QQQ', region: 'US', desc: 'Nasdaq-100 ETF' },
  { symbol: 'NASDAQ:MSFT', name: 'Microsoft Corp.', region: 'US', desc: 'Cloud & AI Software' },
  { symbol: 'NASDAQ:AMZN', name: 'Amazon.com', region: 'US', desc: 'E-Commerce & AWS Cloud' },

  // 🪙 Crypto Assets
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin / USDT', region: 'CRYPTO', desc: 'Bitcoin Spot' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum / USDT', region: 'CRYPTO', desc: 'Ethereum Spot' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana / USDT', region: 'CRYPTO', desc: 'Solana Layer-1' },
  { symbol: 'BINANCE:BNBUSDT', name: 'Binance Coin / USDT', region: 'CRYPTO', desc: 'BNB Chain' },
  { symbol: 'BINANCE:XRPUSDT', name: 'XRP / USDT', region: 'CRYPTO', desc: 'Ripple Ledger' },

  // 🇮🇳 Indian Market (NSE / BSE)
  { symbol: 'NSE:NIFTY', name: 'NIFTY 50', region: 'IN', desc: 'NSE Benchmark Index' },
  { symbol: 'NSE:BANKNIFTY', name: 'NIFTY BANK', region: 'IN', desc: 'Banking Sector Index' },
  { symbol: 'NSE:RELIANCE', name: 'Reliance Industries', region: 'IN', desc: 'Energy & Digital Conglomerate' },
  { symbol: 'NSE:TCS', name: 'TCS Ltd', region: 'IN', desc: 'IT Services Leader' },
  { symbol: 'NSE:INFY', name: 'Infosys Ltd', region: 'IN', desc: 'Global Tech Consulting' },
  { symbol: 'NSE:HDFCBANK', name: 'HDFC Bank', region: 'IN', desc: 'Private Banking Leader' }
];

function initTradingViewModule() {
  loadWatchlistsFromStorage();
  bindTradingViewEvents();
  renderWatchlistDropdownOptions();
  renderWatchlistItems();
  loadTradingViewChart(tvState.currentSymbol);
  loadTradingViewTickerTape();
}

function loadWatchlistsFromStorage() {
  try {
    const storedDict = localStorage.getItem('tv_custom_watchlists_dict');
    const storedActiveId = localStorage.getItem('tv_active_watchlist_id');

    if (storedDict) {
      tvState.watchlists = JSON.parse(storedDict);
    } else {
      tvState.watchlists = {
        'default': { id: 'default', name: '⭐ Master Default Watchlist', items: [] }
      };
    }

    if (storedActiveId && tvState.watchlists[storedActiveId]) {
      tvState.activeWatchlistId = storedActiveId;
    } else {
      tvState.activeWatchlistId = 'default';
    }
  } catch (err) {
    tvState.watchlists = {
      'default': { id: 'default', name: '⭐ Master Default Watchlist', items: [] }
    };
    tvState.activeWatchlistId = 'default';
  }
}

function saveWatchlistsToStorage() {
  try {
    localStorage.setItem('tv_custom_watchlists_dict', JSON.stringify(tvState.watchlists));
    localStorage.setItem('tv_active_watchlist_id', tvState.activeWatchlistId);
  } catch (err) {}
}

function renderWatchlistDropdownOptions() {
  const selectEl = document.getElementById('tvWatchlistSelect');
  if (!selectEl) return;

  let html = '';
  Object.keys(tvState.watchlists).forEach(id => {
    const list = tvState.watchlists[id];
    const isSelected = id === tvState.activeWatchlistId;
    html += `<option value="${id}" ${isSelected ? 'selected' : ''}>${list.name} (${list.items.length})</option>`;
  });

  selectEl.innerHTML = html;
}

function bindTradingViewEvents() {
  // Search Input Filter
  const searchInput = document.getElementById('tvSymbolSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      tvState.searchQuery = e.target.value.trim().toUpperCase();
      renderWatchlistItems();
    });
  }

  // Region Filter Buttons
  document.querySelectorAll('.tv-region-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tv-region-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      tvState.currentRegionFilter = e.currentTarget.getAttribute('data-region') || 'ALL';
      renderWatchlistItems();
    });
  });

  // Watchlist Select Dropdown Change
  const selectEl = document.getElementById('tvWatchlistSelect');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      tvState.activeWatchlistId = e.target.value;
      saveWatchlistsToStorage();
      renderWatchlistItems();
      showToast(`Switched active watchlist to: ${tvState.watchlists[tvState.activeWatchlistId]?.name}`, 'info');
    });
  }

  // Create New Watchlist Button
  const createListBtn = document.getElementById('tvCreateListBtn');
  if (createListBtn) {
    createListBtn.addEventListener('click', () => {
      const listName = prompt('Enter a name for your new Custom Watchlist:', 'My Favorites');
      if (listName && listName.trim()) {
        const id = 'custom_' + Date.now();
        tvState.watchlists[id] = {
          id: id,
          name: `📁 ${listName.trim()}`,
          items: []
        };
        tvState.activeWatchlistId = id;
        saveWatchlistsToStorage();
        renderWatchlistDropdownOptions();
        renderWatchlistItems();
        showToast(`Created new watchlist: ${listName.trim()}`, 'success');
      }
    });
  }

  // Delete Watchlist Button
  const deleteListBtn = document.getElementById('tvDeleteListBtn');
  if (deleteListBtn) {
    deleteListBtn.addEventListener('click', () => {
      if (tvState.activeWatchlistId === 'default') {
        showToast('The Master Default Watchlist cannot be deleted.', 'warning');
        return;
      }
      const listName = tvState.watchlists[tvState.activeWatchlistId]?.name;
      if (confirm(`Are you sure you want to delete "${listName}"?`)) {
        delete tvState.watchlists[tvState.activeWatchlistId];
        tvState.activeWatchlistId = 'default';
        saveWatchlistsToStorage();
        renderWatchlistDropdownOptions();
        renderWatchlistItems();
        showToast(`Deleted custom watchlist.`, 'info');
      }
    });
  }

  // Custom Add Symbol Form
  const addBtn = document.getElementById('tvAddSymbolBtn');
  const addInput = document.getElementById('tvAddSymbolInput');
  const addMarketSelect = document.getElementById('tvAddMarketSelect');

  if (addBtn && addInput) {
    addBtn.addEventListener('click', () => {
      const rawTicker = addInput.value.trim().toUpperCase();
      if (!rawTicker) {
        showToast('Please enter a valid symbol (e.g. VOLV_B, NVDA, NIFTY, BTCUSDT).', 'warning');
        return;
      }
      const prefix = addMarketSelect ? addMarketSelect.value : 'NASDAQ:';
      const fullSymbol = rawTicker.includes(':') ? rawTicker : `${prefix}${rawTicker}`;
      
      addCustomSymbolToWatchlist(fullSymbol);
      addInput.value = '';
    });
  }

  // Fullscreen Button
  const fullscreenBtn = document.getElementById('tvFullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleTradingViewFullscreen);
  }
}

function toggleTradingViewFullscreen() {
  const chartWrapper = document.getElementById('tvChartWrapper');
  const labelEl = document.getElementById('tvFullscreenLabel');
  const chartBox = document.getElementById('tv_chart_container');
  if (!chartWrapper) return;

  tvState.isFullscreen = !tvState.isFullscreen;

  if (tvState.isFullscreen) {
    if (chartWrapper.requestFullscreen) {
      chartWrapper.requestFullscreen().catch(() => {});
    }
    chartWrapper.classList.add('tv-fullscreen-mode');
    chartWrapper.style.position = 'fixed';
    chartWrapper.style.top = '0';
    chartWrapper.style.left = '0';
    chartWrapper.style.width = '100vw';
    chartWrapper.style.height = '100vh';
    chartWrapper.style.zIndex = '999999';
    chartWrapper.style.borderRadius = '0';
    if (chartBox) chartBox.style.height = 'calc(100vh - 45px)';
    if (labelEl) labelEl.textContent = '✕ Exit Fullscreen';
  } else {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    chartWrapper.classList.remove('tv-fullscreen-mode');
    chartWrapper.style.position = 'relative';
    chartWrapper.style.top = 'auto';
    chartWrapper.style.left = 'auto';
    chartWrapper.style.width = 'auto';
    chartWrapper.style.height = 'auto';
    chartWrapper.style.zIndex = 'auto';
    chartWrapper.style.borderRadius = '12px';
    if (chartBox) chartBox.style.height = '610px';
    if (labelEl) labelEl.textContent = '⤢ Fullscreen Chart';
  }

  // Re-trigger widget resize
  loadTradingViewChart(tvState.currentSymbol);
}

function addCustomSymbolToWatchlist(fullSymbol) {
  const activeList = tvState.watchlists[tvState.activeWatchlistId];
  if (!activeList) return;

  const parts = fullSymbol.split(':');
  const prefix = parts.length > 1 ? parts[0] : 'US';
  const ticker = parts.length > 1 ? parts[1] : fullSymbol;

  let region = 'US';
  if (prefix.includes('OMXSTO')) region = 'SE';
  else if (prefix.includes('BINANCE') || prefix.includes('CRYPTO')) region = 'CRYPTO';
  else if (prefix.includes('NSE') || prefix.includes('BSE')) region = 'IN';

  const newItem = {
    symbol: fullSymbol,
    name: ticker,
    region: region,
    desc: `Custom Ticker (${prefix})`,
    isCustom: true
  };

  // Check if exists
  const exists = activeList.items.some(item => item.symbol === fullSymbol);
  if (!exists) {
    activeList.items.unshift(newItem);
    saveWatchlistsToStorage();
    renderWatchlistDropdownOptions();
    renderWatchlistItems();
    showToast(`Added ${fullSymbol} to ${activeList.name}!`, 'success');
  } else {
    showToast(`${fullSymbol} is already in this watchlist.`, 'info');
  }

  loadTradingViewChart(fullSymbol);
}

function removeCustomSymbolFromWatchlist(fullSymbol) {
  const activeList = tvState.watchlists[tvState.activeWatchlistId];
  if (!activeList) return;

  activeList.items = activeList.items.filter(item => item.symbol !== fullSymbol);
  saveWatchlistsToStorage();
  renderWatchlistDropdownOptions();
  renderWatchlistItems();
  showToast(`Removed ${fullSymbol} from ${activeList.name}.`, 'info');
}

function renderWatchlistItems() {
  const container = document.getElementById('tvWatchlistContainer');
  if (!container) return;

  const activeList = tvState.watchlists[tvState.activeWatchlistId] || tvState.watchlists['default'];
  
  // Combine Active Custom List Items with Global Presets
  const allItems = [...(activeList.items || []), ...window.defaultMarketPresets];
  
  // Deduplicate by symbol
  const uniqueItems = [];
  const seenSymbols = new Set();
  allItems.forEach(item => {
    if (!seenSymbols.has(item.symbol)) {
      seenSymbols.add(item.symbol);
      uniqueItems.push(item);
    }
  });

  // Filter by Region & Search Query
  const filtered = uniqueItems.filter(item => {
    const matchesRegion = tvState.currentRegionFilter === 'ALL' || item.region === tvState.currentRegionFilter;
    const q = tvState.searchQuery;
    const matchesSearch = !q || item.symbol.toUpperCase().includes(q) || item.name.toUpperCase().includes(q) || item.desc.toUpperCase().includes(q);
    return matchesRegion && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.78rem;">
        No symbols matching "<strong>${tvState.searchQuery}</strong>" in <em>${activeList.name}</em>.
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const isActive = item.symbol === tvState.currentSymbol;
    let badgeColor = '#60a5fa'; // US
    let badgeLabel = '🇺🇸 US';
    if (item.region === 'SE') { badgeColor = '#38bdf8'; badgeLabel = '🇸🇪 SE'; }
    if (item.region === 'CRYPTO') { badgeColor = '#f59e0b'; badgeLabel = '🪙 CRYPTO'; }
    if (item.region === 'IN') { badgeColor = '#34d399'; badgeLabel = '🇮🇳 IN'; }

    html += `
      <div class="tv-watchlist-card ${isActive ? 'active-symbol' : ''}" onclick="selectTradingViewSymbol('${item.symbol}')" style="padding: 0.65rem 0.85rem; border-radius: 8px; background: ${isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${isActive ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-color)'}; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; margin-bottom: 0.4rem;">
        <div style="display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${item.name}
            </span>
            <span style="font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: ${badgeColor}; border: 1px solid rgba(255,255,255,0.1); font-weight: 600;">
              ${badgeLabel}
            </span>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-secondary); font-family: monospace; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${item.symbol} &bull; ${item.desc}
          </span>
        </div>
        ${item.isCustom ? `
          <button onclick="event.stopPropagation(); removeCustomSymbolFromWatchlist('${item.symbol}')" title="Remove custom ticker" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0.2rem; font-size: 0.75rem; margin-left: 0.4rem;">
            &times;
          </button>
        ` : ''}
      </div>
    `;
  });

  container.innerHTML = html;
}

function selectTradingViewSymbol(symbol) {
  tvState.currentSymbol = symbol;
  renderWatchlistItems();
  loadTradingViewChart(symbol);
}

function loadTradingViewChart(symbol) {
  tvState.currentSymbol = symbol;

  const symbolBadgeEl = document.getElementById('tvActiveSymbolBadge');
  if (symbolBadgeEl) {
    symbolBadgeEl.textContent = symbol;
  }

  const chartBox = document.getElementById('tv_chart_container');
  if (!chartBox) return;

  chartBox.innerHTML = ''; // Clear container

  // Check if TradingView script is already loaded
  if (typeof TradingView !== 'undefined') {
    renderTVWidget(symbol);
  } else {
    // Inject TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => renderTVWidget(symbol);
    document.head.appendChild(script);
  }
}

function renderTVWidget(symbol) {
  if (typeof TradingView === 'undefined') return;

  new TradingView.widget({
    "autosize": true,
    "symbol": symbol,
    "interval": "D",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "en",
    "toolbar_bg": "#0f172a",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "hide_side_toolbar": false,
    "container_id": "tv_chart_container",
    "studies": [
      "RSI@tv-basicstudies",
      "MASimple@tv-basicstudies"
    ]
  });
}

function loadTradingViewTickerTape() {
  const tickerTapeHolder = document.getElementById('tvTickerTapeHolder');
  if (!tickerTapeHolder) return;

  tickerTapeHolder.innerHTML = '';

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    "symbols": [
      { "proName": "OMXSTO:OMXS30", "title": "🇸🇪 OMXS30" },
      { "proName": "OMXSTO:VOLV_B", "title": "🇸🇪 VOLVO B" },
      { "proName": "FOREXCOM:SPXUSD", "title": "🇺🇸 S&P 500" },
      { "proName": "NASDAQ:AAPL", "title": "🇺🇸 AAPL" },
      { "proName": "NASDAQ:NVDA", "title": "🇺🇸 NVDA" },
      { "proName": "BINANCE:BTCUSDT", "title": "🪙 BTC/USDT" },
      { "proName": "BINANCE:ETHUSDT", "title": "🪙 ETH/USDT" },
      { "proName": "NSE:NIFTY", "title": "🇮🇳 NIFTY 50" },
      { "proName": "NSE:RELIANCE", "title": "🇮🇳 RELIANCE" }
    ],
    "showSymbolLogo": true,
    "colorTheme": "dark",
    "isTransparent": true,
    "displayMode": "adaptive",
    "locale": "en"
  });

  tickerTapeHolder.appendChild(script);
}

// Global Exports
window.initTradingViewModule = initTradingViewModule;
window.selectTradingViewSymbol = selectTradingViewSymbol;
window.removeCustomSymbolFromWatchlist = removeCustomSymbolFromWatchlist;
window.toggleTradingViewFullscreen = toggleTradingViewFullscreen;
