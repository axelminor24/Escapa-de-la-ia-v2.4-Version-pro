export const emptyBoard = () => ({ team: '', solved: [], hints: [], failures: {}, autoShown: {}, view: 0, names: {}, lock: '', stationCode: '', boardSince: null, footSince: null, robotText: '', robotCorrect: false, binaryCards: Array(6).fill('') });
const normalize = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const limited = (value, max = 300) => String(value ?? '').slice(0, max);
export function componentName(value) {
  let v = normalize(value).replace(/[().,;:_-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(la|el|una|un) /, '').replace(/ (de|del|para)( la| el)? (pc|computadora|ordenador|computador|servidor)$/, '');
  const aliases = {
    board: ['placa base','placa madre','tarjeta madre','tarjeta base','placa principal','tarjeta principal','motherboard','mother board','mainboard','main board','mother'],
    ram: ['ram','memoria ram','memoria de ram','memoria principal','memoria de acceso aleatorio','memoria de acceso random','random access memory','ram memory','memoria de trabajo','memoria temporal','modulo ram','modulo de ram','modulo de memoria ram'],
    power: ['fuente','fuente de alimentacion','fuente alimentacion','fuente de poder','fuente poder','fuente de energia','fuente de corriente','fuente electrica','fuente atx','psu','power supply','power supply unit','unidad de alimentacion','unidad de suministro de energia']
  };
  v = v.replace(/ (ddr[2-5]|dimm|sodimm)( \d+ ?gb)?$/, '').replace(/ \d+ ?gb$/, '').replace(/ (atx|sfx|\d+ ?w)$/, '');
  return Object.keys(aliases).find(key => aliases[key].includes(v)) ?? null;
}
export function stageKey(board) {
  if (board.view === 0) return board.boardSince === null ? 'sequence' : 'board';
  if (board.view === 1) return board.footSince === null ? 'hardware' : 'foot';
  if (board.view === 2) return board.robotCorrect ? 'secondary' : 'robot';
  return board.view === 3 ? 'binary' : 'lock';
}
export class GameError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
export class Game {
  constructor({ now = Date.now, durationMs = 900000, saved, recoverPaused = true } = {}) {
    this.now = now;
    this.durationMs = durationMs;
    this.seen = new Map(saved?.requests ?? []);
    this.data = saved ?? this.fresh();
    if (this.data.schema !== 1 || !Array.isArray(this.data.board?.solved) || !Number.isFinite(this.data.elapsedMs)) throw new Error('Archivo de partida inválido. Conservá una copia antes de recuperarlo.');
    // A process restart resumes from the last saved second, paused for the operator.
    if (saved && recoverPaused && ['RUNNING', 'INTRO'].includes(this.data.status)) {
      this.data.status = 'PAUSED'; this.data.startedAt = null; this.data.introDeadline = null;
      this.event('state', 'Partida recuperada en pausa');
    }
  }
  fresh() { return { schema: 1, runId: crypto.randomUUID(), revision: 0, status: 'IDLE', elapsedMs: 0, startedAt: null, introDeadline: null, board: emptyBoard(), events: [], nextEvent: 1, fired: [] }; }
  elapsed() { return Math.min(this.durationMs, this.data.elapsedMs + (this.data.status === 'RUNNING' ? Math.max(0, this.now() - this.data.startedAt) : 0)); }
  event(kind, title, extra = {}) {
    this.data.revision++;
    this.data.events.push({ id: this.data.nextEvent++, kind, title, status: this.data.status, elapsedSec: Math.floor(this.elapsed() / 1000), timestamp: this.now(), ...extra });
    this.data.events = this.data.events.slice(-200);
  }
  stop(status) {
    this.data.elapsedMs = this.elapsed(); this.data.startedAt = null; this.data.introDeadline = null; this.data.status = status;
  }
  begin() {
    if (this.data.status === 'RUNNING') return;
    this.data.startedAt = this.now(); this.data.introDeadline = null; this.data.status = 'RUNNING';
    this.event('state', 'Cuenta regresiva en marcha');
  }
  tick() {
    if (this.data.status !== 'RUNNING') return;
    const elapsed = this.elapsed();
    for (const [at, key, title] of [[300000, 'min5', 'Evaluación de los primeros cinco minutos'], [450000, 'halfway', 'Mitad del tiempo'], [720000, '3min', 'Quedan tres minutos']]) {
      if (elapsed >= at && !this.data.fired.includes(key)) {
        this.data.fired.push(key);
        const trackId = key === 'min5' ? (this.data.board.solved.length ? 'min5_progress' : 'min5_no_progress') : key;
        this.event('timeline', title, { trackId });
      }
    }
    if (elapsed >= this.durationMs) { this.stop('GAMEOVER'); this.event('state', 'Tiempo agotado', { trackId: 'gameover' }); }
  }
  snapshot() {
    this.tick();
    const remaining = Math.ceil((this.durationMs - this.elapsed()) / 1000);
    return { runId: this.data.runId, revision: this.data.revision, status: this.data.status, elapsedSec: this.durationMs / 1000 - remaining, totalSec: this.durationMs / 1000, remainingSec: remaining, board: structuredClone(this.data.board), events: structuredClone(this.data.events) };
  }
  serialize() {
    this.tick();
    return { ...structuredClone(this.data), requests: [...this.seen], elapsedMs: this.elapsed(), startedAt: this.data.status === 'RUNNING' ? this.now() : null };
  }
  transaction(input, apply) {
    this.tick();
    if (input.runId !== this.data.runId) throw new GameError('La partida cambió. Esperá a que la pantalla se actualice.');
    if (typeof input.requestId !== 'string' || input.requestId.length > 100 || !input.requestId) throw new GameError('Falta el identificador de la acción.', 400);
    if (this.seen.has(input.requestId)) return { ...this.seen.get(input.requestId), snapshot: this.snapshot() };
    const result = apply() ?? {};
    this.seen.set(input.requestId, result);
    if (this.seen.size > 1000) this.seen.delete(this.seen.keys().next().value);
    return { ...result, snapshot: this.snapshot() };
  }
  control(input) {
    return this.transaction(input, () => {
      const { action } = input;
      if (action === 'RESET') { this.data = this.fresh(); this.seen.clear(); this.event('state', 'Nueva partida preparada'); return; }
      if (action === 'PAUSE') {
        if (!['RUNNING', 'INTRO'].includes(this.data.status)) return;
        this.stop('PAUSED'); this.event('state', 'Partida pausada'); return;
      }
      if (action === 'START' || action === 'SKIP_INTRO') {
        if (['VICTORY', 'GAMEOVER'].includes(this.data.status)) throw new GameError('Prepará una nueva partida antes de iniciar.');
        if (this.data.status === 'RUNNING') return;
        if (action === 'SKIP_INTRO' || this.data.status === 'PAUSED' || this.data.status === 'INTRO') { this.begin(); return; }
        this.data.status = 'INTRO';
        this.event('state', 'Explicación de los desafíos', { trackId: 'start' }); return;
      }
      if (action === 'WIN') {
        if (!['RUNNING', 'PAUSED', 'INTRO'].includes(this.data.status)) throw new GameError('No hay una partida en curso.');
        this.stop('VICTORY'); this.event('state', 'Victoria confirmada por el coordinador', { trackId: 'victory' }); return;
      }
      if (action === 'CHALLENGE') {
        if (this.data.status !== 'RUNNING' && this.data.status !== 'PAUSED') throw new GameError('Iniciá la partida antes de modificar los desafíos.');
        const i = input.number - 1;
        if (!Number.isInteger(i) || i < 0 || i > 3) throw new GameError('Desafío inválido.', 400);
        const b = this.data.board;
        if (b.solved.includes(i)) {
          b.solved = b.solved.filter(n => n < i); b.view = i;
          b.stationCode = ''; b.lock = '';
          if (i <= 0) b.boardSince = null;
          if (i <= 1) { b.footSince = null; b.names = {}; }
          if (i <= 2) { b.robotCorrect = false; b.robotText = ''; }
          b.binaryCards = Array(6).fill('');
          this.event('challenge', `Desafíos restablecidos desde el puesto ${i + 1}`);
        } else {
          if (i !== b.solved.length) throw new GameError('Completá los puestos anteriores primero.');
          this.solve(i);
        }
        return;
      }
      throw new GameError('Comando no reconocido.', 400);
    });
  }
  solve(i) {
    if (this.data.board.solved.includes(i)) return;
    this.data.board.solved.push(i); this.data.board.view = Math.min(i + 1, 3); this.data.board.stationCode = '';
    this.event('challenge', `Puesto ${i + 1} recuperado`, { challenge: i + 1, trackId: `challenge_${i + 1}` });
  }
  player(input) {
    return this.transaction(input, () => {
      const b = this.data.board, fields = input.fields ?? {};
      if (input.action === 'TEAM') {
        if (this.data.status !== 'IDLE') throw new GameError('El equipo ya está en partida.');
        b.team = limited(fields.team, 40).trim() || 'Equipo superviviente';
        this.event('team', 'Equipo preparado'); return { message: 'Equipo preparado. Esperen el inicio del coordinador.' };
      }
      if (this.data.status !== 'RUNNING') throw new GameError(this.data.status === 'PAUSED' ? 'El coordinador pausó la partida.' : 'Esperen el inicio del coordinador.');
      const view = input.view;
      if (!Number.isInteger(view) || view < 0 || view > Math.min(b.solved.length, 4)) throw new GameError('Puesto no disponible.');
      if (b.solved.includes(view)) return { message: 'Este puesto ya fue recuperado.' };
      if (input.stage !== stageKey({ ...b, view })) throw new GameError('El desafío avanzó. Revisá la pantalla antes de volver a enviar.');
      b.view = view;
      const fail = message => {
        const k = stageKey(b); b.failures[k] = (b.failures[k] ?? 0) + 1;
        if (b.failures[k] >= 3) b.autoShown[k] = true;
        this.data.revision++;
        return { message, bad: true };
      };
      if (input.action === 'hint') {
        if (view < 4 && !b.hints.includes(view)) { b.hints.push(view); this.event('hint', `Pista solicitada en el puesto ${view + 1}`); }
        return;
      }
      if (input.action === 'validatecode') {
        b.stationCode = limited(fields.stationCode, 23).trim();
        if (view === 0 && b.boardSince === null) {
          if (b.stationCode.replace(/[-\s]/g, '') !== '38457201') return fail('Secuencia incorrecta. Revisen el orden de las ocho tarjetas.');
          b.boardSince = this.now(); b.stationCode = ''; this.data.revision++; return;
        }
        if (view === 1 && b.footSince === null || view === 2 && !b.robotCorrect || view > 2) throw new GameError('Primero resuelvan el desafío de este puesto.');
        if (b.stationCode !== ['1', '6', '3'][view]) return fail('Ese no es el número buscado. Revisen el lugar indicado.');
        this.solve(view); return { message: 'Hallazgo confirmado. Recuerden el número para el candado final.' };
      }
      if (input.action === 'check' && view === 1 && b.footSince === null) {
        b.names = Object.fromEntries([0,1,2].map(i => [i, limited(fields.names?.[i], 60)]));
        const found = [0,1,2].map(i => componentName(b.names[i])).sort();
        if (found.join(',') !== ['board','ram','power'].sort().join(',')) return fail('Revisen los tres nombres. Deben ser componentes internos distintos, uno por campo; el orden no importa.');
        b.footSince = this.now(); b.stationCode = ''; this.data.revision++; return { message: 'Miren por donde pisan' };
      }
      if (input.action === 'checkrobot' && view === 2 && !b.robotCorrect) {
        b.robotText = limited(fields.robotText);
        const steps = b.robotText.split(/[,;\n]+/).map(normalize).filter(Boolean).map((v, j) => {
          const n = v.match(/^(\d+)\s*[.)\-:]\s*/);
          if (n && Number(n[1]) !== j + 1) return 'numeración incorrecta';
          return v.replace(/^\d+\s*[.)\-:]\s*/, '').replace(/^girar(?: a)?(?: la)? /, '');
        });
        if (steps.join(',') !== 'derecha,avanzar,derecha,avanzar,avanzar') return fail('La secuencia no es correcta. Revisen las instrucciones.');
        b.robotCorrect = true; this.data.revision++; return { message: 'Algoritmo correcto. Busquen el número del tablero secundario.' };
      }
      if (input.action === 'checkbinary' && view === 3) {
        b.binaryCards = Array.from({length:6}, (_, i) => limited(fields.binaryCards?.[i], 12).trim());
        if (b.binaryCards.join(',') !== '10,13,1111,111,10010,17') return fail('Hay respuestas incorrectas. Revisen las seis tarjetas.');
        this.solve(3); return;
      }
      if (input.action === 'unlock' && view === 4 && b.solved.length === 4) {
        b.lock = limited(fields.lock, 4);
        if (b.lock !== '1635') return fail('Clave incorrecta. Revisen los fragmentos y el orden de los puestos.');
        this.stop('VICTORY'); this.event('state', 'Candado abierto. ¡Escaparon!', { trackId: 'victory' }); return;
      }
      throw new GameError('Acción no disponible en este puesto.', 400);
    });
  }
}
