/** Predictable, occasional rewards with no extra objects obscuring the webcam. */
export const POWER_UP_DURATION = 6;
export const POWER_UP_INTERVAL = 8;

export class PowerUps {
  constructor(interval = POWER_UP_INTERVAL, duration = POWER_UP_DURATION) {
    this.interval = interval;
    this.duration = duration;
    this.reset();
  }

  reset() {
    this.nextScore = this.interval;
    this.rewardIndex = 0;
    this.clear();
  }

  clear() {
    this.type = null;
    this.remaining = 0;
  }

  award(score) {
    if (score < this.nextScore) return;
    // Consume the milestone even when a boost is active: never stack/refresh.
    this.nextScore = score + this.interval;
    if (this.type) return;
    this.type = this.rewardIndex++ % 2 === 0 ? 'slow-motion' : 'wide-touch';
    this.remaining = this.duration;
  }

  tick(seconds) {
    if (!this.type) return;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (this.remaining <= 0.000001) this.clear();
  }

  get timeScale() { return this.type === 'slow-motion' ? 0.65 : 1; }
  get radiusMultiplier() { return this.type === 'wide-touch' ? 2 : 1; }

  snapshot() {
    return { type: this.type, remaining: this.remaining, nextScore: this.nextScore };
  }
}
