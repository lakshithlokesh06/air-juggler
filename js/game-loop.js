import { BallGame, ARENA_HEIGHT } from './physics.js';

/** Rendering runs independently of the slower asynchronous hand detector. */
export class GameLoop {
  constructor(overlay, onState, onScore) {
    this.overlay = overlay;
    this.onState = onState;
    this.onScore = onScore;
    this.game = new BallGame();
    this.running = false;
    this.hand = null;
    this.handTime = 0;
    this.frame = null;
  }

  setHand(hand) {
    this.hand = hand;
    this.handTime = performance.now();
  }

  start() {
    this.stop();
    this.game.reset(this.arenaWidth());
    this.running = true;
    this.previousTime = null;
    this.onScore(0);
    this.onState('waiting');
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  arenaWidth() {
    const { width, height } = this.overlay.canvas.getBoundingClientRect();
    return height > 0 ? width / height * ARENA_HEIGHT : 800;
  }

  tick(time) {
    if (!this.running) return;
    const dt = this.previousTime === null ? 0 : (time - this.previousTime) / 1000;
    this.previousTime = time;
    this.game.resize(this.arenaWidth());
    // Drop stale detections rather than letting an invisible finger score.
    const hand = time - this.handTime < 250 ? this.hand : null;
    const finger = this.overlay.controlPoint(hand);
    this.game.start(finger);
    const oldScore = this.game.score;
    this.game.advance(dt, finger);
    if (this.game.score !== oldScore) this.onScore(this.game.score);
    this.overlay.draw(hand, this.game.ball);
    if (this.game.status === 'over') {
      this.running = false;
      this.onState('game-over');
      return;
    }
    this.onState(this.game.status === 'waiting' ? 'waiting' : finger ? 'playing' : 'no-hand');
    this.frame = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.hand = null;
    this.handTime = 0;
    this.overlay.clear();
  }
}
