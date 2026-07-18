// Simulator logic, expected value curves, compounding growth path, volatility spikes and worst-case matrix calculations
function calculateSharkSurvivalAndGrowth(balance, marginAmount, leverage, direction, entryPrice, qty, liqPrice, isTPSLActive, slPrice, tpPrice, asset, entryFee, netGain) {
  const marginMode = window.currentSharkMarginMode;
  
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
  const positionSize = qty * entryPrice;
  const capitalExposure = balance > 0 ? (totalRisk / balance * 100) : 0;
  
  const sizeEl = document.getElementById('survivalPositionSize');
  if (sizeEl) {
    sizeEl.textContent = formatPreciseCurrency(positionSize);
  }
  
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
  if (window.currentSurvivalWinMode === 'slider') {
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
