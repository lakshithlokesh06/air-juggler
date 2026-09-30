import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../js/audio.js';
import { GameFeedback } from '../js/feedback.js';

function fakeContext() {
  const nodes = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    async resume() { this.state = 'running'; },
    createOscillator() {
      const node = { frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } };
      nodes.push(node);
      return node;
    },
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
  };
  return { context, nodes };
}

test('audio is off and lazy until explicitly enabled', async () => {
  let created = 0;
  const { context, nodes } = fakeContext();
  const audio = new GameAudio(() => { created++; return context; });
  audio.play('bounce');
  assert.equal(created, 0);
  assert.equal(nodes.length, 0);
  assert.equal(await audio.enable(), true);
  audio.play('bounce');
  assert.equal(created, 1);
  assert.equal(nodes.length, 2);
  audio.mute();
  assert.ok(nodes.every((node) => node.stopped));
  assert.equal(audio.voices.size, 0);
  audio.play('level-up');
  assert.equal(nodes.length, 2);
});

test('unsupported or blocked audio degrades to silent play', async () => {
  for (const factory of [() => null, () => { throw new Error('unsupported'); }, () => ({ state: 'suspended', resume: async () => { throw new Error('blocked'); } })]) {
    const audio = new GameAudio(factory);
    assert.equal(await audio.enable(), false);
    assert.equal(audio.muted, true);
    assert.doesNotThrow(() => audio.play('bounce'));
  }
});

test('muting during pending resume cannot re-enable audio', async () => {
  let resolve;
  const { context } = fakeContext();
  context.resume = () => new Promise((done) => { resolve = done; });
  const audio = new GameAudio(() => context);
  const pending = audio.enable();
  audio.mute();
  context.state = 'running';
  resolve();
  assert.equal(await pending, false);
  assert.equal(audio.muted, true);
});

test('all cues schedule short voices and ended voices are released', async () => {
  const { context, nodes } = fakeContext();
  const audio = new GameAudio(() => context);
  await audio.enable();
  for (const name of ['bounce', 'countdown', 'go', 'level-up', 'game-over']) audio.play(name);
  assert.equal(nodes.length, 10);
  for (const node of nodes) node.onended();
  assert.equal(audio.voices.size, 0);
  context.state = 'suspended';
  audio.play('bounce');
  assert.equal(nodes.length, 10, 'suspended cues are dropped, never queued');
});

test('feedback deduplicates countdown, bounce, level-up, and game-over', () => {
  const cues = [];
  let bounces = 0;
  const levels = [];
  const feedback = new GameFeedback({ play: (cue) => cues.push(cue), silence() {} }, () => bounces++, (level) => levels.push(level));
  const update = (state, score, level, countdown = null) => feedback.update(state, { score, level, countdown });
  update('countdown', 0, 1, 3);
  update('countdown', 0, 1, 3);
  update('countdown', 0, 1, 2);
  update('paused', 0, 1, 2);
  update('countdown', 0, 1, 2);
  update('countdown', 0, 1, 1);
  update('playing', 0, 1);
  update('playing', 1, 1);
  update('playing', 1, 1);
  update('playing', 5, 2);
  update('game-over', 5, 2);
  update('game-over', 5, 2);
  assert.deepEqual(cues, ['countdown', 'countdown', 'countdown', 'go', 'bounce', 'level-up', 'game-over']);
  assert.equal(bounces, 2);
  assert.deepEqual(levels, [2]);
  feedback.reset();
  update('countdown', 0, 1, 3);
  assert.equal(cues.at(-1), 'countdown');
});

test('life-loss audio is distinct and not replayed by pause/resume', () => {
  const cues = [];
  const feedback = new GameFeedback({ play: (cue) => cues.push(cue), silence() {} });
  const details = { score: 0, level: 1, countdown: null };
  feedback.update('life-lost', details);
  feedback.update('life-lost', details);
  feedback.update('paused', details);
  feedback.update('life-lost', details);
  assert.deepEqual(cues, ['life-lost']);
  feedback.update('waiting', details);
  feedback.update('countdown', { ...details, countdown: 3 });
  assert.equal(cues.at(-1), 'countdown');
});
