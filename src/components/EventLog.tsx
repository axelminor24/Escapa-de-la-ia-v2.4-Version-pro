import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  History,
  Search,
  Trash2,
  Copy,
  Download,
  Check,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Play,
  RotateCcw,
  Trophy,
  Skull,
  Globe,
  Radio,
  Clock,
  Sparkles,
  ArrowDownCircle,
  Sliders,
} from 'lucide-react';
import { GameEvent, GameEventCategory, GameEventSeverity } from '../types';
import { eventLogService } from '../services/eventLogService';

interface EventLogProps {
  className?: string;
  isCompact?: boolean;
}

export const EventLog: React.FC<EventLogProps> = ({ className = '', isCompact = false }) => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameEventCategory | 'ALL'>('ALL');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time events from eventLogService
  useEffect(() => {
    const unsubscribe = eventLogService.subscribe((updated) => {
      setEvents(updated);
    });
    return unsubscribe;
  }, []);

  // Filter events based on category and search query
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchCategory = selectedCategory === 'ALL' || event.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(q) ||
        (event.detail && event.detail.toLowerCase().includes(q)) ||
        (event.source && event.source.toLowerCase().includes(q)) ||
        event.wallTime.toLowerCase().includes(q) ||
        event.gameTime.toLowerCase().includes(q)
      );
    });
  }, [events, selectedCategory, searchQuery]);

  const handleCopyLog = () => {
    const text = eventLogService.exportAsText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLog = (format: 'txt' | 'json') => {
    const content = format === 'txt' ? eventLogService.exportAsText() : eventLogService.exportAsJson();
    const mime = format === 'txt' ? 'text/plain' : 'application/json';
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

  const handleClearLog = () => {
    if (window.confirm('¿Deseas reiniciar y limpiar el historial de eventos?')) {
      eventLogService.clearLog();
    }
  };

  const handleAddSampleEvent = () => {
    eventLogService.logEvent({
      category: 'SYSTEM',
      severity: 'info',
      title: 'Prueba de Diagnóstico',
      detail: 'Evento de prueba verificado por el Game Master desde el panel.',
      source: 'Operador',
    });
  };

  // Helper icon for categories
  const getCategoryIcon = (category: GameEventCategory, severity: GameEventSeverity) => {
    switch (category) {
      case 'CHALLENGE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'STATE':
        if (severity === 'success') return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
        if (severity === 'danger') return <Skull className="w-3.5 h-3.5 text-red-500" />;
        return <Play className="w-3.5 h-3.5 text-indigo-400" />;
      case 'AUDIO':
        return <Volume2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'TIMELINE':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'API':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Category badge formatting
  const getCategoryBadgeClass = (category: GameEventCategory) => {
    switch (category) {
      case 'CHALLENGE':
        return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300';
      case 'STATE':
        return 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300';
      case 'AUDIO':
        return 'bg-purple-950/70 border-purple-700/60 text-purple-300';
      case 'TIMELINE':
        return 'bg-amber-950/70 border-amber-700/60 text-amber-300';
      case 'API':
        return 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300';
      default:
        return 'bg-slate-800/80 border-slate-700 text-slate-300';
    }
  };

  // Severity border styling
  const getSeverityBorder = (severity: GameEventSeverity) => {
    switch (severity) {
      case 'success':
        return 'border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-950/20 to-transparent';
      case 'danger':
        return 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-950/20 to-transparent';
      case 'alert':
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-950/20 to-transparent';
      default:
        return 'border-l-4 border-l-indigo-500/70 bg-gradient-to-r from-indigo-950/15 to-transparent';
    }
  };

  // Format elapsed seconds as MM:SS
  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `+${m}:${s}`;
  };

  return (
    <div
      className={`rounded-2xl bg-[#0b0d14] border border-[#232738] shadow-2xl overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-[#0f111b] border-b border-[#202436] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-950/40">
            <History className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Registro de Eventos // Event Log
              </h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800 text-[10px] font-mono text-red-300 font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Live Recorder
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Historial cronológico auditado de desafíos, estados de partida, pistas de audio y señales de API.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-[#161926] border border-[#2b3046] font-mono text-xs text-slate-300 font-bold">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
          </span>

          <button
            onClick={handleCopyLog}
            title="Copiar historial al portapapeles"
            className="px-2.5 py-1.5 rounded-lg bg-[#181a28] hover:bg-[#222538] border border-[#30354e] text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <div className="relative group">
            <button
              onClick={() => handleDownloadLog('txt')}
              title="Descargar registro en texto o JSON"
              className="px-2.5 py-1.5 rounded-lg bg-[#181a28] hover:bg-[#222538] border border-[#30354e] text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#141724] border border-[#2e334a] rounded-lg shadow-xl p-1 z-30 min-w-[120px]">
              <button
                onClick={() => handleDownloadLog('txt')}
                className="text-left px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 rounded cursor-pointer"
              >
                Formato TXT (.txt)
              </button>
              <button
                onClick={() => handleDownloadLog('json')}
                className="text-left px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 rounded cursor-pointer"
              >
                Formato JSON (.json)
              </button>
            </div>
          </div>

          <button
            onClick={handleClearLog}
            title="Limpiar registro actual"
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-4 py-3 bg-[#0d0f18] border-b border-[#1c2030] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'ALL', label: 'Todos', icon: Filter },
              { id: 'CHALLENGE', label: 'Desafíos', icon: CheckCircle2 },
              { id: 'STATE', label: 'Estado', icon: Play },
              { id: 'AUDIO', label: 'Audios', icon: Volume2 },
              { id: 'TIMELINE', label: 'Hitos', icon: Clock },
              { id: 'API', label: 'API / Red', icon: Globe },
            ] as const
          ).map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950/60'
                    : 'bg-[#141622] hover:bg-[#1b1e2e] border-[#262a3d] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Options */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-[#141724] border border-[#2b3046] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
              autoScroll
                ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
                : 'bg-[#151722] border-[#292c3d] text-slate-500'
            }`}
            title="Mantener vista en los eventos más recientes"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span>Auto</span>
          </button>
        </div>
      </div>

      {/* Events List Body */}
      <div
        className={`overflow-y-auto divide-y divide-[#171a26] p-2 sm:p-3 space-y-1.5 ${
          isCompact ? 'max-h-[360px]' : 'max-h-[520px]'
        }`}
      >
        {filteredEvents.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#141724] border border-[#2b3046] flex items-center justify-center text-slate-500">
              <History className="w-6 h-6 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'No se encontraron eventos con los filtros seleccionados'
                  : 'Aún no hay eventos registrados en esta partida'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Los eventos aparecerán automáticamente en tiempo real al iniciar el cronómetro, resolver desafíos,
                disparar audios o recibir comandos de hardware.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              {(searchQuery || selectedCategory !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="px-3 py-1 rounded bg-[#181a28] hover:bg-[#202334] border border-[#2d3248] text-xs text-indigo-300 font-semibold cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              )}
              <button
                onClick={handleAddSampleEvent}
                className="px-3 py-1 rounded bg-[#181a28] hover:bg-[#202334] border border-[#2d3248] text-xs text-slate-300 font-semibold cursor-pointer"
              >
                + Generar Evento de Prueba
              </button>
            </div>
          </div>
        ) : (
          filteredEvents.map((event) => {
            return (
              <div
                key={event.id}
                className={`p-3 rounded-xl bg-[#12141f] hover:bg-[#161926] border border-[#1f2232] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${getSeverityBorder(
                  event.severity
                )}`}
              >
                {/* Left: Timing & Category Badge */}
                <div className="flex items-start sm:items-center gap-3 shrink-0">
                  {/* Category icon avatar */}
                  <div className="w-7 h-7 rounded-lg bg-[#0e1018] border border-[#262a3c] flex items-center justify-center shrink-0">
                    {getCategoryIcon(event.category, event.severity)}
                  </div>

                  <div className="space-y-0.5">
                    {/* Wall clock & Game timer badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
                        {event.wallTime}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/60 border border-slate-700/60 font-mono text-[11px] text-amber-300 font-semibold">
                        ⏱️ {event.gameTime}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formatElapsed(event.elapsedSec)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                          event.category
                        )}`}
                      >
                        {event.category}
                      </span>
                      {event.source && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          via {event.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center / Right: Event Content */}
                <div className="flex-1 min-w-0 sm:pl-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>{event.title}</span>
                  </h4>
                  {event.detail && (
                    <p className="text-xs text-slate-400 font-mono leading-relaxed mt-0.5 break-words">
                      {event.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Footer bar with quick summary & trigger */}
      <div className="px-4 py-2.5 bg-[#0e1018] border-t border-[#1e2233] flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px]">Canal de auditoría activo</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddSampleEvent}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
          >
            + Diagnóstico
          </button>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-[11px] text-slate-500">
            Exportable para informe de escape room
          </span>
        </div>
      </div>
    </div>
  );
};
