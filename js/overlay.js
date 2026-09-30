import { ARENA_HEIGHT, FINGER_RADIUS } from './physics.js';

/** Match CSS object-fit: cover and the video's scaleX(-1) transform. */
export function mapVideoPoint(point, videoWidth, videoHeight, width, height) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  return {
    x: width - (point.x * scale + (width - videoWidth * scale) / 2),
    y: point.y * scale + (height - videoHeight * scale) / 2,
  };
}

export class HandOverlay {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.video = video;
    this.context = canvas.getContext('2d');
    this.hand = null;
    this.ball = null;
    this.effect = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver = new ResizeObserver(() => this.draw(this.hand, this.ball));
    this.resizeObserver.observe(canvas);
  }

  draw(hand, ball = null, dt = 0) {
    this.hand = hand;
    this.ball = ball;
    const { width, height } = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    const ctx = this.context;
    if (!ctx || !width || !height || !this.video.videoWidth) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (this.effect) {
      this.effect.remaining -= dt;
      if (this.effect.remaining <= 0) this.effect = null;
    }
    if (this.effect && !this.reducedMotion.matches) {
      const scale = height / ARENA_HEIGHT;
      const progress = 1 - this.effect.remaining / 0.35;
      ctx.beginPath();
      ctx.arc(this.effect.x * scale, this.effect.y * scale, (24 + progress * 26) * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(215, 250, 118, ${0.6 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (ball) {
      const scale = height / ARENA_HEIGHT;
      ctx.beginPath();
      ctx.arc(ball.x * scale, ball.y * scale, ball.radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = this.effect ? '#f5ffd9' : '#d7fa76';
      ctx.shadowColor = 'rgba(215, 250, 118, 0.5)';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    if (!hand) return;
    const map = (point) => mapVideoPoint(point, this.video.videoWidth, this.video.videoHeight, width, height);
    // Subtle dots show all 21 landmarks; a larger ring highlights the index tip.
    ctx.fillStyle = 'rgba(215, 250, 118, 0.65)';
    for (const point of hand.keypoints) {
      const { x, y } = map(point);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const tip = hand.keypoints.find((point) => point.name === 'index_finger_tip') ?? hand.keypoints[8];
    if (!tip) return;
    const { x, y } = map(tip);
    ctx.beginPath();
    ctx.arc(x, y, FINGER_RADIUS * height / ARENA_HEIGHT, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 43, 38, 0.6)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d7fa76';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  controlPoint(hand) {
    if (!hand || !this.video.videoWidth) return null;
    const tip = hand.keypoints.find((point) => point.name === 'index_finger_tip') ?? hand.keypoints[8];
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!tip || !width || !height) return null;
    const point = mapVideoPoint(tip, this.video.videoWidth, this.video.videoHeight, width, height);
    // Cropped-out fingertips cannot hit the ball.
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return null;
    return { x: point.x * ARENA_HEIGHT / height, y: point.y * ARENA_HEIGHT / height };
  }

  bounce(ball) {
    this.effect = { x: ball.x, y: ball.y, remaining: 0.35 };
  }

  clear() {
    this.effect = null;
    this.draw(null);
  }
}
