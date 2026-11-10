import { useEffect, useRef, useState } from 'react';

export const PET_SPIN_DURATION = 1100;

/** One upright-to-upright spin per completion, including rapid completions. */
export function usePetCelebration(sequence: number, disabled: boolean, onSettled?: (sequence: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(sequence);
  const pending = useRef(0);
  const active = useRef<Animation | null>(null);
  const [spinning, setSpinning] = useState(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    const count = Math.max(0, sequence - previous.current);
    previous.current = sequence;
    if (disabled || document.hidden) {
      pending.current = 0;
      active.current?.cancel();
      active.current = null;
      setSpinning(false);
      onSettledRef.current?.(sequence);
      return;
    }
    pending.current += count;
    if (!active.current && pending.current === 0) onSettledRef.current?.(sequence);
    const play = () => {
      if (!ref.current || active.current || pending.current === 0) return;
      pending.current -= 1;
      setSpinning(true);
      const animation = ref.current.animate([
        { transform: 'perspective(400px) translateY(0) rotateY(0deg) scale(1)', offset: 0 },
        { transform: 'perspective(400px) translateY(-6px) rotateY(180deg) scale(1.05)', offset: 0.5 },
        { transform: 'perspective(400px) translateY(0) rotateY(360deg) scale(1)', offset: 1 },
      ], { duration: PET_SPIN_DURATION, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' });
      // Start on the active timeline immediately instead of leaving a pending play request.
      if (document.timeline.currentTime !== null) animation.startTime = document.timeline.currentTime;
      active.current = animation;
      animation.finished.then(() => {
        if (active.current !== animation) return;
        active.current = null;
        if (pending.current > 0) play();
        else {
          setSpinning(false);
          onSettledRef.current?.(previous.current);
        }
      }).catch(() => { /* Pause or unmount cancels the spin. */ });
    };
    play();
  }, [sequence, disabled]);

  useEffect(() => () => {
    active.current?.cancel();
    active.current = null;
    pending.current = 0;
  }, []);
  return { ref, spinning };
}
