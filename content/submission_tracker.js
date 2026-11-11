/**
 * AtCoder Pulse - Silent Real-Time Submission Tracker
 * Runs on all atcoder.jp contest pages to capture submissions the exact second they are judged.
 * Completely silent: zero visual DOM modifications.
 */

(function () {
  'use strict';

  function parseTimeStr(timeStr) {
    if (!timeStr) return Math.floor(Date.now() / 1000);
    try {
      const isoStr = timeStr.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return Math.floor(d.getTime() / 1000);
      }
    } catch (e) {}
    return Math.floor(Date.now() / 1000);
  }

  function getLoggedInUser() {
    // 1. Check header navbar link
    const userEl = document.querySelector('#header a[href^="/users/"], a.username, .navbar a[href^="/users/"]');
    if (userEl) {
      const href = userEl.getAttribute('href') || '';
      const match = href.match(/\/users\/([^/?#]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 2. Check embedded script tags
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const text = s.textContent || '';
      const match = text.match(/userScreenName\s*=\s*["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 3. Fallback to window.userScreenName if available
    if (typeof window !== 'undefined' && window.userScreenName) {
      return String(window.userScreenName).trim();
    }

    return '';
  }

  function parseSubmissionRow(row, defaultUserId) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) return null;

    // 1. Detail link -> Submission ID & Contest ID
    const detailLink = row.querySelector('a[href*="/submissions/"]');
    if (!detailLink) return null;
    const href = detailLink.getAttribute('href') || '';
    const idMatch = href.match(/\/submissions\/(\d+)/);
    if (!idMatch) return null;
    const subId = parseInt(idMatch[1], 10);

    const contestMatch = href.match(/\/contests\/([^/?#]+)/);
    const contestId = contestMatch ? contestMatch[1] : '';

    // 2. Task link -> Problem ID
    const taskLink = row.querySelector('a[href*="/tasks/"]');
    const taskHref = taskLink ? taskLink.getAttribute('href') || '' : '';
    const taskMatch = taskHref.match(/\/tasks\/([^/?#]+)/);
    const problemId = taskMatch ? taskMatch[1] : '';

    // 3. User ID: check row for /users/ link, otherwise use defaultUserId
    let userId = '';
    const userLink = row.querySelector('a[href*="/users/"]');
    if (userLink) {
      const userHref = userLink.getAttribute('href') || '';
      const userMatch = userHref.match(/\/users\/([^/?#]+)/);
      if (userMatch && userMatch[1]) userId = userMatch[1].trim();
    }
    if (!userId) {
      userId = defaultUserId;
    }

    // 4. Epoch Second
    const timeEl = row.querySelector('time');
    const epochSecond = parseTimeStr(timeEl ? timeEl.textContent : '');

    // 5. Verdict
    const statusSpan = row.querySelector('.label') || row.querySelector('span[class*="label"]');
    const resultRaw = statusSpan ? statusSpan.textContent.trim() : '';
    const isJudging = /WJ|Judging|WR|\d+\/\d+/i.test(resultRaw);
    let result = resultRaw.split(/\s+/)[0].toUpperCase();
    if (isJudging) {
      result = 'WJ';
    } else if (!result) {
      result = 'OTHER';
    }

    // 6. Language
    let language = 'Other';
    for (const c of cells) {
      const t = c.textContent.trim();
      if (/C\+\+|Python|PyPy|Java|Rust|Go|C#|Ruby|Kotlin|Haskell|JavaScript|TypeScript/i.test(t)) {
        language = t;
        break;
      }
    }

    // 7. Score
    let point = 0;
    for (const c of cells) {
      const val = parseFloat(c.textContent.trim());
      if (!isNaN(val) && val >= 0 && val <= 3000) {
        point = val;
        break;
      }
    }

    return {
      id: subId,
      epoch_second: epochSecond,
      problem_id: problemId,
      contest_id: contestId,
      user_id: userId,
      result: result,
      language: language,
      point: point,
      isJudging: isJudging
    };
  }

  function parseSingleSubmissionDetails(defaultUserId) {
    const path = window.location.pathname;
    const match = path.match(/\/contests\/([^/?#]+)\/submissions\/(\d+)/);
    if (!match) return null;

    const contestId = match[1];
    const subId = parseInt(match[2], 10);

    const taskLink = document.querySelector('a[href*="/tasks/"]');
    const problemId = taskLink ? (taskLink.getAttribute('href').match(/\/tasks\/([^/?#]+)/) || [])[1] : '';

    let userId = '';
    const userLink = document.querySelector('a[href*="/users/"]');
    if (userLink) {
      const uMatch = userLink.getAttribute('href').match(/\/users\/([^/?#]+)/);
      if (uMatch) userId = uMatch[1].trim();
    }
    if (!userId) userId = defaultUserId;

    const timeEl = document.querySelector('time');
    const epochSecond = parseTimeStr(timeEl ? timeEl.textContent : '');

    const statusSpan = document.querySelector('.label, span[class*="label"]');
    const resultRaw = statusSpan ? statusSpan.textContent.trim() : '';
    const isJudging = /WJ|Judging|WR|\d+\/\d+/i.test(resultRaw);
    let result = resultRaw.split(/\s+/)[0].toUpperCase();
    if (isJudging) result = 'WJ';
    else if (!result) result = 'OTHER';

    let language = 'Other';
    const ths = document.querySelectorAll('th');
    for (const th of ths) {
      if (th.textContent.includes('Language')) {
        const td = th.nextElementSibling;
        if (td) language = td.textContent.trim();
      }
    }

    return {
      id: subId,
      epoch_second: epochSecond,
      problem_id: problemId,
      contest_id: contestId,
      user_id: userId,
      result: result,
      language: language,
      point: 0,
      isJudging: isJudging
    };
  }

  const recordedSubmissions = new Set();

  async function saveAndNotify(sub) {
    if (!sub || !sub.user_id || !sub.problem_id || sub.isJudging) return;

    const key = `${sub.id}_${sub.result}`;
    if (recordedSubmissions.has(key)) return;
    recordedSubmissions.add(key);

    console.log('[AtCoder Pulse] Instant Submission Judged:', sub.id, sub.problem_id, sub.result);

    // 1. Direct Save to IndexedDB
    if (typeof AtCoderDB !== 'undefined' && AtCoderDB.addOrUpdateSubmission) {
      await AtCoderDB.addOrUpdateSubmission(sub.user_id, sub);
    }

    // 2. Broadcast via chrome.storage.local (Triggers storage.onChanged across all tabs)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        pulse_latest_submission: {
          sub: sub,
          timestamp: Date.now()
        }
      });
    }

    // 3. Broadcast via runtime message
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'SUBMISSION_RECORDED',
        submission: sub
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  }

  async function processPage() {
    const loggedInUser = getLoggedInUser();
    let hasJudging = false;

    // Check if on single submission page
    if (window.location.pathname.includes('/submissions/') && !window.location.pathname.endsWith('/me') && !window.location.pathname.endsWith('/submissions')) {
      const singleSub = parseSingleSubmissionDetails(loggedInUser);
      if (singleSub) {
        if (singleSub.isJudging) {
          hasJudging = true;
        } else {
          await saveAndNotify(singleSub);
        }
      }
    }

    // Check table rows (works on /submissions, /submissions/me, and any submission list)
    const rows = document.querySelectorAll('table.table tbody tr, table tbody tr');
    for (const row of rows) {
      const sub = parseSubmissionRow(row, loggedInUser);
      if (!sub || !sub.problem_id) continue;

      if (sub.isJudging) {
        hasJudging = true;
        continue;
      }

      await saveAndNotify(sub);
    }

    return hasJudging;
  }

  // Listen for task page form submission so we track the active contest in sessionStorage
  if (window.location.pathname.includes('/tasks/')) {
    const form = document.querySelector('form[action*="/submit"]');
    if (form) {
      form.addEventListener('submit', () => {
        const contestMatch = window.location.pathname.match(/\/contests\/([^/?#]+)/);
        if (contestMatch) {
          try {
            sessionStorage.setItem('pulse_last_contest', contestMatch[1]);
          } catch (e) {}
        }
      });
    }
  }

  // Initial scan and observer setup
  processPage().then((hasJudging) => {
    const targetEl = document.querySelector('table.table') || document.querySelector('table') || document.body;
    if (targetEl) {
      const observer = new MutationObserver(() => {
        processPage();
      });
      observer.observe(targetEl, { childList: true, subtree: true, characterData: true });

      // Fast polling fallback for up to 60 seconds if judging is in progress
      if (hasJudging) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          const stillJudging = await processPage();
          if (!stillJudging || attempts > 40) {
            clearInterval(interval);
          }
        }, 1200);
      }
    }
  });

})();
