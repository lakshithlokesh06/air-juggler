import test from 'node:test';
import assert from 'node:assert/strict';
import { BallGame } from '../js/physics.js';
import { GameLoop } from '../js/game-loop.js';

function playing() {
  const game = new BallGame(800);
  game.start({ x: 400, y: 400 });
  return game;
}

test('waits for a hand before starting and resets score and motion', () => {
  const game = new BallGame();
  game.advance(1, null);
  assert.equal(game.ball.y, 100);
  game.start(null);
  assert.equal(game.status, 'waiting');
  game.start({ x: 300, y: 400 });
  assert.equal(game.ball.x, 300);
  game.score = 3;
  game.reset();
  assert.equal(game.score, 0);
  assert.equal(game.ball.vy, 0);
  assert.equal(game.status, 'waiting');
});

test('gravity yields equivalent motion at 30, 60, and 120 FPS', () => {
  const positions = [30, 60, 120].map((fps) => {
    const game = playing();
    for (let frame = 0; frame < fps / 2; frame++) game.advance(1 / fps, null);
    return game.ball.y;
  });
  for (const y of positions) assert.ok(Math.abs(y - 197.5) < 0.001);
});

test('descending contact scores once and launches the ball upward', () => {
  const game = playing();
  game.ball.y = 300;
  game.ball.vy = 100;
  const finger = { x: 400, y: 330 };
  game.advance(1 / 120, finger);
  assert.equal(game.score, 1);
  assert.ok(game.ball.vy < 0);
  for (let frame = 0; frame < 12; frame++) {
    game.advance(1 / 120, { x: game.ball.x, y: game.ball.y + 10 });
  }
  assert.equal(game.score, 1);
});

test('rearms only after separation and cooldown', () => {
  const game = playing();
  game.ball.y = 300;
  game.advance(1 / 120, { x: 400, y: 330 });
  for (let i = 0; i < 30; i++) game.advance(1 / 120, null);
  game.ball.y = 300;
  game.ball.vy = 100;
  game.advance(1 / 120, { x: 400, y: 330 });
  assert.equal(game.score, 2);
});

test('upward contact, a hand above the ball, and no hand do not score', () => {
  for (const [vy, finger] of [[-100, { x: 400, y: 330 }], [100, { x: 400, y: 280 }], [100, null]]) {
    const game = playing();
    game.ball.y = 300;
    game.ball.vy = vy;
    game.advance(1 / 120, finger);
    assert.equal(game.score, 0);
  }
});

test('falling below the arena on the last life ends the round and freezes scoring', () => {
  const game = playing();
  game.lives = 1;
  for (let i = 0; i < 120; i++) game.advance(1 / 60, null);
  assert.equal(game.status, 'over');
  const y = game.ball.y;
  game.advance(1, { x: game.ball.x, y: game.ball.y });
  assert.equal(game.ball.y, y);
  assert.equal(game.score, 0);
});

test('slow frames are bounded and arena resize keeps ball inside', () => {
  const game = playing();
  game.advance(10, null);
  assert.ok(game.ball.y < 102);
  game.resize(300);
  assert.equal(game.ball.x, 150);
});

test('restart keeps one animation loop and stop prevents further frames', () => {
  let id = 0;
  const pending = new Map();
  globalThis.requestAnimationFrame = (callback) => { pending.set(++id, callback); return id; };
  globalThis.cancelAnimationFrame = (frame) => pending.delete(frame);
  const overlay = {
    canvas: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    clear() {}, draw() {}, controlPoint: (hand) => hand,
  };
  const loop = new GameLoop(overlay, () => {}, () => {});
  loop.start();
  loop.start();
  assert.equal(pending.size, 1);
  loop.stop();
  assert.equal(pending.size, 0);
  loop.tick(1000);
  assert.equal(pending.size, 0);
});

test('stale hand samples are discarded', () => {
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  let observed;
  const overlay = {
    canvas: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    clear() {}, draw() {}, controlPoint(hand) { observed = hand; return hand; },
  };
  const loop = new GameLoop(overlay, () => {}, () => {});
  loop.start();
  loop.setHand({ x: 400, y: 300 });
  loop.tick(loop.handTime + 300);
  assert.equal(observed, null);
  assert.equal(loop.game.status, 'waiting');
  loop.stop();
});

test('difficulty progresses every five points and stops at level six', async () => {
  const { difficultyForScore } = await import('../js/physics.js');
  assert.equal(difficultyForScore(4).level, 1);
  assert.equal(difficultyForScore(5).level, 2);
  assert.equal(difficultyForScore(25).level, 6);
  assert.deepEqual(difficultyForScore(1000), difficultyForScore(25));
  assert.ok(difficultyForScore(10).gravity > difficultyForScore(5).gravity);
  assert.ok(difficultyForScore(10).bounceSpeed > difficultyForScore(5).bounceSpeed);
});

