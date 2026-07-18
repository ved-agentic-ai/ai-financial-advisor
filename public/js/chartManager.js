// Chart rendering and management logic
function renderTimelineChart(data = window.videosData) {
  const chartCanvas = document.getElementById('timelineChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  
  const timeLimitSelect = document.getElementById('timeLimitSelect');
  const hours = timeLimitSelect ? parseInt(timeLimitSelect.value, 10) : 24;
  
  let slots = [];
  let videoCounts = [];
  let viewCounts = [];

  if (hours <= 24) {
    slots = ['0-4h ago', '4-8h ago', '8-12h ago', '12-16h ago', '16-20h ago', '20-24h ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 4));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 168) {
    slots = ['1d ago', '2d ago', '3d ago', '4d ago', '5d ago', '6d ago', '7d ago'];
    videoCounts = [0, 0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(6, Math.floor(h / 24));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 720) {
    slots = ['5d ago', '10d ago', '15d ago', '20d ago', '25d ago', '30d ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 120));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else if (hours <= 8760) {
    slots = ['2m ago', '4m ago', '6m ago', '8m ago', '10m ago', '12m ago'];
    videoCounts = [0, 0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(5, Math.floor(h / 1460));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  } else {
    slots = ['1y ago', '2y ago', '3y ago', '4y ago', '5y ago'];
    videoCounts = [0, 0, 0, 0, 0];
    viewCounts = [0, 0, 0, 0, 0];
    data.forEach(v => {
      const h = getApproximateHoursAgoGlobal(v.ago);
      const idx = Math.min(4, Math.floor(h / 8760));
      videoCounts[idx]++;
      viewCounts[idx] += (v.views || 0);
    });
  }

  // Destroy previous instance to re-render
  if (window.timelineChartInstance) {
    window.timelineChartInstance.destroy();
  }

  window.timelineChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: slots.reverse(),
      datasets: [
        {
          label: 'Videos Uploaded',
          data: videoCounts.reverse(),
          backgroundColor: 'rgba(59, 130, 246, 0.65)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'yVideo',
          borderRadius: 6
        },
        {
          label: 'Total Views',
          data: viewCounts.reverse(),
          type: 'line',
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
          yAxisID: 'yViews'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit' }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' }
          }
        },
        yVideo: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          title: {
            display: true,
            text: 'Videos Count',
            color: '#9ca3af',
            font: { family: 'Outfit' }
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' },
            stepSize: 1
          }
        },
        yViews: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: {
            display: true,
            text: 'Views Reach',
            color: '#9ca3af',
            font: { family: 'Outfit' }
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit' },
            callback: (val) => {
              if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
              if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
              return val;
            }
          }
        }
      }
    }
  });
}

function renderGrowthChart(labels, data) {
  const chartCanvas = document.getElementById('growthChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (window.growthChartInstance) {
    window.growthChartInstance.destroy();
  }
  
  const currencyCode = document.getElementById('tradeCurrency')?.value || 'USD';
  
  window.growthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projected Capital',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#1e3a8a',
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Capital: ${formatLakhCrore(context.raw, currencyCode)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            callback: function(value) {
              return formatLakhCrore(value, currencyCode);
            }
          }
        }
      }
    }
  });
}

function renderSharkGrowthChart(labels, expectedData, simulatedData) {
  const chartCanvas = document.getElementById('sharkGrowthChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (window.sharkGrowthChartInstance) {
    window.sharkGrowthChartInstance.destroy();
  }
  
  window.sharkGrowthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Expected (Average)',
          data: expectedData,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Simulated Path',
          data: simulatedData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: {
              size: 10,
              family: 'Outfit'
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatLargeCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255,255,255,0.03)'
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 9
            },
            maxTicksLimit: 10
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.03)'
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 9
            },
            callback: function(value) {
              return formatLargeCurrency(value);
            }
          }
        }
      }
    }
  });
}
