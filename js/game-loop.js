import { BallGame, ARENA_HEIGHT, difficultyForScore } from './physics.js';

/** Rendering runs independently of the slower asynchronous hand detector. */
export class GameLoop {
  constructor(overlay, onState, onScore) {
    this.overlay = overlay;
    this.onState = onState;
    this.onScore = onScore;
    this.game = new BallGame();
    this.remainingTime = null;
    this.clockStarted = false;
    this.running = false;
    this.paused = false;
    this.countdown = null;
    this.recovery = 0;
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
      lives: this.game.lives,
      mode: this.game.mode.id,
      maxLives: this.game.mode.lives,
      remainingTime: this.remainingTime,
      misses: this.game.misses,
      endReason: this.game.endReason,
      powerUp: this.game.powerUps.snapshot(),
      level: difficultyForScore(this.game.score).level,
      countdown: this.countdown === null ? null : Math.ceil(this.countdown),
    });
  }

  start(modeId = this.game.mode.id) {
    this.stop();
    this.game.reset(this.arenaWidth(), modeId);
    this.remainingTime = this.game.mode.seconds;
    this.clockStarted = false;
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
    this.notify(this.game.status === 'life-lost' ? 'life-lost' : this.game.status === 'waiting' ? 'waiting' : 'no-hand');
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
    // The challenge clock uses elapsed time, not capped/slowed physics time.
    // It includes recovery and later countdowns but excludes the initial setup.
    if (this.clockStarted && this.remainingTime !== null) {
      this.remainingTime = Math.max(0, this.remainingTime - dt);
      if (this.remainingTime <= 0.000001) {
        this.remainingTime = 0;
        this.game.status = 'over';
        this.game.endReason = 'time';
        this.game.powerUps.clear();
        this.running = false;
        this.countdown = null;
        this.overlay.clear();
        this.notify('game-over');
        return;
      }
    }
    let state;
    if (this.game.status === 'life-lost') {
      this.recovery = Math.max(0, this.recovery - Math.min(dt, 0.1));
      state = 'life-lost';
      if (this.recovery === 0) {
        this.game.prepareLife();
        state = 'waiting';
      }
    } else if (this.game.status === 'waiting') {
      if (!finger) {
        // Losing the hand before launch resets the countdown for a fair start.
        this.countdown = null;
        state = 'waiting';
      } else {
        this.countdown = this.countdown === null ? 3 : Math.max(0, this.countdown - Math.min(dt, 0.1));
        state = 'countdown';
        if (this.countdown === 0) {
          this.game.start(finger);
          this.clockStarted = true;
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
      if (this.game.status === 'life-lost') {
        this.recovery = 1;
        this.countdown = null;
        state = 'life-lost';
      } else {
        state = this.game.status === 'over' ? 'game-over' : finger ? 'playing' : 'no-hand';
      }
    }
    this.overlay.draw(hand, ['over', 'life-lost'].includes(this.game.status) ? null : this.game.ball, Math.min(dt, 0.05), { fingerRadius: this.game.fingerRadius });
    if (this.game.status === 'over') this.running = false;
    this.notify(state);
    if (this.running) this.schedule();
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.countdown = null;
    this.recovery = 0;
    this.game.powerUps.clear();
    cancelAnimationFrame(this.frame);
    this.hand = null;
    this.handTime = 0;
    this.overlay.clear();
  }
}
