// Stateless helper functions and formatters
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
  
  if (currency === 'SEK') {
    return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
  }
  return symbol + val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getApproximateHoursAgoGlobal(agoString) {
  if (!agoString) return 999999;
  const s = agoString.toLowerCase();
  
  if (s.includes('now') || s.includes('second') || s.includes('minute') || s.endsWith('m')) {
    return 0.5;
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

function applyCurrencyAndAssetDefaults() {
  const currency = document.getElementById('survivalCurrencySelect')?.value || 'INR';
  const defaults = window.defaultAssetPrices[currency][window.currentSharkAsset];
  if (!defaults) return;

  const abEl = document.getElementById('sharkAvailableBalance');
  const epEl = document.getElementById('sharkEntryPrice');
  const maEl = document.getElementById('sharkMarginAmount');
  const tpEl = document.getElementById('sharkTargetProfitPrice');
  const slEl = document.getElementById('sharkStopLossPrice');

  if (abEl) abEl.value = defaults.balance;
  if (epEl) epEl.value = defaults.entry;
  if (maEl) maEl.value = defaults.margin;

  if (window.currentSharkTPSLMode === 'price') {
    if (tpEl) tpEl.value = defaults.tp;
    if (slEl) slEl.value = defaults.sl;
  } else {
    const tpPctVal = Math.abs((defaults.tp - defaults.entry) / defaults.entry * 100).toFixed(1);
    const slPctVal = Math.abs((defaults.entry - defaults.sl) / defaults.entry * 100).toFixed(1);
    if (tpEl) tpEl.value = tpPctVal;
    if (slEl) slEl.value = slPctVal;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
  toast.style.color = '#fff';
  toast.style.padding = '0.5rem 1rem';
  toast.style.borderRadius = '4px';
  toast.style.fontSize = '0.74rem';
  toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
