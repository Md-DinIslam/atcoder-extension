# ⚡ AtCoder Pulse (AtCoder Analytics & Unsolved Tracker)

A fast, lightweight, and modern **Manifest V3** Chrome extension tailored for competitive programmers. It adds comprehensive solve statistics, interactive AtCoder difficulty breakdown charts, and a **Codeforces-style Unsolved Problem Tracker** directly onto AtCoder profile pages.

---

## 🌟 Key Features

1. **📊 Codeforces-Style Practice Heatmap & Streaks (Row 1)**:
   - Full 53-week practice activity heatmap aligned with local dates.
   - Clean 12-month timeline (`Dec` to `Nov`) triggering on the 1st of each month.
   - Default auto-scroll to the rightmost side so recent days and active streaks are instantly visible.
   - 6-metric Codeforces practice stats grid: Solved for all time, last year, last month, and Max streaks (all time, last year, current).

2. **🎨 200-Rating Interval Difficulty Bar Chart (Row 2)**:
   - 18 granular rating buckets (`0-199`, `200-399` ... `3000-3199`, `3200+`, `Unrated`).
   - Clean spacing with numbers and labels rendered in their official AtCoder tier colors.
   - Click any bar to instantly filter problems in that rating bucket inside the Solved List.

3. **🔥 Codeforces-style Compact Unsolved Problem Tracker**:
   - 3-4 column compact 2-line problem tiles.
   - Tracks all problems attempted with non-AC verdicts (WA, TLE, etc.) needing AC.
   - Filters for difficulty tiers and contest series (ABC/ARC/AGC).
   - Direct 1-click **Solve Now ➔** link to jump to the task statement.

4. **✅ Solved List (Recently Solved First)**:
   - Chronologically sorted by the exact date you solved each problem.
   - Dual-mode difficulty filtering: 200-rating intervals or standard 400-point tiers.
   - First-try AC tag (`⚡ 1st Try AC`) vs retry counts.

5. **🎯 Smart Practice & Profile Accuracy**:
   - Measures your speed and precision with a dedicated `🎯 One-Shot AC` accuracy pill in the header.
   - Problem recommendations tailored to your current median solve rating.

6. **⚡ Blazing Fast & Fully Cached**:
   - Incremental Kenkoooo API sync cached in `chrome.storage.local`.
   - Strictly confined to profile pages (`atcoder.jp/users/*`); no scripts injected into contest task pages.
   - 100% Manifest V3 CSP compliant (zero remote scripts).

6. **📌 Toolbar Extension Popup**:
   - Check any handle on the fly.
   - Pin your default handle.
   - Quick overview of solves, streak, and top unsolved problems.

---

## 📂 Project Architecture

```
├── manifest.json                  # Chrome Extension Manifest V3 configuration
├── package.py                     # One-click packager for Chrome Web Store release
├── icons/                         # 16, 32, 48, 128px high-res icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                         # Extension toolbar popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/                       # Content scripts injected into atcoder.jp/users/*
│   ├── content.js                 # Profile page injection & tab switcher
│   ├── content.css                # Dark / Light theme styling
│   └── dashboard.js               # Reactive UI & problem cards rendering
├── background/                    # Background service worker
│   └── service_worker.js
└── utils/                         # Reusable logic modules
    ├── colors.js                  # AtCoder rating colors & tier definitions
    ├── db.js                      # IndexedDB persistent storage
    ├── api.js                     # Kenkoooo API client with incremental sync
    ├── charts.js                  # Native SVG chart rendering
    └── analyzer.js                # Core metrics, streaks & unsolved extractor
```

---

## 🛠️ How to Test Locally in Chrome, Brave & Firefox

### 1. Google Chrome & Brave Browser
Since **Brave** is built on Chromium, the installation process is identical:
1. In the browser URL bar, go to:
   - For Chrome: `chrome://extensions/`
   - For Brave: `brave://extensions/`
2. Turn ON **Developer mode** (top-right toggle switch).
3. Click **Load unpacked** (top-left button).
4. Select this directory:
   ```
   /media/din/Programming2/Coding/My Procject/AtCoder Extension
   ```
5. The extension **AtCoder Pulse** is now loaded!

### 2. Mozilla Firefox
Firefox supports Manifest V3 with temporary add-on loading:
1. In Firefox's URL bar, go to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click **Load Temporary Add-on...**
3. Navigate to the project folder and select the `manifest.json` file (or `atcoder-pulse-extension.zip`).
4. The extension will be installed immediately and remain active during your browsing session.

---

### 🌐 Live Testing on AtCoder
Once loaded in your browser:
- Open any AtCoder profile (e.g. `https://atcoder.jp/users/chokudai`, `https://atcoder.jp/users/tourist`, or your handle).
- You will see the new **`Pulse Analytics & Unsolved`** tab and a quick button.
- Open any problem (e.g. `https://atcoder.jp/contests/abc300/tasks/abc300_a`) to see the auto-injected difficulty badge and your past attempt status!
- Open a contest tasks list (e.g. `https://atcoder.jp/contests/abc300/tasks`) to see difficulty ratings for all tasks in that contest.
- Click the extension icon in the browser toolbar to inspect the popup view.

---

## 🚀 Publishing to Google Chrome Web Store

### Step 1: Package the Extension
Run the included packaging script:
```bash
python3 package.py
```
This generates `atcoder-pulse-extension.zip` containing all necessary files.

### Step 2: Create a Chrome Web Store Developer Account
1. Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. Pay the one-time \$5 registration fee (required by Google to prevent spam).

### Step 3: Upload the Extension
1. In the Developer Dashboard, click **Add new item** (`+ New Item`).
2. Upload the `atcoder-pulse-extension.zip` file.
3. Fill in the **Store Listing**:
   - **Name**: `AtCoder Pulse - Analytics & Unsolved Tracker`
   - **Summary**: `Deep profile analytics, difficulty breakdown charts, and Codeforces-style unsolved problem tracker for AtCoder.`
   - **Detailed Description**: Copy the highlights from this README.
   - **Category**: `Developer Tools` or `Productivity`.
   - **Language**: English (or your preferred default).
   - **Icon**: Upload `icons/icon128.png` (128x128).
   - **Screenshots**: Take 1-2 screenshots of the dashboard (1280x800 or 640x400) showing the charts and unsolved problems.

### Step 4: Privacy & Permissions Justification
Under the **Privacy** tab:
- **Single Purpose**: Explain that the extension provides performance analytics and tracks unsolved competitive programming problems on AtCoder.
- **Permission Justification**:
  - `storage` / `unlimitedStorage`: Used to cache problem difficulties and past submissions locally in IndexedDB so pages load instantly.
  - `host_permissions` (`https://atcoder.jp/*`, `https://kenkoooo.com/*`): Used to display the analytics dashboard on AtCoder profiles and retrieve public submission data from the Kenkoooo AtCoder API.
- Check "I do not sell user data" and confirm no user personal data is collected or transmitted to external third-party servers.

### Step 5: Submit for Review
Click **Submit for Review**. Google typically reviews and approves Manifest V3 extensions within 24 to 72 hours.

