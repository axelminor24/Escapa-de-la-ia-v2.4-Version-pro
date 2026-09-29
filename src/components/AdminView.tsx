import React, { useState, useRef, useEffect } from 'react';
import {
  GameStatus,
  AudioTrackConfig,
  ChallengesState,
  ChallengeNumber,
} from '../types';
import { audioEngine, INITIAL_TRACKS } from '../services/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Tv,
  LogOut,
  Volume2,
  VolumeX,
  Upload,
  CheckCircle2,
  Check,
  Zap,
  Music,
  Eye,
  FastForward,
  RadioTower,
  History,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { EventLog } from './EventLog';
import { eventLogService } from '../services/eventLogService';

interface AdminViewProps {
  remainingStr: string;
  elapsedSec: number;
  totalSec: number;
  gameState: GameStatus;
  challenges: ChallengesState;
  onStart: (skipIntro?: boolean) => void;
  onPause: () => void;
  onReset: () => void;
  onVictory: () => void;
  onToggleChallenge: (num: ChallengeNumber) => void;
  onSwitchToPlayer: () => void;
  onOpenPopout: () => void;
  onLogout: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  remainingStr,
  elapsedSec,
  totalSec,
  gameState,
  challenges,
  onStart,
  onPause,
  onReset,
  onVictory,
  onToggleChallenge,
  onSwitchToPlayer,
  onOpenPopout,
  onLogout,
}) => {
  const [ambientVol, setAmbientVol] = useState(audioEngine.getAmbientVolume());
  const [voiceVol, setVoiceVol] = useState(audioEngine.getVoiceVolume());
  const [testingTrackId, setTestingTrackId] = useState<string | null>(null);
  const [fileMatchCount, setFileMatchCount] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Tabs for Event Log drawer
  const [activeTab, setActiveTab] = useState<'NONE' | 'LOG'>('NONE');
  const [eventCount, setEventCount] = useState<number>(eventLogService.getEvents().length);
  const [isLogSectionExpanded, setIsLogSectionExpanded] = useState<boolean>(true);

  // Download Event Log helper for AdminView
  const handleDownloadLog = (format: 'json' | 'csv') => {
    let content = '';
    let mime = 'text/plain';
    if (format === 'json') {
      content = eventLogService.exportAsJson();
      mime = 'application/json';
    } else {
      content = eventLogService.exportAsCsv();
      mime = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escape-room-event-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Hidden file input refs
  const bulkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubLog = eventLogService.subscribe((events) => {
      setEventCount(events.length);
    });

    return () => {
      unsubLog();
    };
  }, []);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPercent = Math.min(100, (elapsedSec / totalSec) * 100);
  const solvedCount = Object.values(challenges).filter(Boolean).length;

  const handleAmbientSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAmbientVol(val);
    audioEngine.setAmbientVolume(val);
  };

  const handleVoiceSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVoiceVol(val);
    audioEngine.setVoiceVolume(val);
  };

  const handleSingleFileUpload = (trackId: string, file: File) => {
    const blobUrl = URL.createObjectURL(file);
    audioEngine.setTrackBlobUrl(trackId, blobUrl, file.name);
    eventLogService.recordSystemEvent(
      `Archivo Cargado: ${file.name}`,
      `Pista "${trackId}" vinculada a archivo personalizado "${file.name}".`,
      'Panel Admin'
    );
    // Force re-render
    setTestingTrackId((prev) => (prev === trackId ? null : prev));
  };

  const handleBulkFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    const matched = audioEngine.registerFiles(files);
    setFileMatchCount(matched);
    eventLogService.recordSystemEvent(
      'Carga Masiva de Audios',
      `Se cargaron ${files.length} archivos locales. ${matched} pistas fueron vinculadas automáticamente.`,
      'Panel Admin'
    );
    setTimeout(() => setFileMatchCount(null), 6000);
  };

  const handleTestAudio = async (track: AudioTrackConfig) => {
    if (testingTrackId === track.id) {
      audioEngine.stopVoice();
      setTestingTrackId(null);
      eventLogService.recordAudioEvent(
        track.title,
        track.defaultName,
        false,
        'Prueba manual de audio cancelada/detenida por el operador.',
        'Panel Admin'
      );
      return;
    }
    setTestingTrackId(track.id);
    eventLogService.recordAudioEvent(
      track.title,
      track.defaultName,
      false,
      'Prueba manual de audio iniciada por el operador desde la tabla de pistas.',
      'Panel Admin'
    );
    await audioEngine.testTrack(
      track,
      () => setTestingTrackId(track.id),
      () => setTestingTrackId(null)
    );
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f1016] border border-[#222433] shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/40">
              <RadioTower className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-widest uppercase font-display text-white">
                Control Maestro // Emisora Escape Room
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400">Transmisor Sincronizado</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">v2.4 Pro</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'LOG' ? 'NONE' : 'LOG')}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'LOG'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-950/50'
                  : 'bg-[#181926] hover:bg-[#202233] border-[#2b2d42] text-purple-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Event Log</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/60 border border-purple-400/40 text-[10px] font-mono font-bold text-purple-200">
                {eventCount}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPopout();
              }}
              title="Abrir vista de jugador en una ventana independiente para TV o proyector"
              className="px-3.5 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abrir en</span> TV
            </button>

            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onSwitchToPlayer();
              }}
              title="Ver cómo se muestra la pantalla de los jugadores en esta misma ventana"
              className="px-3.5 py-2 rounded-lg bg-[#181926] hover:bg-[#202233] border border-[#2b2d42] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver como</span> Jugador
            </button>

            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onLogout();
              }}
              title="Cerrar sesión de administrador"
              className="px-3 py-2 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-800/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Drawer: Event Log (Full View) */}
        {activeTab === 'LOG' && (
          <div className="animate-fadeIn">
            <EventLog className="border-2 border-purple-500/60 shadow-purple-950/40" />
          </div>
        )}

        {/* Status banner and Main Timer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Timer Display */}
          <div className="md:col-span-2 p-6 rounded-xl bg-[#0e0f17] border border-[#242738] shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Cronómetro Principal
              </span>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  gameState === 'RUNNING'
                    ? 'bg-red-950/60 text-red-400 border border-red-800/50'
                    : gameState === 'INTRO'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50 animate-pulse'
                    : gameState === 'VICTORY'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                    : 'bg-[#181a26] text-slate-400 border border-[#2b2d42]'
                }`}
              >
                {gameState === 'IDLE' && 'En Espera'}
                {gameState === 'INTRO' && 'Explicando Desafíos...'}
                {gameState === 'RUNNING' && 'Transmisión en Vivo'}
                {gameState === 'PAUSED' && 'Pausado'}
                {gameState === 'VICTORY' && '¡Misión Cumplida!'}
                {gameState === 'GAMEOVER' && 'Tiempo Agotado'}
              </div>
            </div>

            <div className="my-4 text-center">
              <div
                className={`font-mono-numbers font-black text-6xl sm:text-7xl md:text-8xl tracking-wider transition-colors ${
                  gameState === 'VICTORY'
                    ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]'
                    : gameState === 'INTRO'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                }`}
              >
                {remainingStr}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-display mt-2">
                Transcurrido: {formatElapsed(elapsedSec)} / 15:00
              </p>

              {/* Skip Intro button on timer */}
              {gameState === 'INTRO' && (
                <div className="mt-3 animate-bounce">
                  <button
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onStart(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border-2 border-amber-400 text-amber-200 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all hover:scale-105"
                  >
                    <FastForward className="w-4 h-4 fill-amber-300" />
                    <span>⚡ Explicación en curso: Clic aquí para saltar intro e iniciar reloj ya</span>
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Timeline Bar */}
            <div className="space-y-2">
              <div className="relative h-4 rounded-full bg-[#161824] border border-[#292c3f] overflow-visible">
                <div
                  className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Event Markers on Timeline */}
                {[
                  { id: 'start', time: 0, title: '00:00 - Inicio y Explicación' },
                  { id: 'min5', time: 5 * 60, title: '05:00 - Evaluación de Desafíos (Progreso: >=1 o 0)' },
                  { id: 'mid', time: 7.5 * 60, title: '07:30 - Mitad de Tiempo' },
                  { id: '3min', time: 12 * 60, title: '12:00 - Quedan 3 Minutos (Presión)' },
                  { id: 'end', time: 15 * 60, title: '15:00 - Fin del Juego / Tiempo Agotado' },
                ].map((marker) => {
                  const pct = (marker.time / totalSec) * 100;
                  const isHit = elapsedSec >= marker.time;

                  return (
                    <div
                      key={marker.id}
                      style={{ left: `${pct}%` }}
                      title={marker.title}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-transform duration-300 hover:scale-150 z-10 cursor-pointer ${
                        isHit
                          ? 'bg-amber-400 border-white shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                          : 'bg-[#25283a] border-[#444863]'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Marker labels */}
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>00:00 (Inicio)</span>
                <span>05:00 (Progreso)</span>
                <span>07:30 (Mitad)</span>
                <span>12:00 (3 Min)</span>
                <span>15:00 (Fin)</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="p-6 rounded-xl bg-[#0e0f17] border border-[#242738] shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Comandos de Control
              </h2>
              <p className="text-xs text-slate-400">
                Presiona <strong className="text-white">ESPACIO</strong> o <strong className="text-white">ENTER</strong> en cualquier pantalla para iniciar o saltar la intro.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* If INTRO: Show prominent Skip Intro button */}
              {gameState === 'INTRO' ? (
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStart(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer animate-pulse"
                >
                  <FastForward className="w-4 h-4 fill-black" />
                  <span>⏩ Saltar Intro e Iniciar Cuenta Ya</span>
                </button>
              ) : (
                <>
                  {/* Start with Intro */}
                  <button
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onStart(false);
                    }}
                    disabled={gameState === 'RUNNING'}
                    className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>▶ Iniciar con Explicación (Intro)</span>
                  </button>

                  {/* Start Directly (Skip Intro) */}
                  <button
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onStart(true);
                    }}
                    disabled={gameState === 'RUNNING'}
                    className="w-full py-2.5 px-4 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-red-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>⚡ Iniciar Directo (Sin Intro)</span>
                  </button>
                </>
              )}

              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                disabled={gameState !== 'RUNNING' && gameState !== 'INTRO'}
                className="w-full py-2.5 px-4 rounded-lg bg-[#181926] hover:bg-[#202233] disabled:opacity-40 text-slate-300 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#2c2f42] transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pausar</span>
              </button>

              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  onReset();
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#181926] hover:bg-[#202233] text-slate-300 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#2c2f42] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar a 15:00</span>
              </button>

              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  onVictory();
                }}
                className="w-full py-3 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-emerald-200" />
                <span>¡Escaparon! (Victoria)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Challenges Matrix */}
        <div className="p-6 rounded-xl bg-[#0f1016] border border-[#222433] shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Estado de los 4 Desafíos (Escape Room)
              </h2>
              <p className="text-xs text-slate-400">
                Al completarse cada desafío sonará su audio específico, interrumpiendo y reanudando la transmisión. Al llegar al 4º, se activará <strong>inmediatamente</strong> la victoria.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono px-3 py-1 rounded bg-[#181a28] border border-[#2b2d42] text-amber-300">
                {solvedCount} / 4 COMPLETADOS
              </span>
            </div>
          </div>

          {/* Interactive Checkbox buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([1, 2, 3, 4] as const).map((num) => {
              const isSolved = challenges[num];
              return (
                <button
                  key={num}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleChallenge(num);
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    isSolved
                      ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200 shadow-md shadow-emerald-950/30'
                      : 'bg-[#141520] border-[#292b3d] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Desafío {num}
                    </span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isSolved ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    />
                  </div>
                  <div className="text-xs font-semibold">
                    {isSolved ? (
                      <span className="text-emerald-400">Completado ✓</span>
                    ) : (
                      <span className="text-slate-500">Hacer clic para marcar</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Event Log Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Historial de Eventos en Tiempo Real (Event Log)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-[10px] font-mono text-purple-300 font-bold">
                {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Export Buttons */}
              <button
                onClick={() => handleDownloadLog('json')}
                title="Descargar registro de eventos completo en formato JSON para análisis posterior"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                <span>Descargar JSON</span>
              </button>

              <button
                onClick={() => handleDownloadLog('csv')}
                title="Descargar registro de eventos en formato CSV para abrir en Excel o Google Sheets"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar CSV</span>
              </button>

              <button
                onClick={() => setActiveTab(activeTab === 'LOG' ? 'NONE' : 'LOG')}
                className="text-xs text-purple-300 hover:text-purple-200 font-mono flex items-center gap-1 cursor-pointer bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <span>{activeTab === 'LOG' ? 'Cerrar pestaña' : 'Pestaña completa'}</span>
              </button>

              <button
                onClick={() => setIsLogSectionExpanded(!isLogSectionExpanded)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer bg-[#141624] hover:bg-[#1c1f32] border border-[#2b3046] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <span>{isLogSectionExpanded ? 'Plegar' : 'Desplegar'}</span>
                {isLogSectionExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isLogSectionExpanded && <EventLog isCompact={true} />}
        </div>

        {/* Audio Volume Mixer */}
        <div className="p-6 rounded-xl bg-[#0f1016] border border-[#222433] shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Mezclador de Audio & Atenuación (Ducking)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ambient slider */}
            <div className="space-y-2 p-4 rounded-lg bg-[#141520] border border-[#26283b]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Volumen Ambiente Envolvente
                </span>
                <span className="font-mono text-red-400 font-bold">
                  {Math.round(ambientVol * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambientVol}
                onChange={handleAmbientSlider}
                className="w-full accent-red-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Se atenúa automáticamente al 15% mientras habla el narrador.
              </p>
            </div>

            {/* Voice slider */}
            <div className="space-y-2 p-4 rounded-lg bg-[#141520] border border-[#26283b]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Volumen Locuciones & Desafíos
                </span>
                <span className="font-mono text-red-400 font-bold">
                  {Math.round(voiceVol * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={voiceVol}
                onChange={handleVoiceSlider}
                className="w-full accent-red-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Prioridad absoluta: solo un audio habla a la vez.
              </p>
            </div>
          </div>
        </div>

        {/* Audio Tracks Inspector & Local File Uploader */}
        <div className="p-6 rounded-xl bg-[#0f1016] border border-[#222433] shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Pistas de Audio de la Emisora
              </h2>
              <p className="text-xs text-slate-400">
                Los audios se buscarán automáticamente. Si tienes archivos MP3 en tu disco, puedes cargarlos aquí o probarlos con TEST.
              </p>
            </div>

            <button
              onClick={() => bulkInputRef.current?.click()}
              className="px-3.5 py-2 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 text-red-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Carpeta / Múltiples MP3</span>
            </button>
            <input
              type="file"
              ref={bulkInputRef}
              multiple
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleBulkFiles(e.target.files);
                }
              }}
            />
          </div>

          {/* Drag & drop dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleBulkFiles(e.dataTransfer.files);
              }
            }}
            className={`p-4 rounded-xl border-2 border-dashed text-center transition-colors ${
              isDragOver
                ? 'border-red-500 bg-red-950/20 text-red-200'
                : 'border-[#2c2f45] bg-[#12131d] text-slate-400'
            }`}
          >
            <p className="text-xs font-mono">
              📂 Arrastra y suelta tus audios MP3 aquí para asociarlos automáticamente por nombre
            </p>
          </div>

          {fileMatchCount !== null && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>¡Se vincularon {fileMatchCount} archivos de audio exitosamente!</span>
            </div>
          )}

          {/* Minute 5 Conditional Event Card */}
          <div className="p-4 rounded-xl bg-[#12131f] border-2 border-amber-600/60 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#25283f]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider font-display">
                  🎯 Evento Condicional // Minuto 05:00 (Evaluación de Desafíos)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-amber-950 border border-amber-800 text-amber-200">
                Se dispara a los 300 segundos
              </span>
            </div>

            <p className="text-xs text-slate-300">
              A los 5 minutos exactos de transmisión, el sistema evalúa cuántos desafíos se han completado.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Progress */}
              {(() => {
                const track = INITIAL_TRACKS.find((t) => t.id === 'min5_progress')!;
                const hasCustom = audioEngine.hasCustomAudio(track.id);
                const customName = audioEngine.getTrackCustomFileName(track.id);
                const isTesting = testingTrackId === track.id;
                const isCurrentCandidate = solvedCount >= 1;

                return (
                  <div
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-3 text-xs transition-all ${
                      isCurrentCandidate
                        ? 'bg-emerald-950/30 border-emerald-500/70 shadow-md shadow-emerald-950/20'
                        : 'bg-[#141522] border-[#292c42] opacity-80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-emerald-400" />
                          Opción 1: Con Avance (≥ 1 desafío)
                        </span>
                        {isCurrentCandidate && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-black">
                            ACTIVA AHORA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300">{track.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate" title={customName || track.defaultName}>
                        Archivo: {customName || track.defaultName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222538]">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasCustom
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-[#1f2233] text-slate-400 border border-[#30344d]'
                        }`}
                      >
                        {hasCustom ? 'Cargado ✓' : 'Sintetizado'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <label className="px-2 py-1 rounded bg-[#202334] hover:bg-[#2a2e45] border border-[#373c57] text-slate-200 cursor-pointer transition-colors font-medium text-[11px]">
                          Elegir archivo
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSingleFileUpload(track.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleTestAudio(track)}
                          disabled={isTesting}
                          className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors cursor-pointer ${
                            isTesting
                              ? 'bg-amber-500 text-black'
                              : 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200'
                          }`}
                        >
                          {isTesting ? 'Sonando...' : 'TEST'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Option 2: No Progress */}
              {(() => {
                const track = INITIAL_TRACKS.find((t) => t.id === 'min5_no_progress')!;
                const hasCustom = audioEngine.hasCustomAudio(track.id);
                const customName = audioEngine.getTrackCustomFileName(track.id);
                const isTesting = testingTrackId === track.id;
                const isCurrentCandidate = solvedCount === 0;

                return (
                  <div
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-3 text-xs transition-all ${
                      isCurrentCandidate
                        ? 'bg-amber-950/30 border-amber-500/70 shadow-md shadow-amber-950/20'
                        : 'bg-[#141522] border-[#292c42] opacity-80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-amber-400" />
                          Opción 2: Ningún desafío superado (0)
                        </span>
                        {isCurrentCandidate && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black">
                            ACTIVA AHORA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300">{track.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate" title={customName || track.defaultName}>
                        Archivo: {customName || track.defaultName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222538]">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasCustom
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-[#1f2233] text-slate-400 border border-[#30344d]'
                        }`}
                      >
                        {hasCustom ? 'Cargado ✓' : 'Sintetizado'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <label className="px-2 py-1 rounded bg-[#202334] hover:bg-[#2a2e45] border border-[#373c57] text-slate-200 cursor-pointer transition-colors font-medium text-[11px]">
                          Elegir archivo
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSingleFileUpload(track.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleTestAudio(track)}
                          disabled={isTesting}
                          className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors cursor-pointer ${
                            isTesting
                              ? 'bg-amber-500 text-black'
                              : 'bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-200'
                          }`}
                        >
                          {isTesting ? 'Sonando...' : 'TEST'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 4 Challenges Completion Priority Audios Section */}
          <div className="p-4 rounded-xl bg-[#0f1418] border-2 border-emerald-700/60 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#202c2e]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider font-display">
                  🧩 Audios de Superación de los 4 Desafíos (Prioridad Alta)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Superponen sobre cualquier audio y luego reanudan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map((num) => {
                const track = INITIAL_TRACKS.find((t) => t.id === `challenge_${num}`)!;
                const hasCustom = audioEngine.hasCustomAudio(track.id);
                const customName = audioEngine.getTrackCustomFileName(track.id);
                const isTesting = testingTrackId === track.id;
                const isSolved = challenges[num];

                return (
                  <div
                    key={num}
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 text-xs transition-all ${
                      isSolved
                        ? 'bg-emerald-950/40 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                        : 'bg-[#141720] border-[#252a3b]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isSolved ? 'text-emerald-400' : 'text-slate-500'}`} />
                          Desafío {num}: {num === 4 ? 'Superado (Victoria)' : 'Superado'}
                        </span>
                        {isSolved && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-black">
                            RESUELTO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate" title={customName || track.defaultName}>
                        Archivo: {customName || track.defaultName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1e2330]">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasCustom
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-[#1f2233] text-slate-400 border border-[#30344d]'
                        }`}
                      >
                        {hasCustom ? 'Cargado ✓' : 'Sintetizado'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <label className="px-2 py-1 rounded bg-[#202334] hover:bg-[#2a2e45] border border-[#373c57] text-slate-200 cursor-pointer transition-colors font-medium text-[11px]">
                          Elegir archivo
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSingleFileUpload(track.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleTestAudio(track)}
                          disabled={isTesting}
                          className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors cursor-pointer ${
                            isTesting
                              ? 'bg-amber-500 text-black'
                              : 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200'
                          }`}
                        >
                          {isTesting ? 'Sonando...' : 'TEST'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other Standard Tracks Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Otras Pistas Programadas (Ambiente y Cronología)
            </h3>
            {INITIAL_TRACKS.filter(
              (t) =>
                t.id !== 'min5_progress' &&
                t.id !== 'min5_no_progress' &&
                !t.id.startsWith('challenge_')
            ).map((track) => {
              const hasCustom = audioEngine.hasCustomAudio(track.id);
              const customName = audioEngine.getTrackCustomFileName(track.id);
              const isTesting = testingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className="p-3 rounded-lg bg-[#141520] border border-[#242738] flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-[220px]">
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-red-400" />
                      <span>{track.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Archivo: {customName || track.defaultName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hasCustom
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-[#1f2233] text-slate-400 border border-[#30344d]'
                      }`}
                    >
                      {hasCustom ? 'Cargado ✓' : 'Por Defecto / Sintetizado'}
                    </span>

                    {/* Single File Picker */}
                    <label className="px-2.5 py-1 rounded bg-[#202334] hover:bg-[#2a2e45] border border-[#373c57] text-slate-200 cursor-pointer transition-colors font-medium">
                      Elegir archivo
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleSingleFileUpload(track.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {/* Test Button */}
                    <button
                      onClick={() => handleTestAudio(track)}
                      className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                        isTesting
                          ? 'bg-amber-500 text-black'
                          : 'bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300'
                      }`}
                    >
                      {isTesting ? 'Detener' : 'TEST'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
