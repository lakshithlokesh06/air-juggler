import { Camera, cameraErrorMessage } from './camera.js';
import { HandTracker } from './tracking.js';
import { HandOverlay } from './overlay.js';
import { readHighScore } from './score.js';
import { elements, renderScores, renderState } from './ui.js';

let state = 'idle';
let requestId = 0;
let tracker = null;
const overlay = new HandOverlay(elements.canvas, elements.video);
const camera = new Camera(elements.video, () => {
  fail('The camera disconnected or access was revoked. Check your camera and try again.');
});

function setState(nextState, message) {
  if (state === nextState && !message) return;
  state = nextState;
  renderState(state, message);
}

function stopCamera() {
  requestId += 1;
  tracker?.stop();
  tracker = null;
  camera.stop();
  overlay.clear();
  setState('idle');
}

function fail(message) {
  stopCamera();
  setState('error', message);
}

async function startCamera() {
  stopCamera();
  const currentRequest = requestId;
  let phase = 'camera';
  setState('loading');
  try {
    await camera.start();
    if (currentRequest !== requestId) return;
    phase = 'model';
    setState('model-loading');
    const session = new HandTracker(elements.video, (hand) => {
      if (currentRequest !== requestId) return;
      setState(hand ? 'tracking' : 'no-hand');
      overlay.draw(hand);
    }, () => {
      if (currentRequest === requestId) fail('Hand tracking stopped unexpectedly. Try again; if it persists, reload or try a browser with WebGL support.');
    });
    tracker = session;
    await session.load();
    if (currentRequest !== requestId) return;
    setState('ready');
    session.start();
  } catch (error) {
    if (currentRequest !== requestId) return;
    fail(phase === 'camera' ? cameraErrorMessage(error) : `Could not start hand tracking. ${error.message || 'Check your connection and WebGL support, then try again.'}`);
  }
}

elements.start.addEventListener('click', () => {
  if (state === 'idle' || state === 'error') startCamera();
  else stopCamera();
});
elements.restart.addEventListener('click', () => {
  renderScores(0, readHighScore());
  startCamera();
});
window.addEventListener('pagehide', stopCamera);
renderScores(0, readHighScore());
renderState('idle');
