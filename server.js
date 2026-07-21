const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const axios = require('axios');
const ytSearch = require('yt-search');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Helper to parse YouTube duration format (ISO 8601, e.g. PT10M15S) into mm:ss or hh:mm:ss
 */
function parseYouTubeDuration(durationStr) {
  if (!durationStr) return '0:00';
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  
  if (hours > 0) {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  
  return `${minutes}:${formattedSeconds}`;
}

/**
 * Helper to parse YouTube duration format into raw seconds
 */
function parseYouTubeDurationSeconds(durationStr) {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Helper to format views count (e.g. 10400 -> "10.4K views")
 */
function formatViews(views) {
  if (views === undefined || views === null) return '0 views';
  const num = Number(views);
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M views`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K views`;
  }
  return `${num} views`;
}

/**
 * Helper to estimate hours ago from a relative time string (e.g., "12 hours ago", "1 day ago", "2 years ago")
 */
function getApproximateHoursAgo(agoString) {
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
  return 999999; // Fallback
}

/**
 * Helper to get relative time string from ISO published date (for official API)
 */
function getRelativeTimeString(publishedAt) {
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * API Endpoint: /api/videos
 * Returns YouTube videos matching a query, filtered by the upload time window (in hours).
 * Parameters:
 *   - q: search query (defaults to "nifty analysis")
 *   - hours: time window (defaults to 24)
 *   - key: optional API key (passed from frontend for ease of custom key use)
 */
/**
 * Simple in-memory cache for YouTube searches to prevent rate-limiting and stabilize gauge updates
 */
const videoCache = {};

app.get('/api/videos', async (req, res) => {
  try {
    const query = req.query.q || 'nifty analysis';
    const hours = parseInt(req.query.hours || '24', 10);
    
    // API key check priority: query string -> Authorization header -> process.env
    let apiKey = req.query.key || '';
    if (!apiKey && req.headers.authorization) {
      apiKey = req.headers.authorization.replace('Bearer ', '').trim();
    }
    if (!apiKey) {
      apiKey = process.env.YOUTUBE_API_KEY || '';
    }

    // Construct cache key based on query, hours, and mode
    const cacheKey = `${query}_${hours}_${apiKey ? 'api' : 'scraper'}`;
    const cachedEntry = videoCache[cacheKey];
    
    // 5 minutes (300,000 ms) TTL
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < 300000)) {
      console.log(`[Cache] Returning cached video list for key: "${cacheKey}"`);
      return res.json(cachedEntry.data);
    }

    if (apiKey) {
      console.log(`Fetching videos using official YouTube API for query: "${query}" (hours limit: ${hours})...`);
      
      const publishedAfter = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
      
      const searchResponse = await axios.get(searchUrl, {
        params: {
          part: 'snippet',
          q: query,
          maxResults: 50,
          order: 'date',
          type: 'video',
          publishedAfter: publishedAfter,
          key: apiKey
        }
      });

      const searchItems = searchResponse.data.items || [];
      if (searchItems.length === 0) {
        const responseData = { mode: 'api', videos: [] };
        videoCache[cacheKey] = { timestamp: Date.now(), data: responseData };
        return res.json(responseData);
      }

      const videoIds = searchItems.map(item => item.id.videoId).filter(Boolean);
      
      // Secondary request to get details (statistics and contentDetails)
      const detailsUrl = 'https://www.googleapis.com/youtube/v3/videos';
      const detailsResponse = await axios.get(detailsUrl, {
        params: {
          part: 'statistics,contentDetails',
          id: videoIds.join(','),
          key: apiKey
        }
      });

      const detailsMap = {};
      (detailsResponse.data.items || []).forEach(item => {
        detailsMap[item.id] = item;
      });

      // Map results to unified output schema
      const videos = searchItems
        .filter(item => item.id && item.id.videoId)
        .map(item => {
          const videoId = item.id.videoId;
          const snippet = item.snippet || {};
          const details = detailsMap[videoId] || {};
          const stats = details.statistics || {};
          const content = details.contentDetails || {};

          const views = stats.viewCount ? parseInt(stats.viewCount, 10) : 0;
          const durationStr = content.duration ? parseYouTubeDuration(content.duration) : '0:00';
          const publishedAt = snippet.publishedAt;
          
          return {
            videoId: videoId,
            title: snippet.title || '',
            description: snippet.description || '',
            thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
            channelName: snippet.channelTitle || '',
            channelId: snippet.channelId || '',
            views: views,
            viewsFormatted: formatViews(views),
            publishedAt: publishedAt,
            ago: getRelativeTimeString(publishedAt),
            duration: durationStr,
            durationSeconds: content.duration ? parseYouTubeDurationSeconds(content.duration) : 0,
            url: `https://www.youtube.com/watch?v=${videoId}`
          };
        });

      const responseData = { mode: 'api', videos: videos };
      videoCache[cacheKey] = { timestamp: Date.now(), data: responseData };
      return res.json(responseData);
      
    } else {
      console.log(`Fetching videos using yt-search scraper for query: "${query}" (hours limit: ${hours})...`);
      
      const searchResult = await ytSearch(query);
      const allVideos = searchResult.videos || [];
      
      // Filter results matching our hours criteria
      const filteredVideos = allVideos
        .map(v => {
          return {
            videoId: v.videoId,
            title: v.title,
            description: v.description || '',
            thumbnail: v.thumbnail || v.image || '',
            channelName: v.author?.name || '',
            channelId: v.author?.id || '',
            views: v.views || 0,
            viewsFormatted: formatViews(v.views),
            publishedAt: new Date(Date.now() - getApproximateHoursAgo(v.ago) * 3600000).toISOString(),
            ago: v.ago || '',
            duration: v.timestamp || v.duration?.toString() || '0:00',
            durationSeconds: v.seconds || 0,
            url: v.url
          };
        })
        .filter(v => getApproximateHoursAgo(v.ago) <= hours);

      // Sort by relative time (approximate hours ago ascending -> newest first)
      filteredVideos.sort((a, b) => getApproximateHoursAgo(a.ago) - getApproximateHoursAgo(b.ago));

      const responseData = { mode: 'scraper', videos: filteredVideos };
      // Only cache if we got actual results (to prevent caching temporary scraping errors/limits)
      if (filteredVideos.length > 0) {
        videoCache[cacheKey] = { timestamp: Date.now(), data: responseData };
      }
      return res.json(responseData);
    }
  } catch (error) {
    const errMsg = error 
      ? (error.message || (error.response?.data?.error?.message) || (typeof error === 'string' ? error : String(error))) 
      : 'Unknown error';
    console.error('Error fetching videos:', errMsg);
    res.status(500).json({ 
      error: 'Failed to fetch videos from YouTube', 
      message: errMsg
    });
  }
});
/**
 * API Endpoint: /api/ticker
 * Fetches Nifty 50 and OMX Stockholm 30 indices and stock quotes using Yahoo Finance Spark API.
 */
