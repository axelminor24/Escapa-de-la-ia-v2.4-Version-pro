import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminView } from './components/AdminView';
import { PlayerView } from './components/PlayerView';
import { audioEngine, INITIAL_TRACKS } from './services/audioEngine';
import { eventLogService } from './services/eventLogService';
import type { ChallengesState, GameStatus } from './types';

type RoomEvent = { id: number; kind: string; title: string; status: GameStatus; elapsedSec: number; timestamp: number; trackId?: string };
type Snapshot = { serverVersion?: number; serverNow?: number; runId: string; revision: number; status: GameStatus; elapsedSec: number; totalSec: number; remainingSec: number; board: { solved: number[]; team: string }; events: RoomEvent[]; peers: { control: number; display: number; challenges: number } };
type Links = { control: string; stations: { display: string; challenges: string }[] };
const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function NetworkApp() {
  const display = window.location.pathname === '/pantalla';
  const [room, setRoom] = useState<Snapshot | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{ action: 'RESET' | 'WIN'; runId: string } | null>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const commandInFlight = useRef(false);
  const [links, setLinks] = useState<Links | null>(null);
  const [config, setConfig] = useState<{ transport: string; requiresCode?: boolean } | null>(null);
  const [key, setKey] = useState('');
  const client = useRef(requestId());
  const latest = useRef<Snapshot | null>(null);
  const received = useRef(0);
  const lastEvent = useRef(0);
  const eventRun = useRef('');
  const soundEnabled = useRef(false);
  const commandRef = useRef<(action: string) => void>(() => {});

  const receive = useCallback((next: Snapshot) => {
    if (!next?.board) throw new Error('La partida no está disponible.');
    const previous = latest.current;
    if (previous && next.serverVersion !== undefined && previous.serverVersion !== undefined && (next.serverVersion < previous.serverVersion || next.serverVersion === previous.serverVersion && (next.serverNow ?? 0) < (previous.serverNow ?? 0))) return;
    if (previous?.runId === next.runId && previous.revision > next.revision) return;
    const newRun = eventRun.current !== next.runId;
    if (newRun) { eventRun.current = next.runId; lastEvent.current = 0; }
    const initial = !previous;
    const reconnect = Date.now() - received.current > 3000;
    received.current = Date.now();
    latest.current = next; setRoom(next); setConnected(true);
    if (!display && soundEnabled.current) {
      if (newRun || previous?.status !== next.status || reconnect) {
        audioEngine.stopVoice(); audioEngine.stopAmbient();
        if (next.status === 'RUNNING' || next.status === 'INTRO') audioEngine.startAmbient();
      }
      for (const event of next.events) {
        if (event.id <= lastEvent.current) continue;
        eventLogService.logEvent({ category: event.kind === 'challenge' ? 'CHALLENGE' : event.kind === 'timeline' ? 'TIMELINE' : 'STATE', title: event.title, source: 'Partida compartida', gameTime: format(next.totalSec - event.elapsedSec), elapsedSec: event.elapsedSec });
        // Only recent events produce sound; page reloads never repeat old tracks.
        if (!initial && (next.serverNow ?? Date.now()) - event.timestamp < 5000 && event.trackId) {
          const track = INITIAL_TRACKS.find(t => t.id === event.trackId);
          if (track) {
            if (event.kind === 'challenge') audioEngine.playInterruptingVoiceTrack(track);
            else audioEngine.playVoiceTrack(track, event.trackId === 'start' ? () => {
              if (latest.current?.runId === next.runId && latest.current.status === 'INTRO') commandRef.current('SKIP_INTRO');
            } : undefined);
          }
        }
      }
    }
    lastEvent.current = next.events.at(-1)?.id ?? 0;
  }, [display]);

  useEffect(() => {
    fetch('/api/state', { cache: 'no-store' }).then(r => r.json()).then(receive).catch(() => setError('No se pudo conectar con la computadora principal.'));
    fetch('/api/config').then(r => r.ok ? r.json() : { transport: 'sse' }).then(setConfig).catch(() => setError('No se pudo conectar. Recargá la página para reintentar.'));
  }, [display, receive]);

  useEffect(() => {
    if (!config || !display && !enabled) return;
    const disconnected = () => { setConnected(false); audioEngine.stopAmbient(); audioEngine.stopVoice(); };
    if (config.transport === 'poll') {
      let active = true, timer: number;
      const poll = async () => {
        try {
          const response = await fetch(`/api/state?role=${display ? 'display' : 'control'}&client=${client.current}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
          if (!response.ok) throw new Error(response.status === 401 ? 'Volvé a activar el control para continuar.' : 'Conexión interrumpida.');
          const next = await response.json();
          if (active) receive(next);
        } catch (e) { if (active) { disconnected(); if (!display) setError(e instanceof Error ? e.message : 'Conexión interrumpida.'); } }
        finally { if (active) timer = window.setTimeout(poll, 600); }
      };
      poll();
      const check = window.setInterval(() => { if (Date.now() - received.current > 5000) disconnected(); }, 1000);
      return () => { active = false; clearTimeout(timer); clearInterval(check); audioEngine.stopAmbient(); audioEngine.stopVoice(); };
    }
    const stream = new EventSource(`/api/events?role=${display ? 'display' : 'control'}`);
    stream.onmessage = event => { try { receive(JSON.parse(event.data)); } catch { disconnected(); } };
    stream.onerror = disconnected;
    const check = window.setInterval(() => { if (Date.now() - received.current > 3000) disconnected(); }, 1000);
    return () => { stream.close(); clearInterval(check); audioEngine.stopAmbient(); audioEngine.stopVoice(); };
  }, [display, enabled, receive, config]);

  const command = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!latest.current || !soundEnabled.current) {
      setError('Activá el control antes de enviar una orden.');
      return false;
    }
    if (commandInFlight.current) return false;
    commandInFlight.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Escape-Request': '1' }, body: JSON.stringify({ action, runId: latest.current.runId, requestId: requestId(), ...extra }), signal: AbortSignal.timeout(5000) });
      const result = await response.json();
      if (result.snapshot) receive(result.snapshot);
      if (!response.ok) throw new Error(result.error);
      if (action === 'RESET') setNotice('Partida reiniciada: reloj en 15:00 y desafíos preparados desde el comienzo.');
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar la orden.'); return false; }
    finally { commandInFlight.current = false; setBusy(false); }
  }, [receive]);
  commandRef.current = command;

  useEffect(() => {
    const dialog = confirmationDialog.current;
    if (confirmation && dialog && !dialog.open) dialog.showModal();
    if (!confirmation && dialog?.open) dialog.close();
  }, [confirmation]);

  async function activate() {
    setError(''); setBusy(true);
    try {
      audioEngine.prepare();
      const response = await fetch('/api/operator', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Escape-Request': '1' }, body: JSON.stringify({ key }), signal: AbortSignal.timeout(5000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      // Only one operator tab on this PC should produce audio.
      if (!navigator.locks) throw new Error('Abrí el control en Chrome o Edge usando localhost.');
      const acquired = await new Promise<boolean>(resolve => {
        navigator.locks.request('escape-room-audio-control', { ifAvailable: true }, lock => {
          resolve(Boolean(lock));
          if (lock) return new Promise<void>(release => { releaseLock.current = release; });
        }).catch(() => resolve(false));
      });
      if (!acquired) throw new Error('Ya hay otro panel de control activo en esta computadora. Cerralo antes de habilitar este.');
      soundEnabled.current = true; setEnabled(true);
      setKey('');
      fetch('/api/links').then(r => r.ok ? r.json() : null).then(setLinks).catch(() => {});
      if (latest.current?.status === 'RUNNING' || latest.current?.status === 'INTRO') audioEngine.startAmbient();
      if (latest.current?.status === 'INTRO') {
        const runId = latest.current.runId;
        const track = INITIAL_TRACKS.find(t => t.id === 'start');
        if (track) audioEngine.playVoiceTrack(track, () => { if(latest.current?.runId === runId && latest.current.status === 'INTRO') commandRef.current('SKIP_INTRO'); });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo habilitar el control.'); }
    finally { setBusy(false); }
  }
  const releaseLock = useRef<(() => void) | null>(null);
  useEffect(() => () => releaseLock.current?.(), []);
  const deactivate = () => { soundEnabled.current = false; setEnabled(false); releaseLock.current?.(); releaseLock.current = null; };
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { Promise.resolve(context.registerTool({ name: 'read_escape_room', description: 'Consultar el reloj, estado y avance de la partida mostrada en esta pantalla.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ connected: Date.now() - received.current < 5000, status: latest.current?.status, remainingSeconds: latest.current?.remainingSec, solved: latest.current?.board.solved.length }) }, { signal: lifecycle.signal })).catch(() => {}); } catch {}
    return () => lifecycle.abort();
  }, []);
  if (!room) return <main className="min-h-screen grid place-content-center text-center p-8"><h1 className="text-3xl mb-5">Conectando con la partida</h1><p role="status">{error || 'Comprobando la computadora principal…'}</p></main>;
  const challenges = Object.fromEntries([1,2,3,4].map(i => [i, room.board.solved.includes(i - 1)])) as unknown as ChallengesState;
  if (display) return <><PlayerView remainingStr={connected ? format(room.remainingSec) : '--:--'} gameState={room.status} challenges={challenges} isCritical={room.status === 'RUNNING' && room.remainingSec <= 180} onTriggerStart={() => {}} readOnly />{!connected && <div role="alert" className="fixed bottom-5 inset-x-4 text-center text-amber-200 text-xl z-[60]">Conexión interrumpida. Esperando a la computadora principal…</div>}</>;
  if (!enabled) return <main className="min-h-screen grid place-content-center text-center p-8 gap-6"><h1 className="text-3xl font-bold">PC 1 · Control del coordinador</h1><p>Desde aquí se controlan el reloj, los sonidos y las tres pantallas.</p>{config?.requiresCode && <label className="grid gap-2 text-left">Clave del coordinador<input type="password" autoComplete="current-password" value={key} onChange={event => setKey(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !busy) activate(); }} className="bg-slate-900 border border-slate-600 rounded-lg p-3" /></label>}<button onClick={activate} disabled={busy || !config} className="bg-red-600 rounded-lg px-6 py-4 font-bold disabled:opacity-50">Activar control y sonido</button><p role="alert" className="text-amber-200 max-w-2xl">{error}</p></main>;
  return <>
    <section className="mx-auto max-w-7xl px-6 pt-5 text-sm" aria-label="Conexión de las tres computadoras">
      <div className="border border-slate-700 rounded-xl p-5 bg-slate-950 space-y-3">
        <h2 className="text-lg font-bold">Una partida · Tres computadoras</h2>
        <p role="status">{connected ? 'Control conectado' : 'Conexión interrumpida'} · Cronómetro: {room.peers.display ? 'conectado' : 'esperando'} · Desafíos: {room.peers.challenges ? 'conectados' : 'esperando'}{room.board.team && ` · Equipo: ${room.board.team}`}</p>
        {links?.stations.map(station => <div key={station.display} className="grid md:grid-cols-2 gap-3 break-all"><div>PC 2 · Cronómetro<br/><a className="text-cyan-300 underline" href={station.display} target="_blank" rel="noreferrer">{station.display}</a></div><div>PC 3 · Desafíos<br/><a className="text-cyan-300 underline" href={station.challenges} target="_blank" rel="noreferrer">{station.challenges}</a></div></div>)}
        {!links?.stations.length && <p>Esperando los enlaces para las otras computadoras…</p>}
        <p>Los parlantes se conectan a esta computadora. Mantené abierto este panel durante la muestra.</p>
        {error && <p role="alert" className="text-amber-200">{error}</p>}
        {notice && <p role="status" className="text-emerald-300">{notice}</p>}
        {!connected && <button className="border border-amber-400 rounded-lg p-3" onClick={deactivate}>Volver a activar el control</button>}
      </div>
    </section>
    <fieldset disabled={!connected || busy} className="border-0 m-0 p-0 min-w-0">
      <AdminView networkMode remainingStr={format(room.remainingSec)} elapsedSec={room.elapsedSec} totalSec={room.totalSec} gameState={room.status} challenges={challenges}
        onStart={skip => command(skip ? 'SKIP_INTRO' : 'START')} onPause={() => command('PAUSE')}
        onReset={() => { setError(''); setConfirmation({ action: 'RESET', runId: room.runId }); }}
        onVictory={() => { setError(''); setConfirmation({ action: 'WIN', runId: room.runId }); }}
        onToggleChallenge={number => command('CHALLENGE', { number })}
        onSwitchToPlayer={() => window.open('/pantalla', '_blank')} onOpenPopout={() => window.open('/pantalla', '_blank')}
        onLogout={() => { deactivate(); if(config?.requiresCode)fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Escape-Request':'1'},body:'{}'}).catch(()=>{}); }} />
    </fieldset>
    <dialog ref={confirmationDialog} aria-labelledby="confirmation-title" aria-describedby="confirmation-description"
      onCancel={event => { event.preventDefault(); if (!busy) setConfirmation(null); }}
      className="m-auto w-[min(92vw,480px)] rounded-2xl border border-slate-600 bg-slate-950 p-6 text-slate-100 shadow-2xl backdrop:bg-black/75">
      <h2 id="confirmation-title" className="text-xl font-bold">{confirmation?.action === 'RESET' ? '¿Reiniciar la partida?' : '¿Confirmar la victoria?'}</h2>
      <p id="confirmation-description" className="mt-3 text-slate-300">{confirmation?.action === 'RESET' ? 'El reloj volverá a 15:00 y se borrarán el equipo y las respuestas de los cuatro desafíos en todas las pantallas. Los archivos de audio cargados se conservan.' : 'La partida terminará y las tres pantallas mostrarán la victoria.'}</p>
      {error && <p role="alert" className="mt-3 text-amber-200">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button autoFocus disabled={busy} onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-500 px-4 py-3 disabled:opacity-50">Cancelar</button>
        <button disabled={busy} onClick={async () => {
          if (confirmation && await command(confirmation.action, { runId: confirmation.runId })) setConfirmation(null);
        }} className="rounded-lg bg-red-600 px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Aplicando…' : confirmation?.action === 'RESET' ? 'Sí, reiniciar' : 'Sí, confirmar victoria'}</button>
      </div>
    </dialog>
  </>;
}
