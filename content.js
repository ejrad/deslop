// content.js — MutationObserver-based LinkedIn feed scanner

const DEFAULT_THRESHOLD = 40;
let currentThreshold = DEFAULT_THRESHOLD;
let isPaused = false;
let hiddenCount = 0;
let totalScanned = 0;

// Post container selectors — LinkedIn rotates class names; data-urn is most stable
const POST_SELECTORS = [
  '[data-urn*="urn:li:activity"]',
  '[data-urn*="urn:li:share"]',
  '[data-urn*="urn:li:ugcPost"]',
  '[data-id*="urn:li:activity"]',
  '[data-id*="urn:li:ugcPost"]',
  '.feed-shared-update-v2',
  '.occludable-update',
  '.fie-impression-container',
].join(',');

// Text content selectors inside a post (ordered most → least specific)
const TEXT_SELECTORS = [
  '.feed-shared-update-v2__description',
  '.feed-shared-text-view',
  '.feed-shared-inline-show-more-text',
  '.update-components-text',
  '.update-components-text__text-view',
  '.feed-shared-update-v2__commentary',
  '[data-test-id="main-feed-activity-content"]',
  '.feed-shared-text',
  '.attributed-text-segment-list__content',
  'span[dir="ltr"]',
];


function injectStyles() {
  if (document.getElementById('deslop-styles')) return;
  const style = document.createElement('style');
  style.id = 'deslop-styles';
  style.textContent = `
    .deslop-banner {
      margin: 8px 0;
      font-family: inherit;
    }
    .deslop-banner-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background-color: var(--color-background-container-tint, #f9fafb);
      border: 1px solid var(--color-border-faint, #e5e7eb);
      border-radius: 8px;
      box-sizing: border-box;
      width: 100%;
    }
    .deslop-icon {
      font-size: 16px;
      flex-shrink: 0;
      filter: grayscale(100%);
      opacity: 0.7;
    }
    .deslop-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .deslop-title {
      color: var(--color-text, #1f2937);
      font-size: 14px;
      font-weight: 600;
    }
    .deslop-reasons {
      color: var(--color-text-low-emphasis, #6b7280);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .deslop-show-btn {
      background: transparent;
      border: 1px solid var(--color-border-faint, #d1d5db);
      color: var(--color-text-low-emphasis, #4b5563);
      padding: 4px 12px;
      border-radius: 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.15s ease;
      flex-shrink: 0;
    }
    .deslop-show-btn:hover {
      background: var(--color-background-container-hover, #f3f4f6);
      color: var(--color-text, #1f2937);
    }
  `;
  document.head.appendChild(style);
}

function collapsePost(postEl, reasons, score) {
  postEl.dataset.deslopProcessed = 'true';
  postEl.dataset.deslopHidden = 'true';
  postEl.style.display = 'none';

  const banner = document.createElement('div');
  banner.className = 'deslop-banner';
  banner.setAttribute('data-deslop-banner', 'true');

  const reasonText = reasons.slice(0, 3).join(' · ') || 'AI patterns detected';

  banner.innerHTML = `
    <div class="deslop-banner-inner">
      <div class="deslop-icon">🧹</div>
      <div class="deslop-text">
        <span class="deslop-title">Possible AI Slop</span>
        <span class="deslop-reasons">${reasonText}</span>
      </div>
      <button class="deslop-show-btn">Show Anyway?</button>
    </div>
  `;

  banner.querySelector('.deslop-show-btn').addEventListener('click', () => {
    postEl.style.display = '';
    banner.remove();
    postEl.dataset.deslopHidden = 'false';
  });

  postEl.parentNode.insertBefore(banner, postEl);

  hiddenCount++;
  syncStats();
}

function markSafe(postEl) {
  postEl.dataset.deslopProcessed = 'true';
  postEl.dataset.deslopHidden = 'false';
  syncStats();
}

function processPost(textEl) {
  if (textEl.dataset.deslopProcessed) return;
  if (isPaused) { markSafe(textEl); return; }

  // We are now passing the text container directly.
  const text = textEl.innerText?.trim();
  totalScanned++;

  if (!text || text.length < 60) {
    markSafe(textEl);
    return;
  }

  const { score, reasons } = scorePost(text);
  console.log(`[Deslop] score=${score} threshold=${currentThreshold}`, reasons, text.slice(0, 80));

  if (score >= currentThreshold) {
    // Find the outer card to collapse so we hide images/media as well.
    // LinkedIn feed items are typically <li>, <article>, or have data-urn.
    let cardToCollapse = textEl.closest('li, article, .feed-shared-update-v2, [data-urn]');
    
    // If no semantic wrapper is found, traverse up ~5 levels to encapsulate text + sibling media
    if (!cardToCollapse) {
      let curr = textEl;
      for (let i = 0; i < 5; i++) {
        if (curr.parentElement && !['MAIN', 'BODY', 'UL', 'OL', 'DIV[id="main-content"]'].includes(curr.parentElement.tagName)) {
          curr = curr.parentElement;
        }
      }
      cardToCollapse = curr;
    }

    // Mark the text element as processed so we don't rescan it
    textEl.dataset.deslopProcessed = 'true';
    collapsePost(cardToCollapse, reasons, score);
  } else {
    markSafe(textEl);
  }
}

function scanFeed() {
  // LinkedIn is heavily obfuscating classes. We use a pure DOM heuristic:
  // Find the deepest elements inside <main> that contain >60 characters of text.
  const main = document.querySelector('main') || document.body;
  const allElements = main.querySelectorAll('*');
  const candidateBlocks = [];

  for (const el of allElements) {
    if (['SCRIPT', 'STYLE', 'BUTTON', 'SVG', 'IMG', 'A', 'INPUT'].includes(el.tagName)) continue;
    
    // textContent is very fast and doesn't trigger layout
    const text = el.textContent?.trim();
    if (text && text.length > 60) {
      candidateBlocks.push(el);
    }
  }

  // Keep only the "leaf" candidates — elements where none of their descendants are also candidates.
  // This isolates the actual text container (e.g. the post body) from its parent layout wrappers.
  const deepestBlocks = candidateBlocks.filter(el => {
    return !candidateBlocks.some(child => el !== child && el.contains(child));
  });

  console.log(`[Deslop] scanFeed found ${deepestBlocks.length} text blocks via heuristic`);
  deepestBlocks.forEach(processPost);
}

function syncStats() {
  chrome.storage.local.set({ hiddenCount, totalScanned }).catch(() => {});
}

// Load settings from storage
chrome.storage.local.get(['threshold', 'paused', 'hiddenCount', 'totalScanned'], (data) => {
  if (data.threshold !== undefined) currentThreshold = data.threshold;
  if (data.paused !== undefined) isPaused = data.paused;
  if (data.hiddenCount !== undefined) hiddenCount = data.hiddenCount;
  if (data.totalScanned !== undefined) totalScanned = data.totalScanned;
  console.log('[Deslop] content script initialized, threshold=', currentThreshold, 'paused=', isPaused);
  injectStyles();
  scanFeed();
});

// Listen for settings changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.threshold) currentThreshold = changes.threshold.newValue;
  if (changes.paused) {
    isPaused = changes.paused.newValue;
    // Re-scan when unpausing
    if (!isPaused) {
      scanFeed();
    }
  }
});

// MutationObserver for infinite scroll new posts
const observer = new MutationObserver(() => {
  // Debounce slightly to avoid thrashing on DOM bursts
  clearTimeout(observer._timer);
  observer._timer = setTimeout(scanFeed, 300);
});

observer.observe(document.body, { childList: true, subtree: true });
