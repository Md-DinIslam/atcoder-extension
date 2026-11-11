/**
 * AtCoder Pulse - Silent Real-Time Submission Tracker
 * Runs on all atcoder.jp/contests/* pages.
 * Two jobs:
 *   1. Record which contests the user visits (so the dashboard knows where to look).
 *   2. Parse any visible submission rows and save judged results instantly.
 */

(function () {
  'use strict';

  // ── 1. Track visited contest ──────────────────────────────────────────
  const contestMatch = window.location.pathname.match(/\/contests\/([^/?#]+)/);
  const currentContest = contestMatch ? contestMatch[1] : '';

  if (currentContest && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ pulse_recent_contests: [] }, (data) => {
      const list = Array.isArray(data.pulse_recent_contests) ? data.pulse_recent_contests : [];
      // Move current contest to the front, keep max 6
      const updated = [currentContest, ...list.filter(c => c !== currentContest)].slice(0, 6);
      chrome.storage.local.set({ pulse_recent_contests: updated });
    });
  }

  // ── 2. Helpers ─────────────────────────────────────────────────────────
  function parseTimeStr(timeStr) {
    if (!timeStr) return Math.floor(Date.now() / 1000);
    try {
      const iso = timeStr.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    } catch (e) {}
    return Math.floor(Date.now() / 1000);
  }

  function getLoggedInUser() {
    // Header nav link
    const links = document.querySelectorAll('a[href^="/users/"]');
    for (const a of links) {
      // Skip links inside main content (other users); target the navbar ones
      if (a.closest('#header, .header, nav, .navbar, .navbar-right, .dropdown')) {
        const m = (a.getAttribute('href') || '').match(/\/users\/([^/?#]+)/);
        if (m && m[1]) return m[1].trim();
      }
    }
    // Embedded JS variable
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const m = (s.textContent || '').match(/userScreenName\s*=\s*["']([^"']+)["']/);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  function parseRow(row, defaultUser) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) return null;

    const detailLink = row.querySelector('a[href*="/submissions/"]');
    if (!detailLink) return null;
    const href = detailLink.getAttribute('href') || '';
    const idMatch = href.match(/\/submissions\/(\d+)/);
    if (!idMatch) return null;

    const cMatch = href.match(/\/contests\/([^/?#]+)/);
    const taskLink = row.querySelector('a[href*="/tasks/"]');
    const taskMatch = taskLink ? (taskLink.getAttribute('href') || '').match(/\/tasks\/([^/?#]+)/) : null;

    let userId = '';
    const userLink = row.querySelector('a[href*="/users/"]');
    if (userLink) {
      const uMatch = (userLink.getAttribute('href') || '').match(/\/users\/([^/?#]+)/);
      if (uMatch) userId = uMatch[1].trim();
    }

    const statusSpan = row.querySelector('.label') || row.querySelector('span[class*="label"]');
    const raw = statusSpan ? statusSpan.textContent.trim() : '';
    const isJudging = /WJ|Judging|WR|\d+\/\d+/i.test(raw);
    let result = raw.split(/\s+/)[0].toUpperCase();
    if (isJudging) result = 'WJ';
    else if (!result) result = 'OTHER';

    let language = 'Other';
    for (const c of cells) {
      if (/C\+\+|Python|PyPy|Java|Rust|Go|C#|Ruby|Kotlin|Haskell/i.test(c.textContent)) {
        language = c.textContent.trim();
        break;
      }
    }

    let point = 0;
    for (const c of cells) {
      const v = parseFloat(c.textContent.trim());
      if (!isNaN(v) && v >= 0 && v <= 3000) { point = v; break; }
    }

    return {
      id: parseInt(idMatch[1], 10),
      epoch_second: parseTimeStr(row.querySelector('time') ? row.querySelector('time').textContent : ''),
      problem_id: taskMatch ? taskMatch[1] : '',
      contest_id: cMatch ? cMatch[1] : currentContest,
      user_id: userId || defaultUser,
      result, language, point, isJudging
    };
  }

  // ── 3. Save + broadcast ────────────────────────────────────────────────
  const saved = new Set();

  async function saveAndNotify(sub) {
    if (!sub || !sub.user_id || !sub.problem_id || sub.isJudging) return;
    const key = `${sub.id}_${sub.result}`;
    if (saved.has(key)) return;
    saved.add(key);

    // IndexedDB
    if (typeof AtCoderDB !== 'undefined' && AtCoderDB.addOrUpdateSubmission) {
      await AtCoderDB.addOrUpdateSubmission(sub.user_id, sub);
    }

    // chrome.storage.local signal (triggers storage.onChanged on ALL tabs including dashboard)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ pulse_live_event: { sub, ts: Date.now() } });
    }

    // runtime message → service worker → profile tab
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'SUBMISSION_RECORDED', submission: sub }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  }

  // ── 4. Scan page ───────────────────────────────────────────────────────
  async function scan() {
    const user = getLoggedInUser();
    let judging = false;

    const rows = document.querySelectorAll('table tbody tr');
    for (const row of rows) {
      const sub = parseRow(row, user);
      if (!sub || !sub.problem_id) continue;
      if (sub.isJudging) { judging = true; continue; }
      await saveAndNotify(sub);
    }
    return judging;
  }

  // ── 5. Boot ────────────────────────────────────────────────────────────
  scan().then((judging) => {
    const target = document.querySelector('table') || document.body;
    new MutationObserver(() => scan()).observe(target, { childList: true, subtree: true, characterData: true });

    if (judging) {
      let n = 0;
      const iv = setInterval(async () => {
        n++;
        if (!(await scan()) || n > 50) clearInterval(iv);
      }, 1000);
    }
  });

})();
