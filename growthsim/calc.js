// calc.js — pure compound-growth calculation engine.
// No DOM access, no imports, no side effects. This module is the
// "engine": given a plain inputs object it returns a plain array of
// yearly results. It is deliberately kept separate from app.js (the
// "UI") so the math can be reasoned about, reused, or unit-tested in
// isolation from rendering concerns.

const PERIODS_PER_YEAR = { monthly: 12, quarterly: 4, annually: 1 };

/**
 * @typedef {Object} RateBand
 * @property {number} fromYear   inclusive
 * @property {number} toYear     inclusive
 * @property {number} ratePercent
 *
 * @typedef {Object} GrowthInputs
 * @property {number} principal
 * @property {number} monthlyContribution
 * @property {number} years
 * @property {'monthly'|'quarterly'|'annually'} compounding
 * @property {number} annualRatePercent   used when bands is empty/absent
 * @property {RateBand[]} [bands]         overrides annualRatePercent per year when present
 * @property {boolean} inflationAdjust
 * @property {number} inflationRatePercent
 *
 * @typedef {Object} YearlyBreakdown
 * @property {number} year
 * @property {number} ratePercent              rate applied during this year
 * @property {number} contributions            contributed this year (nominal)
 * @property {number} interestEarned           interest earned this year (nominal)
 * @property {number} cumulativeContributions       nominal, since year 0
 * @property {number} cumulativeContributionsReal   contributions in today's dollars
 * @property {number} balanceNominal
 * @property {number} balanceReal              equals balanceNominal when inflationAdjust is false
 */

function rateForYear(inputs, year) {
  if (inputs.bands && inputs.bands.length) {
    const band = inputs.bands.find((b) => year >= b.fromYear && year <= b.toYear);
    if (band) return band.ratePercent;
    return inputs.bands[inputs.bands.length - 1].ratePercent;
  }
  return inputs.annualRatePercent;
}

/**
 * Simulates contribution + compounding period by period (at the
 * selected compounding frequency) and aggregates into one row per year.
 * @param {GrowthInputs} inputs
 * @returns {YearlyBreakdown[]}
 */
export function calculateGrowth(inputs) {
  const periodsPerYear = PERIODS_PER_YEAR[inputs.compounding] || 12;
  const contributionPerPeriod = inputs.monthlyContribution * (12 / periodsPerYear);

  let balance = inputs.principal;
  let cumulativeContributions = inputs.principal;
  let cumulativeContributionsReal = inputs.principal;
  const breakdown = [];

  for (let year = 1; year <= inputs.years; year++) {
    const ratePercent = rateForYear(inputs, year);
    const periodicRate = ratePercent / 100 / periodsPerYear;

    let yearContributions = 0;
    let yearInterest = 0;

    for (let p = 0; p < periodsPerYear; p++) {
      const interestThisPeriod = balance * periodicRate;
      balance += interestThisPeriod;
      balance += contributionPerPeriod;
      yearInterest += interestThisPeriod;
      yearContributions += contributionPerPeriod;
    }

    cumulativeContributions += yearContributions;

    const inflationFactor = inputs.inflationAdjust
      ? Math.pow(1 + inputs.inflationRatePercent / 100, year)
      : 1;

    cumulativeContributionsReal += yearContributions / inflationFactor;

    breakdown.push({
      year,
      ratePercent,
      contributions: yearContributions,
      interestEarned: yearInterest,
      cumulativeContributions,
      cumulativeContributionsReal,
      balanceNominal: balance,
      balanceReal: balance / inflationFactor,
    });
  }

  return breakdown;
}

/**
 * Normalizes a set of rate bands so they contiguously cover [1, years]
 * with no gaps or overlaps — trims/extends bands rather than rejecting
 * imperfect input, since this feeds directly off editable UI rows.
 * @param {RateBand[]} bands
 * @param {number} years
 * @returns {RateBand[]}
 */
export function normalizeBands(bands, years) {
  const sorted = [...bands]
    .filter((b) => Number.isFinite(b.fromYear) && Number.isFinite(b.toYear))
    .sort((a, b) => a.fromYear - b.fromYear);

  // Reflow sequentially from year 1, preserving each band's original width
  // where possible. Clamping fromYear to "at least" the running cursor (as
  // opposed to pinning it exactly) would leave a gap whenever an earlier
  // band is removed or shortened — e.g. deleting band 1 of [1-15, 16-20]
  // must slide the remainder back down to start at year 1, not year 16.
  const normalized = [];
  let cursor = 1;

  for (const band of sorted) {
    if (cursor > years) break;
    const width = Math.max(1, band.toYear - band.fromYear);
    const toYear = Math.min(cursor + width, years);
    normalized.push({ fromYear: cursor, toYear, ratePercent: band.ratePercent });
    cursor = toYear + 1;
  }

  if (normalized.length === 0) {
    normalized.push({ fromYear: 1, toYear: years, ratePercent: bands[0]?.ratePercent ?? 7 });
  } else if (cursor <= years) {
    normalized[normalized.length - 1].toYear = years;
  }

  return normalized;
}

/**
 * Derives the headline summary stats from a computed breakdown.
 * @param {YearlyBreakdown[]} breakdown
 * @param {boolean} useReal
 */
export function summarize(breakdown, useReal) {
  if (!breakdown.length) {
    return { finalBalance: 0, totalContributed: 0, totalInterest: 0, interestSharePercent: 0 };
  }
  const last = breakdown[breakdown.length - 1];
  const finalBalance = useReal ? last.balanceReal : last.balanceNominal;
  const totalContributed = useReal ? last.cumulativeContributionsReal : last.cumulativeContributions;
  const totalInterest = finalBalance - totalContributed;
  const interestSharePercent = finalBalance > 0 ? (totalInterest / finalBalance) * 100 : 0;
  return { finalBalance, totalContributed, totalInterest, interestSharePercent };
}
