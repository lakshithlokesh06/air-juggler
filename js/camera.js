/** Owns the webcam stream. Tracking and gameplay belong in separate modules. */
export class Camera {
  constructor(video, onEnded) {
    this.video = video;
    this.onEnded = onEnded;
    this.stream = null;
  }

  async start() {
    if (!window.isSecureContext) {
      throw new Error('Use localhost or an HTTPS address to access your camera.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera access. Try a current Chrome, Firefox, Edge, or Safari browser.');
    }
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    this.stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => this.onEnded(), { once: true });
    });
    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop() {
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