function loopHarness() {
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const states = [];
  const overlay = {
    canvas: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    clear() {}, draw() {}, controlPoint: (hand) => hand,
  };
  const loop = new GameLoop(overlay, (state, details) => states.push({ state, ...details }), () => {});
  loop.start();
  const frame = (time, hand = { x: 400, y: 470 }) => {
    loop.hand = hand;
    loop.handTime = time;
    loop.tick(time);
  };
  return { loop, frame, states };
}

test('countdown holds the ball for three seconds before release', () => {
  const { loop, frame, states } = loopHarness();
  frame(0);
  assert.equal(states.at(-1).countdown, 3);
  for (let time = 50; time <= 2950; time += 50) frame(time);
  assert.equal(loop.game.status, 'waiting');
  assert.equal(loop.game.ball.y, 100);
  frame(3000);
  frame(3050); // Accommodate floating-point rounding at the boundary.
  assert.equal(loop.game.status, 'playing');
  loop.stop();
});

test('losing the hand resets countdown and restart clears round state', () => {
  const { loop, frame } = loopHarness();
  frame(0);
  frame(100);
  assert.ok(loop.countdown < 3);
  frame(150, null);
  assert.equal(loop.countdown, null);
  frame(200);
  assert.equal(loop.countdown, 3);
  loop.pause();
  loop.game.score = 12;
  loop.start();
  assert.equal(loop.paused, false);
  assert.equal(loop.countdown, null);
  assert.equal(loop.game.score, 0);
  loop.stop();
});

test('pause freezes countdown and resume excludes elapsed paused time', () => {
  const { loop, frame } = loopHarness();
  frame(0);
  frame(100);
  loop.pause();
  const remaining = loop.countdown;
  frame(10000);
  assert.equal(loop.countdown, remaining);
  loop.resume();
  frame(20000);
  assert.equal(loop.countdown, remaining);
  frame(20050);
  assert.ok(loop.countdown < remaining);
  loop.stop();
});

test('pause freezes physics and score; game-over cannot resume', () => {
  const { loop, frame } = loopHarness();
  loop.game.start({ x: 400, y: 470 });
  frame(0);
  frame(50);
  loop.pause();
  const frozen = { ...loop.game.ball };
  frame(60000);
  assert.deepEqual(loop.game.ball, frozen);
  assert.equal(loop.game.score, 0);
  loop.resume();
  frame(70000);
  assert.deepEqual(loop.game.ball, frozen);
  loop.game.lives = 1;
  loop.game.ball.y = 650;
  frame(70050, null);
  assert.equal(loop.running, false);
  loop.pause();
  loop.resume();
  assert.equal(loop.running, false);
});


test('three misses consume exactly three lives while preserving score', () => {
  const game = playing();
  game.score = 7;
  for (const lives of [2, 1, 0]) {
    game.ball.y = 650;
    game.advance(0.05, null);
    assert.equal(game.lives, lives);
    assert.equal(game.score, 7);
    assert.equal(game.status, lives ? 'life-lost' : 'over');
    game.advance(0.05, null);
    assert.equal(game.lives, lives, 'one miss cannot drain multiple lives');
    if (lives) {
      game.prepareLife();
      assert.equal(game.ball.y, 100);
      assert.equal(game.ball.vy, 0);
      assert.equal(game.contact, false);
      game.start({ x: 400, y: 470 });
    }
  }
  game.prepareLife();
  assert.equal(game.status, 'over');
  game.reset();
  assert.equal(game.lives, 3);
  assert.equal(game.score, 0);
});

test('life reset waits, supports pause, then requires a fresh countdown', () => {
  const { loop, frame, states } = loopHarness();
  loop.game.start({ x: 400, y: 470 });
  frame(0);
  loop.game.ball.y = 650;
  frame(50, null);
  assert.equal(states.at(-1).state, 'life-lost');
  assert.equal(loop.game.lives, 2);
  loop.pause();
  frame(10000);
  assert.equal(loop.recovery, 1);
  loop.resume();
  frame(20000, null);
  for (let time = 20100; time <= 21200; time += 100) frame(time, null);
  assert.equal(loop.game.status, 'waiting');
  assert.equal(loop.countdown, null);
  frame(21250);
  assert.equal(loop.countdown, 3);
  assert.equal(loop.game.lives, 2);
  loop.stop();
});

test('pause freezes power-up duration and restart removes effects', () => {
  const { loop, frame } = loopHarness();
  loop.game.start({ x: 400, y: 470 });
  loop.game.powerUps.award(8);
  frame(0);
  loop.pause();
  frame(20000);
  assert.equal(loop.game.powerUps.remaining, 6);
  loop.resume();
  frame(30000);
  assert.equal(loop.game.powerUps.remaining, 6);
  loop.start();
  assert.equal(loop.game.powerUps.type, null);
  assert.equal(loop.game.powerUps.nextScore, 8);
  loop.stop();
});

test('unchanged frames do not repeatedly notify the UI', () => {
  const { loop, frame, states } = loopHarness();
  frame(0, null);
  const count = states.length;
  frame(16, null);
  frame(32, null);
  assert.equal(states.length, count);
  loop.pause();
  assert.equal(states.at(-1).state, 'paused');
  loop.stop();
});
