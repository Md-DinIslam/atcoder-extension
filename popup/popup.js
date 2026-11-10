/**
 * Extension Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const handleInput = document.getElementById('ac-handle-input');
  const fetchBtn = document.getElementById('ac-fetch-btn');
  const pinBtn = document.getElementById('ac-pin-btn');
  const statusEl = document.getElementById('ac-popup-status');
  const contentEl = document.getElementById('ac-popup-content');

  // Stats elements
  const popSolved = document.getElementById('pop-solved');
  const popFirstTry = document.getElementById('pop-first-try');
  const popStreak = document.getElementById('pop-streak');
  const popUnsolved = document.getElementById('pop-unsolved');
  const popUnsolvedCount = document.getElementById('pop-unsolved-count');
  const popUnsolvedList = document.getElementById('pop-unsolved-list');
  const popProfileUrl = document.getElementById('pop-profile-url');

  let currentHandle = '';

  // 1. Check storage for pinned user
  let pinnedUser = '';
  try {
    const res = await chrome.storage.local.get(['pinned_user', 'last_user']);
    pinnedUser = res.pinned_user || '';
    currentHandle = pinnedUser || res.last_user || '';
  } catch (e) {
    console.warn('Storage read warning:', e);
  }

  // 2. Check if current active tab is an AtCoder profile
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const match = tab.url.match(/atcoder\.jp\/users\/([a-zA-Z0-9_-]+)/);
      if (match) {
        currentHandle = match[1];
      }
    }
  } catch (e) {
    console.warn('Tab query warning:', e);
  }

  if (currentHandle) {
    handleInput.value = currentHandle;
    updatePinBtnState();
    loadUserData(currentHandle);
  }

  // Event handlers
  fetchBtn.addEventListener('click', () => {
    const h = handleInput.value.trim();
    if (h) {
      currentHandle = h;
      updatePinBtnState();
      chrome.storage.local.set({ last_user: h });
      loadUserData(h);
    }
  });

  handleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      fetchBtn.click();
    }
  });

  pinBtn.addEventListener('click', async () => {
    const h = handleInput.value.trim();
    if (!h) return;
    if (pinnedUser.toLowerCase() === h.toLowerCase()) {
      // Unpin
      pinnedUser = '';
      await chrome.storage.local.remove('pinned_user');
      pinBtn.classList.remove('pinned');
      pinBtn.title = 'Pin this handle as default';
    } else {
      // Pin
      pinnedUser = h;
      await chrome.storage.local.set({ pinned_user: h });
      pinBtn.classList.add('pinned');
      pinBtn.title = 'Pinned! Click to unpin';
    }
  });

  function updatePinBtnState() {
    const h = handleInput.value.trim().toLowerCase();
    if (pinnedUser && pinnedUser.toLowerCase() === h) {
      pinBtn.classList.add('pinned');
      pinBtn.title = 'Pinned! Click to unpin';
    } else {
      pinBtn.classList.remove('pinned');
      pinBtn.title = 'Pin this handle as default';
    }
  }

  async function loadUserData(handle) {
    statusEl.style.display = 'block';
    statusEl.textContent = `Fetching stats for ${handle}...`;
    contentEl.style.display = 'none';

    try {
      const [models, problems] = await Promise.all([
        AtCoderAPI.getProblemModels(),
        AtCoderAPI.getProblems()
      ]);

      const subResult = await AtCoderAPI.getUserSubmissions(handle, (prog) => {
        statusEl.textContent = `Syncing: ${prog.fetchedCount} submissions...`;
      });

      const stats = AtCoderAnalyzer.analyze(subResult.submissions, models, problems);

      // Render stats
      popSolved.textContent = stats.uniqueSolvedCount;
      popFirstTry.textContent = `${stats.firstTryRate}%`;
      popStreak.textContent = `${stats.streak.current}🔥`;
      popUnsolved.textContent = stats.unsolvedCount;
      popUnsolvedCount.textContent = stats.unsolvedCount;

      popProfileUrl.href = `https://atcoder.jp/users/${handle}#pulse`;

      // Render top 5 unsolved
      const topUnsolved = stats.unsolvedProblems.slice(0, 8);
      if (topUnsolved.length === 0) {
        popUnsolvedList.innerHTML = `<div style="text-align:center; padding:12px; font-size:12px; color:#94a3b8;">No unsolved problems! 🚀</div>`;
      } else {
        popUnsolvedList.innerHTML = topUnsolved.map(p => {
          const badge = AtCoderColors.getBadgeHtml(p.difficulty);
          return `
            <div class="ac-popup-item">
              <div class="ac-popup-item-left">
                <div class="ac-popup-item-title">
                  <a href="${p.url}" target="_blank">${p.title}</a>
                </div>
                <div class="ac-popup-item-sub">❌ ${p.attemptsCount} attempts</div>
              </div>
              <div class="ac-popup-item-right">
                ${badge}
                <a href="${p.url}" target="_blank" class="ac-popup-solve-link">Solve ➔</a>
              </div>
            </div>
          `;
        }).join('');
      }

      statusEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      console.error('Popup load error:', err);
      statusEl.textContent = 'Error loading user data. Please try again.';
      statusEl.style.display = 'block';
    }
  }
});

