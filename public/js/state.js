// Global state initialization for the application
window.videosData = [];
window.timelineChartInstance = null;
window.currentTradeTab = 'digital';
window.growthChartInstance = null;
window.sharkGrowthChartInstance = null;

// Shark Leverage Trade Simulator global state
window.currentSharkMarginMode = 'isolated'; 
window.currentSharkLeverage = 25;
window.currentSharkAsset = 'crypto_eth'; 
window.currentSharkDirection = 'long';
window.currentSharkTPSLMode = 'price'; // price | pct
window.currentSurvivalWinMode = 'slider'; // slider | ratio

window.defaultAssetPrices = {
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
