import React, { useEffect, useState } from 'react';
import { INITIAL_TRACKS, audioEngine } from '../services/audioEngine';
import { restoreRecordings, saveRecording, removeRecording, triggerDescription, type Recording } from '../services/audioLibrary';

export function AudioLibrary({ locked }: { locked: boolean }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => { restoreRecordings().then(setRecordings).catch(error => setMessage(error.message)).finally(() => setBusy(false)); }, []);
  async function upload(id: string, file: File) {
    setBusy(true); setMessage('Guardando audio…');
    try { audioEngine.stopTest(); setRecordings(await saveRecording(id, file)); setMessage('Audio guardado en esta computadora. Se usará automáticamente en su evento.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el archivo.'); }
    finally { setBusy(false); }
  }
  function downloadScript() {
    const text = ['NODO-20 · Guion de grabación', 'Grabá una pista por evento. No incluyas el nombre del equipo ni tiempos finales: aparecen en pantalla.', 'Dejá los archivos del ambiente sin voz. La introducción se escucha completa antes de iniciar el reloj.', ...INITIAL_TRACKS.map(track => `\n${track.title}\nArchivo: ${track.defaultName}\nCuándo: ${triggerDescription(track.id)}\nTexto sugerido: ${track.fallbackText || 'Ambiente sin narración, preparado para repetirse en bucle.'}`)].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'NODO-20-guion-de-audios.txt'; link.click(); URL.revokeObjectURL(url);
  }
  return <section aria-label="Guion y audios de NODO-20" className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold text-cyan-200">La voz de NODO-20</h2><p className="mt-2 text-sm text-slate-300">{recordings.length} de {INITIAL_TRACKS.length} pistas personalizadas · Una voz a la vez</p></div><button onClick={downloadScript} className="rounded-lg border border-cyan-700 px-4 py-2">Descargar guion</button></div>
    <p className="text-sm text-slate-400">Cargá tu MP3 o WAV en el evento correspondiente. Los archivos quedan guardados en este navegador y esta computadora; en otra PC tendrás que cargarlos nuevamente. Conservá tus originales. Sin archivo se usa la voz del navegador.</p>
    <p className="text-sm text-slate-400">Los mensajes esperan su turno y respetan la duración del archivo. El final cancela los avisos pendientes. Al pausar o reiniciar se detiene la narración. Para probar o cambiar pistas, pausá la partida.</p>
    {message && <p role="status" className="text-amber-200">{message}</p>}
    <fieldset disabled={busy || locked} className="grid gap-3 disabled:opacity-70">
      {INITIAL_TRACKS.map(track => {
        const saved = recordings.find(row => row.id === track.id);
        return <details key={track.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <summary className="cursor-pointer font-semibold">{track.title}<span className={`block mt-1 text-xs ${saved ? 'text-emerald-300' : 'text-slate-400'}`}>{saved ? `${saved.name} · ${Math.ceil(saved.duration)} s · Guardado` : 'Voz o ambiente del navegador'}</span></summary>
          <p className="mt-3 text-sm text-cyan-200">{triggerDescription(track.id)}</p>
          <p className="my-3 text-sm text-slate-300">{track.fallbackText || 'Usá música ambiental sin voz, apta para repetir en bucle.'}</p>
          <p className="mb-3 text-xs text-slate-400 break-all">Nombre sugerido: {track.defaultName}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm">Cargar audio<input aria-label={`Audio para ${track.title}`} type="file" accept="audio/*,.mp3,.wav" className="block mt-2 max-w-full" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(track.id, file); event.target.value = ''; }} /></label>
            <button className="rounded-lg border border-cyan-700 px-4 py-2" onClick={() => { if (playing === track.id) audioEngine.stopTest(); else void audioEngine.testTrack(track, () => setPlaying(track.id), () => setPlaying(current => current === track.id ? null : current)); }}>{playing === track.id ? 'Detener prueba' : 'Probar audio'}</button>
            {saved && <button className="rounded-lg border border-slate-600 px-4 py-2" onClick={async () => { setBusy(true); try { audioEngine.stopTest(); setRecordings(await removeRecording(track.id)); setMessage('Pista retirada. Se usará la voz del navegador.'); } catch (error) { setMessage(String(error)); } finally { setBusy(false); } }}>Usar voz predeterminada</button>}
          </div>
        </details>;
      })}
    </fieldset>
    {locked && <p className="text-amber-200 text-sm">Partida en curso. Los archivos están protegidos hasta pausar.</p>}
  </section>;
}
