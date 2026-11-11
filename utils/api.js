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
   * Incrementally fetches submissions for a user from Kenkoooo API.
   * If cached submissions exist, only fetches recent submissions (fast!).
   * If forceRefresh is true, re-checks the last 7 days to guarantee any recent update is caught.
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

    let fromSecond = 0;
    if (cachedData && cachedData.lastFetchedEpoch > 0) {
      if (forceRefresh) {
        // Re-check past 7 days to guarantee any recent submission or status change is caught
        fromSecond = Math.max(0, cachedData.lastFetchedEpoch - (7 * 86400));
      } else {
        // Normal incremental check: last 2 hours
        fromSecond = Math.max(0, cachedData.lastFetchedEpoch - 7200);
      }
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
        const existing = subMap.get(item.id);
        if (!existing) {
          subMap.set(item.id, item);
          newlyFetchedCount++;
        } else if (existing.result !== item.result) {
          // Status updated (e.g. WJ -> AC)
          subMap.set(item.id, { ...existing, ...item });
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderAPI;
}
