/** Translate state changes into one-shot feedback, never one sound per frame. */
export class GameFeedback {
  constructor(audio, onBounce = () => {}, onLevel = () => {}) {
    this.audio = audio;
    this.onBounce = onBounce;
    this.onLevel = onLevel;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.level = 1;
    this.countdown = null;
    this.state = 'idle';
    this.audio.silence();
  }

  update(state, details) {
    if (details.score < this.score) this.reset();
    if (state === 'waiting' && details.countdown === null) this.countdown = null;
    if (state === 'countdown' && details.countdown !== this.countdown) {
      this.audio.play('countdown');
      this.countdown = details.countdown;
    }
    if (state === 'playing' && this.state === 'countdown') this.audio.play('go');
    if (details.score > this.score) {
      this.onBounce();
      if (details.level > this.level) {
        this.audio.play('level-up');
        this.onLevel(details.level);
      } else this.audio.play('bounce');
    }
    if (state === 'life-lost' && this.state !== 'life-lost' && this.state !== 'paused') {
      this.audio.silence();
      this.audio.play('life-lost');
      this.countdown = null;
    }
    if (state === 'game-over' && this.state !== 'game-over') this.audio.play('game-over');
    if (state === 'paused') this.audio.silence();
    this.score = details.score;
    this.level = details.level;
    this.state = state;
  }
}
