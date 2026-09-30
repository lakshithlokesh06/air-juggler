import { Camera, cameraErrorMessage } from './camera.js';
import { readHighScore } from './score.js';
import { elements, renderScores, renderState } from './ui.js';

let state = 'idle';
let requestId = 0;
const camera = new Camera(elements.video, () => {
  stopCamera();
  setState('error', 'The camera disconnected or access was revoked. Check your camera and try again.');
});

function setState(nextState, message) {
  state = nextState;
  renderState(state, message);
}

function stopCamera() {
  requestId += 1;
  camera.stop();
  setState('idle');
}

async function startCamera() {
  if (state === 'loading') return;
  const currentRequest = ++requestId;
  setState('loading');
  try {
    await camera.start();
    // A request may finish after the page was hidden. Release that late stream.
    if (currentRequest !== requestId) {
      camera.stop();
      return;
    }
    setState('ready');
  } catch (error) {
    if (currentRequest !== requestId) return;
    camera.stop();
    setState('error', cameraErrorMessage(error));
  }
}

elements.start.addEventListener('click', () => {
  if (state === 'ready') stopCamera();
  else startCamera();
});

elements.restart.addEventListener('click', () => {
  renderScores(0, readHighScore());
  startCamera();
});

// Release the webcam when leaving the page, including back/forward cache navigation.
window.addEventListener('pagehide', stopCamera);
renderScores(0, readHighScore());
setState('idle');
