/**
 * AtCoder Color and Rating Utility
 * Provides standard colors, tier ranges, and formatting for difficulties.
 */

const AtCoderColors = {
  TIERS: [
    { key: 'gray', label: 'Gray', rangeLabel: '0-399', min: -Infinity, max: 399, color: '#808080', bg: 'rgba(128, 128, 128, 0.15)', border: '#808080' },
    { key: 'brown', label: 'Brown', rangeLabel: '400-799', min: 400, max: 799, color: '#804000', bg: 'rgba(128, 64, 0, 0.15)', border: '#804000' },
    { key: 'green', label: 'Green', rangeLabel: '800-1199', min: 800, max: 1199, color: '#008000', bg: 'rgba(0, 128, 0, 0.15)', border: '#008000' },
    { key: 'cyan', label: 'Cyan', rangeLabel: '1200-1599', min: 1200, max: 1599, color: '#00C0C0', bg: 'rgba(0, 192, 192, 0.15)', border: '#00C0C0' },
    { key: 'blue', label: 'Blue', rangeLabel: '1600-1999', min: 1600, max: 1999, color: '#0000FF', bg: 'rgba(0, 0, 255, 0.15)', border: '#0000FF' },
    { key: 'yellow', label: 'Yellow', rangeLabel: '2000-2399', min: 2000, max: 2399, color: '#C0C000', bg: 'rgba(192, 192, 0, 0.15)', border: '#C0C000' },
    { key: 'orange', label: 'Orange', rangeLabel: '2400-2799', min: 2400, max: 2799, color: '#FF8000', bg: 'rgba(255, 128, 0, 0.15)', border: '#FF8000' },
    { key: 'red', label: 'Red', rangeLabel: '2800-3199', min: 2800, max: 3199, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.15)', border: '#FF0000' },
    { key: 'gold', label: 'Gold', rangeLabel: '3200+', min: 3200, max: Infinity, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.2)', border: '#FFD700' },
    { key: 'unknown', label: 'Unrated', rangeLabel: 'Unrated', min: null, max: null, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', border: '#6b7280' }
  ],

  // 200 Rating Intervals for fine-grained distribution charts
  BUCKETS_200: [
    { key: '0-199', tierKey: 'gray', label: '0-199', subLabel: 'Gray', min: -Infinity, max: 199, color: '#808080', bg: 'rgba(128, 128, 128, 0.15)', border: '#808080' },
    { key: '200-399', tierKey: 'gray', label: '200-399', subLabel: 'Gray', min: 200, max: 399, color: '#808080', bg: 'rgba(128, 128, 128, 0.15)', border: '#808080' },
    { key: '400-599', tierKey: 'brown', label: '400-599', subLabel: 'Brown', min: 400, max: 599, color: '#804000', bg: 'rgba(128, 64, 0, 0.15)', border: '#804000' },
    { key: '600-799', tierKey: 'brown', label: '600-799', subLabel: 'Brown', min: 600, max: 799, color: '#804000', bg: 'rgba(128, 64, 0, 0.15)', border: '#804000' },
    { key: '800-999', tierKey: 'green', label: '800-999', subLabel: 'Green', min: 800, max: 999, color: '#008000', bg: 'rgba(0, 128, 0, 0.15)', border: '#008000' },
    { key: '1000-1199', tierKey: 'green', label: '1000-1199', subLabel: 'Green', min: 1000, max: 1199, color: '#008000', bg: 'rgba(0, 128, 0, 0.15)', border: '#008000' },
    { key: '1200-1399', tierKey: 'cyan', label: '1200-1399', subLabel: 'Cyan', min: 1200, max: 1399, color: '#00C0C0', bg: 'rgba(0, 192, 192, 0.15)', border: '#00C0C0' },
    { key: '1400-1599', tierKey: 'cyan', label: '1400-1599', subLabel: 'Cyan', min: 1400, max: 1599, color: '#00C0C0', bg: 'rgba(0, 192, 192, 0.15)', border: '#00C0C0' },
    { key: '1600-1799', tierKey: 'blue', label: '1600-1799', subLabel: 'Blue', min: 1600, max: 1799, color: '#0000FF', bg: 'rgba(0, 0, 255, 0.15)', border: '#0000FF' },
    { key: '1800-1999', tierKey: 'blue', label: '1800-1999', subLabel: 'Blue', min: 1800, max: 1999, color: '#0000FF', bg: 'rgba(0, 0, 255, 0.15)', border: '#0000FF' },
    { key: '2000-2199', tierKey: 'yellow', label: '2000-2199', subLabel: 'Yellow', min: 2000, max: 2199, color: '#C0C000', bg: 'rgba(192, 192, 0, 0.15)', border: '#C0C000' },
    { key: '2200-2399', tierKey: 'yellow', label: '2200-2399', subLabel: 'Yellow', min: 2200, max: 2399, color: '#C0C000', bg: 'rgba(192, 192, 0, 0.15)', border: '#C0C000' },
    { key: '2400-2599', tierKey: 'orange', label: '2400-2599', subLabel: 'Orange', min: 2400, max: 2599, color: '#FF8000', bg: 'rgba(255, 128, 0, 0.15)', border: '#FF8000' },
    { key: '2600-2799', tierKey: 'orange', label: '2600-2799', subLabel: 'Orange', min: 2600, max: 2799, color: '#FF8000', bg: 'rgba(255, 128, 0, 0.15)', border: '#FF8000' },
    { key: '2800-2999', tierKey: 'red', label: '2800-2999', subLabel: 'Red', min: 2800, max: 2999, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.15)', border: '#FF0000' },
    { key: '3000-3199', tierKey: 'red', label: '3000-3199', subLabel: 'Red', min: 3000, max: 3199, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.15)', border: '#FF0000' },
    { key: '3200+', tierKey: 'gold', label: '3200+', subLabel: 'Gold', min: 3200, max: Infinity, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.2)', border: '#FFD700' },
    { key: 'unrated', tierKey: 'unknown', label: 'Unrated', subLabel: 'Unrated', min: null, max: null, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', border: '#6b7280' }
  ],

  getBucket200(difficulty) {
    if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
      return this.BUCKETS_200[this.BUCKETS_200.length - 1]; // unrated
    }
    const d = Math.round(difficulty);
    for (const b of this.BUCKETS_200) {
      if (b.min !== null && d >= b.min && d <= b.max) {
        return b;
      }
    }
    return this.BUCKETS_200[this.BUCKETS_200.length - 1];
  },

  getTier(difficulty) {
    if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
      return this.TIERS[this.TIERS.length - 1]; // unknown (Unrated)
    }
    const d = Math.round(difficulty);
    for (const tier of this.TIERS) {
      if (tier.min !== null && d >= tier.min && d <= tier.max) {
        return tier;
      }
    }
    return this.TIERS[this.TIERS.length - 1];
  },

  getColor(difficulty) {
    return this.getTier(difficulty).color;
  },

  getBadgeHtml(difficulty) {
    if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
      return `<span class="ac-diff-badge ac-diff-unrated">Unrated</span>`;
    }
    const d = Math.round(difficulty);
    const tier = this.getTier(d);
    return `<span class="ac-diff-badge" style="background:${tier.bg}; color:${tier.color}; border: 1px solid ${tier.border};">${d}</span>`;
  },

  getVerdictBadgeHtml(verdict) {
    const v = (verdict || '').toUpperCase();
    let cls = 'ac-v-other';
    if (v === 'AC') cls = 'ac-v-ac';
    else if (v === 'WA') cls = 'ac-v-wa';
    else if (v === 'TLE') cls = 'ac-v-tle';
    else if (v === 'MLE') cls = 'ac-v-mle';
    else if (v === 'RE') cls = 'ac-v-re';
    else if (v === 'CE') cls = 'ac-v-ce';
    return `<span class="ac-verdict-badge ${cls}">${v}</span>`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderColors;
}
