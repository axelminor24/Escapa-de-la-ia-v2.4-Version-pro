import { ChallengeNumber } from '../types';

export type ApiConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface ExternalApiAction {
  action?:
    | 'START'
    | 'SKIP_INTRO'
    | 'PAUSE'
    | 'RESET'
    | 'WIN'
    | 'GAME_OVER'
    | 'SOLVE_CHALLENGE'
    | 'UNSOLVE_CHALLENGE'
    | 'TRIGGER_AUDIO';
  challengeNumber?: ChallengeNumber;
  trackId?: string;
  skipIntro?: boolean;
  challenges?: {
    1?: boolean;
    2?: boolean;
    3?: boolean;
    4?: boolean;
    challenge1?: boolean;
    challenge2?: boolean;
    challenge3?: boolean;
    challenge4?: boolean;
  };
}

export interface ApiConfig {
  httpUrl: string;
  apiKey: string;
  pollingEnabled: boolean;
  pollingIntervalMs: number;
  wsUrl: string;
  wsEnabled: boolean;
  sendWebhooks: boolean;
  webhookUrl: string;
}

const STORAGE_KEY = 'escape_room_api_config';

const DEFAULT_CONFIG: ApiConfig = {
  httpUrl: '',
  apiKey: '',
  pollingEnabled: false,
  pollingIntervalMs: 1500,
  wsUrl: '',
  wsEnabled: false,
  sendWebhooks: false,
  webhookUrl: '',
};

class ExternalApiService {
  private config: ApiConfig = { ...DEFAULT_CONFIG };
  private status: ApiConnectionStatus = 'DISCONNECTED';
  private lastPingMs: number | null = null;
  private lastMessage: string | null = null;
  private lastError: string | null = null;

  private pollIntervalId: number | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: number | null = null;

  private actionListeners: Set<(action: ExternalApiAction) => void> = new Set();
  private statusListeners: Set<(status: ApiConnectionStatus, ping: number | null, err: string | null) => void> =
    new Set();

  constructor() {
    this.loadConfig();
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public getStatus(): ApiConnectionStatus {
    return this.status;
  }

  public getLastPing(): number | null {
    return this.lastPingMs;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getLastMessage(): string | null {
    return this.lastMessage;
  }

  public onAction(cb: (action: ExternalApiAction) => void): () => void {
    this.actionListeners.add(cb);
    return () => this.actionListeners.delete(cb);
  }

  public onStatusChange(
    cb: (status: ApiConnectionStatus, ping: number | null, err: string | null) => void
  ): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(status: ApiConnectionStatus, ping: number | null, err: string | null) {
    this.status = status;
    this.lastPingMs = ping;
    this.lastError = err;
    this.statusListeners.forEach((cb) => cb(status, ping, err));
  }

  private notifyAction(action: ExternalApiAction) {
    this.lastMessage = JSON.stringify(action);
    this.actionListeners.forEach((cb) => cb(action));
  }

  public loadConfig() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
  }

  public saveConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch {
        // ignore
      }
    }

    // Restart services according to new settings
    this.restartConnections();
  }

  public restartConnections() {
    this.stopPolling();
    this.closeWebSocket();

    if (this.config.pollingEnabled && this.config.httpUrl) {
      this.startPolling();
    }

    if (this.config.wsEnabled && this.config.wsUrl) {
      this.connectWebSocket();
    }

    if (!this.config.pollingEnabled && !this.config.wsEnabled) {
      this.notifyStatus('DISCONNECTED', null, null);
    }
  }

  // --- HTTP REST POLLING ---
  public startPolling() {
    this.stopPolling();
    if (!this.config.httpUrl) return;

    this.notifyStatus('CONNECTING', null, null);

    const poll = async () => {
      const start = performance.now();
      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
        };
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          headers['X-API-Key'] = this.config.apiKey;
        }

        const res = await fetch(this.config.httpUrl, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        const latency = Math.round(performance.now() - start);

        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        this.notifyStatus('CONNECTED', latency, null);
        this.handleInboundData(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al consultar API';
        this.notifyStatus('ERROR', null, msg);
      }
    };

    poll();
    this.pollIntervalId = window.setInterval(poll, Math.max(500, this.config.pollingIntervalMs));
  }

  public stopPolling() {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  // --- WEBSOCKET CONNECTION ---
  public connectWebSocket() {
    this.closeWebSocket();
    if (!this.config.wsUrl || typeof window === 'undefined') return;

    try {
      this.notifyStatus('CONNECTING', null, null);
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.notifyStatus('CONNECTED', 5, null);
        // If API key set, authenticate
        if (this.config.apiKey && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'AUTH', token: this.config.apiKey }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.handleInboundData(parsed);
        } catch {
          // ignore non-json messages
        }
      };

      this.ws.onerror = () => {
        this.notifyStatus('ERROR', null, 'Fallo de conexión WebSocket');
      };

      this.ws.onclose = () => {
        if (this.config.wsEnabled) {
          this.notifyStatus('DISCONNECTED', null, 'WebSocket cerrado. Reconectando...');
          this.wsReconnectTimer = window.setTimeout(() => {
            this.connectWebSocket();
          }, 3000);
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inicializar WebSocket';
      this.notifyStatus('ERROR', null, msg);
    }
  }

  public closeWebSocket() {
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  // --- DISPATCH INBOUND COMMANDS ---
  private handleInboundData(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const actionObj = data as ExternalApiAction;
    this.notifyAction(actionObj);
  }

  // --- TEST CONNECTION ON DEMAND ---
  public async testConnection(
    url: string,
    key?: string
  ): Promise<{ ok: boolean; latencyMs: number; data?: unknown; error?: string }> {
    const start = performance.now();
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
        headers['X-API-Key'] = key;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - start);

      if (!res.ok) {
        return {
          ok: false,
          latencyMs: latency,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      return { ok: true, latencyMs: latency, data };
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs: latency,
        error: err instanceof Error ? err.message : 'Error de conexión / CORS o red inaccesible',
      };
    }
  }

  // --- OUTBOUND STATUS WEBHOOK ---
  public async sendWebhookUpdate(payload: unknown) {
    const targetUrl = this.config.webhookUrl || this.config.httpUrl;
    if (!this.config.sendWebhooks || !targetUrl) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Fallo al enviar webhook a API externa:', err);
    }
  }
}

export const externalApiService = new ExternalApiService();
