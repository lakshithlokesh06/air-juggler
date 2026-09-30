/** Predictable, occasional rewards with no extra objects obscuring the webcam. */
export const POWER_UP_DURATION = 6;
export const POWER_UP_INTERVAL = 8;

export class PowerUps {
  constructor() {
    this.reset();
  }

  reset() {
    this.nextScore = POWER_UP_INTERVAL;
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
    this.nextScore = score + POWER_UP_INTERVAL;
    if (this.type) return;
    this.type = this.rewardIndex++ % 2 === 0 ? 'slow-motion' : 'wide-touch';
    this.remaining = POWER_UP_DURATION;
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
