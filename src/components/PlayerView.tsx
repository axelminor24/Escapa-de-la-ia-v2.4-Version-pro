import React from 'react';
import { GameStatus, ChallengesState } from '../types';
import { CheckCircle2, Lock } from 'lucide-react';
import { ErrorMatrixRain } from './ErrorMatrixRain';

interface PlayerViewProps {
  remainingStr: string;
  gameState: GameStatus;
  isCritical: boolean;
  challenges: ChallengesState;
  onTriggerStart: (skipIntro?: boolean) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  remainingStr,
  gameState,
  isCritical,
  challenges,
  onTriggerStart,
}) => {
  const isVictory = gameState === 'VICTORY';
  const isGameOver = gameState === 'GAMEOVER';
  const isIntro = gameState === 'INTRO';

  // Subtitle messages based on state
  let statusMessage = 'PRESIONA [ESPACIO] O [ENTER] PARA COMENZAR';
  if (isIntro) {
    statusMessage = 'REPRODUCIENDO EXPLICACIÓN DE REGLAS';
  } else if (gameState === 'RUNNING') {
    statusMessage = isCritical ? '¡PRESIÓN CRÍTICA! - TIEMPO AGOTÁNDOSE' : 'TIEMPO RESTANTE DE ESCAPE';
  } else if (gameState === 'PAUSED') {
    statusMessage = 'SISTEMA EN PAUSA';
  } else if (isVictory) {
    statusMessage = '¡DESAFÍO SUPERADO! PUERTAS DESBLOQUEADAS';
  } else if (isGameOver) {
    statusMessage = 'FALLO DE MISIÓN - EL TIEMPO HA TERMINADO';
  }

  return (
    <div
      onClick={() => {
        if (gameState === 'IDLE' || gameState === 'PAUSED') {
          onTriggerStart(false);
        } else if (gameState === 'INTRO') {
          onTriggerStart(true);
        }
      }}
      className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-6 select-none transition-colors duration-700 z-50 overflow-hidden cursor-default ${
        isVictory
          ? 'bg-gradient-to-b from-[#061e12] via-[#04120b] to-[#020805]'
          : isCritical
          ? 'bg-gradient-to-b from-[#2a0606] via-[#140303] to-[#070101]'
          : 'bg-radial from-[#130707] via-[#09080b] to-[#040406]'
      }`}
    >
      {/* Falling Error Code Streams (Matrix / Terminal glitch) */}
      <ErrorMatrixRain
        isCritical={isCritical}
        isVictory={isVictory}
        isGameOver={isGameOver}
      />

      {/* Edge Vignette / Pulse when critical */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-[2] ${
          isCritical
            ? 'opacity-85 bg-[radial-gradient(circle_at_center,_transparent_35%,_rgba(239,68,68,0.45)_100%)]'
            : isVictory
            ? 'opacity-85 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(16,185,129,0.35)_100%)]'
            : 'opacity-50 bg-[radial-gradient(circle_at_center,_transparent_45%,_black_100%)]'
        }`}
      />

      {/* Main Center Timer Display */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 max-w-7xl w-full">
        {/* Giant Monospace Timer */}
        <div
          className={`font-mono-numbers font-black tracking-widest text-[16vw] sm:text-[18vw] leading-none transition-all duration-300 drop-shadow-2xl ${
            isVictory
              ? 'text-emerald-400 drop-shadow-[0_0_60px_rgba(52,211,153,0.8)]'
              : isGameOver
              ? 'text-red-800 drop-shadow-[0_0_20px_rgba(153,27,27,0.4)]'
              : isCritical
              ? 'text-red-500 animate-heartbeat drop-shadow-[0_0_75px_rgba(239,68,68,0.95)]'
              : isIntro
              ? 'text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)] animate-pulse'
              : 'text-red-500 drop-shadow-[0_0_45px_rgba(239,68,68,0.5)]'
          }`}
        >
          {remainingStr}
        </div>

        {/* Status Subtitle */}
        <div
          className={`text-sm sm:text-xl md:text-2xl font-display font-bold tracking-[0.25em] uppercase transition-colors duration-300 ${
            isVictory
              ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]'
              : isCritical
              ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]'
              : isIntro
              ? 'text-amber-300'
              : 'text-slate-400'
          }`}
        >
          {statusMessage}
        </div>

        {/* 4 Challenge Indicators */}
        <div className="pt-6 sm:pt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 w-full">
          {([1, 2, 3, 4] as const).map((num) => {
            const isSolved = challenges[num];
            return (
              <div
                key={num}
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl border text-xs sm:text-sm md:text-base font-display font-semibold transition-all duration-500 ${
                  isSolved
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105'
                    : 'bg-[#10111a]/80 border-[#25283b] text-slate-500'
                }`}
              >
                {isSolved ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                )}
                <span>DESAFÍO {num}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