app.get('/api/ticker', async (req, res) => {
  const niftyBatches = [
    ['^NSEI', '^BSESN', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'ITC.NS', 'LT.NS', 'HINDUNILVR.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'ADANIENT.NS', 'SUNPHARMA.NS', 'M&M.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'NTPC.NS'],
    ['POWERGRID.NS', 'ASIANPAINT.NS', 'COALINDIA.NS', 'ADANIPORTS.NS', 'HCLTECH.NS', 'SBILIFE.NS', 'JSWSTEEL.NS', 'ULTRACEMCO.NS', 'GRASIM.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'HINDALCO.NS', 'WIPRO.NS', 'ONGC.NS', 'BPCL.NS', 'TECHM.NS', 'CIPLA.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'NESTLEIND.NS'],
    ['BRITANNIA.NS', 'DRREDDY.NS', 'APOLLOHOSP.NS', 'DIVISLAB.NS', 'BAJAJ-AUTO.NS', 'BEL.NS']
  ];
  
  const omxBatches = [
    ['^OMX', 'VOLV-B.ST', 'ERIC-B.ST', 'HM-B.ST', 'SEB-A.ST', 'SHB-A.ST', 'SWED-A.ST', 'INVE-B.ST', 'SAND.ST', 'ATCO-A.ST', 'ASSA-B.ST', 'TELIA.ST', 'SKF-B.ST', 'AZN.ST', 'ALIV-SDB.ST', 'BOL.ST', 'ESSITY-B.ST', 'HEXA-B.ST', 'NIBE-B.ST', 'ABB.ST'],
    ['ALFA.ST', 'SOBI.ST', 'TELE2-B.ST', 'GETI-B.ST', 'ELUX-B.ST', 'SKA-B.ST', 'SCA-B.ST', 'STE-R.ST', 'KINV-B.ST']
  ];

  async function fetchBatch(symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols.join(',')}&range=1d`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 4000
      });
      const results = response.data?.spark?.result || [];
      return results.map(item => {
        const responseList = item.response || [];
        if (responseList.length > 0) {
          const meta = responseList[0]?.meta;
          const price = meta?.regularMarketPrice;
          const prevClose = meta?.chartPreviousClose || price;
          const change = price - prevClose;
          const pct = (change / prevClose) * 100;
          return {
            symbol: item.symbol,
            name: meta?.shortName || meta?.longName || item.symbol,
            price: price,
            change: change,
            changePercent: pct
          };
        }
        return null;
      }).filter(Boolean);
    } catch (err) {
      console.error('Error fetching spark batch:', err.message);
      return [];
    }
  }

  try {
    const niftyPromises = niftyBatches.map(fetchBatch);
    const omxPromises = omxBatches.map(fetchBatch);
    
    const [niftyResultsArr, omxResultsArr] = await Promise.all([
      Promise.all(niftyPromises),
      Promise.all(omxPromises)
    ]);
    
    const nifty = niftyResultsArr.flat();
    const omx = omxResultsArr.flat();
    
    res.json({
      success: true,
      nifty: nifty,
      omx: omx
    });
  } catch (error) {
    console.error('Ticker fetch main error:', error.message);
    res.status(500).json({ error: 'Failed to fetch ticker data', message: error.message });
  }
});
/**
 * API Endpoint: /api/mmi
 * Fetches the Tickertape Market Mood Index (MMI) sentiment metrics.
 */
app.get('/api/mmi', async (req, res) => {
  try {
    const url = 'https://api.tickertape.in/mmi/now';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0'
      },
      timeout: 4000
    });
    
    if (response.data && response.data.success) {
      res.json({ success: true, data: response.data.data });
    } else {
      res.status(500).json({ success: false, error: 'Failed to retrieve MMI from Tickertape API' });
    }
  } catch (error) {
    console.error('Error fetching MMI:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch MMI data', message: error.message });
  }
});

/**
 * Helper: Extract the core company name by removing speech prefixes and suffixes
 */
function extractCompanyName(query) {
  let q = query.toLowerCase().trim();
  
  // Fix common speech typos and spelling issues
  q = q.replace(/\bcompnay\b/g, 'company');
  q = q.replace(/\bdetials?\b/g, 'detail');
  q = q.replace(/\binshight\b/g, 'insight');

  // Prefix fillers to remove using preposition split pattern matching
  const introPatterns = [
    /.*?\b(?:about|on|for|of|status of|detail of|details of|details about|detail about|insights on|insight on|insights for|insight for|analysis of|share price of|stock price of|price of)\s+/i
  ];

  for (const pattern of introPatterns) {
    const match = q.match(pattern);
    if (match) {
      q = q.slice(match[0].length).trim();
      break;
    }
  }

  // Also strip common direct search prefix verbs at start if no preposition was matched
  q = q.replace(/^(?:give me|show me|tell me|get me|find me|look up|search for|search|find|get|analyze|analyse|check|status|price)\s+/i, '');

  // Remove leading articles
  q = q.replace(/^(?:the|a|an)\s+/i, '');

  // Suffixes to remove
  const suffixes = [
    " group", " corp", " corporation", " co", " company", " ltd", " limited", " inc", " incorporated", " stock", " share", " equity"
  ];

  for (const suffix of suffixes) {
    if (q.endsWith(suffix)) {
      q = q.slice(0, -suffix.length).trim();
    }
  }

  return q.trim();
}

/**
 * API Endpoint: /api/voice-assistant/query
 * Free 2-way Voice Assistant backend logic
 */
app.post('/api/voice-assistant/query', async (req, res) => {
  const { query, market, lastTicker } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const q = query.toLowerCase().trim();
  console.log(`[Assistant] Query: "${query}", Market: "${market}", Last Ticker: "${lastTicker}"`);

  // Intent parsing
  let intent = 'general';
  if (q.includes('competitor') || q.includes('competition') || q.includes('peer') || q.includes('compare') || q.includes('rival') || q.includes('vs')) {
    intent = 'competitor';
  } else if (q.includes('event') || q.includes('earning') || q.includes('calendar') || q.includes('dividend') || q.includes('report') || q.includes('when') || q.includes('next')) {
    intent = 'events';
  }

  // Pre-compiled list of top peer tickers in sectors for fallback peer mapping
  const industryPeers = {
    'VOLCAR-B.ST': ['VOLV-B.ST', 'SAAB-B.ST', 'HM-B.ST'],
    'VOLV-B.ST': ['VOLCAR-B.ST', 'SAND.ST', 'ATCO-A.ST'],
    'ERIC-B.ST': ['TELIA.ST', 'TELE2-B.ST', 'HEXA-B.ST'],
    'RELIANCE.NS': ['ONGC.NS', 'BPCL.NS', 'COALINDIA.NS'],
    'TCS.NS': ['INFY.NS', 'HCLTECH.NS', 'WIPRO.NS'],
    'HDFCBANK.NS': ['ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS'],
    'BHARTIARTL.NS': ['TELIA.ST', 'TELE2-B.ST']
  };

  try {
    let ticker = lastTicker || '';
    let name = '';
    let industry = '';
    let sector = '';
    let price = null;
    let change = null;
    let changePercent = null;
    let currency = 'USD';
    let fiftyTwoWeekHigh = null;
    let fiftyTwoWeekLow = null;
    let volume = null;
    let prevClose = null;

    // Helper to fetch chart data for a symbol
    async function getChartData(symbol) {
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
        const cRes = await axios.get(chartUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 3000
        });
        const meta = cRes.data?.chart?.result?.[0]?.meta;
        return meta || null;
      } catch (err) {
        return null;
      }
    }

    // If intent is competitor/events and we don't have lastTicker, fallback to general search first
    if ((intent === 'competitor' || intent === 'events') && !ticker) {
      intent = 'general';
    }

    if (intent === 'general') {
      const cleanCompanyQuery = extractCompanyName(query);
      console.log(`[Assistant] Cleaned company query: "${cleanCompanyQuery}" (from "${query}")`);

      // 1. Search for matching symbol using the core company name directly
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanCompanyQuery)}&quotesCount=10&newsCount=0`;
      const searchRes = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 3000
      });

      const quotes = searchRes.data?.quotes || [];
      if (quotes.length === 0) {
        return res.json({
          speech: `I couldn't find any company matching "${query}" in the ${market === 'sweden' ? 'Swedish' : 'Indian'} market. Please try another name or verify the market toggle.`,
          insights: null
        });
      }

      // 2. Filter search results dynamically by market exchange and symbol suffix
      let match = null;
      if (market === 'sweden') {
        match = quotes.find(q => q.symbol && (q.symbol.endsWith('.ST') || q.exchange === 'STO'));
      } else {
        match = quotes.find(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || q.exchange === 'NSI' || q.exchange === 'BSE'));
      }

      // Fallback if no specific exchange match was found, pick the first quote result
      if (!match) {
        match = quotes[0];
      }
      ticker = match.symbol;
      name = match.longname || match.shortname || ticker;
      industry = match.industry || 'General Industry';
      sector = match.sector || 'General Sector';

      // 2. Fetch chart quote details
      const meta = await getChartData(ticker);
      if (meta) {
        price = meta.regularMarketPrice;
        prevClose = meta.chartPreviousClose || price;
        change = price - prevClose;
        changePercent = (change / prevClose) * 100;
        currency = meta.currency || (market === 'sweden' ? 'SEK' : 'INR');
        fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || price;
        fiftyTwoWeekLow = meta.fiftyTwoWeekLow || price;
        volume = meta.regularMarketVolume || 0;
      }

      const formattedPrice = `${price ? price.toFixed(2) : 'N/A'} ${currency}`;
      const changeText = changePercent !== null ? `${changePercent >= 0 ? 'up' : 'down'} by ${Math.abs(changePercent).toFixed(2)}%` : 'stable';
      
      const speech = `${name}, trading under ticker ${ticker.replace('.NS', '').replace('.ST', '')}, is currently priced at ${formattedPrice}, which is ${changeText} today. It operates in the ${industry} industry under the ${sector} sector. You can now ask me about its competitors or upcoming events.`;

      return res.json({
        intent: 'general',
        ticker: ticker,
        name: name,
        speech: speech,
        insights: {
          ticker: ticker,
          name: name,
          sector: sector,
          industry: industry,
          price: price,
          change: change,
          changePercent: changePercent,
          currency: currency,
          fiftyTwoWeekHigh: fiftyTwoWeekHigh,
          fiftyTwoWeekLow: fiftyTwoWeekLow,
          volume: volume
        }
      });
    }

    if (intent === 'competitor') {
      const meta = await getChartData(ticker);
      name = meta?.longName || meta?.shortName || ticker;
      currency = meta?.currency || (market === 'sweden' ? 'SEK' : 'INR');
      price = meta?.regularMarketPrice;

      // Locate peers
      let peers = industryPeers[ticker] || [];

      // Fallback peers if none mapped
      if (peers.length === 0) {
        if (market === 'sweden') {
          peers = ['VOLV-B.ST', 'ERIC-B.ST', 'HM-B.ST'].filter(p => p !== ticker).slice(0, 2);
        } else {
          peers = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS'].filter(p => p !== ticker).slice(0, 2);
        }
      }

      // Fetch details of peers in parallel
      const peerDetails = [];
      await Promise.all(peers.map(async (pSymbol) => {
        const pMeta = await getChartData(pSymbol);
        if (pMeta) {
          peerDetails.push({
            ticker: pSymbol,
            name: pMeta.longName || pMeta.shortName || pSymbol,
            price: pMeta.regularMarketPrice,
            changePercent: pMeta.regularMarketPrice && pMeta.chartPreviousClose ? ((pMeta.regularMarketPrice - pMeta.chartPreviousClose) / pMeta.chartPreviousClose) * 100 : 0,
            currency: pMeta.currency
          });
        }
      }));

      let speech = `In comparison to ${name} at ${price ? price.toFixed(2) : 'N/A'} ${currency}: `;
      if (peerDetails.length > 0) {
        peerDetails.forEach((p, idx) => {
          const changeText = p.changePercent >= 0 ? `up ${p.changePercent.toFixed(2)}%` : `down ${Math.abs(p.changePercent).toFixed(2)}%`;
          speech += `${idx > 0 ? ', and ' : ''}${p.name} is trading at ${p.price ? p.price.toFixed(2) : 'N/A'} ${p.currency}, which is ${changeText}`;
        });
        speech += `. This gives you a comparative look at its industry peers.`;
      } else {
        speech += `I couldn't find competitor information for ${name} at this time.`;
      }

      return res.json({
        intent: 'competitor',
        ticker: ticker,
        name: name,
        speech: speech,
        competitors: peerDetails
      });
    }

    if (intent === 'events') {
      const meta = await getChartData(ticker);
      name = meta?.longName || meta?.shortName || ticker;

      const currentMonth = new Date().getMonth();
      let nextReport = '';
      let nextReportEst = '';

      if (currentMonth >= 0 && currentMonth <= 1) {
        nextReport = 'Q4 Earnings / Full Year Results';
        nextReportEst = 'late April';
      } else if (currentMonth >= 2 && currentMonth <= 4) {
        nextReport = 'Q1 Earnings Release';
        nextReportEst = 'mid July';
      } else if (currentMonth >= 5 && currentMonth <= 7) {
        nextReport = 'Q2 Earnings / Mid Year Report';
        nextReportEst = 'late October';
      } else {
        nextReport = 'Q3 Earnings Release';
        nextReportEst = 'late January';
      }

      const dividendInfo = market === 'sweden' 
        ? `${name} typically proposes annual dividend approvals in their Spring Annual General Meeting around March or April.` 
        : `${name} typically distributes interim dividends during standard quarterly earnings cycles, subject to board approval.`;

      const speech = `For ${name}, the next key corporate event is the ${nextReport}, which is estimated to be released in ${nextReportEst}. In terms of dividends: ${dividendInfo}`;

      return res.json({
        intent: 'events',
        ticker: ticker,
        name: name,
        speech: speech,
        events: {
          nextReport: nextReport,
          estimatedDate: nextReportEst,
          dividendInfo: dividendInfo
        }
      });
    }

  } catch (err) {
    console.error('[Assistant] Error processing query:', err.message);
    res.status(500).json({ error: 'Failed to process voice query', message: err.message });
  }
});

