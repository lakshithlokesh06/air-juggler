import { formatScore } from './score.js';

export const elements = {
  video: document.querySelector('#webcam'),
  canvas: document.querySelector('#game-canvas'),
  start: document.querySelector('#start-button'),
  restart: document.querySelector('#restart-button'),
};

const copy = {
  idle: ['CAMERA OFF', 'Your stage is waiting.', 'Keep the ball up with your index fingertip. Start, then raise one hand to begin.', 'Start', 'Camera permission is requested when you start.'],
  loading: ['CONNECTING', 'Let’s get you in the frame.', 'Allow camera access in your browser’s prompt.', 'Cancel', 'Waiting for camera permission and startup.'],
  'model-loading': ['LOADING TRACKER', 'Getting a feel for your hands.', 'Downloading the hand model. The first start may take a little longer.', 'Stop', 'Loading hand tracking. You can stop anytime.'],
  waiting: ['READY TO PLAY', '', '', 'Stop', 'Raise your index fingertip inside the frame to release the ball.'],
  playing: ['IN PLAY', '', '', 'Stop', 'Meet the falling ball from below with your index fingertip.'],
  'game-over': ['GAME OVER', 'Nice run. Go again?', 'The ball left the play area. Press Restart for a fresh round.', 'Stop', 'Your final score is on the scoreboard. Restart to play again.'],
  'no-hand': ['NO HAND DETECTED', '', '', 'Stop', 'Hand lost — bring your fingertip back. The ball keeps moving.'],
  error: ['SETUP ERROR', 'Let’s get you back on track.', '', 'Try again', 'Check the message above, then try again.'],
};

export function renderState(state, errorMessage = '') {
  const [status, title, description, button, hint] = copy[state];
  const active = ['waiting', 'playing', 'no-hand', 'game-over'].includes(state);
  const loading = state === 'loading' || state === 'model-loading';
  document.querySelector('#stage').dataset.state = state;
  document.querySelector('#stage').setAttribute('aria-busy', String(loading));
  document.querySelector('#camera-status').textContent = status;
  document.querySelector('#status-dot').dataset.state = state;
  document.querySelector('#state-title').textContent = title;
  document.querySelector('#state-description').textContent = errorMessage || description;
  document.querySelector('#stage-message').hidden = active && state !== 'game-over';
  document.querySelector('#live-caption').hidden = !active || state === 'game-over';
  document.querySelector('#tracking-message').textContent = hint;
  document.querySelector('#start-label').textContent = button;
  document.querySelector('#control-hint').textContent = hint;
  elements.video.hidden = !active && state !== 'model-loading';
  elements.canvas.hidden = !active;
  elements.start.disabled = false;
  elements.restart.disabled = !active;
}

export function renderScores(score, highScore) {
  document.querySelector('#score').textContent = formatScore(score);
  document.querySelector('#high-score').textContent = formatScore(highScore);
}
