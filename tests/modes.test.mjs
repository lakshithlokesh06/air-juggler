import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, getMode } from '../js/modes.js';
import { BallGame, difficultyForScore } from '../js/physics.js';
import { GameLoop } from '../js/game-loop.js';
import { readHighScore, saveHighScore } from '../js/score.js';

test('mode settings balance lives, pace, boost frequency, and duration', () => {
  for (const [id, lives, interval, duration] of [['easy', 5, 6, 8], ['normal', 3, 8, 6], ['hard', 2, 12, 4], ['timed', null, 8, 4]]) {
    const game = new BallGame(800, id);
    assert.equal(game.lives, lives);
    assert.equal(game.powerUps.nextScore, interval);
    game.powerUps.award(interval);
    assert.equal(game.powerUps.remaining, duration);
  }
  assert.ok(difficultyForScore(10, 'easy').gravity < difficultyForScore(10, 'normal').gravity);
  assert.ok(difficultyForScore(10, 'hard').bounceSpeed > difficultyForScore(10, 'normal').bounceSpeed);
  assert.equal(difficultyForScore(100, 'hard').level, 6);
  assert.equal(getMode('unknown'), MODES.normal);
});

test('standard modes end after their own life limit; timed allows unlimited misses', () => {
  for (const id of ['easy', 'normal', 'hard']) {
    const game = new BallGame(800, id);
    for (let i = 0; i < MODES[id].lives; i++) {
      game.start({ x: 400, y: 400 });
      game.loseLife();
      game.prepareLife();
    }
    assert.equal(game.status, 'over');
    assert.equal(game.endReason, 'lives');
  }
  const timed = new BallGame(800, 'timed');
  for (let i = 0; i < 10; i++) {
    timed.start({ x: 400, y: 400 });
    timed.loseLife();
    timed.prepareLife();
  }
  assert.equal(timed.status, 'waiting');
  assert.equal(timed.misses, 10);
  assert.equal(timed.lives, null);
});

function timedLoop() {
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const states = [];
  const loop = new GameLoop({
    canvas: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    clear() {}, draw() {}, controlPoint: (hand) => hand,
  }, (state, details) => states.push({ state, ...details }), () => {});
  loop.start('timed');
  const frame = (time, hand = { x: 400, y: 470 }) => {
    loop.hand = hand; loop.handTime = time; loop.tick(time);
  };
  return { loop, frame, states };
}

test('challenge clock excludes first countdown, then expires before any late score', () => {
  const { loop, frame, states } = timedLoop();
  frame(0);
  for (let time = 50; time <= 3100; time += 50) frame(time);
  assert.equal(loop.game.status, 'playing');
  assert.ok(loop.remainingTime > 59.8);
  loop.game.score = 5;
  frame(63100);
  assert.equal(loop.remainingTime, 0);
  assert.equal(loop.game.score, 5);
  assert.equal(loop.running, false);
  assert.equal(states.at(-1).endReason, 'time');
  assert.equal(states.at(-1).state, 'game-over');
});

test('timer uses elapsed time despite boosts, recovery, missing hand, and slow frames', () => {
  const { loop, frame } = timedLoop();
  loop.game.start({ x: 400, y: 470 }); loop.clockStarted = true;
  loop.game.powerUps.award(8);
  frame(0);
  frame(1000);
  assert.equal(loop.remainingTime, 59);
  loop.game.loseLife(); loop.recovery = 1;
  frame(2000, null);
  assert.equal(loop.remainingTime, 58);
  loop.game.prepareLife();
  frame(3000, null);
  assert.equal(loop.remainingTime, 57);
  loop.stop();
});

test('pause freezes challenge clock and restart resets it without changing mode', () => {
  const { loop, frame } = timedLoop();
  loop.game.start({ x: 400, y: 470 }); loop.clockStarted = true;
  frame(0); frame(1000);
  loop.pause(); frame(20000);
  assert.equal(loop.remainingTime, 59);
  loop.resume(); frame(30000);
  assert.equal(loop.remainingTime, 59);
  frame(31000);
  assert.equal(loop.remainingTime, 58);
  loop.start();
  assert.equal(loop.remainingTime, 60);
  assert.equal(loop.clockStarted, false);
  assert.equal(loop.game.mode.id, 'timed');
  loop.start('hard');
  assert.equal(loop.remainingTime, null);
  assert.equal(loop.game.lives, 2);
  loop.stop();
});

test('best scores are isolated and legacy scores belong only to Normal', () => {
  const values = new Map([['air-juggler.high-score', '17']]);
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readHighScore('normal'), 17);
  assert.equal(readHighScore('easy'), 0);
  saveHighScore(5, 'easy'); saveHighScore(9, 'hard'); saveHighScore(12, 'timed');
  assert.equal(readHighScore('easy'), 5);
  assert.equal(readHighScore('hard'), 9);
  assert.equal(readHighScore('timed'), 12);
  assert.equal(readHighScore('normal'), 17);
  assert.equal(saveHighScore(2, 'easy'), 5);
  assert.equal(saveHighScore(NaN, 'hard'), 9);
  values.set('air-juggler.high-score.normal', '-3');
  assert.equal(readHighScore('normal'), 0);
});

test('blocked storage retains bests in the session per mode', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  saveHighScore(40, 'easy');
  saveHighScore(20, 'hard');
  assert.equal(readHighScore('easy'), 40);
  assert.equal(readHighScore('hard'), 20);
});
