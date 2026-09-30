/** All distances use an arena 600 units high; time is measured in seconds. */
export const ARENA_HEIGHT = 600;
export const BALL_RADIUS = 20;
export const FINGER_RADIUS = 15;
const GRAVITY = 780;
const BOUNCE_SPEED = 560;
const STEP = 1 / 120;

/** Every five bounces increases pace; cap it to keep the game playable. */
export function difficultyForScore(score) {
  const level = Math.min(6, 1 + Math.floor(Math.max(0, score) / 5));
  const pace = 1 + (level - 1) * 0.12;
  return { level, gravity: GRAVITY * pace, bounceSpeed: BOUNCE_SPEED * Math.sqrt(pace) };
}

export class BallGame {
  constructor(width = 800) {
    this.reset(width);
  }

  reset(width = this.width) {
    this.width = width;
    this.ball = { x: width / 2, y: 100, vx: 0, vy: 0, radius: BALL_RADIUS };
    this.score = 0;
    this.status = 'waiting';
    this.contact = false;
    this.cooldown = 0;
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
      this.step(dt, finger);
      remaining -= dt;
    }
  }

  step(dt, finger) {
    const ball = this.ball;
    const difficulty = difficultyForScore(this.score);
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
    const touching = distance <= ball.radius + FINGER_RADIUS;
    // Separate before rearming. A cooldown also rejects jitter after contact.
    if (distance > ball.radius + FINGER_RADIUS + 8) this.contact = false;
    if (touching && !this.contact && this.cooldown === 0 && ball.vy > 0 && finger.y >= ball.y) {
      ball.vy = -difficultyForScore(this.score + 1).bounceSpeed;
      ball.vx = Math.max(-180, Math.min(180, (ball.x - finger.x) * 7));
      this.score += 1;
      this.contact = true;
      this.cooldown = 0.2;
    }
    if (ball.y - ball.radius > ARENA_HEIGHT) this.status = 'over';
  }
}
