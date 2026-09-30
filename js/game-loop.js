import { BallGame, ARENA_HEIGHT, difficultyForScore } from './physics.js';

/** Rendering runs independently of the slower asynchronous hand detector. */
export class GameLoop {
  constructor(overlay, onState, onScore) {
    this.overlay = overlay;
    this.onState = onState;
    this.onScore = onScore;
    this.game = new BallGame();
    this.running = false;
    this.paused = false;
    this.countdown = null;
    this.hand = null;
    this.handTime = 0;
    this.frame = null;
  }

  setHand(hand) {
    this.hand = hand;
    this.handTime = performance.now();
  }

  notify(state) {
    this.onState(state, {
      score: this.game.score,
      level: difficultyForScore(this.game.score).level,
      countdown: this.countdown === null ? null : Math.ceil(this.countdown),
    });
  }

  start() {
    this.stop();
    this.game.reset(this.arenaWidth());
    this.running = true;
    this.previousTime = null;
    this.onScore(0);
    this.notify('waiting');
    this.schedule();
  }

  schedule() {
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    cancelAnimationFrame(this.frame);
    this.notify('paused');
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // Resume without simulating paused time or using an old control point.
    this.previousTime = null;
    this.hand = null;
    this.handTime = 0;
    this.notify(this.game.status === 'waiting' ? 'waiting' : 'no-hand');
    this.schedule();
  }

  arenaWidth() {
    const { width, height } = this.overlay.canvas.getBoundingClientRect();
    return height > 0 ? width / height * ARENA_HEIGHT : 800;
  }

  tick(time) {
    if (!this.running || this.paused) return;
    const dt = this.previousTime === null ? 0 : Math.max(0, (time - this.previousTime) / 1000);
    this.previousTime = time;
    this.game.resize(this.arenaWidth());
    const hand = time - this.handTime < 250 ? this.hand : null;
    const finger = this.overlay.controlPoint(hand);
    let state;
    if (this.game.status === 'waiting') {
      if (!finger) {
        // Losing the hand before launch resets the countdown for a fair start.
        this.countdown = null;
        state = 'waiting';
      } else {
        this.countdown = this.countdown === null ? 3 : Math.max(0, this.countdown - Math.min(dt, 0.1));
        state = 'countdown';
        if (this.countdown === 0) {
          this.game.start(finger);
          this.countdown = null;
          state = 'playing';
        }
      }
    } else {
      const oldScore = this.game.score;
      this.game.advance(dt, finger);
      if (this.game.score !== oldScore) {
        this.overlay.bounce?.(this.game.ball);
        this.onScore(this.game.score);
      }
      state = this.game.status === 'over' ? 'game-over' : finger ? 'playing' : 'no-hand';
    }
    this.overlay.draw(hand, this.game.ball, Math.min(dt, 0.05));
    if (this.game.status === 'over') this.running = false;
    this.notify(state);
    if (this.running) this.schedule();
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.countdown = null;
    cancelAnimationFrame(this.frame);
    this.hand = null;
    this.handTime = 0;
    this.overlay.clear();
  }
}
