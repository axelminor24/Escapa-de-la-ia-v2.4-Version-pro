import { AudioTrackConfig } from '../types';
import { eventLogService } from './eventLogService';

export const INITIAL_TRACKS: AudioTrackConfig[] = [
  {
    id: 'ambient',
    defaultName: 'Audio-de-ambiente.mp3',
    title: 'Sonido de Ambiente Envolvente',
    triggerTimeSec: null,
    keywords: ['ambiente', 'background', 'loop', 'atmosfera'],
    fallbackText: '',
    fired: false,
  },
  {
    id: 'start',
    defaultName: 'Inicio-de-juegos-explicacion-de-desafios.mp3',
    title: '00:00 - Inicio y Explicación de Desafíos',
    triggerTimeSec: 0,
    keywords: ['inicio', 'explicacion', 'desafios', 'reglas', 'comienzo'],
    fallbackText: 'Bienvenidos al desafío. Tienen exactamente quince minutos para resolver los cuatro enigmas. Trabajen juntos si quieren salir de aquí. El tiempo empieza a correr... ¡ahora!',
    fired: false,
  },
  {
    id: 'challenge_1',
    defaultName: 'Desafio-1-completado.mp3',
    title: 'Desafío 1 Completado',
    triggerTimeSec: null,
    keywords: ['desafio-1', 'desafio 1', 'enigma 1', 'reto 1', 'completado-1'],
    fallbackText: '¡Atención! El primer desafío ha sido completado con éxito. Continúen con el siguiente enigma.',
    fired: false,
    conditionType: 'none',
    conditionLabel: 'Se reproduce al completar el Desafío 1 (Interrumpe y reanuda)',
  },
  {
    id: 'challenge_2',
    defaultName: 'Desafio-2-completado.mp3',
    title: 'Desafío 2 Completado',
    triggerTimeSec: null,
    keywords: ['desafio-2', 'desafio 2', 'enigma 2', 'reto 2', 'completado-2'],
    fallbackText: '¡Excelente trabajo! Han resuelto el segundo desafío. La mitad del camino está hecha.',
    fired: false,
    conditionType: 'none',
    conditionLabel: 'Se reproduce al completar el Desafío 2 (Interrumpe y reanuda)',
  },
  {
    id: 'challenge_3',
    defaultName: 'Desafio-3-completado.mp3',
    title: 'Desafío 3 Completado',
    triggerTimeSec: null,
    keywords: ['desafio-3', 'desafio 3', 'enigma 3', 'reto 3', 'completado-3'],
    fallbackText: '¡Tercer desafío superado! Solo les queda un último obstáculo para escapar.',
    fired: false,
    conditionType: 'none',
    conditionLabel: 'Se reproduce al completar el Desafío 3 (Interrumpe y reanuda)',
  },
  {
    id: 'challenge_4',
    defaultName: 'Desafio-4-completado.mp3',
    title: 'Desafío 4 Completado',
    triggerTimeSec: null,
    keywords: ['desafio-4', 'desafio 4', 'enigma 4', 'reto 4', 'completado-4', 'tiempo-terminado-desafio'],
    fallbackText: '¡Increíble! Han completado el cuarto desafío. Ahora reúnan los cuatro números y abran el candado final para escapar.',
    fired: false,
    conditionType: 'none',
    conditionLabel: 'Se reproduce al completar el Desafío 4',
  },
  {
    id: 'min5_progress',
    defaultName: 'Minuto-5-con-desafio-completado.mp3',
    title: '05:00 - Con Avance (Al menos 1 desafío completado)',
    triggerTimeSec: 5 * 60, // 300 seconds
    keywords: ['minuto-5-con', '5-con', 'cinco-con', 'avance', 'progreso', 'con-desafio', 'desafio-completado'],
    fallbackText: 'Atención: Han transcurrido cinco minutos y ya han completado al menos un desafío. Van por buen camino, mantengan el enfoque.',
    fired: false,
    conditionType: 'solved_ge_1',
    conditionLabel: 'Se activa a los 05:00 si han superado 1 o más desafíos',
  },
  {
    id: 'min5_no_progress',
    defaultName: 'Minuto-5-sin-desafios-completados.mp3',
    title: '05:00 - Sin Avance (0 desafíos completados)',
    triggerTimeSec: 5 * 60, // 300 seconds
    keywords: ['minuto-5-sin', '5-sin', 'cinco-sin', 'sin-avance', 'sin-desafio', 'retraso', 'ninguno', 'sin-completar'],
    fallbackText: 'Alerta: Cinco minutos transcurridos y aún no han superado ningún desafío. El tiempo corre rápido, necesitan acelerar el ritmo de inmediato.',
    fired: false,
    conditionType: 'solved_eq_0',
    conditionLabel: 'Se activa a los 05:00 si todavía tienen 0 desafíos superados',
  },
  {
    id: 'halfway',
    defaultName: 'Mitad-de-tiempo-consumido-etapa-media.mp3',
    title: '07:30 - Mitad del Tiempo Consumido',
    triggerTimeSec: 7.5 * 60, // 450 seconds
    keywords: ['mitad', 'consumido', '7:30', 'medio', 'tiempo medio'],
    fallbackText: 'Alerta: Siete minutos y treinta segundos transcurridos. La mitad de su tiempo se ha consumido. Apresúrense.',
    fired: false,
  },
  {
    id: '3min',
    defaultName: 'Tres-minutos-restantes-presion.mp3',
    title: '12:00 - Tres Minutos Restantes (Presión)',
    triggerTimeSec: 12 * 60, // 720 seconds (3 mins remaining)
    keywords: ['3', 'tres', 'presion', 'restantes', 'quedan', 'final', '12:00'],
    fallbackText: 'Tres minutos. Es todo lo que les queda. Sientan cómo la presión aumenta. Están muy cerca del final.',
    fired: false,
  },
  {
    id: 'gameover',
    defaultName: 'Tiempo-agotado-Fin-del-juego.mp3',
    title: '15:00 - Tiempo Agotado / Fin del Juego',
    triggerTimeSec: 15 * 60, // 900 seconds
    keywords: ['agotado', 'fin', 'derrota', 'tiempo agotado', 'game over'],
    fallbackText: 'El tiempo se ha agotado. Han fallado en el desafío. Las puertas quedan selladas. Fin del juego.',
    fired: false,
  },
  {
    id: 'victory',
    defaultName: 'Tiempo-terminado-Desafio-completo_1 (1).mp3',
    title: '¡Victoria! - Desafío Completo (Escaparon)',
    triggerTimeSec: null,
    keywords: ['completo', 'terminado', 'escaparon', 'victoria', 'exito', 'desafio completo'],
    fallbackText: '¡Felicidades! Han completado los cuatro desafíos a tiempo. Las puertas se han desbloqueado. ¡Han logrado escapar con éxito!',
    fired: false,
  },
];

