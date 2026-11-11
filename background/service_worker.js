/**
 * AtCoder Pulse Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AtCoder Pulse] Extension installed or updated:', details.reason);
  if (details.reason === 'install') {
    chrome.storage.local.set({
      theme: 'light',
      autoSync: true
    });
  }
});

// Listener for background requests from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG' });
    return false;
  }

  if (request.action === 'FETCH_KENKOOOO') {
    fetch(request.url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => {
        console.warn('[AtCoder Pulse Background] Fetch error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'FETCH_ATCODER_SUBMISSIONS') {
    const { userId, contestIds } = request;
    if (!contestIds || contestIds.length === 0) {
      sendResponse({ submissions: [] });
      return false;
    }

    (async () => {
      const allSubs = [];
      for (const contestId of contestIds.slice(0, 6)) {
        try {
          // Try /submissions/me first (requires login session)
          let url = `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/submissions/me`;
          let resp = await fetch(url, { credentials: 'include' });

          // If /submissions/me redirects to login or gives 302, try public URL
          if (!resp.ok || resp.redirected) {
            url = `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/submissions?f.User=${encodeURIComponent(userId)}`;
            resp = await fetch(url, { credentials: 'include' });
            if (!resp.ok) continue;
          }

          const html = await resp.text();
          // Skip login pages
          if (html.includes('Sign In - AtCoder') || html.includes('/login?continue')) continue;

          // Return raw HTML - content script will parse with DOMParser
          allSubs.push({ contestId, html });
        } catch (e) {
          console.warn(`[Pulse BG] Failed to fetch contest ${contestId}:`, e);
        }
      }
      sendResponse({ rawPages: allSubs });
    })();
    return true; // Keep channel open for async
  }

  if (request.action === 'SUBMISSION_RECORDED') {
    // Broadcast to all open AtCoder tabs to immediately refresh data
    try {
      chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'NEW_SUBMISSION_RECORDED',
              submission: request.submission
            }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        }
      });
    } catch (e) {}
    sendResponse({ success: true });
    return false;
  }

  return false;
});
