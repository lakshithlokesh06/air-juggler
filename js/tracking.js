/** Pinned browser bundles keep this project usable without a build step. */
const TF_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const HANDS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1/dist/hand-pose-detection.min.js';
const scripts = new Map();

function loadScript(url) {
  if (scripts.has(url)) return scripts.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('Library download timed out. Check your connection and try again.')), 30000);
    function finish(error) {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        scripts.delete(url);
        reject(error);
      } else resolve();
    }
    script.src = url;
    script.crossOrigin = 'anonymous';
    script.onload = () => finish();
    script.onerror = () => finish(new Error('Could not download tracking libraries. Check your connection or content blocker and try again.'));
    document.head.append(script);
  });
  scripts.set(url, promise);
  return promise;
}

async function createDetector() {
  await loadScript(TF_URL);
  await loadScript(HANDS_URL);
  const tf = window.tf;
  if (!tf || !window.handPoseDetection) throw new Error('Tracking libraries did not initialize. Reload the page and try again.');
  if (!await tf.setBackend('webgl')) throw new Error('WebGL is unavailable. Enable hardware acceleration or try another browser.');
  await tf.ready();
  return window.handPoseDetection.createDetector(
    window.handPoseDetection.SupportedModels.MediaPipeHands,
    { runtime: 'tfjs', modelType: 'lite', maxHands: 1 },
  );
}

/** One detector and one sequential inference loop per camera session. */
export class HandTracker {
  constructor(video, onResult, onError, detectorFactory = createDetector) {
    this.video = video;
    this.onResult = onResult;
    this.onError = onError;
    this.detectorFactory = detectorFactory;
    this.detector = null;
    this.stopped = false;
    this.inference = null;
    this.frameId = null;
    this.lastVideoTime = -1;
    this.lastInferenceTime = -Infinity;
    this.suspended = false;
  }

  async load() {
    // A timeout gives the user a retry path. A late detector is still disposed.
    let timedOut = false;
    let timer;
    const loading = this.detectorFactory().then((detector) => {
      if (this.stopped || timedOut) {
        detector.dispose();
        return null;
      }
      return detector;
    });
    try {
      this.detector = await Promise.race([
        loading,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error('The hand model took too long to load. Check your connection and try again.'));
          }, 60000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      if (this.stopped) this.disposeDetector();
    }
  }

  start() {
    if (!this.stopped && this.detector) this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  async tick(time = performance.now()) {
    if (this.stopped) return;
    try {
      const hidden = typeof document !== 'undefined' && document.hidden;
      if (!this.suspended && !hidden && time - this.lastInferenceTime >= 1000 / 30 && this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        this.lastInferenceTime = time;
        // Keep raw coordinates; the overlay mirrors them exactly once.
        this.inference = this.detector.estimateHands(this.video, { flipHorizontal: false, staticImageMode: false });
        const hands = await this.inference;
        if (!this.stopped && !this.suspended) this.onResult(hands[0] ?? null);
      }
    } catch (error) {
      if (!this.stopped) {
        this.stop();
        this.onError(error);
      }
      return;
    } finally {
      this.inference = null;
      if (this.stopped) this.disposeDetector();
    }
    if (!this.stopped) this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frameId);
    // Never dispose tensors while estimateHands is still using them.
    if (!this.inference) this.disposeDetector();
  }

  disposeDetector() {
    this.detector?.dispose();
    this.detector = null;
  }
}
