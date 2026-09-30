import { formatScore } from './score.js';

export const elements = {
  video: document.querySelector('#webcam'),
  start: document.querySelector('#start-button'),
  restart: document.querySelector('#restart-button'),
};

const copy = {
  idle: ['CAMERA OFF', 'Your stage is waiting.', 'Enable your camera to step into the frame. A little room to move is all you need.', 'Start camera', 'Camera permission is requested when you start.'],
  loading: ['CONNECTING', 'Let’s get you in the frame.', 'Allow camera access in your browser’s prompt. Your preview will appear here once the camera is ready.', 'Connecting…', 'Waiting for camera permission and startup.'],
  ready: ['CAMERA LIVE', '', '', 'Stop camera', 'Preview only. Hand tracking and gameplay are coming next.'],
  error: ['CAMERA UNAVAILABLE', 'A small camera hiccup.', '', 'Try again', 'Check camera access, then give it another try.'],
};

export function renderState(state, errorMessage = '') {
  const [status, title, description, button, hint] = copy[state];
  const ready = state === 'ready';
  document.querySelector('#stage').dataset.state = state;
  document.querySelector('#stage').setAttribute('aria-busy', String(state === 'loading'));
  document.querySelector('#camera-status').textContent = status;
  document.querySelector('#status-dot').dataset.state = state;
  document.querySelector('#state-title').textContent = title;
  document.querySelector('#state-description').textContent = errorMessage || description;
  document.querySelector('#stage-message').hidden = ready;
  document.querySelector('#live-caption').hidden = !ready;
  document.querySelector('#start-label').textContent = button;
  document.querySelector('#control-hint').textContent = hint;
  elements.video.hidden = !ready;
  elements.start.disabled = state === 'loading';
  elements.restart.disabled = !ready;
}

export function renderScores(score, highScore) {
  document.querySelector('#score').textContent = formatScore(score);
  document.querySelector('#high-score').textContent = formatScore(highScore);
}
