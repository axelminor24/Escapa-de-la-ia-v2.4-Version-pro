import { updateRoom } from './cloud-store.mjs';
import { GameError } from './game.mjs';
import { assets } from './site-assets.mjs';

const encoder = new TextEncoder();
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...extra } });
async function sign(key, text) {
  const secret = await crypto.subtle.importKey('raw', encoder.encode(key), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', secret, encoder.encode(text))), b => b.toString(16).padStart(2,'0')).join('');
}
function equal(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i=0;i<b.length;i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
async function cookieValue(env, role, expires) { return `${expires}.${await sign(env.SESSION_KEY, `${role}:${expires}`)}`; }
async function allowed(req, env, role) {
  const value = req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`escape_${role}=`))?.slice(`escape_${role}=`.length);
  if (!value) return false;
  const expires = Number(value.split('.')[0]);
  if (!Number.isSafeInteger(expires) || expires < Date.now() || expires > Date.now() + 86410000) return false;
  return equal(value, await cookieValue(env, role, expires));
}
async function grant(env, role) {
  return json({ ok:true }, 200, { 'Set-Cookie':`escape_${role}=${await cookieValue(env,role,Date.now()+86400000)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400` });
}
async function readBody(req) {
  if (Number(req.headers.get('content-length')) > 16384) throw new GameError('Solicitud demasiado grande.',413);
  const reader = req.body?.getReader(); const parts=[]; let size=0;
  if (!reader) throw new GameError('Faltan datos.',400);
  while (true) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>16384){await reader.cancel();throw new GameError('Solicitud demasiado grande.',413);} parts.push(value); }
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  try { const body=JSON.parse(new TextDecoder().decode(bytes)); if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();return body; }
  catch { throw new GameError('Datos inválidos.',400); }
}
export default {
  async fetch(req, env) {
    try {
      const url=new URL(req.url), path=url.pathname;
      if(path.startsWith('/api/')) {
        if(!env.CONTROL_KEY || !env.SESSION_KEY || env.SESSION_KEY.length<24 || !env.DB)return json({error:'El sitio todavía se está preparando.'},503);
        if(req.method==='GET') {
          if(path==='/api/config')return json({transport:'poll',requiresCode:true});
          if(path==='/api/state') {
            const role=url.searchParams.get('role');
            if(role==='control'&&!await allowed(req,env,'operator'))return json({error:'Ingresá la clave del coordinador.'},401);
            const safeRole=role==='challenges'&&!await allowed(req,env,'player')?undefined:role;
            return json((await updateRoom(env.DB,{role:safeRole,client:url.searchParams.get('client')})).snapshot);
          }
          if(path==='/api/links') {
            if(!await allowed(req,env,'operator'))return json({error:'Ingresá la clave del coordinador.'},401);
            return json({control:`${url.origin}/control`,stations:[{display:`${url.origin}/pantalla`,challenges:`${url.origin}/desafios/`}]});
          }
          return json({error:'Ruta inexistente.'},404);
        }
        if(req.method!=='POST')return json({error:'Método no permitido.'},405);
        if(req.headers.get('X-Escape-Request')!=='1'||!req.headers.get('content-type')?.startsWith('application/json')||(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'Solicitud no autorizada.'},403);
        const body=await readBody(req);
        if(path==='/api/operator') {
          const id=await sign(env.SESSION_KEY,req.headers.get('cf-connecting-ip')||'shared-login');
          const now=Date.now();
          const rate=await env.DB.prepare('INSERT INTO escape_login_attempts (id, attempts, window_start) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END, window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING attempts').bind(id,now,now-60000,now-60000).first();
          if(rate.attempts>8)return json({error:'Demasiados intentos. Esperá un minuto y volvé a ingresar la clave.'},429);
          if(!equal(body.key,env.CONTROL_KEY))return json({error:'La clave del coordinador no es correcta.'},401);
          await env.DB.prepare('DELETE FROM escape_login_attempts WHERE id = ? OR window_start < ?').bind(id,now-3600000).run();
          return grant(env,'operator');
        }
        if(path==='/api/player-access') {
          // Participants enter through the public challenges URL. This cookie
          // only permits answers; coordinator commands still require the key.
          return grant(env,'player');
        }
        if(path==='/api/logout')return json({ok:true},200,{'Set-Cookie':'escape_operator=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
        if(path!=='/api/control'&&path!=='/api/player')return json({error:'Ruta inexistente.'},404);
        const control=path==='/api/control';
        if(!await allowed(req,env,control?'operator':'player'))return json({error:control?'Ingresá la clave del coordinador.':'Recargá la página de desafíos para volver a conectarte.'},401);
        const result=await updateRoom(env.DB,{action:control?'control':'player',body});
        return json(result,result.code);
      }
      if(!['GET','HEAD'].includes(req.method))return json({error:'Método no permitido.'},405);
      if(path==='/')return Response.redirect(`${url.origin}/control`,302);
      if(path==='/desafios')return Response.redirect(`${url.origin}/desafios/`,302);
      const entry=assets[path==='/control'||path==='/pantalla'?'/index.html':path==='/desafios/'?'/desafios/index.html':path];
      if(!entry)return new Response('Página no encontrada',{status:404});
      return new Response(req.method==='HEAD'?null:entry.body,{headers:{'Content-Type':entry.type,'Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
    } catch(error) {
      if(!(error instanceof GameError))console.error('Escape room request failed',error);
      return json({error:error instanceof GameError?error.message:'No se pudo conectar con la partida. Reintentá en un momento.'},error instanceof GameError?error.status:503);
    }
  }
};
