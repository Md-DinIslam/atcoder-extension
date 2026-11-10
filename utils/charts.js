/**
 * Native Lightweight SVG Charting Engine
 * Zero external dependencies. Fast, interactive, and crisp on all displays.
 */

const AtCoderCharts = {
  /**
   * Renders the Difficulty Distribution Bar Chart by 200 Rating Intervals
   */
  renderDifficultyChart(container, bucketCounts, totalSolved, onBucketClick = null) {
    if (!container) return;
    container.innerHTML = '';

    const buckets = AtCoderColors.BUCKETS_200 || AtCoderColors.TIERS;
    let maxCount = 0;
    buckets.forEach(b => {
      const c = bucketCounts[b.key] || 0;
      if (c > maxCount) maxCount = c;
    });

    if (maxCount === 0) maxCount = 1;

    const chartWrap = document.createElement('div');
    chartWrap.className = 'ac-chart-diff-wrap';

    const barContainer = document.createElement('div');
    barContainer.className = 'ac-diff-bars';

    buckets.forEach(b => {
      const count = bucketCounts[b.key] || 0;
      const heightPercent = count > 0 ? Math.max(6, Math.round((count / maxCount) * 100)) : 0;
      const pctOfTotal = totalSolved > 0 ? ((count / totalSolved) * 100).toFixed(1) : 0;

      const col = document.createElement('div');
      col.className = 'ac-diff-col';
      col.setAttribute('data-bucket', b.key);

      const countColor = count > 0 ? b.color : '#94a3b8';
      const countWeight = count > 0 ? '700' : '500';

      const fillHtml = count > 0
        ? `<div class="ac-bar-fill" style="height: ${heightPercent}%; background-color: ${b.color}; box-shadow: 0 0 5px ${b.color}40;"></div>`
        : '';

      col.innerHTML = `
        <div class="ac-bar-count" style="color: ${countColor}; font-weight: ${countWeight};">${count}</div>
        <div class="ac-bar-track">
          ${fillHtml}
        </div>
        <div class="ac-bar-rating-label" style="color: ${b.color};">
          ${b.label}
        </div>
        <div class="ac-bar-sub-tier" style="color: ${b.color};">
          ${b.subLabel || b.label}
        </div>
      `;

      // Tooltip
      col.title = `${b.subLabel || b.label} (${b.label}): ${count} solved (${pctOfTotal}%) - Click to filter`;

      if (onBucketClick) {
        col.style.cursor = 'pointer';
        col.addEventListener('click', () => {
          document.querySelectorAll('.ac-diff-col').forEach(el => el.classList.remove('active'));
          col.classList.add('active');
          onBucketClick(b);
        });
      }

      barContainer.appendChild(col);
    });

    chartWrap.appendChild(barContainer);
    container.appendChild(chartWrap);
  },

  /**
   * Renders Task Index (A through Ex) Breakdown
   */
  renderTaskIndexChart(container, taskCounts, onSelect = null) {
    if (!container) return;
    container.innerHTML = '';

    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Ex'];
    let max = 0;
    keys.forEach(k => {
      if ((taskCounts[k] || 0) > max) max = taskCounts[k] || 0;
    });
    if (max === 0) max = 1;

    const wrap = document.createElement('div');
    wrap.className = 'ac-task-index-wrap';

    keys.forEach(k => {
      const count = taskCounts[k] || 0;
      const pct = Math.round((count / max) * 100);

      const row = document.createElement('div');
      row.className = 'ac-task-row';
      if (onSelect) {
        row.style.cursor = 'pointer';
        row.title = `Click to filter solved Task ${k} problems`;
        row.addEventListener('click', () => onSelect(k));
      }
      row.innerHTML = `
        <div class="ac-task-tag">${k}</div>
        <div class="ac-task-bar-track">
          <div class="ac-task-bar-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="ac-task-val">${count}</div>
      `;
      wrap.appendChild(row);
    });

    container.appendChild(wrap);
  },

  /**
   * Renders Verdict Segmented Progress Bar
   */
  renderVerdictBar(container, verdicts, total) {
    if (!container || !total) return;
    container.innerHTML = '';

    const palette = {
      AC: '#22c55e',
      WA: '#ef4444',
      TLE: '#eab308',
      MLE: '#a855f7',
      RE: '#f97316',
      CE: '#64748b',
      OTHER: '#94a3b8'
    };

    const bar = document.createElement('div');
    bar.className = 'ac-verdict-progress-bar';

    const legend = document.createElement('div');
    legend.className = 'ac-verdict-legend';

    for (const [v, count] of Object.entries(verdicts)) {
      if (count <= 0) continue;
      const pct = ((count / total) * 100).toFixed(1);
      const color = palette[v] || palette.OTHER;

      const seg = document.createElement('div');
      seg.className = 'ac-verdict-segment';
      seg.style.width = `${pct}%`;
      seg.style.backgroundColor = color;
      seg.title = `${v}: ${count} (${pct}%)`;
      bar.appendChild(seg);

      const item = document.createElement('div');
      item.className = 'ac-legend-item';
      item.innerHTML = `
        <span class="ac-legend-dot" style="background:${color};"></span>
        <span class="ac-legend-lbl">${v}:</span>
        <span class="ac-legend-num">${count} <small>(${pct}%)</small></span>
      `;
      legend.appendChild(item);
    }

    container.appendChild(bar);
    container.appendChild(legend);
  },

  /**
   * Renders Language distribution list with progress bars
   */
  renderLanguageBars(container, languages) {
    if (!container) return;
    container.innerHTML = '';

    const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    if (total === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'ac-lang-list';

    entries.slice(0, 6).forEach(([lang, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      const row = document.createElement('div');
      row.className = 'ac-lang-row';
      row.innerHTML = `
        <div class="ac-lang-info">
          <span class="ac-lang-name">${lang}</span>
          <span class="ac-lang-count">${count} <small>(${pct}%)</small></span>
        </div>
        <div class="ac-lang-track">
          <div class="ac-lang-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      wrap.appendChild(row);
    });

    container.appendChild(wrap);
  },

  /**
   * Renders Monthly Activity Trend (Last 6 Months)
   */
  renderMonthlyActivity(container, monthlySolves) {
    if (!container || !monthlySolves) return;
    container.innerHTML = '';

    const entries = Object.entries(monthlySolves).sort((a, b) => a[0].localeCompare(b[0]));
    const recent = entries.slice(-6); // last 6 months
    if (recent.length === 0) {
      container.innerHTML = '<div class="text-muted" style="font-size:12px; padding:10px 0;">No recent solve history</div>';
      return;
    }

    let max = 0;
    recent.forEach(([, count]) => {
      if (count > max) max = count;
    });
    if (max === 0) max = 1;

    const wrap = document.createElement('div');
    wrap.className = 'ac-monthly-wrap';

    recent.forEach(([monthKey, count]) => {
      const pct = Math.max(6, Math.round((count / max) * 100));
      const col = document.createElement('div');
      col.className = 'ac-monthly-col';
      col.innerHTML = `
        <div class="ac-monthly-num">${count}</div>
        <div class="ac-monthly-track">
          <div class="ac-monthly-fill" style="height: ${pct}%;"></div>
        </div>
        <div class="ac-monthly-label">${monthKey.slice(5)}</div>
      `;
      wrap.appendChild(col);
    });

    container.appendChild(wrap);
  },

  formatLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /**
   * Renders Codeforces-style Heatmap Calendar & 6-Metric Streak Grid
   * @param {HTMLElement} container
   * @param {Object} cf - { allTimeSolved, yearSolved, monthSolved, allTimeMaxStreak, yearMaxStreak, currentStreak, dailyACCounts }
   */
  renderCodeforcesActivityWidget(container, cf) {
    if (!container || !cf) return;
    container.innerHTML = '';

    const dailyCounts = cf.dailyACCounts || {};

    // Generate 53 weeks aligned to Sunday (GitHub / CF standard)
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayDay = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

    const todayLocal = new Date(todayYear, todayMonth, todayDate);

    // Start on Sunday 52 weeks ago
    const startDate = new Date(todayYear, todayMonth, todayDate - (52 * 7 + todayDay));

    const weeks = [];
    const curDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const monthLabels = [];
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const currentWeek = [];
      for (let d = 0; d < 7; d++) {
        const dStr = this.formatLocalDate(curDate);
        const count = dailyCounts[dStr] || 0;
        const isFuture = curDate > todayLocal;

        // Trigger month label on the 1st of each month (clean 12 months, matching Codeforces)
        if (curDate.getDate() === 1) {
          if (curDate.getMonth() !== lastMonth) {
            monthLabels.push({
              weekIdx: w,
              name: curDate.toLocaleDateString('en-US', { month: 'short' })
            });
            lastMonth = curDate.getMonth();
          }
        }

        currentWeek.push({
          dateStr: dStr,
          count,
          isFuture
        });

        // Step 1 calendar day in local time
        curDate.setDate(curDate.getDate() + 1);
      }
      weeks.push(currentWeek);
    }

    const getColor = (count, isFuture) => {
      if (isFuture) return 'transparent';
      if (count === 0) return ''; // Handled by .ac-cf-empty class
      if (count === 1) return '#9be9a8';
      if (count === 2) return '#40c463';
      if (count <= 4) return '#30a14e';
      return '#216e39';
    };

    const wrap = document.createElement('div');
    wrap.className = 'ac-cf-widget-wrap';

    // 1. Calendar Heatmap
    const heatmapHtml = `
      <div class="ac-cf-heatmap-scroll">
        <div class="ac-cf-heatmap-grid">
          <div class="ac-cf-month-row">
            <span class="ac-cf-day-lbl-spacer"></span>
            ${weeks.map((_, idx) => {
              const m = monthLabels.find(l => l.weekIdx === idx);
              return `<span class="ac-cf-month-lbl">${m ? m.name : ''}</span>`;
            }).join('')}
          </div>
          <div class="ac-cf-days-container">
            <div class="ac-cf-day-labels">
              <span class="ac-cf-day-lbl"></span>
              <span class="ac-cf-day-lbl">Mon</span>
              <span class="ac-cf-day-lbl"></span>
              <span class="ac-cf-day-lbl">Wed</span>
              <span class="ac-cf-day-lbl"></span>
              <span class="ac-cf-day-lbl">Fri</span>
              <span class="ac-cf-day-lbl"></span>
            </div>
            <div class="ac-cf-matrix">
              ${weeks.map(week => `
                <div class="ac-cf-col">
                  ${week.map(day => {
                    const color = getColor(day.count, day.isFuture);
                    const isEmpty = day.count === 0 && !day.isFuture;
                    const bgStyle = color ? `background-color: ${color};` : '';
                    return `
                      <div class="ac-cf-cell ${isEmpty ? 'ac-cf-empty' : ''}" 
                           style="${bgStyle} ${day.isFuture ? 'visibility:hidden;' : ''}"
                           title="${day.count} problem${day.count === 1 ? '' : 's'} solved on ${day.dateStr}">
                      </div>
                    `;
                  }).join('')}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // 2. CF 6-Stats Grid (Matches Codeforces layout)
    const statsGridHtml = `
      <div class="ac-cf-stats-grid">
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.allTimeSolved} problems</div>
          <div class="ac-cf-stat-lbl">solved for all time</div>
        </div>
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.yearSolved} problems</div>
          <div class="ac-cf-stat-lbl">solved for the last year</div>
        </div>
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.monthSolved} problems</div>
          <div class="ac-cf-stat-lbl">solved for the last month</div>
        </div>
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.allTimeMaxStreak} days</div>
          <div class="ac-cf-stat-lbl">in a row max.</div>
        </div>
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.yearMaxStreak} days</div>
          <div class="ac-cf-stat-lbl">in a row for the last year</div>
        </div>
        <div class="ac-cf-stat-cell">
          <div class="ac-cf-stat-num">${cf.currentStreak} days</div>
          <div class="ac-cf-stat-lbl">in a row (current streak)</div>
        </div>
      </div>
    `;

    wrap.innerHTML = heatmapHtml + statsGridHtml;
    container.appendChild(wrap);

    // Auto-scroll heatmap to the rightmost side by default so recent activity is instantly visible
    const scrollEl = wrap.querySelector('.ac-cf-heatmap-scroll');
    if (scrollEl) {
      const scrollToRight = () => {
        scrollEl.scrollLeft = scrollEl.scrollWidth;
      };
      scrollToRight();
      requestAnimationFrame(scrollToRight);
      setTimeout(scrollToRight, 50);
      setTimeout(scrollToRight, 200);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderCharts;
}
