import { formatScore } from './score.js';

export const elements = {
  video: document.querySelector('#webcam'),
  canvas: document.querySelector('#game-canvas'),
  start: document.querySelector('#start-button'),
  restart: document.querySelector('#restart-button'),
  pause: document.querySelector('#pause-button'),
  sound: document.querySelector('#sound-button'),
};

const copy = {
  idle: ['CAMERA OFF', 'Your stage is waiting.', 'Keep the ball up with your index fingertip. Start, then raise one hand to begin.', 'Start', 'Camera permission is requested when you start.'],
  loading: ['CONNECTING', 'Let’s get you in the frame.', 'Allow camera access in your browser’s prompt.', 'Cancel', 'Waiting for camera permission and startup.'],
  'model-loading': ['LOADING TRACKER', 'Getting a feel for your hands.', 'Downloading the hand model. The first start may take a little longer.', 'Stop', 'Loading hand tracking. You can stop anytime.'],
  waiting: ['READY TO PLAY', '', '', 'Stop', 'Raise your index fingertip inside the frame to begin a 3-second countdown.'],
  countdown: ['GET READY', '', '', 'Stop', 'Keep your hand in frame. Your round starts in a moment.'],
  paused: ['PAUSED', 'Take a breather.', 'Your ball and score are safe. Resume when you’re ready.', 'Stop', 'Camera stays on while paused. Resume with the button or P.'],
  playing: ['IN PLAY', '', '', 'Stop', 'Meet the falling ball from below with your index fingertip.'],
  'life-lost': ['LIFE LOST', 'Take a breath. You’re still in.', 'Your score is safe. Get your fingertip ready for the next countdown.', 'Stop', 'Resetting the ball. Your next attempt starts after 3–2–1.'],
  'game-over': ['GAME OVER', 'Nice run. Go again?', 'All three lives used. Press Restart for a fresh round.', 'Stop', 'Your final score is on the scoreboard. Restart to play again.'],
  'no-hand': ['NO HAND DETECTED', '', '', 'Stop', 'Hand lost — bring your fingertip back. The ball keeps moving.'],
  error: ['SETUP ERROR', 'Let’s get you back on track.', '', 'Try again', 'Check the message above, then try again.'],
};

export function renderState(state, errorMessage = '') {
  const [status, title, description, button, hint] = copy[state];
  const active = ['waiting', 'countdown', 'paused', 'playing', 'no-hand', 'life-lost', 'game-over'].includes(state);
  const loading = state === 'loading' || state === 'model-loading';
  document.querySelector('#stage').dataset.state = state;
  document.querySelector('#stage').setAttribute('aria-busy', String(loading));
  document.querySelector('#camera-status').textContent = status;
  document.querySelector('#status-dot').dataset.state = state;
  document.querySelector('#state-title').textContent = title;
  document.querySelector('#state-description').textContent = errorMessage || description;
  document.querySelector('#stage-message').hidden = active && !['game-over', 'paused', 'life-lost'].includes(state);
  document.querySelector('#live-caption').hidden = !active || ['game-over', 'paused', 'life-lost'].includes(state);
  document.querySelector('#tracking-message').textContent = hint;
  document.querySelector('#start-label').textContent = button;
  document.querySelector('#control-hint').textContent = hint;
  elements.video.hidden = !active && state !== 'model-loading';
  elements.canvas.hidden = !active;
  elements.start.disabled = false;
  elements.restart.disabled = !active;
  elements.pause.disabled = !active || state === 'game-over';
  elements.pause.textContent = state === 'paused' ? 'Resume' : 'Pause';
  elements.pause.setAttribute('aria-label', state === 'paused' ? 'Resume game (P)' : 'Pause game (P)');
  document.querySelector('#countdown').hidden = state !== 'countdown';
  document.querySelector('#round-result').hidden = state !== 'game-over';
  if (!active) {
    setText('#power-label', 'Boosts arrive every 8 points');
    setText('#power-time', '');
    document.querySelector('#power-status').dataset.active = 'false';
  }
}

export function renderScores(score, highScore) {
  document.querySelector('#score').textContent = formatScore(score);
  document.querySelector('#high-score').textContent = formatScore(highScore);
}

/** Update only changed text so live regions are not announced every frame. */
function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element.textContent !== text) element.textContent = text;
}

export function renderRound(state, details, highScore, previousBest) {
  setText('#lives', `${details.lives} / 3 lives`);
  const power = details.powerUp;
  const powerName = power.type === 'slow-motion' ? 'Slow motion · 65% speed' : 'Wide touch · 2× reach';
  setText('#power-label', power.type ? powerName : `Next boost at ${power.nextScore} points`);
  setText('#power-time', power.type ? `${Math.ceil(power.remaining)}s${state === 'paused' ? ' · paused' : ''}` : '');
  document.querySelector('#power-status').dataset.active = String(Boolean(power.type));
  if (state === 'life-lost') setText('#state-title', `${details.lives} ${details.lives === 1 ? 'life' : 'lives'} left. Keep going.`);
  setText('#level', `LEVEL ${details.level} / 6`);
  if (state === 'countdown') setText('#countdown', String(details.countdown));
  if (state === 'game-over') {
    setText('#final-score', formatScore(details.score));
    setText('#result-caption', details.score > previousBest ? 'NEW PERSONAL BEST' : 'FINAL SCORE');
    setText('#result-detail', `${details.score} ${details.score === 1 ? 'bounce' : 'bounces'} · Level ${details.level} · Best ${highScore}`);
    setText('#state-title', details.score > previousBest ? 'A new best. Nicely done.' : details.score ? 'Nice run. Go again?' : 'You’ve got this. Try again.');
  }
}

let scoreTimer;
let levelTimer;

export function flashScore() {
  const score = document.querySelector('#score');
  clearTimeout(scoreTimer);
  score.classList.add('score-hit');
  scoreTimer = setTimeout(() => score.classList.remove('score-hit'), 240);
}

export function announceLevel(level) {
  const notice = document.querySelector('#level-notice');
  clearTimeout(levelTimer);
  notice.textContent = `Level ${level} — picking up the pace`;
  notice.hidden = false;
  levelTimer = setTimeout(() => { notice.hidden = true; }, 2200);
}

export function clearFeedback() {
  clearTimeout(scoreTimer);
  clearTimeout(levelTimer);
  document.querySelector('#score').classList.remove('score-hit');
  document.querySelector('#level-notice').hidden = true;
}

export function renderSound(muted, unavailable = false) {
  elements.sound.textContent = muted ? 'Sound off' : 'Sound on';
  elements.sound.setAttribute('aria-pressed', String(!muted));
  document.querySelector('#sound-status').textContent = unavailable
    ? 'Audio is unavailable or blocked. You can keep playing silently.'
    : muted ? 'Optional sound effects are muted.' : 'Sound effects enabled. Select Sound on to mute.';
}
