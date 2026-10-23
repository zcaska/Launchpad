import React, { useEffect, useRef } from 'react';

export interface ThoughtBubbleProps {
  quote: string | null;
  visible: boolean;
  onDismiss: () => void;
  placement?: 'top' | 'bottom';
}

export function ThoughtBubble({
  quote,
  visible,
  onDismiss,
  placement = 'top',
}: ThoughtBubbleProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, 4500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDismiss, quote]);

  if (!visible || !quote) return null;

  const isInverted = placement === 'bottom';

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto cursor-pointer select-none transition-all duration-300 ease-out ${
        isInverted ? 'top-full mt-3' : 'bottom-full mb-3'
      }`}
    >
      {/* Ascending Thought Pips */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none ${
          isInverted ? '-top-3 flex-col-reverse' : '-bottom-3'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm mt-0.5" />
      </div>

      {/* Main Frosted Thought Bubble */}
      <div className="relative px-3.5 py-2 max-w-[210px] sm:max-w-[240px] rounded-2xl bg-white/95 dark:bg-stone-900/95 text-stone-800 dark:text-stone-100 text-xs sm:text-[13px] font-medium leading-relaxed tracking-normal shadow-lg backdrop-blur-md border border-stone-200/90 dark:border-stone-700/90 text-center animate-in fade-in zoom-in-95 duration-200">
        <p className="m-0 select-text">{quote}</p>
      </div>
    </div>
  );
}

export default React.memo(ThoughtBubble);
