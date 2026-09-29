import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomServer } from './server.mjs';

test('three independent clients share state; participant roles cannot control the clock', async t => {
  let now = 100000;
  const room = createRoomServer({ dataFile: false, now: () => now });
  await new Promise(resolve => room.server.listen(0, '127.0.0.1', resolve));
  t.after(() => room.stop());
  const base = `http://127.0.0.1:${room.server.address().port}`;
  const headers = { 'Content-Type':'application/json', 'X-Escape-Request':'1' };
  const post = (url, data, cookie) => fetch(base+url, {method:'POST',headers:{...headers,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
  const auth = await post('/api/operator', {}); assert.equal(auth.status,200);
  const cookie = auth.headers.get('set-cookie').split(';')[0];
  const first = await (await fetch(base+'/api/state')).json();
  assert.equal((await post('/api/control',{action:'START',runId:first.runId,requestId:'bad'})).status,403);
  const streams = [];
  for (const role of ['control','display','challenges']) {
    const response = await fetch(`${base}/api/events?role=${role}`, {headers:role==='control'?{Cookie:cookie}:{}});
    assert.equal(response.status,200); const reader=response.body.getReader(); streams.push(reader);
  }
  t.after(async () => { for(const reader of streams)await reader.cancel(); });
  const started = await (await post('/api/control',{action:'SKIP_INTRO',runId:first.runId,requestId:'start'},cookie)).json();
  assert.equal(started.snapshot.status,'RUNNING');
  now += 6000;
  const states = await Promise.all([0,1,2].map(async () => (await fetch(base+'/api/state')).json()));
  assert.deepEqual(states.map(s=>s.remainingSec),[894,894,894]);
  assert.deepEqual(states[0].peers,{control:1,display:1,challenges:1});
  await post('/api/control',{action:'PAUSE',runId:first.runId,requestId:'pause'},cookie); now+=12000;
  assert.equal((await (await fetch(base+'/api/state')).json()).remainingSec,894);
  assert.equal((await post('/api/player',{action:'hint',view:0,stage:'sequence',runId:first.runId,requestId:'paused'})).status,409);
  const foreign = await fetch(base+'/api/operator',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:'{}'});
  assert.equal(foreign.status,403);
  assert.equal((await fetch(base+'/.local-data/session.json')).status,404);
  assert.equal((await fetch(base+'/network/game.mjs')).status,404);
});
