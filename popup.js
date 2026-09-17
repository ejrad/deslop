// popup.js

const thresholdEl = document.getElementById('threshold');
const thresholdBadge = document.getElementById('threshold-badge');
const hiddenCountEl = document.getElementById('hidden-count');
const totalCountEl = document.getElementById('total-count');
const pctCountEl = document.getElementById('pct-count');
const pauseToggle = document.getElementById('pause-toggle');
const pauseIcon = document.getElementById('pause-icon');
const playIcon = document.getElementById('play-icon');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const resetBtn = document.getElementById('reset-btn');

let isPaused = false;

function thresholdLabel(val) {
  if (val <= 20) return 'Very Aggressive';
  if (val <= 30) return 'Aggressive';
  if (val <= 45) return 'Balanced';
  if (val <= 60) return 'Conservative';
  return 'Very Conservative';
}

function updateStats(data) {
  const hidden = data.hiddenCount || 0;
  const total = data.totalScanned || 0;
  hiddenCountEl.textContent = hidden;
  totalCountEl.textContent = total;
  pctCountEl.textContent = total > 0 ? Math.round((hidden / total) * 100) + '%' : '0%';
}

function setPausedUI(paused) {
  isPaused = paused;
  pauseIcon.style.display = paused ? 'none' : '';
  playIcon.style.display = paused ? '' : 'none';
  pauseToggle.classList.toggle('paused', paused);
  statusDot.className = 'status-dot ' + (paused ? 'paused' : 'active');
  statusText.textContent = paused ? 'Filtering paused' : 'Filtering active';
}

// Load saved settings
chrome.storage.local.get(['threshold', 'paused', 'hiddenCount', 'totalScanned'], (data) => {
  if (data.threshold !== undefined) {
    thresholdEl.value = data.threshold;
    thresholdBadge.textContent = thresholdLabel(data.threshold);
  }
  setPausedUI(!!data.paused);
  updateStats(data);
});

// Threshold slider
thresholdEl.addEventListener('input', () => {
  const val = parseInt(thresholdEl.value);
  thresholdBadge.textContent = thresholdLabel(val);
  chrome.storage.local.set({ threshold: val });
});

// Pause toggle
pauseToggle.addEventListener('click', () => {
  const next = !isPaused;
  setPausedUI(next);
  chrome.storage.local.set({ paused: next });
});

// Reset stats
resetBtn.addEventListener('click', () => {
  chrome.storage.local.set({ hiddenCount: 0, totalScanned: 0 });
  updateStats({ hiddenCount: 0, totalScanned: 0 });
});

// Live stat updates while popup is open
chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(['hiddenCount', 'totalScanned'], updateStats);
});
