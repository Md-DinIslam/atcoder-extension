/**
 * AtCoder Pulse - Silent Real-Time Submission Tracker
 * Runs on atcoder.jp contest submission pages to capture submissions the exact second they are judged.
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

  function parseRow(row) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return null;

    // 1. Submission ID & Contest ID from detail link
    const detailLink = row.querySelector('a[href*="/submissions/"]');
    if (!detailLink) return null;
    const href = detailLink.getAttribute('href') || '';
    const idMatch = href.match(/\/submissions\/(\d+)/);
    if (!idMatch) return null;
    const subId = parseInt(idMatch[1], 10);

    const contestMatch = href.match(/\/contests\/([^/?#]+)/);
    const contestId = contestMatch ? contestMatch[1] : '';

    // 2. Problem ID from task link
    const taskLink = row.querySelector('a[href*="/tasks/"]');
    const taskHref = taskLink ? taskLink.getAttribute('href') || '' : '';
    const taskMatch = taskHref.match(/\/tasks\/([^/?#]+)/);
    const problemId = taskMatch ? taskMatch[1] : '';

    // 3. User ID from user link
    const userLink = row.querySelector('a[href*="/users/"]');
    const userHref = userLink ? userLink.getAttribute('href') || '' : '';
    const userMatch = userHref.match(/\/users\/([^/?#]+)/);
    const userId = userMatch ? userMatch[1] : '';

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
      if (/C\+\+|Python|PyPy|Java|Rust|Go|C#|Ruby|Kotlin|Haskell/i.test(t)) {
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

  const recordedSubmissions = new Set();

  async function processTable() {
    const rows = document.querySelectorAll('table.table tbody tr');
    if (!rows || rows.length === 0) return false;

    let hasJudging = false;

    for (const row of rows) {
      const sub = parseRow(row);
      if (!sub || !sub.user_id || !sub.problem_id) continue;

      if (sub.isJudging) {
        hasJudging = true;
        continue;
      }

      // Check if we've already saved this exact state
      const key = `${sub.id}_${sub.result}`;
      if (recordedSubmissions.has(key)) continue;

      recordedSubmissions.add(key);

      // Persist to IndexedDB
      if (typeof AtCoderDB !== 'undefined' && AtCoderDB.addOrUpdateSubmission) {
        await AtCoderDB.addOrUpdateSubmission(sub.user_id, sub);
      }

      // Notify any open AtCoder Pulse dashboard tabs
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'SUBMISSION_RECORDED',
          submission: sub
        }, () => {
          if (chrome.runtime.lastError) {
            // Ignore if no listener
          }
        });
      }
    }

    return hasJudging;
  }

  // Initial scan
  processTable().then((hasJudging) => {
    // If submissions are still being judged, observe table mutations and poll
    const table = document.querySelector('table.table');
    if (table) {
      const observer = new MutationObserver(() => {
        processTable();
      });
      observer.observe(table, { childList: true, subtree: true, characterData: true });

      // Fallback polling for 60 seconds if judging is active
      if (hasJudging) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          const stillJudging = await processTable();
          if (!stillJudging || attempts > 40) {
            clearInterval(interval);
          }
        }, 1500);
      }
    }
  });

})();

