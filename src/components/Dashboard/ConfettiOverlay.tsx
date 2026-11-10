import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ConfettiStyle } from '../../types';
import './completion.css';

const COLORS = ['#2dd4bf', '#f59e0b', '#fb7185', '#818cf8', '#34d399', '#facc15', '#f97316'];

export function ConfettiOverlay({ style = 'cascade' }: { style?: ConfettiStyle }) {
  const container = useRef<HTMLDivElement>(null);
  const [particles] = useState(() => Array.from({ length: style === 'sparkle' ? 30 : 48 }, (_, index) => ({
    color: COLORS[index % COLORS.length],
    position: Math.random() * 100,
    restingHeight: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.8 + Math.random() * 1.4,
    size: style === 'sparkle' ? 10 + Math.random() * 12 : 5 + Math.random() * 6,
    spin: (Math.random() - 0.5) * 900,
    burstX: Math.cos(index * 2.39996) * (25 + Math.random() * 30),
    burstY: Math.sin(index * 2.39996) * (20 + Math.random() * 30),
  })));

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // Commit particle play requests immediately, including in embedded previews.
    const startedAt = document.timeline.currentTime;
    if (startedAt !== null) {
      for (const animation of container.current?.getAnimations({ subtree: true }) ?? []) {
        if (animation.pending) animation.startTime = startedAt;
      }
    }
    const timeout = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <div
      ref={container}
      aria-hidden="true"
      data-confetti={style}
      className="pointer-events-none fixed inset-0 z-[150] overflow-hidden"
    >
      {particles.map((particle, index) => (
        <span
          key={index}
          className="task-clear-particle"
          style={{
            '--color': particle.color,
            '--position': `${particle.position}%`,
            '--resting-height': `${particle.restingHeight}%`,
            '--drift': `${(particle.position - 50) * 1.2}vw`,
            '--delay': `${particle.delay}s`,
            '--duration': `${particle.duration}s`,
            '--size': `${particle.size}px`,
            '--spin': `${particle.spin}deg`,
            '--burst-x': `${particle.burstX}vw`,
            '--burst-y': `${particle.burstY}vh`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
