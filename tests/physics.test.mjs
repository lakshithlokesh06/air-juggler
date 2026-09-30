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

test('falling fully below the arena ends the round and freezes scoring', () => {
  const game = playing();
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
