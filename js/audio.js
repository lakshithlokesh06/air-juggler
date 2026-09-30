/** Small synthesized cues: no downloads, autoplay, or dependency on audio support. */
const PATTERNS = {
  bounce: [[620, 0, 0.09], [880, 0.04, 0.08]],
  countdown: [[440, 0, 0.09]],
  go: [[880, 0, 0.16]],
  'level-up': [[523, 0, 0.12], [659, 0.10, 0.12], [784, 0.20, 0.18]],
  'life-lost': [[330, 0, 0.12], [262, 0.12, 0.16]],
  'game-over': [[392, 0, 0.18], [294, 0.16, 0.18], [196, 0.32, 0.24]],
};

export class GameAudio {
  constructor(createContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return AudioContext ? new AudioContext() : null;
  }) {
    this.createContext = createContext;
    this.context = null;
    this.muted = true;
    this.voices = new Set();
    this.requestId = 0;
  }

  // Call only from a click/key handler. Never resume in an animation callback.
  async enable() {
    const requestId = ++this.requestId;
    this.muted = false;
    try {
      this.context ??= this.createContext();
      if (!this.context) throw new Error('Web Audio is unavailable');
      if (this.context.state !== 'running') await this.context.resume();
      if (this.context.state !== 'running') throw new Error('Audio is blocked');
      return requestId === this.requestId && !this.muted;
    } catch {
      if (requestId === this.requestId) this.mute();
      return false;
    }
  }

  mute() {
    this.requestId += 1;
    this.muted = true;
    this.silence();
  }

  silence() {
    for (const voice of this.voices) {
      try { voice.oscillator.stop(); } catch { /* Already stopped. */ }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }

  play(name) {
    const context = this.context;
    if (this.muted || context?.state !== 'running' || !PATTERNS[name]) return;
    // Bound the number of nodes, even if a caller accidentally sends a burst.
    if (this.voices.size > 12) this.silence();
    try {
      for (const [frequency, delay, duration] of PATTERNS[name]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const voice = { oscillator, gain };
        this.voices.add(voice);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          this.voices.delete(voice);
        };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      }
    } catch {
      // Audio failure must never interrupt a round.
      this.silence();
    }
  }
}