class AudioEngine {
  private ambientAudio: HTMLAudioElement | null = null;
  private voiceAudio: HTMLAudioElement | null = null;
  private priorityVoiceAudio: HTMLAudioElement | null = null;
  private audioUrls: Record<string, string> = {};
  private customFileNames: Record<string, string> = {};

  private ambientVolume = 0.6;
  private voiceVolume = 1.0;
  private isMuted = false;

  // Web Audio Synth ambient drone fallback
  private audioCtx: AudioContext | null = null;
  private synthGainNode: GainNode | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private isSynthPlaying = false;

  // Current playing track ID and interrupt state
  private currentVoiceTrackId: string | null = null;
  private voiceSessionId = 0;
  private interruptedVoiceState: {
    trackId: string;
    currentTime: number;
    onEnded?: () => void;
  } | null = null;

  constructor() {
    // Client-side initialization
    if (typeof window !== 'undefined') {
      this.ambientAudio = new Audio();
      this.ambientAudio.loop = true;
      this.ambientAudio.preload = 'auto';

      this.voiceAudio = new Audio();
      this.voiceAudio.preload = 'auto';

      this.priorityVoiceAudio = new Audio();
      this.priorityVoiceAudio.preload = 'auto';
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientAudio) this.ambientAudio.muted = muted;
    if (this.voiceAudio) this.voiceAudio.muted = muted;
    if (this.priorityVoiceAudio) this.priorityVoiceAudio.muted = muted;
    if (this.synthGainNode && this.audioCtx) {
      this.synthGainNode.gain.setValueAtTime(muted ? 0 : this.ambientVolume * 0.35, this.audioCtx.currentTime);
    }
  }

  public prepare() {
    this.initAudioContext();
  }

