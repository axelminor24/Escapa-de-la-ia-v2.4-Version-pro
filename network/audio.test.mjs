import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/services/audioEngine.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/export const /g, 'const ')
  + '\nObject.assign(exports, { audioEngine, INITIAL_TRACKS });';

function setup() {
  const players = [], timers = new Map();
  let id = 0, oscillatorStarts = 0, oscillatorStops = 0;
  class Audio {
    paused = true;
    volume = 1;
    currentTime = 0;
    constructor() { players.push(this); }
    play() {
      this.paused = false;
      return new Promise((resolve, reject) => { this.resolvePlay = resolve; this.rejectPlay = reject; });
    }
    pause() { this.paused = true; }
  }
  const param = () => ({ setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), detune: param(), connect() {}, disconnect() {}, stop() { oscillatorStops++; }, start() { oscillatorStarts++; } });
  class AudioContext {
    state = 'running'; currentTime = 0;
    createGain = node; createBiquadFilter = node; createOscillator = node;
  }
  const exports = {};
  const setTimeout = (fn, ms) => { timers.set(++id, { fn, ms }); return id; };
  const clearTimeout = (key) => timers.delete(key);
  const window = { AudioContext, addEventListener() {}, removeEventListener() {}, setInterval: setTimeout, clearInterval: clearTimeout, setTimeout };
  vm.runInNewContext(source, { exports, eventLogService: { recordAudioEvent() {} }, window, Audio, setTimeout, clearTimeout, console });
  return { ...exports, players, timers, starts: () => oscillatorStarts, activeOscillators: () => oscillatorStarts - oscillatorStops };
}

test('stopping a voice test stops its player and ignores a late failure', async () => {
  const { audioEngine, INITIAL_TRACKS, players } = setup();
  let ends = 0;
  const result = audioEngine.testTrack(INITIAL_TRACKS.find(t => t.id === 'start'), undefined, () => ends++);
  assert.equal(players[1].paused, false);
  audioEngine.stopTest();
  assert.equal(await result, false);
  assert.equal(players[1].paused, true);
  players[1].rejectPlay(new Error('late failure'));
  await Promise.resolve();
  assert.equal(ends, 1);
});

test('pausing prevents a delayed ambient failure from restarting sound', async () => {
  const { audioEngine, players, starts } = setup();
  audioEngine.startAmbient();
  audioEngine.pauseAmbient();
  players[0].rejectPlay(new Error('late failure'));
  players[0].onerror();
  await Promise.resolve();
  assert.equal(players[0].paused, true);
  assert.equal(starts(), 0);
});

test('ambient preview stops the actual audio when its preview ends', async () => {
  const { audioEngine, INITIAL_TRACKS, players, timers } = setup();
  const result = audioEngine.testTrack(INITIAL_TRACKS[0]);
  assert.equal(players[0].paused, false);
  const expiry = [...timers.values()].find(t => t.ms === 3500);
  expiry.fn();
  assert.equal(await result, true);
  assert.equal(players[0].paused, true);
  assert.equal([...timers.values()].some(t => t.ms === 2000), false);
});

test('a shared pause cancels an ambient preview and clears its stop timer', async () => {
  const { audioEngine, INITIAL_TRACKS, timers } = setup();
  const result = audioEngine.testTrack(INITIAL_TRACKS[0]);
  audioEngine.pauseAmbient();
  assert.equal(await result, false);
  assert.equal([...timers.values()].some(t => t.ms === 3500), false);
});

test('a playing default audio file never gets a synthesized layer added by the watchdog', () => {
  const { audioEngine, players, timers, starts } = setup();
  audioEngine.startAmbient();
  players[0].currentTime = 4;
  players[0].onplaying();
  [...timers.values()].find(t => t.ms === 2000).fn();
  audioEngine.startAmbient();
  assert.equal(starts(), 0);
});

test('a file that starts after fallback takes over exclusively', () => {
  const { audioEngine, players, activeOscillators } = setup();
  audioEngine.startAmbient();
  players[0].onerror();
  assert.ok(activeOscillators() > 0);
  assert.equal(players[0].paused, true);
  players[0].paused = false;
  players[0].onplaying();
  assert.equal(activeOscillators(), 0);
});

test('a late error from the previous file cannot add fallback over a new upload', async () => {
  const { audioEngine, players, starts } = setup();
  audioEngine.startAmbient();
  const rejectOldFile = players[0].rejectPlay;
  audioEngine.setTrackBlobUrl('ambient', 'blob:uploaded-ambient');
  rejectOldFile(new Error('old file missing'));
  await Promise.resolve();
  assert.equal(players[0].src, 'blob:uploaded-ambient');
  assert.equal(starts(), 0);
});

test('narration waits for the full file before playing the next event', () => {
  const { audioEngine, INITIAL_TRACKS, players } = setup();
  const intro = INITIAL_TRACKS.find(t => t.id === 'start');
  const challenge = INITIAL_TRACKS.find(t => t.id === 'challenge_1');
  let completed = 0;
  audioEngine.enqueueNarration(intro, () => completed++);
  audioEngine.enqueueNarration(challenge);
  assert.equal(players[1].src, encodeURI(intro.defaultName));
  assert.equal(completed, 0);
  const finishIntro = players[1].onended;
  finishIntro();
  assert.equal(completed, 1);
  assert.equal(players[1].src, encodeURI(challenge.defaultName));
  finishIntro();
  assert.equal(completed, 1);
});

test('reset or pause cancels queued audio and stale completion cannot restart it', () => {
  const { audioEngine, INITIAL_TRACKS, players } = setup();
  let startedClock = false;
  audioEngine.enqueueNarration(INITIAL_TRACKS.find(t => t.id === 'start'), () => { startedClock = true; });
  audioEngine.enqueueNarration(INITIAL_TRACKS.find(t => t.id === 'challenge_1'));
  const staleEnd = players[1].onended;
  audioEngine.clearNarration();
  staleEnd();
  assert.equal(startedClock, false);
  assert.equal(players[1].paused, true);
  audioEngine.enqueueNarration(INITIAL_TRACKS.find(t => t.id === 'final_resistance'));
  audioEngine.enqueueNarration(INITIAL_TRACKS.find(t => t.id === 'victory'));
  assert.equal(players[1].src, 'IA-ultima-resistencia.mp3');
  players[1].onended();
  assert.equal(players[1].src, encodeURI(INITIAL_TRACKS.find(t => t.id === 'victory').defaultName));
});
