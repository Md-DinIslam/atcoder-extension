/**
 * AtCoder API integration module (Kenkoooo endpoints)
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
   * Scrapes recent submissions DIRECTLY from atcoder.jp (no Kenkoooo delay).
   * Works because content script runs on same origin (atcoder.jp).
   * Returns array of submission objects compatible with Kenkoooo format.
   */
  async scrapeRecentSubmissions(userId, maxPages = 2) {
    const cleanId = (userId || '').trim();
    const results = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = `https://atcoder.jp/users/${encodeURIComponent(cleanId)}/submissions?page=${page}`;
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) break;
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const rows = doc.querySelectorAll('table.table tbody tr');
        if (!rows || rows.length === 0) break;

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 8) continue;

          // Time: "2024-11-10 15:30:00+0900" → epoch_second
          const timeEl = cells[0].querySelector('time');
          const timeStr = timeEl ? timeEl.textContent.trim() : '';
          let epoch = 0;
          if (timeStr) {
            // Convert to ISO 8601: space→T, +0900→+09:00
            const isoStr = timeStr.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
            const d = new Date(isoStr);
            if (!isNaN(d.getTime())) epoch = Math.floor(d.getTime() / 1000);
          }

          // Contest ID
          const contestLink = cells[1].querySelector('a');
          const contestHref = contestLink ? (contestLink.getAttribute('href') || '') : '';
          const contestId = contestHref.replace('/contests/', '').split('/')[0] || '';

          // Problem ID from task link
          const taskLink = cells[2].querySelector('a');
          const taskHref = taskLink ? (taskLink.getAttribute('href') || '') : '';
          const taskSplit = taskHref.split('/tasks/');
          const problemId = taskSplit.length > 1 ? taskSplit[1] : '';

          // Language (3rd cell, may have sub-link)
          const language = cells[3].textContent.trim();

          // Score/point
          const point = parseInt(cells[4].textContent.trim()) || 0;

          // Verdict (6th cell = index 6)
          const verdictSpan = cells[6] ? (cells[6].querySelector('span') || cells[6]) : null;
          const result = verdictSpan ? verdictSpan.textContent.trim().split(/\s+/)[0] : '';

          // Submission ID from last cell detail link
          const detailLink = row.querySelector('a[href*="/submissions/"]');
          const subHref = detailLink ? (detailLink.getAttribute('href') || '') : '';
          const idMatch = subHref.match(/\/submissions\/(\d+)/);
          const subId = idMatch ? parseInt(idMatch[1]) : 0;

          if (!subId || !problemId || !epoch) continue;

          results.push({
            id: subId,
            epoch_second: epoch,
            problem_id: problemId,
            contest_id: contestId,
            result,
            language,
            point
          });
        }

        // If fewer than 20 rows, this was the last page
        if (rows.length < 20) break;

      } catch (err) {
        console.warn(`AtCoder scrape page ${page} error:`, err);
        break;
      }
    }

    return results;
  },

  /**
   * Incrementally fetches all submissions for a user (Kenkoooo bulk load)
   */
  async getUserSubmissions(userId, onProgress = null, forceRefresh = false) {
    if (!userId) return { submissions: [], newlyFetched: 0 };
    const cleanId = userId.trim().toLowerCase();

    if (forceRefresh) {
      await AtCoderDB.clearUser(cleanId);
    }

    const cachedData = await AtCoderDB.getUserData(cleanId);
    let allSubmissions = cachedData ? [...cachedData.submissions] : [];
    let fromSecond = 0;

    const subMap = new Map();
    for (const sub of allSubmissions) {
      subMap.set(sub.id, sub);
    }

    if (cachedData && cachedData.lastFetchedEpoch > 0) {
      fromSecond = Math.max(0, cachedData.lastFetchedEpoch - 1);
    }

    let newlyFetchedCount = 0;
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

      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      for (const item of batch) {
        if (!subMap.has(item.id)) {
          subMap.set(item.id, item);
          newlyFetchedCount++;
        }
      }

      if (onProgress) {
        onProgress({
          fetchedCount: subMap.size,
          newlyFetched: newlyFetchedCount
        });
      }

      if (batch.length < 500) {
        keepFetching = false;
      } else {
        let maxEpoch = fromSecond;
        for (const item of batch) {
          if (item.epoch_second > maxEpoch) {
            maxEpoch = item.epoch_second;
          }
        }
        fromSecond = (maxEpoch === fromSecond) ? fromSecond + 1 : maxEpoch;
        await new Promise(r => setTimeout(r, 120));
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderAPI;
}
