import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from './cloud-worker.mjs';
import { updateRoom } from './cloud-store.mjs';

export function database() {
  const sqlite = new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  return { close:()=>sqlite.close(), prepare(sql) {
    let args=[];
    return { bind(...values){args=values;return this;}, async first(){await Promise.resolve();return sqlite.prepare(sql).get(...args);},async run(){await Promise.resolve();const result=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}};} };
  }};
}
test('cloud requests preserve the running clock across isolates and serialize concurrent answers', async()=>{
  const db=database();let now=100000;
  try {
    const initial=(await updateRoom(db,{now:()=>now})).snapshot;
    const input=(action,id,extra={})=>({runId:initial.runId,requestId:id,action,...extra});
    await updateRoom(db,{now:()=>now,action:'control',body:input('SKIP_INTRO','start')});
    now+=10000;
    const states=await Promise.all(['control','display','challenges'].map(role=>updateRoom(db,{now:()=>now,role,client:role+'-12345678'})));
    assert.ok(states.every(s=>s.snapshot.status==='RUNNING'&&s.snapshot.remainingSec===890));
    const request=input('validatecode','answer',{view:0,stage:'sequence',fields:{stationCode:'38457201'}});
    await Promise.all([updateRoom(db,{now:()=>now,action:'player',body:request}),updateRoom(db,{now:()=>now,action:'player',body:request})]);
    const current=(await updateRoom(db,{now:()=>now})).snapshot;
    assert.equal(current.board.boardSince,now);
    assert.equal(current.board.failures.board,undefined);
    assert.equal(current.peers.display,1);assert.equal(current.peers.control,1);
    await updateRoom(db,{now:()=>now,action:'control',body:input('PAUSE','pause')});
    now+=15000;
    assert.equal((await updateRoom(db,{now:()=>now})).snapshot.remainingSec,890);
    await updateRoom(db,{now:()=>now,action:'control',body:input('RESET','reset')});
    const stale=await updateRoom(db,{now:()=>now,action:'player',body:request});assert.equal(stale.code,409);
    assert.equal(stale.snapshot.board.boardSince,null);
  }finally{db.close();}
});
test('public website protects coordinator commands, participant writes, cookies, and link disclosure',async()=>{
  const db=database(), env={DB:db,CONTROL_KEY:'test-secret-for-local-tests-only-123456',SESSION_KEY:'session-key-for-local-tests-only-123456'};
  const call=(path,body,cookie='',origin='https://escape.test')=>worker.fetch(new Request('https://escape.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Escape-Request':'1',Origin:origin,Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env);
  try{
    assert.equal((await call('/api/control',{})).status,401);
    assert.equal((await call('/api/links')).status,401);
    assert.equal((await call('/api/player',{})).status,401);
    assert.equal((await call('/api/operator',{key:'wrong'})).status,401);
    assert.equal((await call('/api/operator',{key:env.CONTROL_KEY},'','https://other.test')).status,403);
    const operator=await call('/api/operator',{key:env.CONTROL_KEY});assert.equal(operator.status,200);
    const cookie=operator.headers.get('set-cookie').split(';')[0];
    assert.match(operator.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
    const links=await(await call('/api/links',null,cookie)).json();
    const token=new URLSearchParams(new URL(links.stations[0].challenges).hash.slice(1)).get('acceso');
    const participant=await call('/api/player-access',{token});assert.equal(participant.status,200);
    const participantCookie=participant.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/api/control',{},participantCookie)).status,401);
    const state=await(await call('/api/state')).json();
    assert.equal((await call('/api/control',{action:'SKIP_INTRO',runId:state.runId,requestId:'start'},cookie)).status,200);
    const result=await(await call('/api/player',{action:'validatecode',runId:state.runId,requestId:'answer',view:0,stage:'sequence',fields:{stationCode:'38457201'}},participantCookie)).json();
    assert.notEqual(result.snapshot.board.boardSince,null);
    assert.equal((await call('/api/control',{},cookie+'tampered')).status,401);
    for(let i=0;i<8;i++)assert.equal((await call('/api/operator',{key:'wrong'})).status,401);
    assert.equal((await call('/api/operator',{key:'wrong'})).status,429);
  }finally{db.close();}
});
