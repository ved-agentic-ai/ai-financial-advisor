// Trading Calculator for Digital/Equity compounding and Shark Leverage trade setup
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
  
  let allocationPct = 0.25;
  let leverage = 1;
  
  if (window.currentTradeTab === 'equity') {
    allocationPct = 0.10;
    if (riskPct > 3) {
      riskPct = 3;
    }
  } else {
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
  
  let lossFraction = riskPct / 100;
  let profitFraction = rewardPct / 100;
  
  if (window.currentTradeTab === 'digital') {
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

  const cryptoTaxBreakdown = document.getElementById('cryptoTaxBreakdown');
  const taxValue = document.getElementById('taxValue');
  const netProfitValue = document.getElementById('netProfitValue');

  if (cryptoTaxBreakdown && taxValue && netProfitValue) {
    if (window.currentTradeTab === 'digital') {
      const taxAmount = maxProfit * 0.30;
      const netProfitAmount = maxProfit * 0.70;
      taxValue.textContent = `Tax (30%): ${formatCurrency(taxAmount)}`;
      netProfitValue.textContent = `Net: ${formatCurrency(netProfitAmount)}`;
      cryptoTaxBreakdown.style.display = 'block';
    } else {
      cryptoTaxBreakdown.style.display = 'none';
    }
  }
  
  const rrRatio = riskPct > 0 ? (rewardPct / riskPct) : 0;
  metricRatio.textContent = `1 : ${rrRatio.toFixed(2)}`;
  
  if (rrRatio >= 3) {
    metricRatioAlert.textContent = 'Target: Min 1:3 ratio met';
    metricRatioAlert.style.color = 'var(--bullish-color)';
  } else {
    metricRatioAlert.textContent = 'Warning: Ratio is below 1:3 target';
    metricRatioAlert.style.color = '#ef4444';
  }
  
  const lossesToBlowup = maxLoss > 0 ? Math.floor(capital / maxLoss) : Infinity;
  if (isFinite(lossesToBlowup)) {
    metricBlowup.textContent = `${lossesToBlowup} Trades`;
  } else {
    metricBlowup.textContent = 'Infinite Trades';
  }
  
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
  if (window.currentTradeTab === 'digital') {
    const netGrowth = (currentCapital - capital) * 0.70;
    const netCapitalValue = capital + netGrowth;
    projectionSummary.textContent = `Projected Capital after ${years} years: ${formatLakhCrore(Math.round(currentCapital), currencyCode)} (Growth: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%) | Net Post-Tax (30% VDA): ${formatLakhCrore(Math.round(netCapitalValue), currencyCode)}`;
  } else {
    projectionSummary.textContent = `Projected Capital after ${years} years: ${formatLakhCrore(Math.round(currentCapital), currencyCode)} (Growth: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%)`;
  }
  
  renderGrowthChart(yearsLabels, chartData);

  updateRulesCompliance({
    allocationPct: allocationPct,
    rrRatio: rrRatio,
    leverage: leverage,
    riskPct: riskPct,
    lossesToBlowup: lossesToBlowup
  });
}

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

  if (ruleAllocation && textAllocation && iconAllocation) {
    if (window.currentTradeTab === 'digital') {
      textAllocation.textContent = `Size: Exactly 25% allocated (${(params.allocationPct * 100).toFixed(0)}%)`;
      ruleAllocation.className = 'rule-item passed';
      iconAllocation.innerHTML = checkIcon;
    } else {
      textAllocation.textContent = `Size: Exactly 10% allocated (${(params.allocationPct * 100).toFixed(0)}%)`;
      ruleAllocation.className = 'rule-item passed';
      iconAllocation.innerHTML = checkIcon;
    }
  }

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

  if (ruleRiskLimit && textRiskLimit && iconRiskLimit) {
    if (window.currentTradeTab === 'digital') {
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

function calculateSharkTrade() {
  const marginMode = window.currentSharkMarginMode;
  const leverage = window.currentSharkLeverage;
  const asset = window.currentSharkAsset;
  const direction = window.currentSharkDirection;

  const balanceInput = document.getElementById('sharkAvailableBalance');
  const entryPriceInput = document.getElementById('sharkEntryPrice');
  const marginAmountInput = document.getElementById('sharkMarginAmount');

  if (!balanceInput || !entryPriceInput || !marginAmountInput) return;

  const balance = parseFloat(balanceInput.value) || 0;
  const entryPrice = parseFloat(entryPriceInput.value) || 0;
  const marginAmount = parseFloat(marginAmountInput.value) || 0;
  const isTPSLActive = document.getElementById('sharkSetTPSL').checked;
  let tpPrice = 0;
  let slPrice = 0;

  const rawTpVal = parseFloat(document.getElementById('sharkTargetProfitPrice').value) || 0;
  const rawSlVal = parseFloat(document.getElementById('sharkStopLossPrice').value) || 0;

  if (window.currentSharkTPSLMode === 'price') {
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

  const positionValue = marginAmount * leverage;
  const qty = entryPrice > 0 ? (positionValue / entryPrice) : 0;

  const qtyCalculated = document.getElementById('sharkQtyCalculated');
  const assetLabel = asset === 'crypto_eth' ? 'ETH' : (asset === 'crypto_btc' ? 'BTC' : 'Oz Gold');
  if (qtyCalculated) {
    qtyCalculated.textContent = `Position: ${qty.toFixed(4)} ${assetLabel}`;
  }

  const entryFee = positionValue * 0.0005;
  let exitFee = positionValue * 0.0005; 
  
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
    if (window.currentSharkTPSLMode === 'price') {
      tpAstPct.textContent = `${tpPct >= 0 ? '+' : ''}${tpPct.toFixed(1)}%`;
      tpAstPct.style.color = tpPct >= 0 ? '#34d399' : '#f87171';
    } else {
      tpAstPct.textContent = formatPreciseCurrency(tpPrice);
      tpAstPct.style.color = '#34d399';
    }
  }
  if (slAstPct) {
    if (window.currentSharkTPSLMode === 'price') {
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

window.setSharkLeverage = function(val) {
  window.currentSharkLeverage = val;
  const sharkLeverageSlider = document.getElementById('sharkLeverageSlider');
  const sharkLeverageSliderVal = document.getElementById('sharkLeverageSliderVal');
  const sharkLeverageLabel = document.getElementById('sharkLeverageLabel');
  
  if (sharkLeverageSlider) sharkLeverageSlider.value = val;
  if (sharkLeverageSliderVal) sharkLeverageSliderVal.textContent = `${val}x`;
  if (sharkLeverageLabel) sharkLeverageLabel.textContent = `${val}x`;
  calculateSharkTrade();
};
