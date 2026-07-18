// Fetch and render stock tickers and market mood index (MMI)
async function fetchAndRenderTicker() {
  const tickerTrackNifty = document.getElementById('tickerTrackNifty');
  const tickerTrackOmx = document.getElementById('tickerTrackOmx');
  
  try {
    const response = await fetch('/api/ticker');
    const data = await response.json();
    if (data.success) {
      if (data.nifty && tickerTrackNifty) {
        renderTicker(data.nifty, tickerTrackNifty, 'en-IN');
      }
      if (data.omx && tickerTrackOmx) {
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

async function fetchAndRenderMMI() {
  const mmiNeedle = document.getElementById('mmiNeedle');
  const mmiValue = document.getElementById('mmiValue');
  const mmiStatus = document.getElementById('mmiStatus');

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
  const mmiNeedle = document.getElementById('mmiNeedle');
  const mmiValue = document.getElementById('mmiValue');
  const mmiStatus = document.getElementById('mmiStatus');
  if (!mmiNeedle || !mmiValue || !mmiStatus) return;

  const value = data.currentValue || 50;
  mmiValue.textContent = value.toFixed(1);
  
  const deg = (value / 100) * 180 - 90;
  mmiNeedle.style.transform = `rotate(${deg}deg)`;
  
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
