import { formatScore } from './score.js';

export const elements = {
  video: document.querySelector('#webcam'),
  canvas: document.querySelector('#game-canvas'),
  start: document.querySelector('#start-button'),
  restart: document.querySelector('#restart-button'),
};

const copy = {
  idle: ['CAMERA OFF', 'Your stage is waiting.', 'Enable your camera, then raise one hand to see your index fingertip tracked.', 'Start camera', 'Camera permission is requested when you start.'],
  loading: ['CONNECTING', 'Let’s get you in the frame.', 'Allow camera access in your browser’s prompt.', 'Cancel', 'Waiting for camera permission and startup.'],
  'model-loading': ['LOADING TRACKER', 'Getting a feel for your hands.', 'Downloading the hand model. The first start may take a little longer.', 'Stop camera', 'Loading hand tracking. You can stop anytime.'],
  ready: ['TRACKER READY', '', '', 'Stop camera', 'Tracking is ready. Raise one hand inside the frame.'],
  'no-hand': ['NO HAND DETECTED', '', '', 'Stop camera', 'Raise one hand with your fingers visible in a well-lit space.'],
  tracking: ['HAND TRACKED', '', '', 'Stop camera', 'The bright ring follows your index fingertip.'],
  error: ['SETUP ERROR', 'Let’s get you back on track.', '', 'Try again', 'Check the message above, then try again.'],
};

export function renderState(state, errorMessage = '') {
  const [status, title, description, button, hint] = copy[state];
  const active = ['ready', 'no-hand', 'tracking'].includes(state);
  const loading = state === 'loading' || state === 'model-loading';
  document.querySelector('#stage').dataset.state = state;
  document.querySelector('#stage').setAttribute('aria-busy', String(loading));
  document.querySelector('#camera-status').textContent = status;
  document.querySelector('#status-dot').dataset.state = state;
  document.querySelector('#state-title').textContent = title;
  document.querySelector('#state-description').textContent = errorMessage || description;
  document.querySelector('#stage-message').hidden = active;
  document.querySelector('#live-caption').hidden = !active;
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
