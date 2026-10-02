import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, stageKey } from './game.mjs';

function fixture() {
  let now = 100000, id = 0;
  const game = new Game({ now: () => now });
  const input = extra => ({ runId: game.data.runId, requestId: `request-${++id}`, ...extra });
  const control = (action, extra) => game.control(input({ action, ...extra }));
  const player = (action, fields = {}, view = game.data.board.view) => game.player(input({ action, fields, view, stage: stageKey({ ...game.data.board, view }) }));
  return { game, input, control, player, advance: ms => { now += ms; return game.snapshot(); } };
}
test('one clock advances, pauses exactly, resumes, and repeated start does not reset it', () => {
  const f = fixture(); f.control('SKIP_INTRO');
  assert.equal(f.advance(5500).remainingSec, 895);
  f.control('SKIP_INTRO'); assert.equal(f.advance(1500).remainingSec, 893);
  f.control('PAUSE'); assert.equal(f.advance(8000).remainingSec, 893);
  f.control('START'); assert.equal(f.advance(3000).remainingSec, 890);
});
test('intro completion and paused intro cannot restart the clock', () => {
  const f = fixture(); f.control('START'); assert.equal(f.advance(10000).status, 'INTRO');
  f.control('PAUSE'); assert.equal(f.advance(20000).status, 'PAUSED');
  f.control('START'); assert.equal(f.advance(1000).remainingSec, 899);
  f.control('RESET'); f.control('START'); assert.equal(f.advance(30000).status, 'INTRO');
  f.control('SKIP_INTRO'); assert.equal(f.game.snapshot().status, 'RUNNING');
});
test('timeline fires once at each threshold, including when ticks are delayed', () => {
  const f = fixture(); f.control('SKIP_INTRO'); f.advance(300000); f.advance(150000); f.advance(270000); f.advance(1000);
  assert.deepEqual(f.game.data.events.filter(e => e.kind === 'timeline').map(e => e.trackId), ['min5_no_progress','halfway','3min']);
});
test('conditional audio reads shared progress at minute five', () => {
  const f = fixture(); f.control('SKIP_INTRO'); f.control('CHALLENGE', { number: 1 }); f.advance(300000);
  assert.equal(f.game.data.events.find(e => e.kind === 'timeline').trackId, 'min5_progress');
});
test('server expiration rejects late answers and does not replay game over', () => {
  const f = fixture(); f.control('SKIP_INTRO'); assert.equal(f.advance(900000).status, 'GAMEOVER');
  assert.throws(() => f.player('validatecode', { stationCode: '38457201' })); f.advance(60000);
  assert.equal(f.game.data.events.filter(e => e.trackId === 'gameover').length, 1);
});
test('all original puzzles remain playable and fourth challenge waits for final lock', () => {
  const f = fixture(); f.player('TEAM', { team: 'Resistencia' }); f.control('SKIP_INTRO');
  assert.equal(f.player('validatecode', { stationCode: 'wrong' }).bad, true);
  f.player('validatecode', { stationCode: '3-8-4-5-7-2-0-1' }); f.player('validatecode', { stationCode: '1' });
  f.player('check', { names: { 0:'Motherboard', 1:'Memoria RAM DDR4', 2:'Fuente de alimentación' } });
  f.player('validatecode', { stationCode: '6' });
  f.player('checkrobot', { robotText: '1. Girar a la derecha, 2. Avanzar, 3. derecha, 4. avanzar, 5. avanzar' });
  f.player('validatecode', { stationCode: '3' });
  f.player('checkbinary', { binaryCards: ['10','13','1111','111','10010','17'] });
  assert.equal(f.game.data.status, 'RUNNING'); assert.deepEqual(f.game.data.board.solved, [0,1,2,3]);
  assert.equal(f.player('unlock', { lock: '1111' }, 4).bad, true);
  f.player('unlock', { lock: '1635' }, 4); assert.equal(f.game.data.status, 'VICTORY');
  const remaining = f.game.snapshot().remainingSec; assert.equal(f.advance(900000).remainingSec, remaining);
});
test('out-of-order puzzle and forged victory attempts are rejected', () => {
  const f = fixture(); f.control('SKIP_INTRO');
  assert.throws(() => f.player('checkbinary', { binaryCards: ['10','13','1111','111','10010','17'] }, 3));
  assert.throws(() => f.player('WIN')); assert.throws(() => f.player('RESET'));
  assert.equal(f.game.data.status, 'RUNNING'); assert.deepEqual(f.game.data.board.solved, []);
});
test('duplicate response request does not become a different puzzle action', () => {
  const f = fixture(); f.control('SKIP_INTRO');
  const request = f.input({ action: 'validatecode', view: 0, stage: 'sequence', fields: { stationCode: '38457201' } });
  f.game.player(request); f.game.player(request);
  assert.equal(f.game.data.board.failures.board, undefined);
  assert.equal(f.game.data.board.solved.length, 0);
  assert.throws(() => f.game.player({ ...request, requestId: 'new' }));
});
test('hints are single use and three errors enable guidance', () => {
  const f = fixture(); f.control('SKIP_INTRO'); f.player('hint'); f.player('hint');
  for (let i=0;i<3;i++) f.player('validatecode', { stationCode: 'bad' });
  assert.deepEqual(f.game.data.board.hints, [0]); assert.equal(f.game.data.board.autoShown.sequence, true);
});
test('reset rejects in-flight answers from the previous run and clears progress', () => {
  const f = fixture(); f.control('SKIP_INTRO'); const old = f.input({ action:'hint', view:0, stage:'sequence' });
  f.control('CHALLENGE', {number:1}); f.control('RESET'); assert.throws(() => f.game.player(old));
  assert.equal(f.game.snapshot().remainingSec, 900); assert.equal(f.game.data.status, 'IDLE'); assert.deepEqual(f.game.data.board.solved, []);
});
test('restored process keeps elapsed time and progress, then waits in pause', () => {
  const f = fixture(); f.control('SKIP_INTRO'); f.control('CHALLENGE', {number:1}); f.advance(42500);
  const recovered = new Game({ saved:f.game.serialize(), now: () => 1000000 });
  assert.equal(recovered.snapshot().remainingSec, 858); assert.equal(recovered.data.status, 'PAUSED'); assert.deepEqual(recovered.data.board.solved, [0]);
});
test('manual rollback invalidates later stages', () => {
  const f = fixture(); f.control('SKIP_INTRO'); for(let number=1;number<=4;number++)f.control('CHALLENGE',{number});
  f.control('CHALLENGE',{number:2}); assert.deepEqual(f.game.data.board.solved,[0]); assert.equal(f.game.data.board.view,1); assert.equal(f.game.data.board.footSince,null);
});

test('AI reacts once to errors and the first hint, without changing the clock or answers', () => {
  const f = fixture(); f.control('SKIP_INTRO'); f.advance(20000);
  for (let i = 0; i < 5; i++) f.player('validatecode', {stationCode:'bad'});
  f.player('hint'); f.player('hint');
  assert.equal(f.game.data.events.filter(e => e.trackId === 'ai_errors').length,1);
  assert.equal(f.game.data.events.filter(e => e.trackId === 'ai_hint').length,1);
  assert.equal(f.game.snapshot().remainingSec,880);
  assert.deepEqual(f.game.data.board.solved,[]);
  assert.equal(f.game.data.board.failures.sequence,5);
  f.control('RESET'); f.control('SKIP_INTRO'); f.player('hint');
  assert.equal(f.game.data.events.filter(e => e.trackId === 'ai_hint').length,1);
});
