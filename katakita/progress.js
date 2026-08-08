// progress.js — streak and mastery persistence via localStorage, with
// a defensive in-memory fallback so the app is fully usable even
// where storage is unavailable. Never throws. Mirrors the pattern in
// /mindtrail/progress.js.

const KEY = 'katakita_progress_v1';
const MASTERED_AT = 2; // correct-in-a-row streak needed to call a word "known"

const DEFAULTS = {
  streak: 0,
  lastPracticedDate: null,
  totalSessions: 0,
  playDates: [], // recent 'YYYY-MM-DD' strings, most recent last
  wordStreaks: {}, // wordId -> current correct-in-a-row count
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
    if (!raw) return { ...DEFAULTS, wordStreaks: {} };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, wordStreaks: { ...(parsed.wordStreaks || {}) } };
  } catch {
    storageAvailable = false;
    return { ...memoryFallback, wordStreaks: { ...memoryFallback.wordStreaks } };
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

/** Records one quiz answer's outcome against a word's mastery streak. */
export function markWordResult(wordId, isCorrect) {
  const progress = loadProgress();
  const current = progress.wordStreaks[wordId] || 0;
  progress.wordStreaks[wordId] = isCorrect ? current + 1 : 0;
  saveProgress(progress);
  return progress.wordStreaks[wordId];
}

export function isWordKnown(progress, wordId) {
  return (progress.wordStreaks[wordId] || 0) >= MASTERED_AT;
}

export function countKnown(progress, wordIds) {
  return wordIds.filter((id) => isWordKnown(progress, id)).length;
}

/**
 * Records a completed practice session: updates the day-based streak
 * and totals. Practicing again on the same calendar day doesn't
 * extend the streak further, but does update the session count.
 */
export function recordSessionCompletion() {
  const progress = loadProgress();
  const today = todayString();

  if (progress.lastPracticedDate !== today) {
    progress.streak = progress.lastPracticedDate === yesterdayString() ? progress.streak + 1 : 1;
    progress.lastPracticedDate = today;
    progress.playDates = [...progress.playDates, today].slice(-30);
  }

  progress.totalSessions += 1;
  saveProgress(progress);
  return progress;
}

/** Last 7 calendar days (oldest first) with whether each was practiced. */
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
