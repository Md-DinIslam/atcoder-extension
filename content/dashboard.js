/**
 * AtCoder Dashboard Component
 * Renders the integrated analytics & unsolved tracker UI.
 */

class AtCoderDashboard {
  constructor(userId, container) {
    this.userId = userId;
    this.container = container;
    this.data = null;
    this.activeTab = 'charts'; // 'charts' | 'unsolved' | 'recommendations' | 'solved'
    this.filterDifficulty = 'all';
    this.filterContest = 'all';
    this.filterTask = 'all';
    this.searchTerm = '';
    this.sortBy = 'attempts'; // 'attempts' | 'diff-desc' | 'diff-asc' | 'recent' | 'task-asc' | 'task-desc'
    this.pageSize = 30;
    this.unsolvedPage = 1;
    this.recommendationsPage = 1;
    this.solvedPage = 1;
  }

  renderShell() {
    this.container.innerHTML = `
      <div id="atcoder-pulse-root" class="ac-pulse-theme-light">
        <!-- Dashboard Header -->
        <div class="ac-pulse-header">
          <div class="ac-pulse-brand">
            <div class="ac-pulse-logo">
              <span class="ac-pulse-title">AtCoder Pulse</span>
            </div>
            <div class="ac-pulse-user-pill">
              <span class="glyphicon glyphicon-user"></span>
              <span id="ac-header-username">${this.userId}</span>
            </div>
            <div class="ac-pulse-user-pill" id="ac-header-accuracy" style="display: none;"></div>
          </div>

          <div class="ac-pulse-actions">
            <span id="ac-last-sync-text" class="ac-sync-timestamp">Checking data...</span>
            <button id="ac-sync-btn" class="ac-btn ac-btn-primary" title="Check for new submissions">
              <span class="glyphicon glyphicon-refresh" id="ac-sync-icon"></span>
              <span id="ac-sync-label">Sync Now</span>
            </button>
            <button id="ac-theme-toggle" class="ac-btn ac-btn-icon" title="Toggle Dark / Light Theme">
              <span id="ac-theme-icon">🌙</span>
            </button>
          </div>
        </div>

        <!-- Sync Progress Bar -->
        <div id="ac-sync-progress" class="ac-progress-bar-wrap" style="display: none;">
          <div class="ac-progress-bar-inner" id="ac-sync-progress-fill" style="width: 0%;"></div>
          <div class="ac-progress-text" id="ac-sync-progress-text">Syncing submissions...</div>
        </div>

        <!-- Navigation Sub-tabs -->
        <div class="ac-nav-tabs">
          <button class="ac-tab-btn active" data-tab="charts">
            <span class="glyphicon glyphicon-stats"></span> Charts & Analytics
          </button>
          <button class="ac-tab-btn" data-tab="unsolved">
            <span class="glyphicon glyphicon-fire" style="color: #f87171;"></span> Unsolved Backlog 
            <span class="ac-pill-badge" id="ac-unsolved-badge">0</span>
          </button>
          <button class="ac-tab-btn" data-tab="recommendations">
            <span class="glyphicon glyphicon-star" style="color: #fbbf24;"></span> Smart Practice
          </button>
          <button class="ac-tab-btn" data-tab="solved">
            <span class="glyphicon glyphicon-ok" style="color: #34d399;"></span> Solved List
          </button>
        </div>

        <!-- Tab Panels -->
        <div class="ac-tab-content">
          <!-- 1. Charts Tab -->
          <div id="ac-tab-charts" class="ac-panel active">
            <!-- Row 1 (Single Row, Full Width): Codeforces-Style Daily Streak & Activity Heatmap -->
            <div class="ac-card ac-full-row-card">
              <div class="ac-card-header">
                <div class="ac-card-title">
                  <span class="glyphicon glyphicon-calendar"></span> Activity Heatmap & Streaks
                </div>
                <div class="ac-card-subtitle">Yearly practice consistency, solves by time period, and consecutive active days</div>
              </div>
              <div id="ac-cf-activity-container"></div>
            </div>

            <!-- Row 2 (Single Row, Full Width): Solved by Difficulty -->
            <div class="ac-card ac-full-row-card mt-4">
              <div class="ac-card-header">
                <div class="ac-card-title">
                  <span class="glyphicon glyphicon-signal"></span> Solved by Difficulty (200 Rating Intervals)
                </div>
                <div class="ac-card-subtitle">Detailed 200-point rating distribution. Click any bar to inspect problems in that range.</div>
              </div>
              <div id="ac-diff-chart-container" class="ac-chart-box"></div>
            </div>

            <!-- Row 3 (Single 2-Column Row): Task Index (Left) & Submissions/Verdicts/Languages (Right) -->
            <div class="ac-grid-2col mt-4">
              <!-- Left: Task Index Breakdown -->
              <div class="ac-card">
                <div class="ac-card-header">
                  <div class="ac-card-title">
                    <span class="glyphicon glyphicon-tasks"></span> Solved by Problem Task Index
                  </div>
                  <div class="ac-card-subtitle">Distribution across A, B, C, D, E, F, G, Ex</div>
                </div>
                <div id="ac-task-chart-container" class="ac-chart-box"></div>
              </div>

              <!-- Right: Submissions, Verdicts & Languages -->
              <div class="ac-card">
                <div class="ac-card-header">
                  <div class="ac-card-title">
                    <span class="glyphicon glyphicon-check"></span> Submissions, Verdicts & Languages
                  </div>
                </div>
                <div id="ac-verdict-container" class="mb-3"></div>
                <div class="ac-card-subtitle mb-2">Most Used Languages:</div>
                <div id="ac-lang-container" class="mb-3"></div>
              </div>
            </div>
          </div>

          <!-- 2. Unsolved Tab -->
          <div id="ac-tab-unsolved" class="ac-panel">
            <div class="ac-filter-toolbar">
              <div class="ac-search-input-wrap">
                <span class="glyphicon glyphicon-search"></span>
                <input type="text" id="ac-unsolved-search" placeholder="Search by name, ID or contest..." />
              </div>

              <div class="ac-filter-controls">
                <select id="ac-filter-diff" class="ac-select">
                  <option value="all">All Difficulties</option>
                  <option value="gray">Gray (< 400)</option>
                  <option value="brown">Brown (400-799)</option>
                  <option value="green">Green (800-1199)</option>
                  <option value="cyan">Cyan (1200-1599)</option>
                  <option value="blue">Blue (1600-1999)</option>
                  <option value="yellow">Yellow (2000-2399)</option>
                  <option value="orange">Orange (2400-2799)</option>
                  <option value="red">Red (2800-3199)</option>
                  <option value="gold">Gold (3200+)</option>
                  <option value="unknown">Unrated</option>
                </select>

                <select id="ac-filter-task" class="ac-select">
                  <option value="all">All Tasks</option>
                  <option value="A">Task A</option>
                  <option value="B">Task B</option>
                  <option value="C">Task C</option>
                  <option value="D">Task D</option>
                  <option value="E">Task E</option>
                  <option value="F">Task F</option>
                  <option value="G">Task G</option>
                  <option value="Ex">Task Ex</option>
                  <option value="Other">Other</option>
                </select>

                <select id="ac-filter-contest" class="ac-select">
                  <option value="all">All Contests</option>
                  <option value="abc">ABC (Beginner)</option>
                  <option value="arc">ARC (Regular)</option>
                  <option value="agc">AGC (Grand)</option>
                  <option value="other">Other Contests</option>
                </select>

                <select id="ac-sort-by" class="ac-select">
                  <option value="attempts">Most Attempts First</option>
                  <option value="task-asc">Task: A to Ex</option>
                  <option value="task-desc">Task: Ex to A</option>
                  <option value="diff-desc">Difficulty: High to Low</option>
                  <option value="diff-asc">Difficulty: Low to High</option>
                  <option value="recent">Recently Attempted</option>
                </select>
              </div>
            </div>

            <div id="ac-unsolved-list" class="ac-problem-grid"></div>
            <div id="ac-unsolved-pagination"></div>
          </div>

          <!-- 3. Recommendations Tab -->
          <div id="ac-tab-recommendations" class="ac-panel">
            <div class="ac-recommend-header mb-3">
              <h4>🎯 Recommended Problems to Push Your Rating</h4>
              <p class="text-muted">Targeted problems chosen near your current practice difficulty level:</p>
            </div>
            <div id="ac-recommendations-list" class="ac-problem-grid"></div>
            <div id="ac-recommendations-pagination"></div>
          </div>

          <!-- 4. Solved List Tab -->
          <div id="ac-tab-solved" class="ac-panel">
            <div class="ac-filter-toolbar">
              <div class="ac-search-input-wrap">
                <span class="glyphicon glyphicon-search"></span>
                <input type="text" id="ac-solved-search" placeholder="Search solved problems by name, ID or contest..." />
              </div>
              <div class="ac-filter-controls">
                <select id="ac-solved-filter-diff" class="ac-select">
                  <option value="all">All Difficulties</option>
                  <optgroup label="200-Rating Intervals">
                    <option value="0-199">0-199 (Gray)</option>
                    <option value="200-399">200-399 (Gray)</option>
                    <option value="400-599">400-599 (Brown)</option>
                    <option value="600-799">600-799 (Brown)</option>
                    <option value="800-999">800-999 (Green)</option>
                    <option value="1000-1199">1000-1199 (Green)</option>
                    <option value="1200-1399">1200-1399 (Cyan)</option>
                    <option value="1400-1599">1400-1599 (Cyan)</option>
                    <option value="1600-1799">1600-1799 (Blue)</option>
                    <option value="1800-1999">1800-1999 (Blue)</option>
                    <option value="2000-2199">2000-2199 (Yellow)</option>
                    <option value="2200-2399">2200-2399 (Yellow)</option>
                    <option value="2400-2599">2400-2599 (Orange)</option>
                    <option value="2600-2799">2600-2799 (Orange)</option>
                    <option value="2800-2999">2800-2999 (Red)</option>
                    <option value="3000-3199">3000-3199 (Red)</option>
                    <option value="3200+">3200+ (Gold)</option>
                    <option value="unrated">Unrated</option>
                  </optgroup>
                  <optgroup label="Standard Tiers (400 Interval)">
                    <option value="tier:gray">All Gray (&lt; 400)</option>
                    <option value="tier:brown">All Brown (400-799)</option>
                    <option value="tier:green">All Green (800-1199)</option>
                    <option value="tier:cyan">All Cyan (1200-1599)</option>
                    <option value="tier:blue">All Blue (1600-1999)</option>
                    <option value="tier:yellow">All Yellow (2000-2399)</option>
                    <option value="tier:orange">All Orange (2400-2799)</option>
                    <option value="tier:red">All Red (2800-3199)</option>
                    <option value="tier:gold">All Gold (3200+)</option>
                  </optgroup>
                </select>

                <select id="ac-solved-filter-task" class="ac-select">
                  <option value="all">All Tasks</option>
                  <option value="A">Task A</option>
                  <option value="B">Task B</option>
                  <option value="C">Task C</option>
                  <option value="D">Task D</option>
                  <option value="E">Task E</option>
                  <option value="F">Task F</option>
                  <option value="G">Task G</option>
                  <option value="Ex">Task Ex</option>
                  <option value="Other">Other</option>
                </select>

                <select id="ac-solved-sort-by" class="ac-select">
                  <option value="recent">Recently Solved First</option>
                  <option value="task-asc">Task: A to Ex</option>
                  <option value="task-desc">Task: Ex to A</option>
                  <option value="diff-desc">Difficulty: High to Low</option>
                  <option value="diff-asc">Difficulty: Low to High</option>
                  <option value="oldest">Oldest Solved First</option>
                </select>
              </div>
            </div>
            <div id="ac-solved-list" class="ac-problem-grid"></div>
            <div id="ac-solved-pagination"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Tab switching
    const tabBtns = this.container.querySelectorAll('.ac-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        this.container.querySelectorAll('.ac-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        this.activeTab = tabId;
        const panel = this.container.querySelector(`#ac-tab-${tabId}`);
        if (panel) panel.classList.add('active');

        // Always re-render active tab content
        if (tabId === 'unsolved') {
          // Reset filters to show all unsolved problems by default
          this.unsolvedPage = 1;
          this.filterDifficulty = 'all';
          this.filterContest = 'all';
          this.filterTask = 'all';
          this.searchTerm = '';
          const diffSelect = this.container.querySelector('#ac-filter-diff');
          const contestSelect = this.container.querySelector('#ac-filter-contest');
          const taskSelect = this.container.querySelector('#ac-filter-task');
          const searchInput = this.container.querySelector('#ac-unsolved-search');
          if (diffSelect) diffSelect.value = 'all';
          if (contestSelect) contestSelect.value = 'all';
          if (taskSelect) taskSelect.value = 'all';
          if (searchInput) searchInput.value = '';
          this.renderUnsolvedList();
        } else if (tabId === 'solved') {
          this.solvedPage = 1;
          this.renderSolvedList();
        } else if (tabId === 'recommendations') {
          this.recommendationsPage = 1;
          this.renderRecommendations();
        } else if (tabId === 'charts') {
          this.scrollHeatmapToRight();
        }
      });
    });

    // Sync button
    const syncBtn = this.container.querySelector('#ac-sync-btn');
    syncBtn.addEventListener('click', () => this.refreshData(true));

    // Theme toggle
    const themeBtn = this.container.querySelector('#ac-theme-toggle');
    const root = this.container.querySelector('#atcoder-pulse-root');
    themeBtn.addEventListener('click', () => {
      const isDark = root.classList.contains('ac-pulse-theme-dark');
      if (isDark) {
        root.classList.remove('ac-pulse-theme-dark');
        root.classList.add('ac-pulse-theme-light');
        themeBtn.querySelector('#ac-theme-icon').textContent = '☀️';
      } else {
        root.classList.remove('ac-pulse-theme-light');
        root.classList.add('ac-pulse-theme-dark');
        themeBtn.querySelector('#ac-theme-icon').textContent = '🌙';
      }
    });

    // Filters for unsolved
    const unsolvedSearch = this.container.querySelector('#ac-unsolved-search');
    unsolvedSearch.addEventListener('input', (e) => {
      this.unsolvedPage = 1;
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.renderUnsolvedList();
    });

    const diffSelect = this.container.querySelector('#ac-filter-diff');
    diffSelect.addEventListener('change', (e) => {
      this.unsolvedPage = 1;
      this.filterDifficulty = e.target.value;
      this.renderUnsolvedList();
    });

    const taskSelect = this.container.querySelector('#ac-filter-task');
    if (taskSelect) {
      taskSelect.addEventListener('change', (e) => {
        this.unsolvedPage = 1;
        this.filterTask = e.target.value;
        this.renderUnsolvedList();
      });
    }

    const contestSelect = this.container.querySelector('#ac-filter-contest');
    contestSelect.addEventListener('change', (e) => {
      this.unsolvedPage = 1;
      this.filterContest = e.target.value;
      this.renderUnsolvedList();
    });

    const sortSelect = this.container.querySelector('#ac-sort-by');
    sortSelect.addEventListener('change', (e) => {
      this.unsolvedPage = 1;
      this.sortBy = e.target.value;
      this.renderUnsolvedList();
    });

    // Solved list search/filter/sort
    const solvedSearch = this.container.querySelector('#ac-solved-search');
    const solvedDiff = this.container.querySelector('#ac-solved-filter-diff');
    const solvedTask = this.container.querySelector('#ac-solved-filter-task');
    const solvedSort = this.container.querySelector('#ac-solved-sort-by');
    if (solvedSearch) solvedSearch.addEventListener('input', () => {
      this.solvedPage = 1;
      this.renderSolvedList();
    });
    if (solvedDiff) solvedDiff.addEventListener('change', () => {
      this.solvedPage = 1;
      this.renderSolvedList();
    });
    if (solvedTask) solvedTask.addEventListener('change', () => {
      this.solvedPage = 1;
      this.renderSolvedList();
    });
    if (solvedSort) solvedSort.addEventListener('change', () => {
      this.solvedPage = 1;
      this.renderSolvedList();
    });

    // Listen for live submission updates captured while solving problems
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'NEW_SUBMISSION_RECORDED') {
          this._renderFromCache();
        }
      });
    }
  }

  async loadInitialData() {
    this.renderShell();
    // Step 1: Instant render from IndexedDB cache (zero network)
    await this._renderFromCache();
    // Step 2: Background incremental sync
    this.refreshData(false);
  }

  async _renderFromCache() {
    try {
      const [cachedData, models, problems] = await Promise.all([
        AtCoderDB.getUserData(this.userId),
        AtCoderAPI.getProblemModels(false),
        AtCoderAPI.getProblems(false)
      ]);

      if (cachedData && cachedData.submissions && cachedData.submissions.length > 0) {
        this.data = AtCoderAnalyzer.analyze(cachedData.submissions, models, problems);
        this.problemsMap = problems;
        this.renderMetrics();
        this.renderCharts();
        this.renderUnsolvedList();
        this.renderRecommendations();
        this.renderSolvedList();

        const syncText = this.container.querySelector('#ac-last-sync-text');
        if (syncText && cachedData.lastUpdated) {
          syncText.textContent = `Cached: ${new Date(cachedData.lastUpdated).toLocaleTimeString()}`;
        }
      }
    } catch (err) {
      console.warn('Cache render skipped:', err);
    }
  }

  async refreshData(forceFetch = false) {
    const syncIcon = this.container.querySelector('#ac-sync-icon');
    const syncLabel = this.container.querySelector('#ac-sync-label');
    const progressBar = this.container.querySelector('#ac-sync-progress');
    const progressFill = this.container.querySelector('#ac-sync-progress-fill');
    const progressText = this.container.querySelector('#ac-sync-progress-text');

    if (syncIcon) syncIcon.classList.add('ac-spin');
    if (syncLabel) syncLabel.textContent = 'Syncing...';
    if (progressBar) progressBar.style.display = 'block';
    if (progressFill) progressFill.style.width = '20%';

    try {
      // 1. Always use 24h-TTL cached meta — fast and reliable
      const [models, problems] = await Promise.all([
        AtCoderAPI.getProblemModels(false),
        AtCoderAPI.getProblems(false)
      ]);

      if (progressFill) progressFill.style.width = '50%';

      // 2. Fetch incremental submissions from Kenkoooo
      const subResult = await AtCoderAPI.getUserSubmissions(this.userId, (prog) => {
        if (progressText && progressFill) {
          progressText.textContent = `Syncing submissions (${prog.fetchedCount} loaded)...`;
          progressFill.style.width = '75%';
        }
      }, forceFetch);

      if (progressFill) progressFill.style.width = '95%';

      // 3. Analyze & render UI
      this.data = AtCoderAnalyzer.analyze(subResult.submissions, models, problems);
      this.problemsMap = problems;
      this.renderMetrics();
      this.renderCharts();
      this.renderUnsolvedList();
      this.renderRecommendations();
      this.renderSolvedList();

      if (progressFill) progressFill.style.width = '100%';

      // 4. Status message
      const syncText = this.container.querySelector('#ac-last-sync-text');
      if (syncText) {
        const t = new Date().toLocaleTimeString();
        syncText.textContent = subResult.newlyFetched > 0
          ? `✅ +${subResult.newlyFetched} new — ${t}`
          : `Up to date — ${t}`;
      }

    } catch (err) {
      console.error('Pulse refresh failed:', err);
      const syncText = this.container.querySelector('#ac-last-sync-text');
      if (syncText) syncText.textContent = 'Sync error. Check connection.';
    } finally {
      if (syncIcon) syncIcon.classList.remove('ac-spin');
      if (syncLabel) syncLabel.textContent = 'Sync Now';
      if (progressBar) {
        setTimeout(() => { progressBar.style.display = 'none'; }, 600);
      }
    }
  }

  renderMetrics() {
    if (!this.data) return;
    const m = this.data;

    // Update unsolved badge on the tab header
    const unsolvedBadge = this.container.querySelector('#ac-unsolved-badge');
    if (unsolvedBadge) {
      unsolvedBadge.textContent = m.unsolvedCount;
    }

    // Update First-Try AC pill in the brand header
    const accPill = this.container.querySelector('#ac-header-accuracy');
    if (accPill) {
      accPill.style.display = 'flex';
      accPill.innerHTML = `
        <span class="glyphicon glyphicon-ok-sign" style="color: #10b981;"></span>
        <span>First-Try AC: <b>${m.firstTryRate}%</b></span>
      `;
      accPill.title = `${m.firstTryCount} of ${m.uniqueSolvedCount} problems solved on 1st submission (${m.solveRate}% solve rate)`;
    }
  }

  renderCharts() {
    if (!this.data) return;

    // 1. Row 1: Codeforces Activity Heatmap & Streaks (Month-wise like GitHub)
    try {
      const cfContainer = this.container.querySelector('#ac-cf-activity-container');
      if (cfContainer && this.data.cfActivity) {
        AtCoderCharts.renderCodeforcesActivityWidget(cfContainer, this.data.cfActivity);
      }
    } catch (err) {
      console.warn('Heatmap render error:', err);
    }

    // 2. Row 2: Difficulty Chart (200 Rating Intervals)
    try {
      const diffContainer = this.container.querySelector('#ac-diff-chart-container');
      const bucketCounts = (this.data.difficulty && this.data.difficulty.bucketCounts)
        ? this.data.difficulty.bucketCounts
        : this.data.difficulty.counts;

      AtCoderCharts.renderDifficultyChart(
        diffContainer,
        bucketCounts,
        this.data.uniqueSolvedCount,
        (bucket) => {
          this.solvedPage = 1;
          const solvedTabBtn = this.container.querySelector('[data-tab="solved"]');
          const solvedDiffSelect = this.container.querySelector('#ac-solved-filter-diff');
          const bucketKey = bucket ? (bucket.key || bucket) : 'all';
          if (solvedDiffSelect) solvedDiffSelect.value = bucketKey;
          if (solvedTabBtn) solvedTabBtn.click();
          this.renderSolvedList();
        }
      );
    } catch (err) {
      console.warn('Difficulty chart error:', err);
    }

    // 3. Row 3: Task Index Breakdown
    try {
      const taskContainer = this.container.querySelector('#ac-task-chart-container');
      if (taskContainer && this.data.taskIndices) {
        AtCoderCharts.renderTaskIndexChart(taskContainer, this.data.taskIndices, (taskKey) => {
          this.solvedPage = 1;
          const solvedTabBtn = this.container.querySelector('[data-tab="solved"]');
          const solvedTaskSelect = this.container.querySelector('#ac-solved-filter-task');
          if (solvedTaskSelect) solvedTaskSelect.value = taskKey;
          if (solvedTabBtn) solvedTabBtn.click();
          this.renderSolvedList();
        });
      }
    } catch (err) {
      console.warn('Task chart error:', err);
    }

    // 4. Row 3: Verdicts Segment
    try {
      const verdictContainer = this.container.querySelector('#ac-verdict-container');
      if (verdictContainer && this.data.verdicts) {
        AtCoderCharts.renderVerdictBar(verdictContainer, this.data.verdicts, this.data.totalSubmissions);
      }
    } catch (err) {
      console.warn('Verdict bar error:', err);
    }

    // 5. Row 3: Languages
    try {
      const langContainer = this.container.querySelector('#ac-lang-container');
      if (langContainer && this.data.languages) {
        AtCoderCharts.renderLanguageBars(langContainer, this.data.languages);
      }
    } catch (err) {
      console.warn('Language bars error:', err);
    }

    // Scroll heatmap to right so recent activity is immediately visible
    this.scrollHeatmapToRight();
  }

  scrollHeatmapToRight() {
    const scrollEl = this.container.querySelector('.ac-cf-heatmap-scroll');
    if (!scrollEl) return;
    const doScroll = () => {
      scrollEl.scrollLeft = scrollEl.scrollWidth;
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 50);
    setTimeout(doScroll, 200);
  }

  renderUnsolvedList() {
    if (!this.data) return;
    const container = this.container.querySelector('#ac-unsolved-list');
    if (!container) return;
    let list = Array.isArray(this.data.unsolvedProblems) ? [...this.data.unsolvedProblems] : [];

    // Filter by Difficulty
    if (this.filterDifficulty && this.filterDifficulty !== 'all') {
      list = list.filter(p => p.tier && p.tier.key === this.filterDifficulty);
    }

    // Filter by Task
    if (this.filterTask && this.filterTask !== 'all') {
      list = list.filter(p => p.taskIndex === this.filterTask);
    }

    // Filter by Contest
    if (this.filterContest && this.filterContest !== 'all') {
      list = list.filter(p => p.contestType === this.filterContest);
    }

    // Filter by Search
    if (this.searchTerm) {
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(this.searchTerm)) ||
        (p.id && p.id.toLowerCase().includes(this.searchTerm)) ||
        (p.contestId && p.contestId.toLowerCase().includes(this.searchTerm)) ||
        (p.taskIndex && p.taskIndex.toLowerCase() === this.searchTerm)
      );
    }

    const getTaskRank = (task) => {
      const map = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'EX': 8, 'Ex': 8 };
      const t = (task || '').toUpperCase();
      return map[t] !== undefined ? map[t] : 99;
    };

    // Sort
    if (this.sortBy === 'attempts') {
      list.sort((a, b) => b.attemptsCount - a.attemptsCount);
    } else if (this.sortBy === 'task-asc') {
      list.sort((a, b) => {
        const rankDiff = getTaskRank(a.taskIndex) - getTaskRank(b.taskIndex);
        if (rankDiff !== 0) return rankDiff;
        return (b.lastAttemptEpoch || 0) - (a.lastAttemptEpoch || 0);
      });
    } else if (this.sortBy === 'task-desc') {
      list.sort((a, b) => {
        const rankDiff = getTaskRank(b.taskIndex) - getTaskRank(a.taskIndex);
        if (rankDiff !== 0) return rankDiff;
        return (b.lastAttemptEpoch || 0) - (a.lastAttemptEpoch || 0);
      });
    } else if (this.sortBy === 'diff-desc') {
      list.sort((a, b) => (b.difficulty !== null && b.difficulty !== undefined ? b.difficulty : -9999) - (a.difficulty !== null && a.difficulty !== undefined ? a.difficulty : -9999));
    } else if (this.sortBy === 'diff-asc') {
      list.sort((a, b) => (a.difficulty !== null && a.difficulty !== undefined ? a.difficulty : 9999) - (b.difficulty !== null && b.difficulty !== undefined ? b.difficulty : 9999));
    } else if (this.sortBy === 'recent') {
      list.sort((a, b) => (b.lastAttemptEpoch || 0) - (a.lastAttemptEpoch || 0));
    }

    if (list.length === 0) {
      const paginationContainer = this.container.querySelector('#ac-unsolved-pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
      const isFiltered = (this.filterDifficulty && this.filterDifficulty !== 'all') || (this.filterTask && this.filterTask !== 'all') || (this.filterContest && this.filterContest !== 'all') || this.searchTerm;
      container.innerHTML = `
        <div class="ac-empty-state">
          <div class="ac-empty-icon">${isFiltered ? '🔍' : '🎉'}</div>
          <div class="ac-empty-text">${isFiltered ? 'No unsolved problems match your current filters.' : 'No unsolved problems found! You have solved all attempted problems.'}</div>
          <div class="ac-empty-sub">
            ${isFiltered ? '<button id="ac-reset-filters-btn" class="ac-btn ac-btn-primary" style="margin-top:10px;">Reset Filters</button>' : 'Great job! Keep practicing to maintain your streak.'}
          </div>
        </div>
      `;
      const resetBtn = container.querySelector('#ac-reset-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.unsolvedPage = 1;
          this.filterDifficulty = 'all';
          this.filterContest = 'all';
          this.filterTask = 'all';
          this.searchTerm = '';
          const dSel = this.container.querySelector('#ac-filter-diff');
          const cSel = this.container.querySelector('#ac-filter-contest');
          const tSel = this.container.querySelector('#ac-filter-task');
          const sInp = this.container.querySelector('#ac-unsolved-search');
          if (dSel) dSel.value = 'all';
          if (cSel) cSel.value = 'all';
          if (tSel) tSel.value = 'all';
          if (sInp) sInp.value = '';
          this.renderUnsolvedList();
        });
      }
      return;
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.unsolvedPage > totalPages) this.unsolvedPage = 1;

    const startIdx = (this.unsolvedPage - 1) * this.pageSize;
    const pagedList = list.slice(startIdx, startIdx + this.pageSize);

    container.innerHTML = pagedList.map(p => this.generateProblemCard(p, true)).join('');

    const paginationContainer = this.container.querySelector('#ac-unsolved-pagination');
    this.renderPagination(paginationContainer, totalItems, this.unsolvedPage, this.pageSize, (newPage) => {
      this.unsolvedPage = newPage;
      this.renderUnsolvedList();
      const toolbar = this.container.querySelector('#ac-tab-unsolved .ac-filter-toolbar') || container;
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  renderRecommendations() {
    if (!this.data) return;
    const container = this.container.querySelector('#ac-recommendations-list');
    const paginationContainer = this.container.querySelector('#ac-recommendations-pagination');
    const recs = this.data.recommendations || [];

    if (recs.length === 0) {
      container.innerHTML = `<div class="ac-empty-state">No recommendations at this time.</div>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalItems = recs.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.recommendationsPage > totalPages) this.recommendationsPage = 1;

    const startIdx = (this.recommendationsPage - 1) * this.pageSize;
    const pagedList = recs.slice(startIdx, startIdx + this.pageSize);

    container.innerHTML = pagedList.map(p => {
      const cardHtml = this.generateProblemCard(p, false);
      return `
        <div class="ac-rec-card-wrap">
          <div class="ac-rec-tag">💡 ${p.reason || 'Practice Match'}</div>
          ${cardHtml}
        </div>
      `;
    }).join('');

    this.renderPagination(paginationContainer, totalItems, this.recommendationsPage, this.pageSize, (newPage) => {
      this.recommendationsPage = newPage;
      this.renderRecommendations();
      const header = this.container.querySelector('#ac-tab-recommendations .ac-recommend-header') || container;
      header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  renderSolvedList() {
    if (!this.data) return;
    const container = this.container.querySelector('#ac-solved-list');
    if (!container) return;
    const searchVal = (this.container.querySelector('#ac-solved-search')?.value || '').toLowerCase().trim();
    const diffVal = this.container.querySelector('#ac-solved-filter-diff')?.value || 'all';
    const taskVal = this.container.querySelector('#ac-solved-filter-task')?.value || 'all';
    const sortVal = this.container.querySelector('#ac-solved-sort-by')?.value || 'recent';

    let list = Array.isArray(this.data.solvedProblems) ? [...this.data.solvedProblems] : [];

    // Filter by difficulty (200-intervals or full tiers)
    if (diffVal && diffVal !== 'all') {
      if (diffVal.startsWith('tier:')) {
        const tierKey = diffVal.slice(5);
        list = list.filter(p => p.tier && p.tier.key === tierKey);
      } else {
        list = list.filter(p =>
          (p.bucket200 && p.bucket200.key === diffVal) ||
          (p.tier && p.tier.key === diffVal)
        );
      }
    }

    // Filter by Task
    if (taskVal && taskVal !== 'all') {
      list = list.filter(p => p.taskIndex === taskVal);
    }

    // Filter by search
    if (searchVal) {
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(searchVal)) ||
        (p.id && p.id.toLowerCase().includes(searchVal)) ||
        (p.contestId && p.contestId.toLowerCase().includes(searchVal)) ||
        (p.taskIndex && p.taskIndex.toLowerCase() === searchVal)
      );
    }

    const getTaskRank = (task) => {
      const map = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'EX': 8, 'Ex': 8 };
      const t = (task || '').toUpperCase();
      return map[t] !== undefined ? map[t] : 99;
    };

    // Sort: Default is recently solved first (last solve date)
    if (sortVal === 'recent') {
      list.sort((a, b) => (b.solvedEpoch || 0) - (a.solvedEpoch || 0));
    } else if (sortVal === 'task-asc') {
      list.sort((a, b) => {
        const rankDiff = getTaskRank(a.taskIndex) - getTaskRank(b.taskIndex);
        if (rankDiff !== 0) return rankDiff;
        return (b.solvedEpoch || 0) - (a.solvedEpoch || 0);
      });
    } else if (sortVal === 'task-desc') {
      list.sort((a, b) => {
        const rankDiff = getTaskRank(b.taskIndex) - getTaskRank(a.taskIndex);
        if (rankDiff !== 0) return rankDiff;
        return (b.solvedEpoch || 0) - (a.solvedEpoch || 0);
      });
    } else if (sortVal === 'oldest') {
      list.sort((a, b) => (a.solvedEpoch || 0) - (b.solvedEpoch || 0));
    } else if (sortVal === 'diff-desc') {
      list.sort((a, b) => (b.difficulty !== null && b.difficulty !== undefined ? b.difficulty : -9999) - (a.difficulty !== null && a.difficulty !== undefined ? a.difficulty : -9999));
    } else if (sortVal === 'diff-asc') {
      list.sort((a, b) => (a.difficulty !== null && a.difficulty !== undefined ? a.difficulty : 9999) - (b.difficulty !== null && b.difficulty !== undefined ? b.difficulty : 9999));
    }

    const paginationContainer = this.container.querySelector('#ac-solved-pagination');

    if (list.length === 0) {
      container.innerHTML = `<div class="ac-empty-state">No solved problems match your filters.</div>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.solvedPage > totalPages) this.solvedPage = 1;

    const startIdx = (this.solvedPage - 1) * this.pageSize;
    const pagedList = list.slice(startIdx, startIdx + this.pageSize);

    container.innerHTML = pagedList.map(p => this.generateSolvedCard(p)).join('');

    this.renderPagination(paginationContainer, totalItems, this.solvedPage, this.pageSize, (newPage) => {
      this.solvedPage = newPage;
      this.renderSolvedList();
      const toolbar = this.container.querySelector('#ac-tab-solved .ac-filter-toolbar') || container;
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  renderPagination(paginationContainer, totalItems, currentPage, pageSize, onPageChange) {
    if (!paginationContainer) return;
    if (totalItems <= 0) {
      paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) {
      paginationContainer.innerHTML = `
        <div class="ac-pagination-wrap">
          <div class="ac-pagination-info">Showing all ${totalItems} problems</div>
        </div>
      `;
      return;
    }

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    let buttonsHtml = '';
    // Previous button
    buttonsHtml += `<button class="ac-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>« Prev</button>`;

    // Page numbers with ellipsis
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(totalPages, maxVisible);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - maxVisible + 1);
    }

    if (startPage > 1) {
      buttonsHtml += `<button class="ac-page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        buttonsHtml += `<span class="ac-page-dots">...</span>`;
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      buttonsHtml += `<button class="ac-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttonsHtml += `<span class="ac-page-dots">...</span>`;
      }
      buttonsHtml += `<button class="ac-page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    buttonsHtml += `<button class="ac-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next »</button>`;

    paginationContainer.innerHTML = `
      <div class="ac-pagination-wrap">
        <div class="ac-pagination-info">Showing ${startIdx}–${endIdx} of ${totalItems} problems (Page ${currentPage} of ${totalPages})</div>
        <div class="ac-pagination-controls">
          ${buttonsHtml}
        </div>
      </div>
    `;

    // Click handler for buttons
    const btns = paginationContainer.querySelectorAll('.ac-page-btn:not(:disabled):not(.active)');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages && p !== currentPage) {
          onPageChange(p);
        }
      });
    });
  }

  formatRelativeTime(epochSecond) {
    if (!epochSecond) return 'N/A';
    const now = Date.now();
    const diffSec = Math.floor((now - epochSecond * 1000) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
    return new Date(epochSecond * 1000).toLocaleDateString();
  }

  generateProblemCard(p, isUnsolved = true) {
    const diffBadge = AtCoderColors.getBadgeHtml(p.difficulty);
    const lastAttemptTime = this.formatRelativeTime(p.lastAttemptEpoch);

    let attemptsHtml = '';
    if (isUnsolved) {
      const vDetails = Object.entries(p.failedVerdicts || {})
        .map(([v, count]) => `${count}${v}`)
        .join(',');
      attemptsHtml = `<span class="ac-tile-attempts">❌ ${p.attemptsCount} <small>(${vDetails || p.lastVerdict})</small></span>`;
    }

    const contestTag = (p.contestId || '').toUpperCase();
    const taskIdx = p.taskIndex ? `-${p.taskIndex}` : '';

    return `
      <div class="ac-compact-tile" title="${p.title} (${contestTag}${taskIdx})">
        <div class="ac-tile-row1">
          <div class="ac-tile-left">
            ${diffBadge}
            <a href="${p.url}" target="_blank" class="ac-tile-title">${p.title}</a>
          </div>
          <a href="${p.url}" target="_blank" class="ac-tile-solve-btn">Solve ➔</a>
        </div>
        <div class="ac-tile-row2">
          ${attemptsHtml}
          <span class="ac-tile-sep">•</span>
          <span class="ac-tile-time"><span class="glyphicon glyphicon-time"></span> ${lastAttemptTime}</span>
          <span class="ac-tile-sep">•</span>
          <span class="ac-tile-contest">${contestTag}${taskIdx}</span>
        </div>
      </div>
    `;
  }

  generateSolvedCard(p) {
    const diffBadge = AtCoderColors.getBadgeHtml(p.difficulty);
    const solvedTime = this.formatRelativeTime(p.solvedEpoch);
    const exactDate = p.solvedEpoch ? new Date(p.solvedEpoch * 1000).toLocaleString() : '';
    const firstTry = p.attemptsBeforeAC === 0;
    const contestTag = (p.contestId || '').toUpperCase();
    const taskIdx = p.taskIndex ? `-${p.taskIndex}` : '';
    const linkUrl = p.url || `https://atcoder.jp/contests/${p.contestId}/tasks/${p.id}`;

    return `
      <div class="ac-compact-tile" title="${p.title} - Solved: ${exactDate}">
        <div class="ac-tile-row1">
          <div class="ac-tile-left">
            ${diffBadge}
            <a href="${linkUrl}" target="_blank" class="ac-tile-title">${p.title}</a>
          </div>
          <a href="${linkUrl}" target="_blank" class="ac-tile-solve-btn">Review ➔</a>
        </div>
        <div class="ac-tile-row2">
          <span class="ac-tile-status-tag ${firstTry ? 'text-success' : 'text-muted'}">
            ${firstTry ? '⚡ 1st Try AC' : `✔ AC (${p.attemptsBeforeAC + 1} tries)`}
          </span>
          <span class="ac-tile-sep">•</span>
          <span class="ac-tile-time" title="Solved: ${exactDate}"><span class="glyphicon glyphicon-ok text-success"></span> ${solvedTime}</span>
          <span class="ac-tile-sep">•</span>
          <span class="ac-tile-contest">${contestTag}${taskIdx}</span>
        </div>
      </div>
    `;
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderDashboard;
}

