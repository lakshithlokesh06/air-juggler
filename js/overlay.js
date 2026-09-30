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
    this.resizeObserver = new ResizeObserver(() => this.draw(this.hand));
    this.resizeObserver.observe(canvas);
  }

  draw(hand) {
    this.hand = hand;
    const { width, height } = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const ctx = this.context;
    if (!ctx || !width || !height || !this.video.videoWidth) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
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
    ctx.arc(x, y, 15, 0, Math.PI * 2);
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

  clear() {
    this.draw(null);
  }
}
