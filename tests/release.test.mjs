import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BallGame } from '../js/physics.js';
import { MODES } from '../js/modes.js';

for (const mode of Object.values(MODES)) {
  test(`${mode.name}: bounce, miss, and replay preserve the selected mode`, () => {
    const game = new BallGame();
    game.reset(800, mode.id);
    const finger = { x: 400, y: 470 };
    game.start(finger);
    game.ball.x = 400;
    game.ball.y = 440;
    game.ball.vy = 100;
    game.advance(0.01, finger);
    assert.equal(game.score, 1);
    game.ball.y = 650;
    game.advance(0.05, null);
    assert.equal(game.score, 1);
    assert.equal(game.status, 'life-lost');
    assert.equal(game.lives, mode.lives === null ? null : mode.lives - 1);
    game.prepareLife();
    assert.equal(game.status, 'waiting');
    game.reset(800, mode.id);
    assert.equal(game.score, 0);
    assert.equal(game.mode.id, mode.id);
    assert.equal(game.lives, mode.lives);
  });
}

test('release markup has unique IDs, help, skip navigation and shortcut opt-out', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['game-workspace', 'about', 'camera-help', 'keyboard-shortcut']) assert.ok(ids.includes(id));
  assert.match(html, /href="#game-workspace"/);
  assert.match(html, /<noscript>/);
});
