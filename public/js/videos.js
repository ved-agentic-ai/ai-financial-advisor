// YouTube videos scan dashboard rendering and exporting
async function fetchVideos() {
  const searchQueryInput = document.getElementById('searchQuery');
  const timeLimitSelect = document.getElementById('timeLimit');
  const refreshBtn = document.getElementById('refreshBtn');
  const videoGrid = document.getElementById('videoGrid');

  if (!searchQueryInput || !timeLimitSelect || !refreshBtn || !videoGrid) return;

  const query = searchQueryInput.value.trim() || 'nifty analysis';
  const hours = timeLimitSelect.value;
  const youtubeApiKey = document.getElementById('apiKeyInput')?.value || '';

  refreshBtn.disabled = true;
  refreshBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block;"></i> Fetching...`;
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
  
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
    
    window.videosData = (result.videos || []).map(v => {
      return {
        ...v,
        sentiment: classifySentiment(v.title, v.description)
      };
    });
    
    showToast(`Successfully loaded ${window.videosData.length} videos.`, 'success');
    sortAndRenderVideos();
    
  } catch (error) {
    console.error('Failed to load videos:', error);
    showToast(`Error: ${error.message}`, 'error');
    
    let errorTitle = 'Failed to retrieve data';
    let errorDesc = error.message || 'An unknown network error occurred.';
    let actionTip = 'Please check your connection and retry.';

    if (errorDesc.includes('302') || errorDesc.includes('limit') || errorDesc.includes('quota') || errorDesc.includes('403') || errorDesc.toLowerCase().includes('failed')) {
      errorTitle = 'YouTube Rate Limit / API Quota Restrict';
      errorDesc = 'YouTube has temporarily restricted requests from this server IP or your daily official API key quota has been exhausted.';
      actionTip = `
        <div style="text-align: left; max-width: 500px; margin: 1rem auto; padding: 1rem; background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 8px; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
          <strong style="color: #fbbf24; display: block; margin-bottom: 0.5rem; font-size: 0.85rem;"><i data-lucide="alert-triangle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> Recommended Actions:</strong>
          <ol style="margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Use your own API Key:</strong> Click the settings gear icon in the top-right of the dashboard and paste a personal YouTube API Key for a stable, dedicated quota.</li>
            <li><strong>Wait for automatic reset:</strong> YouTube's official API quota resets daily at midnight PT. Temporary IP blocks reset within 15-60 minutes.</li>
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
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = `<i data-lucide="refresh-cw"></i> Refresh`;
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }
}

function sortAndRenderVideos() {
  const sortBySelect = document.getElementById('sortBy');
  const channelFilterInput = document.getElementById('channelFilter');
  const videoTypeSelect = document.getElementById('videoType');

  if (!sortBySelect || !channelFilterInput || !videoTypeSelect) return;

  const sortBy = sortBySelect.value;
  const channelQuery = channelFilterInput.value.trim().toLowerCase();
  const selectedType = videoTypeSelect.value;
  
  let filteredVideos = [...window.videosData];
  if (channelQuery) {
    filteredVideos = filteredVideos.filter(v => 
      v.channelName.toLowerCase().includes(channelQuery)
    );
  }

  if (selectedType === 'long') {
    filteredVideos = filteredVideos.filter(v => v.durationSeconds > 60);
  } else if (selectedType === 'shorts') {
    filteredVideos = filteredVideos.filter(v => v.durationSeconds <= 60);
  }
  
  if (sortBy === 'views') {
    filteredVideos.sort((a, b) => b.views - a.views);
  } else if (sortBy === 'sentiment') {
    const weight = { bullish: 3, neutral: 2, bearish: 1 };
    filteredVideos.sort((a, b) => weight[b.sentiment] - weight[a.sentiment]);
  } else {
    filteredVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  
  renderDashboard(filteredVideos);
}

function renderDashboard(data = window.videosData) {
  renderStats(data);
  renderGauge(data);
  renderTimelineChart(data);
  renderVideoCards(data);
}

function renderStats(data = window.videosData) {
  const statTotalVideos = document.getElementById('statTotalVideos');
  const statBullishCount = document.getElementById('statBullishCount');
  const statBearishCount = document.getElementById('statBearishCount');
  const statTotalViews = document.getElementById('statTotalViews');
  const statBullishPct = document.getElementById('statBullishPct');
  const statBearishPct = document.getElementById('statBearishPct');

  if (!statTotalVideos || !statBullishCount || !statBearishCount || !statTotalViews) return;

  const total = data.length;
  const bullish = data.filter(v => v.sentiment === 'bullish').length;
  const bearish = data.filter(v => v.sentiment === 'bearish').length;
  const totalViewsVal = data.reduce((sum, v) => sum + (v.views || 0), 0);

  statTotalVideos.textContent = total;
  statBullishCount.textContent = bullish;
  statBearishCount.textContent = bearish;
  
  if (totalViewsVal >= 1e6) {
    statTotalViews.textContent = `${(totalViewsVal / 1e6).toFixed(2)}M`;
  } else if (totalViewsVal >= 1e3) {
    statTotalViews.textContent = `${(totalViewsVal / 1e3).toFixed(1)}K`;
  } else {
    statTotalViews.textContent = totalViewsVal;
  }

  if (statBullishPct && statBearishPct) {
    if (total > 0) {
      statBullishPct.textContent = `${Math.round((bullish / total) * 100)}% of total`;
      statBearishPct.textContent = `${Math.round((bearish / total) * 100)}% of total`;
    } else {
      statBullishPct.textContent = '0% of total';
      statBearishPct.textContent = '0% of total';
    }
  }
}

function renderGauge(data = window.videosData) {
  const gaugeNeedle = document.getElementById('gaugeNeedle');
  const gaugeValue = document.getElementById('gaugeValue');
  const sentimentStatus = document.getElementById('sentimentStatus');

  if (!gaugeNeedle || !gaugeValue || !sentimentStatus) return;

  const bullish = data.filter(v => v.sentiment === 'bullish').length;
  const bearish = data.filter(v => v.sentiment === 'bearish').length;
  const total = bullish + bearish;

  let score = 50;
  if (total > 0) {
    score = Math.round((bullish / total) * 100);
  }

  const rotationDegrees = (score / 100) * 180 - 90;
  gaugeNeedle.style.transform = `rotate(${rotationDegrees}deg)`;
  gaugeValue.textContent = `${score}%`;

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

function renderVideoCards(data = window.videosData) {
  const videoGrid = document.getElementById('videoGrid');
  if (!videoGrid) return;
  videoGrid.innerHTML = '';
  
  if (data.length === 0) {
    videoGrid.innerHTML = `
      <div class="state-message">
        <i data-lucide="frown" style="width: 48px; height: 48px; color: var(--text-secondary); margin-bottom: 1rem;"></i>
        <h3>No videos found</h3>
        <p>Try modifying your query or increasing the time limit.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
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
  
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function openModal(modalEl) {
  if (modalEl) modalEl.classList.add('active');
}

function closeModal(modalEl) {
  if (modalEl) modalEl.classList.remove('active');
}

function openVideoModal(videoId) {
  const videoIframe = document.getElementById('videoIframe');
  const videoModal = document.getElementById('videoModal');
  if (videoIframe && videoModal) {
    videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    openModal(videoModal);
  }
}

function closeVideoModal() {
  const videoIframe = document.getElementById('videoIframe');
  const videoModal = document.getElementById('videoModal');
  if (videoIframe && videoModal) {
    videoIframe.src = '';
    closeModal(videoModal);
  }
}

function exportToCSV() {
  if (window.videosData.length === 0) {
    showToast('No data to export!', 'error');
    return;
  }

  const headers = ['Video ID', 'Title', 'Channel', 'Views', 'Upload Age', 'Sentiment', 'Published At', 'URL'];
  const rows = window.videosData.map(v => [
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

function exportToJSON() {
  if (window.videosData.length === 0) {
    showToast('No data to export!', 'error');
    return;
  }

  const jsonStr = JSON.stringify(window.videosData, null, 2);
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
