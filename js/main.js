import { Camera, cameraErrorMessage, cameraErrorState } from './camera.js';
import { HandTracker } from './tracking.js';
import { HandOverlay } from './overlay.js';
import { readHighScore, saveHighScore } from './score.js';
import { GameAudio } from './audio.js';
import { GameFeedback } from './feedback.js';
import { GameLoop } from './game-loop.js';
import { elements, renderScores, renderState, renderRound, flashScore, announceLevel, clearFeedback, renderSound, renderModeSelection, renderShortcut, SETUP_STATES } from './ui.js';

const audio = new GameAudio();
const feedback = new GameFeedback(audio, flashScore, announceLevel);
let state = 'idle';
let requestId = 0;
let tracker = null;
const overlay = new HandOverlay(elements.canvas, elements.video);
let selectedMode = 'normal';
let highScore = readHighScore(selectedMode);
let roundBest = highScore;
const gameLoop = new GameLoop(overlay, (nextState, details) => {
  setState(nextState);
  renderRound(nextState, details, highScore, roundBest);
  feedback.update(nextState, details);
  if (nextState === 'paused' || nextState === 'game-over' || nextState === 'life-lost') clearFeedback();
}, (score) => {
  if (score > highScore) highScore = saveHighScore(score, selectedMode);
  renderScores(score, highScore);
});
const camera = new Camera(elements.video, () => {
  fail('The camera disconnected or access was revoked. Check your camera and try again.');
});

function setState(nextState, message) {
  if (state === nextState && !message) return;
  state = nextState;
  if (tracker) tracker.suspended = nextState === 'paused' || nextState === 'game-over';
  renderState(state, message);
}

function stopCamera() {
  requestId += 1;
  tracker?.stop();
  tracker = null;
  camera.stop();
  gameLoop.stop();
  feedback.reset();
  clearFeedback();
  setState('idle');
  renderModeSelection(selectedMode, readHighScore);
  renderScores(0, highScore);
}

function fail(message, errorState = 'error') {
  stopCamera();
  setState(errorState, message);
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
    roundBest = highScore;
    feedback.reset();
    clearFeedback();
    gameLoop.start(selectedMode);
    if (document.hidden) {
      audio.silence();
      gameLoop.pause();
    }
    session.start();
  } catch (error) {
    if (currentRequest !== requestId) return;
    fail(phase === 'camera' ? cameraErrorMessage(error) : `Could not start hand tracking. ${error.message || 'Check your connection and WebGL support, then try again.'}`, phase === 'camera' ? cameraErrorState(error) : 'error');
  }
}

elements.start.addEventListener('click', () => {
  if (!audio.muted && SETUP_STATES.includes(state)) void audio.enable();
  if (SETUP_STATES.includes(state)) startCamera();
  else stopCamera();
});
elements.restart.addEventListener('click', () => {
  if (!audio.muted) void audio.enable();
  if (tracker) {
    roundBest = highScore;
    feedback.reset();
    clearFeedback();
    gameLoop.start(selectedMode);
  }
  else startCamera();
});
window.addEventListener('pagehide', stopCamera);
elements.pause.addEventListener('click', togglePause);
function togglePause() {
  if (gameLoop.paused) {
    if (!audio.muted) void audio.enable();
    gameLoop.resume();
  }
  else gameLoop.pause();
}
let soundRequest = 0;
elements.sound.addEventListener('click', async () => {
  const request = ++soundRequest;
  if (!audio.muted) {
    audio.mute();
    renderSound(true);
  } else {
    const enabling = audio.enable();
    renderSound(false);
    const enabled = await enabling;
    if (request === soundRequest) renderSound(audio.muted, !enabled && audio.muted);
  }
});
elements.shortcut.addEventListener('change', renderShortcut);
// P is a shortcut; native buttons retain their usual Space/Enter behavior.
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key.toLowerCase() === 'p' && elements.shortcut.checked && !elements.pause.disabled) {
    event.preventDefault();
    togglePause();
  }
});
// Keep the round paused on return; the player explicitly resumes.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.silence();
    gameLoop.pause();
  }
});
document.querySelector('#mode-options').addEventListener('change', (event) => {
  if (!SETUP_STATES.includes(state) || event.target.name !== 'game-mode') return;
  selectedMode = event.target.value;
  highScore = readHighScore(selectedMode);
  roundBest = highScore;
  renderModeSelection(selectedMode, readHighScore);
  renderScores(0, highScore);
});
renderModeSelection(selectedMode, readHighScore);
renderScores(0, highScore);
renderState('idle');
renderSound(true);
