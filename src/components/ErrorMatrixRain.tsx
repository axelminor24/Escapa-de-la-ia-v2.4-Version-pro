import React, { useEffect, useRef } from 'react';

interface ErrorMatrixRainProps {
  isCritical: boolean;
  isVictory: boolean;
  isGameOver: boolean;
}

const ERROR_STRINGS = [
  'ERR_SYS_0x7F',
  'CRITICAL_OVERFLOW',
  'CIPHER_FAIL',
  'SECURITY_BREACH',
  'LOCKDOWN_ACTIVE',
  '0x44F0_CORRUPT',
  'AUTH_BYPASS_FAIL',
  'CIPHER_302',
  'TRACE_ALERT',
  'TIME_OVERFLOW',
  'EXCEPTION_0x1B',
  '01001011',
  'FAIL_SAFE_OFF',
  'MEM_FAULT_0xFF',
  'CONTAINMENT_FAIL',
  'CORRUPT_SECTOR_#9',
  'SYS_ALERT_99',
  'KERNEL_PANIC',
  'ACCESS_DENIED',
  'SYS_LOCK_ENGAGED',
  'DEADLOCK_EVENT',
  'OVERHEAT_WARN',
  '0xDEADBEEF',
  '0x00000000',
  '0xFFFFFFFF',
  'SYSTEM_HALT',
  'PURGE_INIT_0x04',
  'ERR_ENIGMA_FAIL',
  'DISCONNECTED_NODE',
];

const VICTORY_STRINGS = [
  'ACCESS_GRANTED',
  'SYSTEM_RESTORED',
  'OVERRIDE_SUCCESS',
  'DOORS_UNLOCKED',
  'FIREWALL_BYPASSED',
  '0x00_NORMAL',
  'CLEARANCE_LVL_5',
  'CONTAINMENT_SECURE',
  'CHALLENGE_CLEARED',
  'ESCAPE_CONFIRMED',
  'PROTOCOL_COMPLETE',
  'SESSION_TERMINATED',
  '0x0000_OK',
];

export const ErrorMatrixRain: React.FC<ErrorMatrixRainProps> = ({
  isCritical,
  isVictory,
  isGameOver,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const fontSize = 13;
    const columnSpacing = 32;
    const columns = Math.ceil(window.innerWidth / columnSpacing) + 2;

    // Stream state for each column
    const dropsY: number[] = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * -120)
    );
    const columnSpeeds: number[] = Array.from(
      { length: columns },
      () => 1.2 + Math.random() * 2.0
    );
    const activeText: string[] = Array.from({ length: columns }, () => '');
    const charLengths: number[] = Array.from({ length: columns }, () => 14 + Math.floor(Math.random() * 12));

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Dark background trail fade:
      // High opacity clears faster, lower leaves longer dramatic trails
      ctx.fillStyle = isCritical ? 'rgba(8, 2, 2, 0.28)' : 'rgba(5, 5, 8, 0.22)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px 'JetBrains Mono', 'Courier New', monospace`;

      const pool = isVictory ? VICTORY_STRINGS : ERROR_STRINGS;
      const globalSpeedMultiplier = isCritical ? 2.2 : isVictory ? 1.0 : 1.3;

      for (let col = 0; col < columns; col++) {
        const x = col * columnSpacing;
        const currentY = dropsY[col] * fontSize;

        // Choose text string or hex word for this column
        if (!activeText[col] || Math.random() < 0.05) {
          activeText[col] = pool[Math.floor(Math.random() * pool.length)];
        }
        const text = activeText[col];

        // Draw multiple trailing characters up the column
        const trailLength = charLengths[col];
        for (let j = 0; j < trailLength; j++) {
          const charY = currentY - j * fontSize;
          if (charY < -fontSize || charY > height + fontSize) continue;

          // Determine character to draw
          const char = text[(j + Math.floor(dropsY[col])) % text.length] || '#';

          // Color & Glow logic
          if (j === 0) {
            // Leading Head character (brightest)
            if (isVictory) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#34d399';
              ctx.shadowBlur = 10;
            } else if (isCritical) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#f87171';
              ctx.shadowBlur = 12;
            } else if (isGameOver) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#991b1b';
              ctx.shadowBlur = 6;
            } else {
              ctx.fillStyle = Math.random() < 0.2 ? '#ffffff' : '#fca5a5';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 8;
            }
          } else {
            // Trailing body
            const fadeFactor = 1 - j / trailLength;
            if (isVictory) {
              ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + fadeFactor * 0.75})`;
              ctx.shadowBlur = 0;
            } else if (isCritical) {
              ctx.fillStyle = `rgba(239, 68, 68, ${0.25 + fadeFactor * 0.75})`;
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = fadeFactor > 0.6 ? 4 : 0;
            } else if (isGameOver) {
              ctx.fillStyle = `rgba(153, 27, 27, ${0.1 + fadeFactor * 0.5})`;
              ctx.shadowBlur = 0;
            } else {
              // Standard crimson/red terminal rain
              const red = Math.floor(180 + fadeFactor * 75);
              ctx.fillStyle = `rgba(${red}, 30, 30, ${0.15 + fadeFactor * 0.75})`;
              ctx.shadowBlur = 0;
            }
          }

          ctx.fillText(char, x, charY);
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Advance downward
        dropsY[col] += columnSpeeds[col] * globalSpeedMultiplier * 0.35;

        // Wrap to top with random delay once stream passes the bottom
        if (currentY - trailLength * fontSize > height) {
          if (Math.random() > 0.94) {
            dropsY[col] = Math.floor(Math.random() * -30);
            columnSpeeds[col] = 1.2 + Math.random() * 2.2;
            activeText[col] = pool[Math.floor(Math.random() * pool.length)];
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCritical, isVictory, isGameOver]);

  return (
    <>
      {/* Falling Error Code Streams */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="absolute inset-0 pointer-events-none opacity-85 z-0"
      />

      {/* CRT Scanline & Glitch Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 z-[1]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55) 1px, transparent 1px, transparent 3px)',
        }}
      />
    </>
  );
};
