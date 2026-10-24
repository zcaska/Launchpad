import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Confetti as PartyPopper,
  Sparkle as Sparkles,
  Flag
} from '@phosphor-icons/react';
import { ConfettiStyle } from '../../types';

/**
 * ConfettiOverlay: non-interactive fullscreen celebration shown when the user
 * clears every task. Renders particles in one of three styles chosen in Settings.
 * The parent owns the lifetime (renders for ~4s, then swaps in the smart suggestion).
 */

const CONFETTI_COLORS = ['#0f766e', '#f59e0b', '#fb7185', '#818cf8', '#34d399', '#facc15', '#f97316'];

const STYLE_ICON: Record<ConfettiStyle, React.ReactNode> = {
  cascade: <Flag className="w-7 h-7 text-teal-600 dark:text-teal-400" />,
  burst: <PartyPopper className="w-7 h-7 text-amber-500" />,
  sparkle: <Sparkles className="w-7 h-7 text-indigo-500" />,
};

interface ConfettiOverlayProps {
  style?: ConfettiStyle;
}

/** Deterministic-enough random helper so particles differ every render. */
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ style = 'cascade' }) => {
  const particles = useMemo(() => {
    const count = style === 'sparkle' ? 36 : 70;
    return Array.from({ length: count }, (_, i) => {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      return {
        id: i,
        color,
        // cascade / sparkle fall from the top; burst radiates from center
        x: rand(0, 100),
        y: rand(-20, 0),
        delay: rand(0, 0.8),
        duration: rand(2.2, 3.6),
        rotate: rand(-360, 360),
        size: style === 'sparkle' ? rand(4, 8) : rand(6, 12),
      };
    });
  }, [style]);

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="All tasks done for the day"
    >
      {/* Soft celebratory backdrop so the message pops without blocking the dashboard view */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/40 dark:bg-black/50 backdrop-blur-[2px]"
      />

      {/* Particles */}
      <div className="absolute inset-0">
        {particles.map((p) => {
          if (style === 'burst') {
            // Radial pieces start at screen center and fly outward, then drop
            return (
              <motion.div
                key={p.id}
                className="absolute rounded-[2px]"
                style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color, left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  x: `${(p.x - 50) * 14}px`,
                  y: [0, `${-rand(60, 240)}px`, '110vh'],
                  rotate: p.rotate,
                  opacity: [1, 1, 0.9, 0],
                }}
                transition={{ duration: p.duration + 0.8, delay: p.delay, ease: 'easeOut', opacity: { times: [0, 0.5, 0.8, 1] } }}
              />
            );
          }

          return (
            <motion.div
              key={p.id}
              className={style === 'sparkle' ? 'absolute rounded-full' : 'absolute rounded-[2px]'}
              style={{ width: p.size, height: style === 'sparkle' ? p.size : p.size * 0.55, backgroundColor: p.color, left: `${p.x}%` }}
              initial={{ y: `${p.y}vh`, rotate: 0, opacity: 0 }}
              animate={{ y: '110vh', rotate: p.rotate, opacity: [0, 1, 1, 0.6] }}
              transition={{
                delay: p.delay,
                duration: p.duration,
                ease: 'easeIn',
                opacity: { times: [0, 0.1, 0.8, 1], duration: p.duration, delay: p.delay },
              }}
            />
          );
        })}
      </div>

      {/* Celebration message */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.25 }}
        className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-3xl bg-white/90 dark:bg-serene-surface-dark/95 shadow-2xl border border-serene-border-light dark:border-serene-border-dark text-center max-w-md mx-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
          {STYLE_ICON[style]}
        </div>
        <h2 className="text-2xl font-black text-serene-text-primary dark:text-serene-text-darkPrimary">
          🎉 All tasks done for the day!
        </h2>
        <p className="text-sm text-serene-text-muted dark:text-serene-text-darkMuted">
          Your runway is clear — time for something rewarding.
        </p>
      </motion.div>
    </div>
  );
};
