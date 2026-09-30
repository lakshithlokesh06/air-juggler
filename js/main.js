import { Camera, cameraErrorMessage } from './camera.js';
import { HandTracker } from './tracking.js';
import { HandOverlay } from './overlay.js';
import { readHighScore, saveHighScore } from './score.js';
import { GameLoop } from './game-loop.js';
import { elements, renderScores, renderState } from './ui.js';

let state = 'idle';
let requestId = 0;
let tracker = null;
const overlay = new HandOverlay(elements.canvas, elements.video);
let highScore = readHighScore();
const gameLoop = new GameLoop(overlay, setState, (score) => {
  if (score > highScore) highScore = saveHighScore(score);
  renderScores(score, highScore);
});
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
  gameLoop.stop();
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
      gameLoop.setHand(hand);
    }, () => {
      if (currentRequest === requestId) fail('Hand tracking stopped unexpectedly. Try again; if it persists, reload or try a browser with WebGL support.');
    });
    tracker = session;
    await session.load();
    if (currentRequest !== requestId) return;
    setState('waiting');
    gameLoop.start();
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
  if (tracker) gameLoop.start();
  else startCamera();
});
window.addEventListener('pagehide', stopCamera);
// Stop instead of simulating a large time jump when a background tab resumes.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
});
renderScores(0, readHighScore());
renderState('idle');
