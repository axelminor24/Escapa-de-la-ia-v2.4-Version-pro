import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';
import { Game, GameError } from './game.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
export function addresses() {
  return [...new Set(Object.values(networkInterfaces()).flat().filter(a => a?.family === 'IPv4' && !a.internal).map(a => a.address))];
}
export function createRoomServer({ root = resolve(here, '..'), dataFile = resolve(root, '.local-data/session.json'), now, durationMs } = {}) {
  const saved = dataFile && existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : undefined;
  const game = new Game({ now, durationMs, saved });
  const secret = randomBytes(32).toString('hex');
  const peers = new Map();
  const hostnames = new Set(['localhost', '127.0.0.1', '[::1]', ...addresses()]);
  let lastSave = 0, heartbeat;
  function persist() {
    if (!dataFile) return;
    mkdirSync(dirname(dataFile), { recursive: true });
    writeFileSync(`${dataFile}.tmp`, JSON.stringify(game.serialize()));
    renameSync(`${dataFile}.tmp`, dataFile);
    lastSave = Date.now();
  }
  const authorized = req => req.headers.cookie?.split(';').some(v => v.trim() === `escape_operator=${secret}`);
  const counts = () => Object.fromEntries(['control','display','challenges'].map(role => [role, [...peers.values()].filter(p => p === role).length]));
  const snapshot = () => ({ ...game.snapshot(), peers: counts() });
  function broadcast() {
    const data = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const response of peers.keys()) {
      if (response.writableLength > 262144 || response.destroyed) { peers.delete(response); response.destroy(); }
      else response.write(data);
    }
  }
  function json(res, code, data, extra = {}) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.end(JSON.stringify(data));
  }
  async function readBody(req) {
    let bytes = 0; const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) throw new GameError('La solicitud es demasiado grande.', 413);
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new GameError('La solicitud no contiene datos válidos.', 400); }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (!hostnames.has(url.hostname)) return json(res, 403, { error: 'Usá la dirección local que muestra el coordinador.' });
      if (req.method === 'POST') {
        if (req.headers['x-escape-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json') || (req.headers.origin && req.headers.origin !== url.origin)) return json(res, 403, { error: 'Solicitud no autorizada.' });
        const body = await readBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new GameError('Datos inválidos.', 400);
        if (url.pathname === '/api/operator') {
          if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return json(res, 403, { error: 'El control se habilita en la computadora principal usando http://localhost:' + server.address().port + '/control' });
          return json(res, 200, { ok: true }, { 'Set-Cookie': `escape_operator=${secret}; HttpOnly; SameSite=Strict; Path=/` });
        }
        if (url.pathname === '/api/control' && !authorized(req)) return json(res, 403, { error: 'Habilitá el control desde la computadora principal.' });
        if (url.pathname !== '/api/control' && url.pathname !== '/api/player') return json(res, 404, { error: 'Ruta inexistente.' });
        const result = url.pathname === '/api/control' ? game.control(body) : game.player(body);
        persist(); broadcast(); return json(res, 200, { ...result, snapshot: snapshot() });
      }
      if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });
      if (url.pathname === '/api/state') return json(res, 200, snapshot());
      if (url.pathname === '/api/links') {
        const port = server.address().port;
        return json(res, 200, { control: `http://localhost:${port}/control`, stations: addresses().map(ip => ({ display: `http://${ip}:${port}/pantalla`, challenges: `http://${ip}:${port}/desafios/` })) });
      }
      if (url.pathname === '/api/events') {
        let role = url.searchParams.get('role');
        if (!['control','display','challenges'].includes(role) || role === 'control' && !authorized(req)) return json(res, 403, { error: 'Pantalla no autorizada.' });
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        peers.set(res, role); broadcast();
        req.on('close', () => { peers.delete(res); }); return;
      }
      if (url.pathname === '/') { res.writeHead(302, { Location: '/control' }); return res.end(); }
      if (url.pathname === '/desafios') { res.writeHead(302, { Location: '/desafios/' }); return res.end(); }
      let directory, path;
      if (url.pathname.startsWith('/desafios/')) {
        directory = resolve(root, 'network/challenges'); path = url.pathname.slice('/desafios/'.length) || 'index.html';
      } else if (url.pathname === '/control' || url.pathname === '/pantalla') {
        directory = resolve(root, 'dist'); path = 'index.html';
      } else if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.mp3')) {
        directory = resolve(root, 'dist'); path = url.pathname.slice(1);
      } else return json(res, 404, { error: 'Ruta inexistente.' });
      path = decodeURIComponent(path);
      const file = resolve(directory, path);
      if (!file.startsWith(directory + sep) || path.split(/[\\/]/).some(part => part.startsWith('.')) || !existsSync(file) || !statSync(file).isFile()) return json(res, 404, { error: 'Archivo inexistente.' });
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(readFileSync(file));
    } catch (error) {
      if (!res.headersSent) json(res, error instanceof GameError ? error.status : 500, { error: error instanceof GameError ? error.message : 'No se pudo completar la operación. Revisá la computadora principal.', snapshot: snapshot() });
      if (!(error instanceof GameError)) console.error(error);
    }
  });
  server.on('listening', () => {
    heartbeat = setInterval(() => { broadcast(); if (Date.now() - lastSave >= 1000) persist(); }, 250);
  });
  server.on('close', () => clearInterval(heartbeat));
  return { server, game, stop: () => { clearInterval(heartbeat); persist(); for (const res of peers.keys()) res.end(); peers.clear(); return new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const room = createRoomServer();
  const port = Number(process.env.PORT || 3210);
  room.server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `El puerto ${port} ya está en uso. Revisá si la muestra ya está abierta.` : error); process.exitCode = 1; });
  room.server.listen(port, '0.0.0.0', () => {
    console.log(`\nESCAPANDO DE LA IA — TRES COMPUTADORAS\n\nPC 1 / Coordinador: http://localhost:${port}/control`);
    for (const ip of addresses()) console.log(`\nPC 2 / Cronómetro: http://${ip}:${port}/pantalla\nPC 3 / Desafíos:   http://${ip}:${port}/desafios/`);
    console.log('\nDejá esta ventana abierta durante la muestra. Ctrl+C para detener.\n');
  });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await room.stop(); process.exit(); });
}
