import { useEffect, useState, type CSSProperties } from 'react';
import { ConfettiStyle } from '../../types';
import './completion.css';

const COLORS = ['#2dd4bf', '#f59e0b', '#fb7185', '#818cf8', '#34d399', '#facc15', '#f97316'];

export function ConfettiOverlay({ style = 'cascade' }: { style?: ConfettiStyle }) {
  const [particles] = useState(() => Array.from({ length: style === 'sparkle' ? 24 : 42 }, (_, index) => ({
    color: COLORS[index % COLORS.length],
    position: Math.random() * 100,
    restingHeight: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.8 + Math.random() * 1.4,
    size: 5 + Math.random() * 6,
    spin: (Math.random() - 0.5) * 900,
  })));

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      data-confetti={style}
      className="pointer-events-none fixed inset-0 overflow-hidden"
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
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
