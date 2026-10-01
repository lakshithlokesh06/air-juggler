/** Owns the webcam stream. Tracking and gameplay belong in separate modules. */
export class Camera {
  constructor(video, onEnded) {
    this.video = video;
    this.onEnded = onEnded;
    this.stream = null;
    this.requestId = 0;
  }

  async start() {
    if (!window.isSecureContext) {
      throw new Error('Use localhost or an HTTPS address to access your camera.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera access. Try a current Chrome, Firefox, Edge, or Safari browser.');
    }
    this.stop();
    const requestId = this.requestId;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    // Permission may resolve after Stop or a newer camera request.
    if (requestId !== this.requestId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;
    this.stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => { if (requestId === this.requestId) this.onEnded(); }, { once: true });
    });
    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch (error) {
      if (requestId === this.requestId) this.stop();
      throw error;
    }
  }

  stop() {
    this.requestId += 1;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}

export function cameraErrorMessage(error) {
  const messages = {
    NotAllowedError: 'Camera access was denied. Allow camera access in your browser’s site settings, then try again.',
    NotFoundError: 'No camera was found. Connect a webcam, then try again.',
    NotReadableError: 'Your camera is unavailable. Close other apps using it, then try again.',
    OverconstrainedError: 'Your camera could not use these settings. Try another camera or browser.',
    AbortError: 'Camera startup was interrupted. Please try again.',
    SecurityError: 'Camera access is blocked by your browser’s security settings.',
  };
  return messages[error.name] || error.message || 'Something went wrong while starting your camera. Please try again.';
}

export function cameraErrorState(error) {
  if (['NotAllowedError', 'SecurityError'].includes(error.name)) return 'permission-denied';
  return error.name === 'NotFoundError' ? 'no-camera' : 'error';
}
