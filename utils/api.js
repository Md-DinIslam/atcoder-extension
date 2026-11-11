/**
 * AtCoder API integration module (Kenkoooo endpoints & caching)
 * Handles incremental fetching, background bridging, and intelligent caching.
 */

const AtCoderAPI = {
  KENKOOOO_BASE: 'https://kenkoooo.com/atcoder',

  /**
   * Safe fetch helper that tries background service worker first (bypassing CSP/CORS),
   * and falls back to window.fetch if in web demo or standalone context.
   */
  async fetchJson(url) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const bgResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'FETCH_KENKOOOO', url }, (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        });

        if (bgResponse && bgResponse.success && bgResponse.data) {
          return bgResponse.data;
        }
      } catch (err) {
        // Fallback to direct fetch
      }
    }

    // Direct fetch fallback
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  /**
   * Fetches difficulty models for all problems (cached in IndexedDB, 24h TTL)
   */
  async getProblemModels(forceRefresh = false) {
    const TTL = 24 * 3600 * 1000;
    if (!forceRefresh) {
      try {
        const db = await AtCoderDB.open();
        const row = await new Promise(resolve => {
          const tx = db.transaction('meta_cache', 'readonly');
          const req = tx.objectStore('meta_cache').get('problem_models');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (row && row.data && typeof row.data === 'object' && Object.keys(row.data).length > 100) {
          if (!row.cachedAt || (Date.now() - row.cachedAt) < TTL) {
            return row.data;
          }
        }
      } catch (e) {
        console.warn('Cache lookup failed for problem models:', e);
      }
    }

    try {
      const url = `${this.KENKOOOO_BASE}/resources/problem-models.json`;
      const data = await this.fetchJson(url);

      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        AtCoderDB.saveMeta('problem_models', data).catch(() => {});
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch problem models from remote:', err);
    }

    // Stale fallback
    try {
      const stale = await AtCoderDB.getMeta('problem_models');
      if (stale && typeof stale === 'object') return stale;
    } catch (e) {}

    return {};
  },

  /**
   * Fetches problem details (id, title, contest_id, problem_index), 24h TTL cache
   */
  async getProblems(forceRefresh = false) {
    const TTL = 24 * 3600 * 1000;
    if (!forceRefresh) {
      try {
        const db = await AtCoderDB.open();
        const row = await new Promise(resolve => {
          const tx = db.transaction('meta_cache', 'readonly');
          const req = tx.objectStore('meta_cache').get('problems');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (row && row.data && typeof row.data === 'object' && Object.keys(row.data).length > 100) {
          if (!row.cachedAt || (Date.now() - row.cachedAt) < TTL) {
            return row.data;
          }
        }
      } catch (e) {
        console.warn('Cache lookup failed for problems:', e);
      }
    }

    try {
      const url = `${this.KENKOOOO_BASE}/resources/problems.json`;
      const list = await this.fetchJson(url);

      if (Array.isArray(list)) {
        const map = {};
        for (const p of list) {
          map[p.id] = p;
        }
        AtCoderDB.saveMeta('problems', map).catch(() => {});
        return map;
      }
    } catch (err) {
      console.warn('Failed to fetch problems list from remote:', err);
    }

    try {
      const stale = await AtCoderDB.getMeta('problems');
      if (stale) return stale;
    } catch (e) {}

    return {};
  },

  /**
   * Incrementally fetches submissions for a user.
   * Strategy: Direct AtCoder fetch FIRST (instant), then Kenkoooo (background completeness).
   */
  async getUserSubmissions(userId, onProgress = null, forceRefresh = false) {
    if (!userId) return { submissions: [], newlyFetched: 0 };
    const cleanId = userId.trim().toLowerCase();

    const cachedData = await AtCoderDB.getUserData(cleanId);
    const allSubmissions = cachedData && Array.isArray(cachedData.submissions) ? [...cachedData.submissions] : [];
    const subMap = new Map();
    for (const sub of allSubmissions) {
      subMap.set(sub.id, sub);
    }

    let newlyFetchedCount = 0;

    // ── STEP 1: Direct AtCoder Fetch (instant, bypasses Kenkoooo lag) ────
    try {
      const recentContests = await this._getRecentContestIds(allSubmissions, userId);
      if (recentContests.length > 0) {
        const directSubs = await this._fetchDirectFromAtCoder(userId, recentContests);
        for (const s of directSubs) {
          const existing = subMap.get(s.id);
          if (!existing) {
            subMap.set(s.id, s);
            newlyFetchedCount++;
          } else if (existing.result !== s.result) {
            subMap.set(s.id, { ...existing, ...s });
            newlyFetchedCount++;
          }
        }
      }
    } catch (err) {
      console.warn('[Pulse] Direct AtCoder fetch skipped:', err);
    }

    if (onProgress) onProgress({ fetchedCount: subMap.size, newlyFetched: newlyFetchedCount });

    // ── STEP 2: Kenkoooo Fetch (for historical completeness) ─────────────
    let fromSecond = 0;
    if (cachedData && cachedData.lastFetchedEpoch > 0) {
      fromSecond = forceRefresh
        ? Math.max(0, cachedData.lastFetchedEpoch - (7 * 86400))
        : Math.max(0, cachedData.lastFetchedEpoch - 7200);
    }

    let keepFetching = true;
    let loopCount = 0;

    while (keepFetching) {
      loopCount++;
      if (loopCount > 100) break;

      const url = `${this.KENKOOOO_BASE}/atcoder-api/v3/user/submissions?user=${encodeURIComponent(cleanId)}&from_second=${fromSecond}`;
      let batch = [];

      try {
        batch = await this.fetchJson(url);
      } catch (err) {
        console.warn('Error fetching submissions batch:', err);
        break;
      }

      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const item of batch) {
        const existing = subMap.get(item.id);
        if (!existing) {
          subMap.set(item.id, item);
          newlyFetchedCount++;
        } else if (existing.result !== item.result) {
          subMap.set(item.id, { ...existing, ...item });
          newlyFetchedCount++;
        }
      }

      if (onProgress) onProgress({ fetchedCount: subMap.size, newlyFetched: newlyFetchedCount });

      if (batch.length < 500) {
        keepFetching = false;
      } else {
        let maxEpoch = fromSecond;
        for (const item of batch) {
          if (item.epoch_second > maxEpoch) maxEpoch = item.epoch_second;
        }
        fromSecond = (maxEpoch === fromSecond) ? fromSecond + 1 : maxEpoch;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    const mergedList = Array.from(subMap.values());
    mergedList.sort((a, b) => a.epoch_second - b.epoch_second);

    let highestEpoch = 0;
    if (mergedList.length > 0) {
      highestEpoch = mergedList[mergedList.length - 1].epoch_second;
    }

    AtCoderDB.saveUserData(cleanId, mergedList, highestEpoch).catch(() => {});

    return {
      submissions: mergedList,
      newlyFetched: newlyFetchedCount,
      lastUpdated: Date.now()
    };
  },

  /**
   * Collects recent candidate contest IDs from:
   * 1. chrome.storage.local (tracked by submission_tracker on visits / submits)
   * 2. localStorage (instant, synchronous across tabs)
   * 3. Last unique contest_ids from cached submissions
   * 4. Recent ABC contests and common practice contests
   */
  async _getRecentContestIds(cachedSubmissions, userId) {
    const ids = new Set();

    // Source 1: chrome.storage.local
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await new Promise(resolve => {
          chrome.storage.local.get({ pulse_recent_contests: [] }, resolve);
        });
        if (Array.isArray(data.pulse_recent_contests)) {
          for (const c of data.pulse_recent_contests) {
            if (c) ids.add(c.trim());
          }
        }
      }
    } catch (e) {}

    // Source 2: localStorage (instant across tabs on atcoder.jp)
    try {
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('pulse_recent_contests');
        if (local) {
          const arr = JSON.parse(local);
          if (Array.isArray(arr)) {
            for (const c of arr) if (c) ids.add(c.trim());
          }
        }
      }
    } catch (e) {}

    // Source 3: Last unique contests from cached submission history
    if (Array.isArray(cachedSubmissions)) {
      for (let i = cachedSubmissions.length - 1; i >= 0 && ids.size < 12; i--) {
        if (cachedSubmissions[i].contest_id) {
          ids.add(cachedSubmissions[i].contest_id.trim());
        }
      }
    }

    // Source 4: Contests around user's latest known contests + standard practice
    const candidates = [
      'abc385', 'abc384', 'abc386', 'abc387', 'abc388', 'abc389', 'abc390',
      'abc383', 'abc382', 'abc381', 'abc380',
      'abc275', 'abc158', 'abc143', 'practice', 'practice2', 'typical90', 'dp'
    ];
    for (const c of candidates) {
      if (ids.size >= 16) break;
      ids.add(c);
    }

    return Array.from(ids).slice(0, 16);
  },

  /**
   * Fetches submissions directly from AtCoder via content script same-origin fetch.
   * Runs directly on https://atcoder.jp with full session credentials.
   * Bypasses Kenkoooo's 15–30 min crawling delay completely.
   */
  async _fetchDirectFromAtCoder(userId, contestIds) {
    if (!contestIds || contestIds.length === 0) return [];
    const subs = [];
    const seenIds = new Set();

    // Direct concurrent fetches from content script (same-origin with full cookies)
    await Promise.all(contestIds.map(async (contestId) => {
      try {
        // Attempt 1: /submissions/me (shows all submissions of logged-in user in this contest)
        let url = `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/submissions/me`;
        let resp = await fetch(url, { credentials: 'include' });

        if (resp.ok && !resp.redirected && !resp.url.includes('/login')) {
          const html = await resp.text();
          if (!html.includes('Sign In - AtCoder') && !html.includes('/login?continue')) {
            const parsed = this._parseSubmissionsHtml(html, contestId, userId);
            for (const s of parsed) {
              if (!seenIds.has(s.id)) {
                seenIds.add(s.id);
                subs.push(s);
              }
            }
            if (parsed.length > 0) return; // Found submissions, no need for fallback URL
          }
        }

        // Attempt 2: Public submissions list filtered by user
        if (userId) {
          url = `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/submissions?f.User=${encodeURIComponent(userId)}`;
          resp = await fetch(url, { credentials: 'include' });
          if (resp.ok && !resp.redirected && !resp.url.includes('/login')) {
            const html = await resp.text();
            if (!html.includes('Sign In - AtCoder') && !html.includes('/login?continue')) {
              const parsed = this._parseSubmissionsHtml(html, contestId, userId);
              for (const s of parsed) {
                if (!seenIds.has(s.id)) {
                  seenIds.add(s.id);
                  subs.push(s);
                }
              }
            }
          }
        }
      } catch (err) {
        // Silent skip for contests with no access / network error
      }
    }));

    return subs;
  },

  _parseSubmissionsHtml(html, contestId, userId) {
    const results = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tbody tr');

      for (const row of rows) {
        const detailLink = row.querySelector('a[href*="/submissions/"]');
        if (!detailLink) continue;
        const idMatch = (detailLink.getAttribute('href') || '').match(/\/submissions\/(\d+)/);
        if (!idMatch) continue;

        const taskLink = row.querySelector('a[href*="/tasks/"]');
        if (!taskLink) continue;
        const taskMatch = (taskLink.getAttribute('href') || '').match(/\/tasks\/([^/?#]+)/);
        if (!taskMatch) continue;

        const timeEl = row.querySelector('time');
        let epoch = Math.floor(Date.now() / 1000);
        if (timeEl && timeEl.textContent) {
          try {
            const iso = timeEl.textContent.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
            const d = new Date(iso);
            if (!isNaN(d.getTime())) epoch = Math.floor(d.getTime() / 1000);
          } catch (e) {}
        }

        const statusSpan = row.querySelector('.label') || row.querySelector('span[class*="label"]');
        const raw = statusSpan ? statusSpan.textContent.trim() : '';
        if (/WJ|Judging|WR|\d+\/\d+/i.test(raw)) continue;
        let result = raw.split(/\s+/)[0].toUpperCase();
        if (!result) result = 'OTHER';

        let language = 'Other';
        const cells = row.querySelectorAll('td');
        for (const c of cells) {
          if (/C\+\+|Python|PyPy|Java|Rust|Go|C#|Ruby|Kotlin|Haskell/i.test(c.textContent)) {
            language = c.textContent.trim(); break;
          }
        }

        // Accurate score extraction (skip date cell 0)
        let point = 0;
        const scoreCell = row.querySelector('.submission-score') || cells[4] || cells[3];
        if (scoreCell) {
          const v = parseFloat(scoreCell.textContent.trim());
          if (!isNaN(v) && v >= 0 && v <= 3000) point = v;
        }

        results.push({
          id: parseInt(idMatch[1], 10),
          epoch_second: epoch,
          problem_id: taskMatch[1],
          contest_id: contestId,
          user_id: userId,
          result, language, point
        });
      }
    } catch (e) {}
    return results;
  }
          contest_id: contestId,
          user_id: userId,
          result, language, point
        });
      }
    } catch (e) {}
    return results;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderAPI;
}
