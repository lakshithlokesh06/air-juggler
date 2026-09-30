import { getMode } from './modes.js';

const memoryBest = new Map();
const keyFor = (mode) => `air-juggler.high-score.${getMode(mode).id}`;
const validScore = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;

/** Preserve session bests even when browser storage is blocked. */
export function readHighScore(mode = 'normal') {
  const id = getMode(mode).id;
  let saved = 0;
  try {
    const stored = localStorage.getItem(keyFor(id));
    // Existing scores belong to the unchanged Normal rules.
    const value = stored ?? (id === 'normal' ? localStorage.getItem('air-juggler.high-score') : null);
    saved = validScore(Number(value));
  } catch { /* Private browsing or disabled storage. */ }
  return Math.max(saved, memoryBest.get(id) ?? 0);
}

export function saveHighScore(score, mode = 'normal') {
  const id = getMode(mode).id;
  const best = Math.max(readHighScore(id), validScore(score));
  memoryBest.set(id, best);
  try { localStorage.setItem(keyFor(id), String(best)); } catch { /* Session fallback. */ }
  return best;
}

export function formatScore(value) {
  return String(value).padStart(2, '0');
}
