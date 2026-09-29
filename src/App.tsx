import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, ChallengesState, ChallengeNumber, SyncMessage } from './types';
import { audioEngine, INITIAL_TRACKS } from './services/audioEngine';
import { externalApiService } from './services/externalApiService';
import { eventLogService } from './services/eventLogService';
import { RoleSelector } from './components/RoleSelector';
import { PlayerView } from './components/PlayerView';
import { AdminView } from './components/AdminView';

const TOTAL_GAME_SECONDS = 15 * 60; // 900 seconds (15 minutes)

export default function App() {
  // Navigation / View modes
  const [currentView, setCurrentView] = useState<'ROLE_SELECTOR' | 'PLAYER' | 'ADMIN'>('ROLE_SELECTOR');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Game Engine State
  const [gameState, setGameState] = useState<GameStatus>('IDLE');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [challenges, setChallenges] = useState<ChallengesState>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const gameStateRef = useRef<GameStatus>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const elapsedSecRef = useRef<number>(elapsedSec);
  useEffect(() => {
    elapsedSecRef.current = elapsedSec;
  }, [elapsedSec]);

  const challengesRef = useRef<ChallengesState>(challenges);
  useEffect(() => {
    challengesRef.current = challenges;
  }, [challenges]);

  // Track firing status (to avoid re-triggering during countdown)
  const firedTracksRef = useRef<Set<string>>(new Set());
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedOffsetRef = useRef<number>(0);
  const introSafetyTimerRef = useRef<number | null>(null);

  // BroadcastChannel for cross-window and external app communication
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isPopoutRef = useRef<boolean>(false);

  // Format MM:SS for display
  const getRemainingTimeStr = useCallback((elapsed: number) => {
    const remain = Math.max(0, TOTAL_GAME_SECONDS - elapsed);
    const m = Math.floor(remain / 60).toString().padStart(2, '0');
    const s = (remain % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const remainingStr = getRemainingTimeStr(elapsedSec);
  const isCritical = gameState === 'RUNNING' && TOTAL_GAME_SECONDS - elapsedSec <= 180 && TOTAL_GAME_SECONDS - elapsedSec > 0;

  // Broadcast message helper
  const broadcast = useCallback((msg: SyncMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage(msg);
    }
  }, []);

  // --- VICTORY TRIGGER (IMMEDIATE) ---
  const triggerVictory = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    startTimeRef.current = null;

    setGameState('VICTORY');

    // Record Event Log
    eventLogService.recordStateEvent(
      'VICTORY',
      '¡Victoria Total - Misión Cumplida!',
      'Los 4 desafíos fueron completados con éxito dentro del tiempo límite.',
      'success',
      'Sistema'
    );

    // 1. Immediately silence ambient and cut off any voice playing
    audioEngine.stopAmbient();
    audioEngine.stopVoice();

    // 2. Play victory audio immediately
    const challenge4Track = INITIAL_TRACKS.find((t) => t.id === 'challenge_4');
    const victoryTrack = challenge4Track || INITIAL_TRACKS.find((t) => t.id === 'victory');
    if (victoryTrack) {
      audioEngine.playVoiceTrack(victoryTrack);
    }

    // 3. Broadcast to all screens and external API
    broadcast({
      type: 'VICTORY',
      gameState: 'VICTORY',
      challenges: { 1: true, 2: true, 3: true, 4: true },
    });

    externalApiService.sendWebhookUpdate({
      action: 'VICTORY',
      gameState: 'VICTORY',
      elapsedSec: elapsedSecRef.current,
      challenges: { 1: true, 2: true, 3: true, 4: true },
    });
  }, [broadcast]);

  // --- CHALLENGE TOGGLING WITH INTERRUPT AUDIO ---
  const setChallengeStatus = useCallback((num: ChallengeNumber, isSolved: boolean) => {
    setChallenges((prev) => {
      const wasSolved = prev[num];
      const updated = { ...prev, [num]: isSolved };
      const solvedCount = Object.values(updated).filter(Boolean).length;

      // Broadcast challenge update
      broadcast({
        type: 'CHALLENGE_UPDATE',
        challenges: updated,
      });

      // Record Event Log
      eventLogService.recordChallengeEvent(num, isSolved, solvedCount, 'Control Maestro');

      externalApiService.sendWebhookUpdate({
        action: 'CHALLENGE_UPDATE',
        challengeNumber: num,
        isSolved,
        challenges: updated,
      });

      // User requirement: When a challenge is completed, play its specific audio track,
      // superimposing over any current audio (pausing it) and resuming it once finished!
      if (!wasSolved && isSolved) {
        if (num === 4 || solvedCount === 4) {
          // All 4 challenges completed: trigger immediate victory
          setTimeout(() => {
            triggerVictory();
          }, 10);
        } else {
          // Challenges 1, 2, or 3 completed:
          const challengeTrack = INITIAL_TRACKS.find((t) => t.id === `challenge_${num}`);
          if (challengeTrack) {
            audioEngine.playInterruptingVoiceTrack(challengeTrack);
          }
        }
      }

      return updated;
    });
  }, [broadcast, triggerVictory]);

  const toggleChallenge = useCallback((num: ChallengeNumber) => {
    setChallenges((prev) => {
      const nextVal = !prev[num];
      setChallengeStatus(num, nextVal);
      return prev;
    });
  }, [setChallengeStatus]);

  // --- START COUNTDOWN (Guaranteed to advance the clock accurately and cancel intro voice) ---
  const startCountdown = useCallback(() => {
    // 1. Immediately cut off any voice or intro audio!
    audioEngine.stopVoice();
    if (introSafetyTimerRef.current !== null) {
      clearTimeout(introSafetyTimerRef.current);
      introSafetyTimerRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 2. Ensure continuous ambient audio is playing
    audioEngine.startAmbient();

    // 3. Transition to RUNNING and record exact start timestamp
    setGameState('RUNNING');
    startTimeRef.current = Date.now();
    eventLogService.recordStateEvent(
      'RUNNING',
      'Cuenta Regresiva Iniciada',
      'El cronómetro principal de 15:00 ha comenzado a correr hacia atrás.',
      'info',
      'Sistema'
    );

    const runTick = () => {
      if (startTimeRef.current === null) return;
      const now = Date.now();
      const deltaSec = Math.floor((now - startTimeRef.current) / 1000);
      const nextElapsed = Math.min(TOTAL_GAME_SECONDS, elapsedOffsetRef.current + deltaSec);

      // Keep eventLogService time context synchronized
      eventLogService.updateTimeContext(getRemainingTimeStr(nextElapsed), nextElapsed);

      // Only process when second counter actually advances
      if (nextElapsed === elapsedSecRef.current && elapsedSecRef.current > 0) return;
      elapsedSecRef.current = nextElapsed;
      setElapsedSec(nextElapsed);

      const remain = Math.max(0, TOTAL_GAME_SECONDS - nextElapsed);

      // Minuto 5 (300s): Evaluación condicional de desafíos completados
      if (nextElapsed >= 300 && !firedTracksRef.current.has('min5_evaluated')) {
        firedTracksRef.current.add('min5_evaluated');
        firedTracksRef.current.add('min5_progress');
        firedTracksRef.current.add('min5_no_progress');

        const solvedCount = Object.values(challengesRef.current).filter(Boolean).length;
        const targetTrackId = solvedCount >= 1 ? 'min5_progress' : 'min5_no_progress';
        const targetTrack = INITIAL_TRACKS.find((t) => t.id === targetTrackId);
        if (targetTrack) {
          audioEngine.playVoiceTrack(targetTrack);
        }

        eventLogService.recordTimelineEvent(
          'Hito: Evaluación Minuto 5',
          solvedCount >= 1
            ? `Avance positivo (${solvedCount}/4 desafíos completados). Audio condicional activado.`
            : 'Alerta de retraso (0 desafíos completados a los 5 minutos). Audio de presión activado.',
          solvedCount >= 1 ? 'info' : 'warning'
        );
      }

      // Otras pistas programadas no condicionales
      INITIAL_TRACKS.forEach((track) => {
        if (
          (!track.conditionType || track.conditionType === 'none') &&
          track.triggerTimeSec !== null &&
          track.triggerTimeSec > 0 &&
          nextElapsed >= track.triggerTimeSec &&
          !firedTracksRef.current.has(track.id)
        ) {
          firedTracksRef.current.add(track.id);
          audioEngine.playVoiceTrack(track);

          if (track.id === 'halfway') {
            eventLogService.recordTimelineEvent('Hito: Mitad del Tiempo', 'Han transcurrido 07:30 (quedan 07:30 restantes).', 'info');
          } else if (track.id === 'three_min') {
            eventLogService.recordTimelineEvent('Hito: Zona Crítica (Últimos 3 Minutos)', 'Alerta de presión crítica activada. Quedan 3 minutos.', 'alert');
          }
        }
      });

      // Broadcast time
      broadcast({
        type: 'TIME_TICK',
        elapsed: nextElapsed,
        remainingStr: getRemainingTimeStr(nextElapsed),
        isCritical: remain <= 180 && remain > 0,
      });

      // Outbound external API webhook
      externalApiService.sendWebhookUpdate({
        action: 'TIME_TICK',
        elapsed: nextElapsed,
        remaining: remain,
        remainingStr: getRemainingTimeStr(nextElapsed),
        gameState: 'RUNNING',
        challenges: challengesRef.current,
      });

      // Fin del tiempo
      if (remain <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        startTimeRef.current = null;
        setGameState('GAMEOVER');
        audioEngine.stopAmbient();
        const gameOverTrack = INITIAL_TRACKS.find((t) => t.id === 'gameover');
        if (gameOverTrack) {
          audioEngine.playVoiceTrack(gameOverTrack);
        }

        eventLogService.recordStateEvent(
          'GAMEOVER',
          'Tiempo Agotado - Fin de la Misión',
          'Los 15 minutos han expirado sin resolver los 4 desafíos.',
          'danger',
          'Sistema'
        );

        broadcast({
          type: 'GAME_OVER',
          gameState: 'GAMEOVER',
        });

        externalApiService.sendWebhookUpdate({
          action: 'GAME_OVER',
          gameState: 'GAMEOVER',
        });
      }
    };

    // Run first tick immediately and loop every 150ms
    runTick();
    timerIntervalRef.current = window.setInterval(runTick, 150);

    broadcast({
      type: 'GAME_START',
      gameState: 'RUNNING',
    });
  }, [broadcast, getRemainingTimeStr]);

  // --- START GAME SEQUENCE ---
  const startGameSequence = useCallback((skipIntro: boolean = false) => {
    if (gameStateRef.current === 'RUNNING') return;

    // If skipIntro requested or already in INTRO, immediately begin countdown!
    if (skipIntro || gameStateRef.current === 'INTRO') {
      eventLogService.recordStateEvent(
        'RUNNING',
        'Intro Saltada - Inicio Inmediato',
        'Se omitió la explicación previa para comenzar la cuenta regresiva de 15:00 directamente.',
        'warning',
        'Operador'
      );
      startCountdown();
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (introSafetyTimerRef.current !== null) {
      clearTimeout(introSafetyTimerRef.current);
      introSafetyTimerRef.current = null;
    }

    setGameState('INTRO');

    eventLogService.recordStateEvent(
      'INTRO',
      'Juego Iniciado con Explicación',
      'Reproducción de bienvenida y reglas de los 4 desafíos.',
      'info',
      'Operador'
    );

    // 1. Start continuous ambient background loop
    audioEngine.startAmbient();

    // Safety watchdog: guarantees countdown begins even if audio file is missing or browser delays
    introSafetyTimerRef.current = window.setTimeout(() => {
      startCountdown();
    }, 12000);

    // 2. Play intro explanation audio
    const startTrack = INITIAL_TRACKS.find((t) => t.id === 'start');
    if (startTrack) {
      firedTracksRef.current.add(startTrack.id);

      audioEngine.playVoiceTrack(startTrack, () => {
        if (introSafetyTimerRef.current !== null) {
          clearTimeout(introSafetyTimerRef.current);
          introSafetyTimerRef.current = null;
        }
        // 3. EXACT MOMENT INTRO AUDIO ENDS: COUNTDOWN STARTS!
        startCountdown();
      });
    } else {
      startCountdown();
    }

    broadcast({
      type: 'GAME_INTRO',
      gameState: 'INTRO',
    });
  }, [broadcast, startCountdown]);

  // --- PAUSE GAME ---
  const pauseGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (startTimeRef.current !== null) {
      const deltaSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      elapsedOffsetRef.current = Math.min(TOTAL_GAME_SECONDS, elapsedOffsetRef.current + deltaSec);
      startTimeRef.current = null;
    }

    setGameState('PAUSED');
    audioEngine.pauseAmbient();
    audioEngine.stopVoice();

    eventLogService.recordStateEvent(
      'PAUSED',
      'Partida Pausada',
      `Cronómetro congelado a los ${remainingStr} restantes.`,
      'warning',
      'Operador'
    );

    broadcast({
      type: 'PAUSE',
      gameState: 'PAUSED',
    });

    externalApiService.sendWebhookUpdate({
      action: 'PAUSE',
      gameState: 'PAUSED',
    });
  }, [broadcast, remainingStr]);

  // --- RESET GAME ---
  const resetGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (introSafetyTimerRef.current !== null) {
      clearTimeout(introSafetyTimerRef.current);
      introSafetyTimerRef.current = null;
    }

    startTimeRef.current = null;
    elapsedOffsetRef.current = 0;
    elapsedSecRef.current = 0;

    setGameState('IDLE');
    setElapsedSec(0);
    firedTracksRef.current.clear();
    setChallenges({ 1: false, 2: false, 3: false, 4: false });

    audioEngine.stopAmbient();
    audioEngine.stopVoice();

    eventLogService.recordStateEvent(
      'IDLE',
      'Partida Reiniciada',
      'Cronómetro restablecido a 15:00, desafíos pendientes y audios silenciados.',
      'alert',
      'Operador'
    );

    broadcast({
      type: 'RESET',
      gameState: 'IDLE',
      elapsed: 0,
      challenges: { 1: false, 2: false, 3: false, 4: false },
    });

    externalApiService.sendWebhookUpdate({
      action: 'RESET',
      gameState: 'IDLE',
      elapsed: 0,
      challenges: { 1: false, 2: false, 3: false, 4: false },
    });
  }, [broadcast]);

  // --- INITIALIZATION & BROADCAST / EXTERNAL API LISTENERS ---
  useEffect(() => {
    // Check if opened as player popout (?mode=player)
    const params = new URLSearchParams(window.location.search);
    const isPopout = params.get('mode') === 'player';
    isPopoutRef.current = isPopout;

    if (isPopout) {
      setCurrentView('PLAYER');
      // Secondary popout window must not duplicate audio
      audioEngine.setMuted(true);
    }

    // Set up BroadcastChannel
    const channel = new BroadcastChannel('escape_room_sync');
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SyncMessage | { action?: string; challengeNumber?: number }>) => {
      const data = event.data;
      if (!data) return;

      // Handle external trigger actions from other apps:
      if ('action' in data && data.action) {
        if (data.action === 'SOLVE_CHALLENGE' && typeof data.challengeNumber === 'number') {
          const num = data.challengeNumber as ChallengeNumber;
          if (num >= 1 && num <= 4) {
            setChallengeStatus(num, true);
          }
        } else if (data.action === 'WIN') {
          triggerVictory();
        } else if (data.action === 'RESET') {
          resetGame();
        } else if (data.action === 'SKIP_INTRO') {
          startCountdown();
        } else if (data.action === 'START') {
          startGameSequence(false);
        }
        return;
      }

      // Handle internal sync messages:
      if ('type' in data) {
        const syncMsg = data as SyncMessage;
        if (syncMsg.type === 'REQUEST_START_FROM_PLAYER') {
          if (!isPopoutRef.current) {
            if (gameStateRef.current === 'INTRO') {
              startCountdown();
            } else {
              startGameSequence(false);
            }
          }
        } else if (syncMsg.type === 'TIME_TICK' && typeof syncMsg.elapsed === 'number') {
          setElapsedSec(syncMsg.elapsed);
          elapsedSecRef.current = syncMsg.elapsed;
        } else if (syncMsg.type === 'GAME_INTRO') {
          setGameState('INTRO');
        } else if (syncMsg.type === 'GAME_START') {
          setGameState('RUNNING');
        } else if (syncMsg.type === 'PAUSE') {
          setGameState('PAUSED');
        } else if (syncMsg.type === 'RESET') {
          setGameState('IDLE');
          setElapsedSec(0);
          elapsedSecRef.current = 0;
          setChallenges({ 1: false, 2: false, 3: false, 4: false });
        } else if (syncMsg.type === 'VICTORY') {
          setGameState('VICTORY');
          setChallenges({ 1: true, 2: true, 3: true, 4: true });
        } else if (syncMsg.type === 'GAME_OVER') {
          setGameState('GAMEOVER');
        } else if (syncMsg.type === 'CHALLENGE_UPDATE' && syncMsg.challenges) {
          setChallenges(syncMsg.challenges);
        }
      }
    };

    // Also support storage event for cross-tab localStorage triggers
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'escape_room_trigger' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.action === 'SOLVE_CHALLENGE' && typeof parsed.challengeNumber === 'number') {
            setChallengeStatus(parsed.challengeNumber as ChallengeNumber, true);
          } else if (parsed.action === 'WIN') {
            triggerVictory();
          } else if (parsed.action === 'SKIP_INTRO') {
            startCountdown();
          } else if (parsed.action === 'START') {
            startGameSequence(false);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for External API service actions
    const unsubApi = externalApiService.onAction((data) => {
      if (data.action) {
        eventLogService.recordApiEvent(
          data.action,
          `Comando externo recibido: ${data.action}${
            data.challengeNumber ? ` para desafío #${data.challengeNumber}` : ''
          }`,
          'API Externa / Red'
        );
      }

      if (data.action === 'START') {
        startGameSequence(data.skipIntro ?? false);
      } else if (data.action === 'SKIP_INTRO') {
        startCountdown();
      } else if (data.action === 'PAUSE') {
        pauseGame();
      } else if (data.action === 'RESET') {
        resetGame();
      } else if (data.action === 'WIN') {
        triggerVictory();
      } else if (data.action === 'SOLVE_CHALLENGE' && typeof data.challengeNumber === 'number') {
        const num = data.challengeNumber as ChallengeNumber;
        if (num >= 1 && num <= 4) {
          setChallengeStatus(num, true);
        }
      } else if (data.action === 'UNSOLVE_CHALLENGE' && typeof data.challengeNumber === 'number') {
        const num = data.challengeNumber as ChallengeNumber;
        if (num >= 1 && num <= 4) {
          setChallengeStatus(num, false);
        }
      } else if (data.action === 'TRIGGER_AUDIO' && data.trackId) {
        const track = INITIAL_TRACKS.find((t) => t.id === data.trackId);
        if (track) {
          audioEngine.playVoiceTrack(track);
        }
      } else if (data.challenges) {
        const c = data.challenges;
        const c1 = c[1] ?? c.challenge1;
        const c2 = c[2] ?? c.challenge2;
        const c3 = c[3] ?? c.challenge3;
        const c4 = c[4] ?? c.challenge4;
        if (c1 !== undefined) setChallengeStatus(1, Boolean(c1));
        if (c2 !== undefined) setChallengeStatus(2, Boolean(c2));
        if (c3 !== undefined) setChallengeStatus(3, Boolean(c3));
        if (c4 !== undefined) setChallengeStatus(4, Boolean(c4));
      }
    });

    // Start external API connections
    externalApiService.restartConnections();

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
      unsubApi();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [startGameSequence, startCountdown, triggerVictory, resetGame, pauseGame, setChallengeStatus]);

  // --- KEYBOARD SHORTCUTS (ENTER, SPACE, ESCAPE) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // SPACE or ENTER: Start game or Skip Intro
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();

        // If secondary popout window, forward request to master host
        if (isPopoutRef.current) {
          broadcast({ type: 'REQUEST_START_FROM_PLAYER' });
          return;
        }

        if (gameStateRef.current === 'INTRO') {
          // Immediately skip intro and start countdown!
          startGameSequence(true);
        } else if (gameStateRef.current === 'IDLE' || gameStateRef.current === 'PAUSED') {
          startGameSequence(false);
        }
      }

      // ESCAPE KEY: Exit PlayerView back to Admin or RoleSelector
      if (e.key === 'Escape') {
        if (currentView === 'PLAYER') {
          // If in popout window, close it or do nothing
          if (isPopoutRef.current) {
            window.close();
          } else if (isAdminAuthenticated) {
            setCurrentView('ADMIN');
          } else {
            setCurrentView('ROLE_SELECTOR');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isAdminAuthenticated, startGameSequence, broadcast]);

  // Navigation handlers
  const handleSelectPlayer = () => {
    setCurrentView('PLAYER');
  };

  const handleLoginAdmin = () => {
    setIsAdminAuthenticated(true);
    setCurrentView('ADMIN');
  };

  const handleOpenPopout = () => {
    window.open(
      `${window.location.origin}${window.location.pathname}?mode=player`,
      'EscapeRoomProjector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setCurrentView('ROLE_SELECTOR');
  };

  // --- RENDER CURRENT VIEW ---
  if (currentView === 'ROLE_SELECTOR') {
    return (
      <RoleSelector
        onSelectPlayer={handleSelectPlayer}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  if (currentView === 'PLAYER') {
    return (
      <PlayerView
        remainingStr={remainingStr}
        gameState={gameState}
        isCritical={isCritical}
        challenges={challenges}
        onTriggerStart={(skipIntro?: boolean) => {
          if (isPopoutRef.current) {
            broadcast({ type: 'REQUEST_START_FROM_PLAYER' });
          } else {
            startGameSequence(skipIntro ?? false);
          }
        }}
      />
    );
  }

  return (
    <AdminView
      remainingStr={remainingStr}
      elapsedSec={elapsedSec}
      totalSec={TOTAL_GAME_SECONDS}
      gameState={gameState}
      challenges={challenges}
      onStart={(skipIntro?: boolean) => startGameSequence(skipIntro ?? false)}
      onPause={pauseGame}
      onReset={resetGame}
      onVictory={triggerVictory}
      onToggleChallenge={toggleChallenge}
      onSwitchToPlayer={() => setCurrentView('PLAYER')}
      onOpenPopout={handleOpenPopout}
      onLogout={handleLogout}
    />
  );
}
