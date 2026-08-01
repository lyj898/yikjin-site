// progress.js — streak and stats persistence via localStorage, with a
// defensive fallback so the game is fully playable even where storage
// is unavailable (private browsing, sandboxed environments, storage
// disabled). Never throws.

const KEY = 'mindtrail_progress_v1';

const DEFAULTS = {
  tierIndex: 0,
  streak: 0,
  lastPlayedDate: null,
  totalTrails: 0,
  bestAccuracy: 0,
  playDates: [], // recent 'YYYY-MM-DD' strings, most recent last
};

let memoryFallback = { ...DEFAULTS };
let storageAvailable = true;

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    storageAvailable = false;
    return { ...memoryFallback };
  }
}

function saveProgress(progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    storageAvailable = false;
    memoryFallback = { ...progress };
  }
}

export function isPersistent() {
  return storageAvailable;
}

export function getTierIndex() {
  return loadProgress().tierIndex;
}

export function setTierIndex(tierIndex) {
  const progress = loadProgress();
  progress.tierIndex = tierIndex;
  saveProgress(progress);
}

/**
 * Records a completed trail: updates the day-based streak, totals,
 * and best accuracy. Playing again on the same calendar day doesn't
 * extend the streak further, but does update the other stats.
 * @param {number} accuracyPercent 0-100
 * @returns {typeof DEFAULTS} the updated progress
 */
export function recordTrailCompletion(accuracyPercent) {
  const progress = loadProgress();
  const today = todayString();

  if (progress.lastPlayedDate !== today) {
    progress.streak = progress.lastPlayedDate === yesterdayString() ? progress.streak + 1 : 1;
    progress.lastPlayedDate = today;
    progress.playDates = [...progress.playDates, today].slice(-30);
  }

  progress.totalTrails += 1;
  progress.bestAccuracy = Math.max(progress.bestAccuracy, accuracyPercent);

  saveProgress(progress);
  return progress;
}

/**
 * Last 7 calendar days (oldest first) with whether each was played,
 * for the understated stamp strip.
 */
export function lastSevenDays(progress) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: key, played: progress.playDates.includes(key), isToday: i === 0 });
  }
  return days;
}
