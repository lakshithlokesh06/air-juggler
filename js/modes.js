/** Shared by physics, score storage, and mode-selection copy. */
export const MODES = Object.freeze({
  easy: Object.freeze({ id: 'easy', name: 'Easy', lives: 5, pace: 0.8, boostInterval: 6, boostDuration: 8, seconds: null, description: '5 lives · gentler gravity · 8s boosts every 6 points' }),
  normal: Object.freeze({ id: 'normal', name: 'Normal', lives: 3, pace: 1, boostInterval: 8, boostDuration: 6, seconds: null, description: '3 lives · classic pace · 6s boosts every 8 points' }),
  hard: Object.freeze({ id: 'hard', name: 'Hard', lives: 2, pace: 1.25, boostInterval: 12, boostDuration: 4, seconds: null, description: '2 lives · faster gravity · 4s boosts every 12 points' }),
  timed: Object.freeze({ id: 'timed', name: '60-second challenge', lives: null, pace: 1, boostInterval: 8, boostDuration: 4, seconds: 60, description: '60 seconds · unlimited attempts · 4s boosts every 8 points' }),
});

export function getMode(id = 'normal') {
  return Object.hasOwn(MODES, id) ? MODES[id] : MODES.normal;
}