// --- PERSISTENT VISITOR TRACKER STATS ---
const statsFilePath = path.join(__dirname, 'visitor_stats.json');

function readStats() {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = fs.readFileSync(statsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stats file:', err);
  }
  return { views: 0 };
}

function writeStats(stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing stats file:', err);
  }
}

app.post('/api/stats/views/increment', (req, res) => {
  const stats = readStats();
  stats.views = (stats.views || 0) + 1;
  writeStats(stats);
  res.json({ success: true, views: stats.views });
});

app.get('/api/stats/views', (req, res) => {
  const stats = readStats();
  res.json({ views: stats.views });
});

// --- PERSISTENT TRADE BOOK DATABASE ---
const tradesDbPath = path.join(__dirname, 'trades_db.json');

function readTradesDb() {
  try {
    if (fs.existsSync(tradesDbPath)) {
      const data = fs.readFileSync(tradesDbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading trades_db.json:', err);
  }
  return [];
}

function writeTradesDb(trades) {
  try {
    fs.writeFileSync(tradesDbPath, JSON.stringify(trades, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing trades_db.json:', err);
  }
}

app.get('/api/trade-book', (req, res) => {
  const trades = readTradesDb();
  res.json(trades);
});

app.post('/api/trade-book', (req, res) => {
  const newTrades = req.body;
  if (Array.isArray(newTrades)) {
    writeTradesDb(newTrades);
    return res.json({ success: true, count: newTrades.length });
  }
  res.status(400).json({ error: 'Expected array of trade entries' });
});

app.delete('/api/trade-book/:id', (req, res) => {
  const { id } = req.params;
  let trades = readTradesDb();
  trades = trades.filter(t => t.id !== id);
  writeTradesDb(trades);
  res.json({ success: true, count: trades.length });
});

// --- APP LLM CONFIGURATION & PROXY ROUTES ---
const llmConfigPath = path.join(__dirname, 'llm_config.json');

function readLlmConfig() {
  try {
    if (fs.existsSync(llmConfigPath)) {
      return JSON.parse(fs.readFileSync(llmConfigPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading llm_config.json:', err);
  }
  return { apiKey: '', passkey: 'Welcome@123', status: 'ACTIVE' };
}

function writeLlmConfig(cfg) {
  try {
    fs.writeFileSync(llmConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing llm_config.json:', err);
  }
}

app.get('/api/app-llm-key', (req, res) => {
  const cfg = readLlmConfig();
  res.json({
    status: cfg.status || 'ACTIVE',
    hasKey: Boolean(cfg.apiKey),
    maskedKey: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}...${cfg.apiKey.slice(-4)}` : 'Not Configured'
  });
});

app.post('/api/app-llm-key', (req, res) => {
  const { passkey, apiKey } = req.body;
  const cfg = readLlmConfig();

  if (passkey !== 'Welcome@123') {
    return res.status(401).json({ error: '⚠️ Invalid Passcode! Passcode verification failed.' });
  }

  if (!apiKey || apiKey.trim().length < 8) {
    return res.status(400).json({ error: '⚠️ Invalid LLM Key format. Key must be at least 8 characters long.' });
  }

  cfg.apiKey = apiKey.trim();
  cfg.status = 'ACTIVE';
  writeLlmConfig(cfg);

  res.json({
    success: true,
    message: 'App LLM Key updated successfully!',
    maskedKey: `${cfg.apiKey.slice(0, 4)}...${cfg.apiKey.slice(-4)}`
  });
});

// AI Proxy for App-Provided & Personal Key Requests
app.post('/api/ai-proxy', async (req, res) => {
  const { prompt, sectionContext, userKey, mode } = req.body;

  let keyToUse = userKey;
  
  if (mode === 'APP_KEY' || !keyToUse) {
    const cfg = readLlmConfig();
    keyToUse = cfg.apiKey || process.env.GEMINI_API_KEY || process.env.PALM_API_KEY;
  }

  if (!keyToUse) {
    return res.status(400).json({ error: 'No API Key available. Please enter your Gemini API Key in Personal Key mode or configure App Key.' });
  }

  try {
    const systemInstruction = `You are the Antigravity AI Advisor & Trading Strategist. You provide concise, expert, friendly answers about:
    1. Active Trader & Shark Leverage Simulator (25x leverage, margin, risk/reward).
    2. Interactive Trade Book & 100-Trade Discipline Protocol.
    3. Modern Web Design & Architecture.
    4. Financial/Trading YouTube Video Analysis.
    Current Section Context: ${sectionContext || 'General Advisor'}.
    Keep responses clear, professional, concise, and structured with bullet points.`;

    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }]
        }
      ]
    };

    const candidateModels = [
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError = null;
    let response = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`;
        response = await axios.post(url, geminiPayload, { headers: { 'Content-Type': 'application/json' } });
        if (response && response.data?.candidates) break;
      } catch (mErr) {
        lastError = mErr;
        // Continue to try next candidate model
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const text = candidates[0].content?.parts[0]?.text || 'No response generated.';
      const usage = response.data?.usageMetadata || { promptTokenCount: Math.ceil(prompt.length / 4), candidatesTokenCount: Math.ceil(text.length / 4), totalTokenCount: Math.ceil((prompt.length + text.length) / 4) };
      return res.json({ text, usageMetadata: usage });
    }
    
    res.status(500).json({ error: 'Invalid response from AI provider.' });
  } catch (err) {
    console.error('AI Proxy Error:', err.response?.data || err.message);
    const msg = err.response?.data?.error?.message || 'Failed to process request with LLM key.';
    res.status(500).json({ error: `⚠️ AI API Error: ${msg}` });
  }
});

// Start listening on port 8082, scan upwards if busy
const DEFAULT_PORT = 8082;
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`YouTube Analysis Dashboard running at:`);
    console.log(`http://localhost:${port}`);
    console.log(`=========================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
