import React, { useState, useRef, useEffect } from 'react';
import {
  GameStatus,
  AudioTrackConfig,
  ChallengesState,
  ChallengeNumber,
} from '../types';
import { audioEngine, INITIAL_TRACKS } from '../services/audioEngine';
import {
  externalApiService,
  ApiConnectionStatus,
  ApiConfig,
} from '../services/externalApiService';
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
  Code2,
  Copy,
  Check,
  Music,
  Eye,
  FastForward,
  Globe,
  Wifi,
  WifiOff,
  Terminal,
  Zap,
  Github,
  AlertTriangle,
  RefreshCw,
  RadioTower,
  History,
  ChevronDown,
  ChevronUp,
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
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [fileMatchCount, setFileMatchCount] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Tabs for Api, GitHub & Event Log drawer
  const [activeTab, setActiveTab] = useState<'NONE' | 'API' | 'GITHUB' | 'LOG'>('NONE');
  const [apiSnippetLang, setApiSnippetLang] = useState<'NODE' | 'PYTHON' | 'ARDUINO' | 'CURL'>('NODE');
  const [eventCount, setEventCount] = useState<number>(eventLogService.getEvents().length);
  const [isLogSectionExpanded, setIsLogSectionExpanded] = useState<boolean>(true);

  // External API Config state
  const [apiConfig, setApiConfig] = useState<ApiConfig>(externalApiService.getConfig());
  const [apiStatus, setApiStatus] = useState<ApiConnectionStatus>(externalApiService.getStatus());
  const [apiPing, setApiPing] = useState<number | null>(externalApiService.getLastPing());
  const [apiError, setApiError] = useState<string | null>(externalApiService.getLastError());
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Hidden file input refs
  const bulkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = externalApiService.onStatusChange((status, ping, err) => {
      setApiStatus(status);
      setApiPing(ping);
      setApiError(err);
    });

    const unsubLog = eventLogService.subscribe((events) => {
      setEventCount(events.length);
    });

    return () => {
      unsub();
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

  // External API Handlers
  const handleSaveApiConfig = () => {
    externalApiService.saveConfig(apiConfig);
    setTestResult({ ok: true, msg: 'Configuración guardada y servicios reiniciados.' });
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleTestApiPing = async () => {
    if (!apiConfig.httpUrl) {
      setTestResult({ ok: false, msg: 'Ingresa una URL HTTP válida antes de probar.' });
      return;
    }
    setIsTestingApi(true);
    setTestResult(null);
    const res = await externalApiService.testConnection(apiConfig.httpUrl, apiConfig.apiKey);
    setIsTestingApi(false);
    if (res.ok) {
      setTestResult({
        ok: true,
        msg: `¡Conexión exitosa! Latencia: ${res.latencyMs}ms. Respuesta: ${JSON.stringify(res.data).slice(0, 80)}`,
      });
    } else {
      setTestResult({
        ok: false,
        msg: `Fallo de conexión: ${res.error || 'No se pudo contactar la API'}`,
      });
    }
  };

  // Simulate incoming actions from API directly
  const simulateApiAction = (action: string, param?: number) => {
    if (action === 'SOLVE_CHALLENGE' && param) {
      onToggleChallenge(param as ChallengeNumber);
    } else if (action === 'WIN') {
      onVictory();
    } else if (action === 'RESET') {
      onReset();
    } else if (action === 'SKIP_INTRO') {
      onStart(true);
    }
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const copyGitCommands = () => {
    const cmd = `git init\ngit add .\ngit commit -m "Deploy Escape Room Station"\ngit branch -M main\ngit remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git\ngit push -u origin main`;
    navigator.clipboard.writeText(cmd);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 2500);
  };

  const getCodeSnippet = () => {
    if (apiSnippetLang === 'NODE') {
      return `// Backend Node.js / Express para tu Escape Room
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let state = {
  challenge1: false,
  challenge2: false,
  challenge3: false,
  challenge4: false,
};

// 1. Endpoint que consulta la emisora automáticamente:
app.get('/api/status', (req, res) => {
  res.json({ challenges: state });
});

// 2. Endpoint que llamas cuando resuelven un enigma físico:
app.post('/api/solve/:num', (req, res) => {
  const num = req.params.num;
  state[\`challenge\${num}\`] = true;
  console.log(\`Desafío \${num} superado!\`);
  res.json({ success: true, state });
});

app.listen(5000, () => console.log('API de Escape Room lista en puerto 5000'));`;
    }

    if (apiSnippetLang === 'PYTHON') {
      return `# Backend Python Flask para tu Escape Room
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

state = {
    "1": False,
    "2": False,
    "3": False,
    "4": False
}

# 1. Endpoint consultado por la emisora:
@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({"challenges": state})

# 2. Endpoint activado por tus sensores o botones:
@app.route('/api/solve/<int:num>', methods=['POST'])
def solve(num):
    if 1 <= num <= 4:
        state[str(num)] = True
        return jsonify({"success": True, "state": state})
    return jsonify({"error": "Desafío inválido"}), 400

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0')`;
    }

    if (apiSnippetLang === 'ARDUINO') {
      return `// Código para ESP32 / Arduino con WiFi
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "http://192.168.1.100:5000/api/solve/1";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  Serial.println("Conectado a WiFi!");
}

void resolverDesafio1() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST("{}");
    Serial.print("Respuesta HTTP: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}

void loop() {
  // Cuando el sensor magnético o teclado se active:
  // resolverDesafio1();
}`;
    }

    return `# Consultar o activar vía cURL desde cualquier terminal:

# 1. Enviar evento de Desafío 1 Completado:
curl -X POST http://localhost:5000/api/solve/1

# 2. Consultar estado actual:
curl http://localhost:5000/api/status

# 3. Disparar acción directa a la emisora si usas Webhook:
curl -X POST http://localhost:5000/api/action \\
  -H "Content-Type: application/json" \\
  -d '{"action": "SOLVE_CHALLENGE", "challengeNumber": 2}'`;
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
              onClick={() => setActiveTab(activeTab === 'API' ? 'NONE' : 'API')}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'API'
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-950/50'
                  : 'bg-[#181926] hover:bg-[#202233] border-[#2b2d42] text-indigo-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Vincular API Externa</span>
              {apiStatus === 'CONNECTED' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'GITHUB' ? 'NONE' : 'GITHUB')}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'GITHUB'
                  ? 'bg-slate-700 border-slate-400 text-white'
                  : 'bg-[#181926] hover:bg-[#202233] border-[#2b2d42] text-slate-300'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Listo para</span> GitHub
            </button>

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

        {/* Drawer: External API Integration */}
        {activeTab === 'API' && (
          <div className="p-6 rounded-2xl bg-[#0b0c14] border-2 border-indigo-600/70 shadow-2xl space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#20233b]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-700/80 flex items-center justify-center text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                    Conexión con otra API & Sensores Hardware
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sincroniza la emisora en tiempo real con tu backend (Node, Python, Arduino, ESP32 o Raspberry Pi).
                  </p>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Estado API:</span>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 ${
                    apiStatus === 'CONNECTED'
                      ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                      : apiStatus === 'CONNECTING'
                      ? 'bg-amber-950 border border-amber-600 text-amber-300 animate-pulse'
                      : apiStatus === 'ERROR'
                      ? 'bg-red-950 border border-red-600 text-red-300'
                      : 'bg-[#181a28] border border-[#2b2d42] text-slate-400'
                  }`}
                >
                  {apiStatus === 'CONNECTED' && (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-400" />
                      <span>CONECTADO {apiPing !== null && `(${apiPing}ms)`}</span>
                    </>
                  )}
                  {apiStatus === 'CONNECTING' && (
                    <>
                      <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>CONECTANDO...</span>
                    </>
                  )}
                  {apiStatus === 'ERROR' && (
                    <>
                      <WifiOff className="w-3 h-3 text-red-400" />
                      <span>ERROR DE CONEXIÓN</span>
                    </>
                  )}
                  {apiStatus === 'DISCONNECTED' && (
                    <>
                      <WifiOff className="w-3 h-3 text-slate-500" />
                      <span>DESCONECTADO</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Config Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>URL de Polling HTTP REST</span>
                  <span className="text-[11px] text-slate-500 font-mono">GET /api/status</span>
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:5000/api/status"
                  value={apiConfig.httpUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, httpUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141524] border border-[#2b2e48] text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Token de Autorización / API Key (Opcional)</span>
                  <span className="text-[11px] text-slate-500 font-mono">Bearer / X-API-Key</span>
                </label>
                <input
                  type="password"
                  placeholder="token-secreto-escape-room"
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141524] border border-[#2b2e48] text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#131422] border border-[#26283e]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={apiConfig.pollingEnabled}
                    onChange={(e) => setApiConfig({ ...apiConfig, pollingEnabled: e.target.checked })}
                    className="accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Activar sondeo continuo (Polling HTTP)</span>
                </label>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Frecuencia de sondeo:</span>
                  <span className="font-mono text-indigo-300 font-bold">{apiConfig.pollingIntervalMs} ms</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="250"
                  value={apiConfig.pollingIntervalMs}
                  onChange={(e) => setApiConfig({ ...apiConfig, pollingIntervalMs: parseInt(e.target.value) })}
                  className="accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* WebSocket Config */}
              <div className="space-y-1.5 p-3 rounded-lg bg-[#131422] border border-[#26283e]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={apiConfig.wsEnabled}
                    onChange={(e) => setApiConfig({ ...apiConfig, wsEnabled: e.target.checked })}
                    className="accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Conexión WebSocket en tiempo real</span>
                </label>
                <input
                  type="text"
                  placeholder="ws://localhost:5000"
                  value={apiConfig.wsUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, wsUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-[#181a2c] border border-[#2c2f48] text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Test connection alert message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-950/70 border border-emerald-600 text-emerald-200'
                    : 'bg-red-950/70 border border-red-600 text-red-200'
                }`}
              >
                {testResult.ok ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                <span>{testResult.msg}</span>
              </div>
            )}

            {apiError && !testResult && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs font-mono text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Error de comunicación: {apiError}</span>
              </div>
            )}

            {/* Action Bar for API Settings */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveApiConfig}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-950/40 cursor-pointer transition-all"
                >
                  Guardar & Conectar
                </button>
                <button
                  onClick={handleTestApiPing}
                  disabled={isTestingApi}
                  className="px-3.5 py-2 rounded-lg bg-[#181a28] hover:bg-[#222438] border border-[#303350] text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isTestingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Probar Conexión (Ping)</span>
                </button>
              </div>

              {/* Simulation tools */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span>Simular señal entrante:</span>
                <button
                  onClick={() => simulateApiAction('SOLVE_CHALLENGE', 1)}
                  className="px-2 py-1 rounded bg-[#1a1d2e] hover:bg-[#242840] border border-[#323654] text-emerald-300 font-mono text-[11px] cursor-pointer"
                >
                  + Desafío 1
                </button>
                <button
                  onClick={() => simulateApiAction('SOLVE_CHALLENGE', 2)}
                  className="px-2 py-1 rounded bg-[#1a1d2e] hover:bg-[#242840] border border-[#323654] text-emerald-300 font-mono text-[11px] cursor-pointer"
                >
                  + Desafío 2
                </button>
                <button
                  onClick={() => simulateApiAction('WIN')}
                  className="px-2 py-1 rounded bg-[#1a1d2e] hover:bg-[#242840] border border-[#323654] text-amber-300 font-mono text-[11px] cursor-pointer"
                >
                  🏆 Ganar
                </button>
              </div>
            </div>

            {/* Code Examples Tabs */}
            <div className="space-y-2 pt-2 border-t border-[#1c1e33]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Ejemplos de Código para Vincular
                  </span>
                  <div className="flex items-center gap-1 ml-3">
                    {(['NODE', 'PYTHON', 'ARDUINO', 'CURL'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setApiSnippetLang(lang)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                          apiSnippetLang === lang
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-[#181a28] text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => copySnippet(getCodeSnippet())}
                  className="px-2.5 py-1 text-xs rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-xs font-mono p-3 bg-black/70 rounded-lg text-slate-300 overflow-x-auto border border-[#1e2136]">
                {getCodeSnippet()}
              </pre>
            </div>
          </div>
        )}

        {/* Drawer: GitHub & GitHub Pages */}
        {activeTab === 'GITHUB' && (
          <div className="p-6 rounded-2xl bg-[#0e111a] border-2 border-slate-600 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Github className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                    Listo para Subir y Correr en GitHub
                  </h2>
                  <p className="text-xs text-slate-400">
                    Esta aplicación ya cuenta con configuración de rutas relativas y despliegue automático con GitHub Actions.
                  </p>
                </div>
              </div>

              <button
                onClick={copyGitCommands}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedGit ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar comandos Git</span>
              </button>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#141824] border border-[#252c42] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>package-lock.json:</strong> Generado para instalación precisa en GitHub Actions.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141824] border border-[#252c42] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>deploy.yml:</strong> Workflow en <code>.github/workflows</code> tolerante y listo.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141824] border border-[#252c42] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>vite.config.ts:</strong> Ruta base <code>base: './'</code> configurada.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141824] border border-[#252c42] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>public/.nojekyll:</strong> Archivo presente para lectura de assets.</span>
              </div>
            </div>

            {/* Terminal snippet */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Comandos para subir a tu repositorio:</span>
              <pre className="p-3 rounded bg-black/80 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
{`git init
git add .
git commit -m "Escape Room Station"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main`}
              </pre>
            </div>
            <p className="text-[11px] text-slate-400">
              * En tu repositorio de GitHub, ve a <strong>Settings &gt; Pages</strong> y en <strong>Source</strong> selecciona <strong>GitHub Actions</strong>. En un minuto estará publicado en vivo.
            </p>
          </div>
        )}

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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'LOG' ? 'NONE' : 'LOG')}
                className="text-xs text-purple-300 hover:text-purple-200 font-mono flex items-center gap-1 cursor-pointer bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <span>{activeTab === 'LOG' ? 'Cerrar pestaña completa' : 'Abrir pestaña completa'}</span>
              </button>

              <button
                onClick={() => setIsLogSectionExpanded(!isLogSectionExpanded)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer bg-[#141624] hover:bg-[#1c1f32] border border-[#2b3046] px-2.5 py-1 rounded-lg transition-colors"
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
                      disabled={isTesting}
                      className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                        isTesting
                          ? 'bg-amber-500 text-black'
                          : 'bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300'
                      }`}
                    >
                      {isTesting ? 'Sonando...' : 'TEST'}
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
