import test from 'node:test';
import assert from 'node:assert/strict';
import { PowerUps } from '../js/power-ups.js';
import { BallGame } from '../js/physics.js';

test('boosts arrive at milestones, alternate, expire, and never stack', () => {
  const power = new PowerUps();
  power.award(7);
  assert.equal(power.type, null);
  power.award(8);
  assert.equal(power.type, 'slow-motion');
  power.tick(2);
  power.award(8);
  assert.equal(power.remaining, 4);
  power.award(16);
  assert.equal(power.remaining, 4, 'active reward is not refreshed');
  power.tick(4);
  assert.equal(power.type, null);
  assert.equal(power.timeScale, 1);
  power.award(24);
  assert.equal(power.type, 'wide-touch');
  assert.equal(power.radiusMultiplier, 2);
  power.tick(6);
  assert.equal(power.radiusMultiplier, 1);
});

test('slow motion slows physics but consumes normal active-play duration', () => {
  const slow = new BallGame();
  const normal = new BallGame();
  for (const game of [slow, normal]) game.start({ x: 400, y: 400 });
  slow.powerUps.award(8);
  for (let i = 0; i < 10; i++) {
    slow.advance(0.05, null);
    normal.advance(0.05, null);
  }
  assert.ok(slow.ball.y < normal.ball.y);
  assert.ok(Math.abs(slow.powerUps.remaining - 5.5) < 0.00001);
});

test('wide touch matches a larger collision radius and does not repeat score', () => {
  const game = new BallGame();
  game.start({ x: 400, y: 400 });
  game.powerUps.award(8);
  game.powerUps.tick(6);
  game.powerUps.award(16);
  assert.equal(game.fingerRadius, 30);
  game.ball.y = 300;
  game.ball.vy = 50;
  game.advance(1 / 120, { x: 400, y: 345 });
  assert.equal(game.score, 1, 'contact beyond normal 35-unit reach succeeds');
  game.advance(1 / 120, { x: 400, y: 345 });
  assert.equal(game.score, 1);
  game.powerUps.clear();
  assert.equal(game.fingerRadius, 15);
});

test('life loss clears effects but retains reward milestones and difficulty', () => {
  const game = new BallGame();
  game.start({ x: 400, y: 400 });
  game.score = 8;
  game.powerUps.award(8);
  game.loseLife();
  assert.equal(game.powerUps.type, null);
  assert.equal(game.powerUps.nextScore, 16);
  assert.equal(game.score, 8);
  game.prepareLife();
  assert.equal(game.powerUps.type, null);
  game.powerUps.award(16);
  assert.equal(game.powerUps.type, 'wide-touch');
});

test('a valid eighth bounce awards a boost without extra scoring', () => {
  const game = new BallGame();
  game.start({ x: 400, y: 400 });
  game.score = 7;
  game.ball.y = 300;
  game.ball.vy = 50;
  game.advance(1 / 120, { x: 400, y: 330 });
  assert.equal(game.score, 8);
  assert.equal(game.powerUps.type, 'slow-motion');
});
