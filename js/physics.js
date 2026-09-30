import { getMode } from './modes.js';
import { PowerUps } from './power-ups.js';

/** All distances use an arena 600 units high; time is measured in seconds. */
export const ARENA_HEIGHT = 600;
export const BALL_RADIUS = 20;
export const FINGER_RADIUS = 15;
const GRAVITY = 780;
const BOUNCE_SPEED = 560;
const STEP = 1 / 120;

/** Every five bounces increases pace; cap it to keep the game playable. */
export function difficultyForScore(score, modeId = 'normal') {
  const level = Math.min(6, 1 + Math.floor(Math.max(0, score) / 5));
  const pace = getMode(modeId).pace * (1 + (level - 1) * 0.12);
  return { level, gravity: GRAVITY * pace, bounceSpeed: BOUNCE_SPEED * Math.sqrt(pace) };
}

export class BallGame {
  constructor(width = 800, modeId = 'normal') {
    this.reset(width, modeId);
  }

  reset(width = this.width, modeId = this.mode?.id) {
    this.mode = getMode(modeId);
    this.endReason = null;
    this.misses = 0;
    this.width = width;
    this.ball = { x: width / 2, y: 100, vx: 0, vy: 0, radius: BALL_RADIUS };
    this.score = 0;
    this.lives = this.mode.lives;
    this.powerUps = new PowerUps(this.mode.boostInterval, this.mode.boostDuration);
    this.status = 'waiting';
    this.contact = false;
    this.cooldown = 0;
  }

  get fingerRadius() {
    return FINGER_RADIUS * this.powerUps.radiusMultiplier;
  }

  loseLife() {
    if (this.status !== 'playing') return;
    this.misses += 1;
    if (this.lives !== null) this.lives = Math.max(0, this.lives - 1);
    this.powerUps.clear();
    this.status = this.lives === null || this.lives > 0 ? 'life-lost' : 'over';
    if (this.status === 'over') this.endReason = 'lives';
  }

  prepareLife() {
    if (this.status !== 'life-lost') return;
    this.ball = { x: this.width / 2, y: 100, vx: 0, vy: 0, radius: BALL_RADIUS };
    this.contact = false;
    this.cooldown = 0;
    this.status = 'waiting';
  }

  resize(width) {
    this.ball.x *= width / this.width;
    this.width = width;
    this.ball.x = Math.max(BALL_RADIUS, Math.min(width - BALL_RADIUS, this.ball.x));
  }

  start(finger) {
    if (this.status !== 'waiting' || !finger) return;
    this.ball.x = Math.max(BALL_RADIUS, Math.min(this.width - BALL_RADIUS, finger.x));
    this.status = 'playing';
  }

  advance(seconds, finger) {
    if (this.status !== 'playing') return;
    // Bound catch-up after slow frames and subdivide to avoid tunneling.
    let remaining = Math.min(Math.max(seconds, 0), 0.05);
    while (remaining > 0 && this.status === 'playing') {
      const dt = Math.min(STEP, remaining);
      // Boost duration uses active-play time, not slowed physics time.
      const timeScale = this.powerUps.timeScale;
      this.step(dt * timeScale, finger);
      this.powerUps.tick(dt);
      remaining -= dt;
    }
  }

  step(dt, finger) {
    const ball = this.ball;
    const difficulty = difficultyForScore(this.score, this.mode.id);
    this.cooldown = Math.max(0, this.cooldown - dt);
    ball.y += ball.vy * dt + 0.5 * difficulty.gravity * dt * dt;
    ball.vy += difficulty.gravity * dt;
    ball.x += ball.vx * dt;
    if (ball.x < ball.radius || ball.x > this.width - ball.radius) {
      ball.x = Math.max(ball.radius, Math.min(this.width - ball.radius, ball.x));
      ball.vx *= -1;
    }
    if (ball.y < ball.radius) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    }

    const distance = finger ? Math.hypot(ball.x - finger.x, ball.y - finger.y) : Infinity;
    const touching = distance <= ball.radius + this.fingerRadius;
    // Separate before rearming. A cooldown also rejects jitter after contact.
    if (distance > ball.radius + this.fingerRadius + 8) this.contact = false;
    if (touching && !this.contact && this.cooldown === 0 && ball.vy > 0 && finger.y >= ball.y) {
      ball.vy = -difficultyForScore(this.score + 1, this.mode.id).bounceSpeed;
      ball.vx = Math.max(-180, Math.min(180, (ball.x - finger.x) * 7 * Math.sqrt(this.mode.pace)));
      this.score += 1;
      this.powerUps.award(this.score);
      this.contact = true;
      this.cooldown = 0.2;
    }
    if (ball.y - ball.radius > ARENA_HEIGHT) this.loseLife();
  }
}
