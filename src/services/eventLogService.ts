import { GameEvent, GameEventCategory, GameEventSeverity } from '../types';

const STORAGE_KEY = 'escape_room_event_log';
const MAX_EVENTS = 200;

type EventListener = (events: GameEvent[]) => void;

class EventLogService {
  private events: GameEvent[] = [];
  private listeners: Set<EventListener> = new Set();
  private currentGameTimeStr: string = '15:00';
  private currentElapsedSec: number = 0;

  constructor() {
    this.loadFromStorage();
    if (this.events.length === 0) {
      this.recordSystemEvent(
        'Sistema de Registro Inicializado',
        'Estación de control lista para registrar eventos de juego, audios y desafíos en tiempo real.',
        'Sistema'
      );
    }
  }

  public updateTimeContext(remainingStr: string, elapsedSec: number) {
    this.currentGameTimeStr = remainingStr;
    this.currentElapsedSec = elapsedSec;
  }

  private loadFromStorage() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.events = JSON.parse(saved);
      }
    } catch {
      this.events = [];
    }
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.events.slice(-MAX_EVENTS)));
    } catch {
      // Storage quota or disabled, ignore
    }
  }

  private notify() {
    this.saveToStorage();
    const copy = [...this.events];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    });
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    listener([...this.events]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getEvents(): GameEvent[] {
    return [...this.events];
  }

  public logEvent(params: {
    category: GameEventCategory;
    severity?: GameEventSeverity;
    title: string;
    detail?: string;
    source?: string;
    gameTime?: string;
    elapsedSec?: number;
    metadata?: Record<string, any>;
  }): GameEvent {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const wallTime = `${hours}:${minutes}:${seconds}`;

    const newEvent: GameEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      wallTime,
      gameTime: params.gameTime ?? this.currentGameTimeStr,
      elapsedSec: params.elapsedSec ?? this.currentElapsedSec,
      category: params.category,
      severity: params.severity ?? 'info',
      title: params.title,
      detail: params.detail,
      source: params.source ?? 'Sistema',
      metadata: params.metadata,
    };

    this.events = [newEvent, ...this.events].slice(0, MAX_EVENTS);
    this.notify();
    return newEvent;
  }

  // --- SPECIALIZED SHORTCUTS ---
  public recordChallengeEvent(
    challengeNumber: number,
    isSolved: boolean,
    totalSolved: number,
    source: string = 'Panel Admin'
  ) {
    if (isSolved) {
      this.logEvent({
        category: 'CHALLENGE',
        severity: totalSolved === 4 ? 'success' : 'success',
        title: `🎯 Desafío #${challengeNumber} Resuelto`,
        detail:
          totalSolved === 4
            ? `¡Los 4 desafíos han sido superados! Condición de victoria completada (${totalSolved}/4).`
            : `Desafío #${challengeNumber} completado con éxito. Progreso total: ${totalSolved}/4 desafíos.`,
        source,
        metadata: { challengeNumber, totalSolved, isSolved: true },
      });
    } else {
      this.logEvent({
        category: 'CHALLENGE',
        severity: 'warning',
        title: `↩ Desafío #${challengeNumber} Desmarcado`,
        detail: `El desafío #${challengeNumber} volvió a estado pendiente. Progreso actual: ${totalSolved}/4.`,
        source,
        metadata: { challengeNumber, totalSolved, isSolved: false },
      });
    }
  }

  public recordStateEvent(
    state: string,
    title: string,
    detail?: string,
    severity: GameEventSeverity = 'info',
    source: string = 'Control Maestro'
  ) {
    this.logEvent({
      category: 'STATE',
      severity,
      title,
      detail,
      source,
      metadata: { gameState: state },
    });
  }

  public recordAudioEvent(
    trackTitle: string,
    trackFile: string,
    isInterrupting: boolean = false,
    detail?: string,
    source: string = 'AudioEngine'
  ) {
    this.logEvent({
      category: 'AUDIO',
      severity: isInterrupting ? 'warning' : 'info',
      title: isInterrupting ? `🔊 Audio Prioritario: ${trackTitle}` : `🔊 Pista: ${trackTitle}`,
      detail:
        detail ||
        (isInterrupting
          ? `Reproduciendo ${trackFile}. Audio anterior pausado en segundo plano, se reanudará al finalizar.`
          : `Reproduciendo ${trackFile}.`),
      source,
      metadata: { trackTitle, trackFile, isInterrupting },
    });
  }

  public recordTimelineEvent(title: string, detail: string, severity: GameEventSeverity = 'info') {
    this.logEvent({
      category: 'TIMELINE',
      severity,
      title,
      detail,
      source: 'Cronómetro',
    });
  }

  public recordApiEvent(action: string, detail: string, source: string = 'API Externa') {
    this.logEvent({
      category: 'API',
      severity: 'info',
      title: `🌐 Señal Externa: ${action}`,
      detail,
      source,
      metadata: { action },
    });
  }

  public recordSystemEvent(title: string, detail?: string, source: string = 'Sistema') {
    this.logEvent({
      category: 'SYSTEM',
      severity: 'info',
      title,
      detail,
      source,
    });
  }

  public clearLog() {
    this.events = [];
    this.recordSystemEvent(
      'Registro de Eventos Limpiado',
      'El historial de eventos ha sido restablecido por el operador.',
      'Operador'
    );
  }

  public exportAsText(): string {
    const lines = [
      '==============================================================',
      'ESCAPE ROOM v2.4 PRO - REGISTRO HISTÓRICO DE EVENTOS',
      `Fecha de exportación: ${new Date().toLocaleString()}`,
      `Total de eventos: ${this.events.length}`,
      '==============================================================\n',
    ];

    // Export in chronological order (oldest to newest)
    const chrono = [...this.events].reverse();
    chrono.forEach((e, idx) => {
      lines.push(
        `[${(idx + 1).toString().padStart(3, '0')}] ${e.wallTime} | Restante: ${e.gameTime} | +${Math.floor(
          e.elapsedSec / 60
        )
          .toString()
          .padStart(2, '0')}:${(e.elapsedSec % 60).toString().padStart(2, '0')} | [${e.category}]`
      );
      lines.push(`     Título: ${e.title}`);
      if (e.detail) lines.push(`     Detalle: ${e.detail}`);
      if (e.source) lines.push(`     Origen: ${e.source}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  public exportAsJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalEvents: this.events.length,
        events: [...this.events].reverse(),
      },
      null,
      2
    );
  }

  public exportAsCsv(): string {
    const headers = [
      '#',
      'Hora_Real',
      'Tiempo_Restante',
      'Segundos_Transcurridos',
      'Categoria',
      'Severidad',
      'Titulo',
      'Detalle',
      'Origen',
    ];
    const rows = [headers.join(',')];

    // Chronological order (oldest to newest)
    const chrono = [...this.events].reverse();
    chrono.forEach((e, idx) => {
      const escapeCsv = (val: string = '') => {
        const clean = val.replace(/"/g, '""');
        return `"${clean}"`;
      };

      const row = [
        idx + 1,
        escapeCsv(e.wallTime),
        escapeCsv(e.gameTime),
        e.elapsedSec,
        escapeCsv(e.category),
        escapeCsv(e.severity),
        escapeCsv(e.title),
        escapeCsv(e.detail || ''),
        escapeCsv(e.source || ''),
      ];
      rows.push(row.join(','));
    });

    // Return with UTF-8 BOM for full Excel/Google Sheets compatibility
    return '\uFEFF' + rows.join('\r\n');
  }
}

export const eventLogService = new EventLogService();
