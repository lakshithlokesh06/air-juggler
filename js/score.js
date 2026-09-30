/** Persistence is optional: private browsing or blocked storage must not break the UI. */
const HIGH_SCORE_KEY = 'air-juggler.high-score';

export function readHighScore() {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function formatScore(value) {
  return String(value).padStart(2, '0');
}

export function saveHighScore(score) {
  const best = Math.max(readHighScore(), score);
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(best));
  } catch {
    // Storage may be unavailable; the current session still keeps its best.
  }
  return best;
}
