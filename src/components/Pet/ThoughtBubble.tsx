import React, { useEffect, useRef } from 'react';

export interface ThoughtBubbleProps {
  quote: string | null;
  visible: boolean;
  onDismiss: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function ThoughtBubble({
  quote,
  visible,
  onDismiss,
  placement = 'left',
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

  // Determine layout and pip orientation based on placement
  let containerPositionClass = 'right-full mr-3.5 top-1/2 -translate-y-1/2';
  if (placement === 'right') {
    containerPositionClass = 'left-full ml-3.5 top-1/2 -translate-y-1/2';
  } else if (placement === 'bottom') {
    containerPositionClass = 'left-1/2 -translate-x-1/2 top-full mt-3';
  } else if (placement === 'top') {
    containerPositionClass = 'left-1/2 -translate-x-1/2 bottom-full mb-3';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className={`absolute z-50 pointer-events-auto cursor-pointer select-none transition-all duration-300 ease-out ${containerPositionClass}`}
    >
      {/* Thought Pips: Pointing to the appropriate fin or edge */}
      {placement === 'left' && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-row items-center pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm ml-0.5" />
        </div>
      )}

      {placement === 'right' && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm mr-0.5" />
        </div>
      )}

      {placement === 'top' && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 flex flex-col items-center pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm mt-0.5" />
        </div>
      )}

      {placement === 'bottom' && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 flex flex-col-reverse items-center pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-600/80 shadow-sm mt-0.5" />
        </div>
      )}

      {/* Main Frosted Thought Bubble (Horizontal layout with defined width, responsive mobile scaling, and multi-line text wrapping) */}
      <div className="relative px-3.5 sm:px-4 py-2 sm:py-2.5 w-[180px] xs:w-[210px] sm:w-[240px] max-w-[calc(100vw-76px)] rounded-2xl bg-white/95 dark:bg-stone-900/95 text-stone-800 dark:text-stone-100 text-[11px] sm:text-xs md:text-[13px] font-medium leading-snug tracking-normal shadow-lg backdrop-blur-md border border-stone-200/90 dark:border-stone-700/90 text-center animate-in fade-in zoom-in-95 duration-200">
        <p className="m-0 select-text break-words whitespace-normal leading-snug">{quote}</p>
      </div>
    </div>
  );
}

export default React.memo(ThoughtBubble);
