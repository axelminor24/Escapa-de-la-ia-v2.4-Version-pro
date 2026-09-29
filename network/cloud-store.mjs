import { Game, GameError } from './game.mjs';

// Compare-and-swap keeps simultaneous requests from overwriting one another.
// All readers begin on the primary so the clock and progress remain authoritative.
export async function updateRoom(binding, { role, client, action, body, now = Date.now } = {}) {
  const db = binding.withSession ? binding.withSession('first-primary') : binding;
  for (let attempt = 0; attempt < 8; attempt++) {
    let row = await db.prepare('SELECT version, payload FROM escape_room WHERE id = 1').first();
    if (!row) {
      const initial = JSON.stringify({ game: new Game({ now }).serialize(), clients: {} });
      await db.prepare('INSERT OR IGNORE INTO escape_room (id, version, payload) VALUES (1, 0, ?)').bind(initial).run();
      continue;
    }
    const saved = JSON.parse(row.payload);
    const game = new Game({ saved: saved.game, now, recoverPaused: false });
    const beforeRevision = game.data.revision;
    let result = {}, failure;
    if (action) {
      try { result = game[action](body); }
      catch (error) { if (!(error instanceof GameError)) throw error; failure = error; }
    }
    const snapshot = game.snapshot();
    const time = now();
    const clients = saved.clients ?? {};
    let presenceChanged = false;
    for (const [key, entry] of Object.entries(clients)) {
      if (time - entry.time > 15000) { delete clients[key]; presenceChanged = true; }
    }
    if (['control','display','challenges'].includes(role) && /^[a-zA-Z0-9-]{8,80}$/.test(client ?? '') && (!clients[client] || time - clients[client].time > 4000 || clients[client].role !== role)) {
      if (Object.keys(clients).length < 50 || clients[client]) { clients[client] = { role, time }; presenceChanged = true; }
    }
    const changed = Boolean(action) || beforeRevision !== game.data.revision || presenceChanged;
    let version = row.version;
    if (changed) {
      const payload = JSON.stringify({ game: game.serialize(), clients });
      const updated = await db.prepare('UPDATE escape_room SET payload = ?, version = version + 1 WHERE id = 1 AND version = ?').bind(payload, row.version).run();
      if (updated.meta.changes !== 1) continue;
      version++;
    }
    snapshot.serverVersion = version;
    snapshot.serverNow = time;
    snapshot.peers = Object.fromEntries(['control','display','challenges'].map(r => [r, Object.values(clients).filter(c => c.role === r).length]));
    return { code: failure?.status ?? 200, ...result, ...(failure ? { error: failure.message } : {}), snapshot };
  }
  throw new GameError('La partida está recibiendo varias órdenes. Esperá un momento y reintentá.', 503);
}
