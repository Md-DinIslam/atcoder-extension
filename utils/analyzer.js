/**
 * AtCoder Analytics Engine
 * Parses raw submission streams and problem models into deep CP insights.
 */

const AtCoderAnalyzer = {
  /**
   * Main analysis function
   * @param {Array} submissions - List of submission objects
   * @param {Object} problemModels - Map of problem_id -> { difficulty, ... }
   * @param {Object} problemsMap - Map of problem_id -> { id, contest_id, title, ... }
   */
  analyze(submissions, problemModels = {}, problemsMap = {}) {
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return this.getEmptyStats();
    }

    // Sort chronologically
    const subs = [...submissions].sort((a, b) => a.epoch_second - b.epoch_second);

    const problemSubmissions = new Map(); // problemId -> [submissions]
    const verdictsCount = {};
    const languageCount = {};
    const dailyACDates = new Set(); // 'YYYY-MM-DD'
    const dailyACCounts = {}; // 'YYYY-MM-DD' -> count
    const monthlySolves = {}; // 'YYYY-MM' -> count

    let totalSubmissions = subs.length;
    let totalACSubmissions = 0;

    for (const sub of subs) {
      const pid = sub.problem_id;
      if (!problemSubmissions.has(pid)) {
        problemSubmissions.set(pid, []);
      }
      problemSubmissions.get(pid).push(sub);

      // Verdict tally
      const v = (sub.result || 'OTHER').toUpperCase();
      verdictsCount[v] = (verdictsCount[v] || 0) + 1;
      if (v === 'AC') {
        totalACSubmissions++;
      }

      // Language tally (normalize compiler versions)
      const langFamily = this.normalizeLanguage(sub.language);
      languageCount[langFamily] = (languageCount[langFamily] || 0) + 1;
    }

    // Problem-level analysis
    const uniqueAttemptedCount = problemSubmissions.size;
    const solvedProblems = [];
    const unsolvedProblems = [];
    let firstTryACCount = 0;

    const diffTierCounts = {
      gray: 0, brown: 0, green: 0, cyan: 0,
      blue: 0, yellow: 0, orange: 0, red: 0,
      gold: 0, unknown: 0
    };

    const diffBucketCounts = {};
    if (AtCoderColors.BUCKETS_200) {
      AtCoderColors.BUCKETS_200.forEach(b => {
        diffBucketCounts[b.key] = 0;
      });
    }

    const contestTypeCounts = {
      abc: 0, arc: 0, agc: 0, ahc: 0, other: 0
    };

    const taskIndexCounts = {
      A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, Ex: 0, Other: 0
    };

    const solvedDifficulties = [];

    for (const [pid, pSubs] of problemSubmissions.entries()) {
      let isSolved = false;
      let firstACIndex = -1;
      let lastACIndex = -1;
      const failedVerdicts = {};

      for (let i = 0; i < pSubs.length; i++) {
        const sub = pSubs[i];
        if (sub.result === 'AC') {
          if (!isSolved) {
            isSolved = true;
            firstACIndex = i;
          }
          lastACIndex = i;
        } else {
          const v = sub.result || 'WA';
          failedVerdicts[v] = (failedVerdicts[v] || 0) + 1;
        }
      }

      const pMeta = problemsMap[pid] || {};
      const pModel = problemModels[pid] || {};
      const diff = (pModel.difficulty !== undefined && pModel.difficulty !== null)
        ? Math.round(pModel.difficulty)
        : null;
      const tier = AtCoderColors.getTier(diff);
      const bucket200 = AtCoderColors.getBucket200 ? AtCoderColors.getBucket200(diff) : { key: 'unrated' };

      // Derive canonical contest ID and task index
      let canonicalContest = pMeta.contest_id || (pSubs[0] ? pSubs[0].contest_id : '');
      let taskIndex = 'Other';

      const pidParts = pid.split('_');
      if (pidParts.length >= 2) {
        const prefix = pidParts[0].toLowerCase();
        if (['abc', 'arc', 'agc', 'ahc', 'dp', 'past'].some(p => prefix.startsWith(p))) {
          canonicalContest = prefix;
        }
        const suffix = pidParts[pidParts.length - 1].toUpperCase();
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(suffix)) {
          taskIndex = suffix;
        } else if (suffix === 'EX' || suffix === 'H') {
          taskIndex = 'Ex';
        }
      }

      if (taskIndex === 'Other' && pMeta.problem_index) {
        taskIndex = this.normalizeTaskIndex(pMeta.problem_index, pid);
      }

      const contestType = this.categorizeContest(canonicalContest);
      const problemName = pMeta.name || pMeta.title || pid;
      const title = `${taskIndex}. ${problemName}`;
      const problemUrl = `https://atcoder.jp/contests/${canonicalContest}/tasks/${pid}`;

      if (isSolved) {
        // Solved
        if (firstACIndex === 0) {
          firstTryACCount++;
        }

        const solveDateStr = this.formatLocalDate(pSubs[firstACIndex].epoch_second * 1000);
        dailyACDates.add(solveDateStr);
        dailyACCounts[solveDateStr] = (dailyACCounts[solveDateStr] || 0) + 1;
        const monthKey = solveDateStr.slice(0, 7);
        monthlySolves[monthKey] = (monthlySolves[monthKey] || 0) + 1;

        diffTierCounts[tier.key] = (diffTierCounts[tier.key] || 0) + 1;
        diffBucketCounts[bucket200.key] = (diffBucketCounts[bucket200.key] || 0) + 1;
        contestTypeCounts[contestType] = (contestTypeCounts[contestType] || 0) + 1;
        taskIndexCounts[taskIndex] = (taskIndexCounts[taskIndex] || 0) + 1;

        if (diff !== null) {
          solvedDifficulties.push(diff);
        }

        const effectiveACIndex = lastACIndex >= 0 ? lastACIndex : firstACIndex;
        solvedProblems.push({
          id: pid,
          contestId: canonicalContest,
          title,
          difficulty: diff,
          tier,
          bucket200,
          contestType,
          taskIndex,
          solvedEpoch: pSubs[effectiveACIndex].epoch_second,
          firstSolvedEpoch: pSubs[firstACIndex].epoch_second,
          attemptsBeforeAC: firstACIndex,
          url: problemUrl
        });
      } else {
        // Unsolved (Attempted, but no AC)
        const lastSub = pSubs[pSubs.length - 1];
        unsolvedProblems.push({
          id: pid,
          contestId: canonicalContest,
          title,
          difficulty: diff,
          tier,
          bucket200,
          contestType,
          taskIndex,
          attemptsCount: pSubs.length,
          failedVerdicts,
          firstAttemptEpoch: pSubs[0].epoch_second,
          lastAttemptEpoch: lastSub.epoch_second,
          lastVerdict: lastSub.result || 'WA',
          url: problemUrl
        });
      }
    }

    // Sort solved problems by last solve date (most recently solved first)
    solvedProblems.sort((a, b) => (b.solvedEpoch || 0) - (a.solvedEpoch || 0));

    // Sort unsolved by attempts desc by default
    unsolvedProblems.sort((a, b) => b.attemptsCount - a.attemptsCount);

    // Streaks calculation
    const streakStats = this.calculateStreaks(dailyACDates);

    // Codeforces-style Activity
    const cfActivity = this.calculateCodeforcesActivity(solvedProblems, dailyACDates, dailyACCounts);

    // Difficulty stats
    solvedDifficulties.sort((a, b) => a - b);
    const maxDiff = solvedDifficulties.length > 0 ? solvedDifficulties[solvedDifficulties.length - 1] : null;
    const minDiff = solvedDifficulties.length > 0 ? solvedDifficulties[0] : null;
    const avgDiff = solvedDifficulties.length > 0
      ? Math.round(solvedDifficulties.reduce((a, b) => a + b, 0) / solvedDifficulties.length)
      : null;
    const medianDiff = solvedDifficulties.length > 0
      ? solvedDifficulties[Math.floor(solvedDifficulties.length / 2)]
      : null;

    // Recommendation logic
    const recommendations = this.generateRecommendations(solvedProblems, unsolvedProblems, problemModels, problemsMap, medianDiff || 800);

    return {
      totalSubmissions,
      totalACSubmissions,
      uniqueAttemptedCount,
      uniqueSolvedCount: solvedProblems.length,
      unsolvedCount: unsolvedProblems.length,
      acRate: totalSubmissions > 0 ? ((totalACSubmissions / totalSubmissions) * 100).toFixed(1) : 0,
      solveRate: uniqueAttemptedCount > 0 ? ((solvedProblems.length / uniqueAttemptedCount) * 100).toFixed(1) : 0,
      firstTryCount: firstTryACCount,
      firstTryRate: solvedProblems.length > 0 ? ((firstTryACCount / solvedProblems.length) * 100).toFixed(1) : 0,
      streak: streakStats,
      cfActivity,
      difficulty: {
        counts: diffTierCounts,
        bucketCounts: diffBucketCounts,
        min: minDiff,
        max: maxDiff,
        avg: avgDiff,
        median: medianDiff
      },
      contestTypes: contestTypeCounts,
      taskIndices: taskIndexCounts,
      verdicts: verdictsCount,
      languages: languageCount,
      monthlySolves,
      unsolvedProblems,
      solvedProblems,
      recommendations
    };
  },

  formatLocalDate(epochMsOrDate) {
    const d = (typeof epochMsOrDate === 'number') ? new Date(epochMsOrDate) : epochMsOrDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  calculateStreaks(dailyACDatesSet) {
    if (dailyACDatesSet.size === 0) {
      return { current: 0, longest: 0, totalDaysActive: 0 };
    }

    const sortedDates = Array.from(dailyACDatesSet).sort();
    let maxStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const pParts = sortedDates[i - 1].split('-').map(Number);
      const cParts = sortedDates[i].split('-').map(Number);
      const prev = new Date(pParts[0], pParts[1] - 1, pParts[2]);
      const curr = new Date(cParts[0], cParts[1] - 1, cParts[2]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }

    // Current streak (checking if today or yesterday in local time was active)
    const now = new Date();
    const todayStr = this.formatLocalDate(now);
    const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = this.formatLocalDate(yDate);

    let currentStreak = 0;
    if (dailyACDatesSet.has(todayStr) || dailyACDatesSet.has(yesterdayStr)) {
      let checkDate = dailyACDatesSet.has(todayStr)
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

      while (true) {
        const dStr = this.formatLocalDate(checkDate);
        if (dailyACDatesSet.has(dStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      current: currentStreak,
      longest: Math.max(maxStreak, currentStreak),
      totalDaysActive: dailyACDatesSet.size
    };
  },

  calculateCodeforcesActivity(solvedProblems, dailyACDatesSet, dailyACCounts) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();

    let yearSolved = 0;
    let monthSolved = 0;

    for (const p of solvedProblems) {
      const epoch = p.firstSolvedEpoch || p.solvedEpoch;
      if (epoch) {
        const ms = epoch * 1000;
        if (ms >= oneYearAgo) yearSolved++;
        if (ms >= oneMonthAgo) monthSolved++;
      }
    }

    const streaks = this.calculateStreaks(dailyACDatesSet);

    // Calculate max streak in last year
    const sortedDates = Array.from(dailyACDatesSet).sort();
    let yearMaxStreak = 0;
    let tempYearStreak = 0;
    let prevYearDate = null;

    for (const dStr of sortedDates) {
      const parts = dStr.split('-').map(Number);
      const dTime = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      if (dTime >= oneYearAgo) {
        if (!prevYearDate) {
          tempYearStreak = 1;
        } else {
          const diffDays = Math.round((dTime - prevYearDate) / 86400000);
          if (diffDays === 1) {
            tempYearStreak++;
          } else if (diffDays > 1) {
            tempYearStreak = 1;
          }
        }
        if (tempYearStreak > yearMaxStreak) yearMaxStreak = tempYearStreak;
        prevYearDate = dTime;
      }
    }

    // Calculate max streak in last month
    let monthMaxStreak = 0;
    let tempMonthStreak = 0;
    let prevMonthDate = null;

    for (const dStr of sortedDates) {
      const parts = dStr.split('-').map(Number);
      const dTime = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      if (dTime >= oneMonthAgo) {
        if (!prevMonthDate) {
          tempMonthStreak = 1;
        } else {
          const diffDays = Math.round((dTime - prevMonthDate) / 86400000);
          if (diffDays === 1) {
            tempMonthStreak++;
          } else if (diffDays > 1) {
            tempMonthStreak = 1;
          }
        }
        if (tempMonthStreak > monthMaxStreak) monthMaxStreak = tempMonthStreak;
        prevMonthDate = dTime;
      }
    }

    return {
      allTimeSolved: solvedProblems.length,
      yearSolved,
      monthSolved,
      allTimeMaxStreak: streaks.longest,
      yearMaxStreak: yearMaxStreak || (streaks.longest > 0 ? Math.min(streaks.longest, 365) : 0),
      monthMaxStreak: monthMaxStreak || (streaks.current > 0 ? streaks.current : 0),
      currentStreak: streaks.current,
      dailyACCounts: dailyACCounts || {}
    };
  },

  categorizeContest(contestId) {
    if (!contestId) return 'other';
    const c = contestId.toLowerCase();
    if (c.startsWith('abc')) return 'abc';
    if (c.startsWith('arc')) return 'arc';
    if (c.startsWith('agc')) return 'agc';
    if (c.startsWith('ahc')) return 'ahc';
    return 'other';
  },

  normalizeTaskIndex(problemIndex, problemId) {
    if (problemIndex) {
      const idx = problemIndex.toUpperCase().trim();
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(idx)) return idx;
      if (idx === 'EX' || idx === 'H') return 'Ex';
      return 'Other';
    }
    // Fallback from problemId like "abc210_d"
    const match = (problemId || '').match(/_([a-z0-9]+)$/i);
    if (match) {
      const char = match[1].toUpperCase();
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(char)) return char;
      if (char === 'EX' || char === 'H') return 'Ex';
    }
    return 'Other';
  },

  normalizeLanguage(langStr) {
    if (!langStr) return 'Other';
    const l = langStr.toLowerCase();
    if (l.includes('c++') || l.includes('gcc') || l.includes('clang')) return 'C++';
    if (l.includes('pypy')) return 'PyPy';
    if (l.includes('python')) return 'Python';
    if (l.includes('rust')) return 'Rust';
    if (l.includes('java')) return 'Java';
    if (l.includes('golang') || l.includes('go (')) return 'Go';
    if (l.includes('kotlin')) return 'Kotlin';
    if (l.includes('c#') || l.includes('csharp')) return 'C#';
    if (l.includes('c (')) return 'C';
    if (l.includes('javascript') || l.includes('node') || l.includes('typescript')) return 'JS / TS';
    if (l.includes('ruby')) return 'Ruby';
    return 'Other';
  },

  generateRecommendations(solvedProblems, unsolvedProblems, problemModels, problemsMap, targetRating) {
    const solvedSet = new Set(solvedProblems.map(p => p.id));
    const recommendations = [];

    // 1. Prioritize closest unsolved problem in practice range
    const targetMin = Math.max(0, targetRating - 200);
    const targetMax = targetRating + 300;

    for (const u of unsolvedProblems) {
      if (u.difficulty !== null && u.difficulty >= targetMin && u.difficulty <= targetMax) {
        recommendations.push({
          ...u,
          reason: 'Unfinished Practice (Re-attempt)'
        });
        if (recommendations.length >= 3) break;
      }
    }

    // 2. Add high-value rated problems from recent ABCs
    if (recommendations.length < 5) {
      for (const [pid, pMeta] of Object.entries(problemsMap)) {
        if (solvedSet.has(pid)) continue;
        if (recommendations.some(r => r.id === pid)) continue;

        const model = problemModels[pid];
        if (!model || model.difficulty === null || model.difficulty === undefined) continue;

        const d = Math.round(model.difficulty);
        if (d >= targetMin && d <= targetMax) {
          const contestId = pMeta.contest_id || '';
          if (contestId.startsWith('abc') || contestId.startsWith('arc')) {
            recommendations.push({
              id: pid,
              contestId,
              title: pMeta.title || pid,
              difficulty: d,
              tier: AtCoderColors.getTier(d),
              contestType: this.categorizeContest(contestId),
              taskIndex: this.normalizeTaskIndex(pMeta.problem_index, pid),
              reason: `Target Rating Match (${d})`,
              url: `https://atcoder.jp/contests/${contestId}/tasks/${pid}`
            });
            if (recommendations.length >= 5) break;
          }
        }
      }
    }

    return recommendations;
  },

  getEmptyStats() {
    return {
      totalSubmissions: 0,
      totalACSubmissions: 0,
      uniqueAttemptedCount: 0,
      uniqueSolvedCount: 0,
      unsolvedCount: 0,
      acRate: 0,
      solveRate: 0,
      firstTryCount: 0,
      firstTryRate: 0,
      streak: { current: 0, longest: 0, totalDaysActive: 0 },
      cfActivity: { allTimeSolved: 0, yearSolved: 0, monthSolved: 0, allTimeMaxStreak: 0, yearMaxStreak: 0, monthMaxStreak: 0, currentStreak: 0, dailyACCounts: {} },
      difficulty: { counts: {}, min: null, max: null, avg: null, median: null },
      contestTypes: {},
      taskIndices: {},
      verdicts: {},
      languages: {},
      monthlySolves: {},
      unsolvedProblems: [],
      solvedProblems: [],
      recommendations: []
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderAnalyzer;
}

