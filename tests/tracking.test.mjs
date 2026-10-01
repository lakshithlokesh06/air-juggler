import test from 'node:test';
import assert from 'node:assert/strict';
import { mapVideoPoint } from '../js/overlay.js';
import { HandTracker } from '../js/tracking.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test('mirrors coordinates once at matching aspect ratio', () => {
  assert.deepEqual(mapVideoPoint({ x: 100, y: 200 }, 1280, 720, 640, 360), { x: 590, y: 100 });
});

test('accounts for centered cover crop on portrait layouts', () => {
  assert.deepEqual(mapVideoPoint({ x: 640, y: 360 }, 1280, 720, 360, 480), { x: 180, y: 240 });
  const left = mapVideoPoint({ x: 0, y: 360 }, 1280, 720, 360, 480);
  assert.ok(left.x > 360, 'cropped points stay outside the visible canvas');
});

test('accounts for vertical cropping on wide layouts', () => {
  assert.deepEqual(mapVideoPoint({ x: 320, y: 240 }, 640, 480, 800, 400), { x: 400, y: 200 });
});

test('disposes a model that finishes loading after stop', async () => {
  globalThis.cancelAnimationFrame = () => {};
  const pending = deferred();
  let disposed = 0;
  const tracker = new HandTracker({}, () => {}, () => {}, () => pending.promise);
  const loading = tracker.load();
  tracker.stop();
  pending.resolve({ dispose: () => disposed++ });
  await loading;
  assert.equal(disposed, 1);
  assert.equal(tracker.detector, null);
});

test('stop suppresses late inference results and waits to dispose', async () => {
  globalThis.cancelAnimationFrame = () => {};
  globalThis.requestAnimationFrame = () => { throw new Error('Stopped loop must not schedule another frame'); };
  const pending = deferred();
  let disposed = 0;
  let results = 0;
  const detector = { estimateHands: () => pending.promise, dispose: () => disposed++ };
  const video = { readyState: 2, videoWidth: 640, currentTime: 1 };
  const tracker = new HandTracker(video, () => results++, assert.fail, async () => detector);
  await tracker.load();
  const frame = tracker.tick();
  tracker.stop();
  assert.equal(disposed, 0);
  pending.resolve([{ keypoints: [] }]);
  await frame;
  assert.equal(results, 0);
  assert.equal(disposed, 1);
});

test('empty detection emits no-hand and schedules only after inference', async () => {
  let scheduled = 0;
  globalThis.requestAnimationFrame = () => ++scheduled;
  globalThis.cancelAnimationFrame = () => {};
  const pending = deferred();
  const results = [];
  const tracker = new HandTracker(
    { readyState: 2, videoWidth: 640, currentTime: 1 },
    (hand) => results.push(hand), assert.fail,
    async () => ({ estimateHands: () => pending.promise, dispose() {} }),
  );
  await tracker.load();
  const frame = tracker.tick();
  assert.equal(scheduled, 0);
  pending.resolve([]);
  await frame;
  assert.deepEqual(results, [null]);
  assert.equal(scheduled, 1);
  tracker.stop();
});

test('inference failure reports an error and disposes the detector', async () => {
  let disposed = 0;
  let reported;
  const error = new Error('GPU unavailable');
  const tracker = new HandTracker(
    { readyState: 2, videoWidth: 640, currentTime: 1 }, assert.fail,
    (value) => { reported = value; },
    async () => ({ estimateHands: async () => { throw error; }, dispose: () => disposed++ }),
  );
  await tracker.load();
  await tracker.tick();
  assert.equal(reported, error);
  assert.equal(disposed, 1);
});

test('camera permission resolving after stop releases the late stream', async () => {
  const { Camera } = await import('../js/camera.js');
  const pending = deferred();
  let stops = 0;
  const previousWindow = globalThis.window;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.window = { isSecureContext: true };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia: () => pending.promise },
  } });
  try {
    const video = { srcObject: null, play: assert.fail };
    const camera = new Camera(video, assert.fail);
    const starting = camera.start();
    camera.stop();
    pending.resolve({ getTracks: () => [{ stop: () => stops++ }] });
    await starting;
    assert.equal(stops, 1);
    assert.equal(video.srcObject, null);
  } finally {
    globalThis.window = previousWindow;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else delete globalThis.navigator;
  }
});

test('inference is rate limited, skips duplicates, and suspends without results', async () => {
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  let calls = 0;
  const video = { readyState: 2, videoWidth: 640, currentTime: 1 };
  const tracker = new HandTracker(video, () => {}, assert.fail, async () => ({
    estimateHands: async () => { calls++; return []; }, dispose() {},
  }));
  await tracker.load();
  await tracker.tick(0);
  video.currentTime++;
  await tracker.tick(16);
  assert.equal(calls, 1);
  await tracker.tick(34);
  assert.equal(calls, 2);
  await tracker.tick(100);
  assert.equal(calls, 2, 'same video frame is not inferred again');
  tracker.suspended = true;
  video.currentTime++;
  await tracker.tick(200);
  assert.equal(calls, 2);
  tracker.suspended = false;
  await tracker.tick(234);
  assert.equal(calls, 3);
  tracker.stop();
});

test('suspending during inference suppresses its late result', async () => {
  const pending = deferred();
  let results = 0;
  const tracker = new HandTracker({ readyState: 2, videoWidth: 640, currentTime: 1 },
    () => results++, assert.fail, async () => ({ estimateHands: () => pending.promise, dispose() {} }));
  await tracker.load();
  const frame = tracker.tick(0);
  tracker.suspended = true;
  pending.resolve([]);
  await frame;
  assert.equal(results, 0);
  tracker.stop();
});

test('camera failures select actionable setup states', async () => {
  const { cameraErrorState } = await import('../js/camera.js');
  assert.equal(cameraErrorState({ name: 'NotAllowedError' }), 'permission-denied');
  assert.equal(cameraErrorState({ name: 'SecurityError' }), 'permission-denied');
  assert.equal(cameraErrorState({ name: 'NotFoundError' }), 'no-camera');
  assert.equal(cameraErrorState({ name: 'NotReadableError' }), 'error');
});
