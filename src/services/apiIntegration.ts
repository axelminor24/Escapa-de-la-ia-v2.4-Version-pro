import { ChallengesState, ChallengeNumber } from '../types';

export type ApiSyncStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface ApiCallbacks {
  onChallengeSolve: (num: ChallengeNumber) => void;
  onChallengesState: (state: ChallengesState) => void;
  onWin: () => void;
  onFail: () => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

class ApiIntegrationService {
  private apiUrl: string = '';
  private pollingIntervalMs: number = 1500;
  private intervalId: number | null = null;
  private status: ApiSyncStatus = 'DISCONNECTED';
  private lastMessage: string = 'Sin configurar';
  private callbacks: ApiCallbacks | null = null;
  private onStatusChange: ((status: ApiSyncStatus, msg: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.apiUrl = localStorage.getItem('escape_room_api_url') || '';
    }
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public setApiUrl(url: string) {
    this.apiUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem('escape_room_api_url', this.apiUrl);
    }
  }

  public setCallbacks(callbacks: ApiCallbacks, onStatusChange: (status: ApiSyncStatus, msg: string) => void) {
    this.callbacks = callbacks;
    this.onStatusChange = onStatusChange;
  }

  public async testConnection(targetUrl?: string): Promise<{ success: boolean; message: string; sampleData?: unknown }> {
    const url = (targetUrl || this.apiUrl).trim();
    if (!url) {
      return { success: false, message: 'URL de API vacía' };
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        return { success: false, message: `Respuesta HTTP ${res.status}: ${res.statusText}` };
      }

      const data = await res.json();
      return { success: true, message: `Conexión exitosa (HTTP ${res.status})`, sampleData: data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error de red: ${msg}` };
    }
  }

  public startPolling() {
    this.stopPolling();
    if (!this.apiUrl) {
      this.updateStatus('DISCONNECTED', 'Ingresa una URL de API para iniciar sincronización');
      return;
    }

    this.updateStatus('CONNECTING', 'Conectando con la API externa...');

    const poll = async () => {
      if (!this.apiUrl) return;

      try {
        const res = await fetch(this.apiUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          this.updateStatus('ERROR', `Error HTTP ${res.status} (${res.statusText})`);
          return;
        }

        const data = await res.json();
        this.updateStatus('CONNECTED', `Sincronizado a las ${new Date().toLocaleTimeString()}`);
        this.processIncomingData(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.updateStatus('ERROR', `Error de red al consultar API: ${msg}`);
      }
    };

    // Run first poll immediately
    poll();
    this.intervalId = window.setInterval(poll, this.pollingIntervalMs);
  }

  public stopPolling() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateStatus('DISCONNECTED', 'Sincronización detenida');
  }

  public isPolling(): boolean {
    return this.intervalId !== null;
  }

  private updateStatus(newStatus: ApiSyncStatus, msg: string) {
    this.status = newStatus;
    this.lastMessage = msg;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus, msg);
    }
  }

  private processIncomingData(data: Record<string, unknown>) {
    if (!this.callbacks || !data || typeof data !== 'object') return;

    // 1. Direct challenge triggers: { action: "SOLVE_CHALLENGE", challengeNumber: 1 }
    if (data.action === 'SOLVE_CHALLENGE' && typeof data.challengeNumber === 'number') {
      const num = data.challengeNumber as ChallengeNumber;
      if (num >= 1 && num <= 4) {
        this.callbacks.onChallengeSolve(num);
      }
    } else if (data.action === 'WIN') {
      this.callbacks.onWin();
    } else if (data.action === 'FAIL') {
      this.callbacks.onFail();
    } else if (data.action === 'START') {
      this.callbacks.onStart();
    } else if (data.action === 'PAUSE') {
      this.callbacks.onPause();
    } else if (data.action === 'RESET') {
      this.callbacks.onReset();
    }

    // 2. Challenges state object: { challenges: { 1: true, 2: false, 3: true, 4: false } }
    if (data.challenges && typeof data.challenges === 'object') {
      const ch = data.challenges as Record<string, boolean>;
      this.callbacks.onChallengesState({
        1: Boolean(ch['1'] ?? ch[1]),
        2: Boolean(ch['2'] ?? ch[2]),
        3: Boolean(ch['3'] ?? ch[3]),
        4: Boolean(ch['4'] ?? ch[4]),
      });
    }

    // 3. Flat properties: { challenge1: true, challenge2: true }
    if ('challenge1' in data || 'challenge2' in data || 'challenge3' in data || 'challenge4' in data) {
      this.callbacks.onChallengesState({
        1: Boolean(data.challenge1),
        2: Boolean(data.challenge2),
        3: Boolean(data.challenge3),
        4: Boolean(data.challenge4),
      });
    }

    // 4. Solved count: { solvedCount: 3 }
    if (typeof data.solvedCount === 'number') {
      const count = Math.min(4, Math.max(0, data.solvedCount));
      this.callbacks.onChallengesState({
        1: count >= 1,
        2: count >= 2,
        3: count >= 3,
        4: count >= 4,
      });
    }
  }
}

export const apiIntegration = new ApiIntegrationService();