  public setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientAudio) {
      // If voice is currently speaking, maintain ducking
      if (this.currentVoiceTrackId) {
        this.ambientAudio.volume = this.ambientVolume * 0.15;
      } else {
        this.ambientAudio.volume = this.ambientVolume;
      }
    }
    if (this.synthGainNode && this.audioCtx) {
      const target = this.currentVoiceTrackId ? this.ambientVolume * 0.08 : this.ambientVolume * 0.35;
      this.synthGainNode.gain.setValueAtTime(this.isMuted ? 0 : target, this.audioCtx.currentTime);
    }
  }

  public setVoiceVolume(vol: number) {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
    if (this.voiceAudio) {
      this.voiceAudio.volume = this.voiceVolume;
    }
    if (this.priorityVoiceAudio) {
      this.priorityVoiceAudio.volume = this.voiceVolume;
    }
  }

  public getAmbientVolume(): number {
    return this.ambientVolume;
  }

  public getVoiceVolume(): number {
    return this.voiceVolume;
  }

  public isVoicePlaying(): boolean {
    return (
      (this.voiceAudio !== null && !this.voiceAudio.paused && !this.voiceAudio.ended) ||
      (this.priorityVoiceAudio !== null && !this.priorityVoiceAudio.paused && !this.priorityVoiceAudio.ended)
    );
  }

  public setTrackBlobUrl(trackId: string, url: string, fileName?: string) {
    this.audioUrls[trackId] = url;
    if (fileName) {
      this.customFileNames[trackId] = fileName;
    }
  }

  public getTrackCustomFileName(trackId: string): string | null {
    return this.customFileNames[trackId] || null;
  }

  public getTrackSrc(track: AudioTrackConfig): string {
    if (this.audioUrls[track.id]) {
      return this.audioUrls[track.id];
    }
    // Default encoded path relative to root/public
    return encodeURI(track.defaultName);
  }

  public hasCustomAudio(trackId: string): boolean {
    return Boolean(this.audioUrls[trackId]);
  }

  // --- AMBIENT SOUND (Continuous Background) ---
  public startAmbient() {
    if (this.isMuted) return;

    const ambientTrack = INITIAL_TRACKS.find((t) => t.id === 'ambient')!;
    const src = this.getTrackSrc(ambientTrack);

    if (this.ambientAudio) {
      this.ambientAudio.src = src;
      this.ambientAudio.volume = this.ambientVolume;
      const playPromise = this.ambientAudio.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Ambient file playback failed or file not found, starting synthetic ambient drone:', err);
          this.startSynthDrone();
        });
      }
    } else {
      this.startSynthDrone();
    }
  }

  public pauseAmbient() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
    }
    this.stopSynthDrone();
  }

  public stopAmbient() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }
    this.stopSynthDrone();
  }

  // --- SYNTHETIC AMBIENT DRONE FALLBACK (Web Audio API) ---
  private initAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public startSynthDrone() {
    if (this.isSynthPlaying || this.isMuted) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      this.stopSynthDrone();

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.ambientVolume * 0.35, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);

      // Low frequency drone oscillators for escape room tension
      const freqs = [48, 54, 72, 96];
      this.synthOscillators = [];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Subtle detune for thickness
        osc.detune.setValueAtTime((idx - 1.5) * 6, ctx.currentTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.22 / freqs.length, ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
        this.synthOscillators.push(osc);
      });

      // LFO for slow atmospheric pulsation
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.18, ctx.currentTime); // 5.5 sec cycle
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(35, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.synthOscillators.push(lfo);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.synthGainNode = masterGain;
      this.isSynthPlaying = true;
    } catch (e) {
      console.warn('Could not start synthetic drone:', e);
    }
  }

  public stopSynthDrone() {
    if (this.synthOscillators.length > 0) {
      this.synthOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.synthOscillators = [];
    }
    this.isSynthPlaying = false;
  }

  // --- MONOPHONIC VOICE PLAYER WITH DUCKING ---
  public playVoiceTrack(track: AudioTrackConfig, onEnded?: () => void) {
    if (this.isMuted) {
      if (onEnded) onEnded();
      return;
    }

    // 1. Immediately cut off any voice audio currently playing
    this.stopVoice();

    const sessionId = ++this.voiceSessionId;
    this.currentVoiceTrackId = track.id;

    // Log audio event
    eventLogService.recordAudioEvent(track.title, track.defaultName, false);

    // 2. Duck ambient sound to 15%
    this.applyDucking(true);

    const src = this.getTrackSrc(track);

    if (this.voiceAudio) {
      this.voiceAudio.src = src;
      this.voiceAudio.volume = this.voiceVolume;

      let hasFinished = false;
      const handleFinish = () => {
        if (hasFinished || sessionId !== this.voiceSessionId) return;
        hasFinished = true;
        this.currentVoiceTrackId = null;
        this.applyDucking(false);
        if (onEnded) onEnded();
      };

      this.voiceAudio.onended = handleFinish;
      this.voiceAudio.onerror = () => {
        if (sessionId !== this.voiceSessionId || this.currentVoiceTrackId !== track.id) return;
        console.warn(`File "${track.defaultName}" failed to load or decode (404/demux). Falling back to speech:`);
        this.playSpeechSynthesisFallback(track, handleFinish, sessionId);
      };

      const playPromise = this.voiceAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (sessionId !== this.voiceSessionId || this.currentVoiceTrackId !== track.id || err?.name === 'AbortError') {
            return;
          }
          console.warn(`File "${track.defaultName}" could not be played. Triggering synthesized voice fallback:`, err);
          this.playSpeechSynthesisFallback(track, handleFinish, sessionId);
        });
      }
    } else {
      this.playSpeechSynthesisFallback(
        track,
        () => {
          if (sessionId !== this.voiceSessionId) return;
          this.currentVoiceTrackId = null;
          this.applyDucking(false);
          if (onEnded) onEnded();
        },
        sessionId
      );
    }
  }

  // --- INTERRUPTING PRIORITY VOICE PLAYER (For challenge completion) ---
  // Superimposes over whatever is currently playing, puts it in background, and resumes it once finished!
  public playInterruptingVoiceTrack(track: AudioTrackConfig, onEnded?: () => void) {
    if (this.isMuted) {
      if (onEnded) onEnded();
      return;
    }

    const sessionId = ++this.voiceSessionId;

    // 1. If a normal voice is playing, pause it and record its timestamp
    if (this.voiceAudio && !this.voiceAudio.paused && this.voiceAudio.currentTime > 0) {
      this.interruptedVoiceState = {
        trackId: this.currentVoiceTrackId || '',
        currentTime: this.voiceAudio.currentTime,
        onEnded: this.voiceAudio.onended as (() => void) | undefined,
      };
      this.voiceAudio.pause();
    }

    // 2. Duck ambient to 10%
    this.applyDucking(true);

    // Log priority interrupting audio event
    eventLogService.recordAudioEvent(
      track.title,
      track.defaultName,
      true,
      'Audio de desafío superpuesto sobre la emisión. Pista anterior en pausa.'
    );

    const src = this.getTrackSrc(track);

    let hasFinished = false;
    const handlePriorityFinish = () => {
      if (hasFinished || sessionId !== this.voiceSessionId) return;
      hasFinished = true;

      // When this priority challenge audio finishes:
      if (onEnded) onEnded();

      // Check if we need to resume interrupted voice
      if (this.interruptedVoiceState && this.voiceAudio && sessionId === this.voiceSessionId) {
        const savedState = this.interruptedVoiceState;
        this.interruptedVoiceState = null;
        this.currentVoiceTrackId = savedState.trackId;

        // Restore currentTime and resume playback
        this.voiceAudio.currentTime = savedState.currentTime;
        if (savedState.onEnded) {
          this.voiceAudio.onended = savedState.onEnded;
        }

        const resumePromise = this.voiceAudio.play();
        if (resumePromise !== undefined) {
          resumePromise.catch(() => {
            this.currentVoiceTrackId = null;
            this.applyDucking(false);
          });
        }
      } else {
        // No interrupted audio to resume, return ambient to normal
        this.applyDucking(false);
      }
    };

    if (this.priorityVoiceAudio) {
      this.priorityVoiceAudio.pause();
      this.priorityVoiceAudio.currentTime = 0;
      this.priorityVoiceAudio.src = src;
      this.priorityVoiceAudio.volume = this.voiceVolume;

      this.priorityVoiceAudio.onended = handlePriorityFinish;
      this.priorityVoiceAudio.onerror = () => {
        if (sessionId !== this.voiceSessionId) return;
        console.warn(`Priority file "${track.defaultName}" failed to load. Falling back to speech:`);
        this.playSpeechSynthesisFallback(track, handlePriorityFinish, sessionId);
      };

      const playPromise = this.priorityVoiceAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (sessionId !== this.voiceSessionId || err?.name === 'AbortError') return;
          console.warn(`Priority play failed for "${track.defaultName}":`, err);
          this.playSpeechSynthesisFallback(track, handlePriorityFinish, sessionId);
        });
      }
    } else {
      this.playSpeechSynthesisFallback(track, handlePriorityFinish, sessionId);
    }
  }

  // --- SPEECH SYNTHESIS FALLBACK WITH WATCHDOG ---
  private playSpeechSynthesisFallback(track: AudioTrackConfig, onFinish: () => void, sessionId?: number) {
    if (sessionId !== undefined && sessionId !== this.voiceSessionId) {
      return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis || !track.fallbackText) {
      onFinish();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(track.fallbackText);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.pitch = 0.85; // slightly lower pitch for dramatic escape room narrator effect
      utterance.volume = this.voiceVolume;

      let finished = false;
      let watchdogTimer: number | null = null;

      const safeFinish = () => {
        if (finished) return;
        finished = true;
        if (watchdogTimer !== null) {
          clearTimeout(watchdogTimer);
        }
        if (sessionId === undefined || sessionId === this.voiceSessionId) {
          onFinish();
        }
      };

      // Watchdog timeout: guarantees onFinish is called even if browser speech API gets stuck!
      const estDurationSec = Math.min(14, Math.max(3.5, track.fallbackText.length / 14));
      watchdogTimer = window.setTimeout(() => {
        safeFinish();
      }, (estDurationSec + 1) * 1000);

      utterance.onend = safeFinish;
      utterance.onerror = safeFinish;

      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang.startsWith('es'));
      if (esVoice) {
        utterance.voice = esVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      onFinish();
    }
  }

  // --- DUCKING MANAGEMENT ---
  private applyDucking(duck: boolean) {
    if (this.ambientAudio && !this.ambientAudio.paused) {
      this.ambientAudio.volume = duck ? this.ambientVolume * 0.15 : this.ambientVolume;
    }
    if (this.synthGainNode && this.audioCtx && this.isSynthPlaying) {
      const target = duck ? this.ambientVolume * 0.08 : this.ambientVolume * 0.35;
      this.synthGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.synthGainNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : target, this.audioCtx.currentTime + 0.3);
    }
  }

  // --- STOP VOICE IMMEDIATELY ---
  public stopVoice() {
    this.voiceSessionId++;
    this.currentVoiceTrackId = null;
    this.interruptedVoiceState = null;

    if (this.voiceAudio) {
      this.voiceAudio.onended = null;
      this.voiceAudio.onerror = null;
      this.voiceAudio.pause();
      this.voiceAudio.currentTime = 0;
      this.voiceAudio.src = '';
    }
    if (this.priorityVoiceAudio) {
      this.priorityVoiceAudio.onended = null;
      this.priorityVoiceAudio.onerror = null;
      this.priorityVoiceAudio.pause();
      this.priorityVoiceAudio.currentTime = 0;
      this.priorityVoiceAudio.src = '';
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const stoppedSession = this.voiceSessionId;
      setTimeout(() => {
        try {
          if (this.voiceSessionId === stoppedSession) window.speechSynthesis?.cancel();
        } catch {
          // ignore
        }
      }, 40);
    }
    this.applyDucking(false);
  }

  // --- TEST TRACK INDIVIDUALLY ---
  public testTrack(track: AudioTrackConfig, onStart?: () => void, onEnd?: () => void): Promise<boolean> {
    return new Promise((resolve) => {
      this.stopVoice();
      if (onStart) onStart();

      const testPlayer = new Audio(this.getTrackSrc(track));
      testPlayer.volume = this.voiceVolume;

      const finish = (success: boolean) => {
        if (onEnd) onEnd();
        resolve(success);
      };

      testPlayer.onended = () => finish(true);
      testPlayer.onerror = () => {
        if (track.fallbackText) {
          this.playSpeechSynthesisFallback(track, () => finish(true));
        } else {
          finish(false);
        }
      };

      testPlayer.play().catch(() => {
        if (track.fallbackText) {
          this.playSpeechSynthesisFallback(track, () => finish(true));
        } else {
          finish(false);
        }
      });
    });
  }

  // --- FILE MATCHING HELPER ---
  public registerFiles(fileList: FileList | File[]): number {
    let matched = 0;
    Array.from(fileList).forEach((file) => {
      const url = URL.createObjectURL(file);
      const name = file.name.toLowerCase();

      INITIAL_TRACKS.forEach((track) => {
        const defaultNameLower = track.defaultName.toLowerCase();
        const matchesDefault = name === defaultNameLower || name.includes(defaultNameLower.replace('.mp3', ''));
        const matchesKeywords = track.keywords.some((k) => name.includes(k.toLowerCase()));

        if (matchesDefault || matchesKeywords) {
          this.setTrackBlobUrl(track.id, url, file.name);
          matched++;
        }
      });
    });
    return matched;
  }
}

export const audioEngine = new AudioEngine();
