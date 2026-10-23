import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { PetController } from './usePetController';
import { PetSprite } from './PetSprite';
import { ThoughtBubble } from './ThoughtBubble';
import { usePetMotion } from './usePetMotion';
import { getPetQuote } from './petQuotes';
import type { QuoteCategory } from './petQuotes';
import type { PetState, PetTier } from '../../utils/petState';

// Launchpad Mascot Pet — coordinator container.
// Coordinates motion, thought bubbles, quotes, dragging, and pause states;
// visual graphics powered by the canonical floating-pebble mascot (Mascot.tsx & PetSprite.tsx).
//
// Visual spec (Launchpad Mascot Design Reference):
//   floating-pebble silhouette, body #FF7A3C, fins #FF9A6B,
//   diffuse highlight #FFD6B3, shadow #E05A20, adaptive eyes #1A1A1A, shine #FFFFFF.

export interface LaunchpadPetProps {
  controller: PetController;
  paused: boolean;
  onTogglePaused: () => void;
  tier: PetTier;
}

const STATE_QUOTE_CATEGORY_MAP: Partial<Record<PetState, QuoteCategory>> = {
  happy: 'taskComplete',
  overwhelmed: 'overwhelmed',
  sad: 'inactivitySlump',
  'coffee-break': 'coffeeBreak',
  focused: 'focusStart',
  'welcome-back': 'welcomeBack',
};

function LaunchpadPetComponent({
  controller,
  paused,
  onTogglePaused,
  tier,
}: LaunchpadPetProps) {
  const state: PetState = controller.state;

  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Hovering/petting reaction: a quick wiggle and a heart.
  const [petted, setPetted] = useState(false);
  const petTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPet = useCallback(() => {
    if (reduced) return;
    setPetted(true);
    if (petTimerRef.current) clearTimeout(petTimerRef.current);
    petTimerRef.current = setTimeout(() => setPetted(false), 1000);
  }, [reduced]);

  useEffect(() => () => {
    if (petTimerRef.current) clearTimeout(petTimerRef.current);
  }, []);

  // Click tracking: single click pets, double click toggles paused movement
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePetClick = useCallback(() => {
    onPet();
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 350);
    } else if (clickCountRef.current >= 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      onTogglePaused();
    }
  }, [onPet, onTogglePaused]);

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  // Motion controller: owns position, dragging, roaming flight, and bubble placement
  const motion = usePetMotion({
    roaming: state === 'roaming',
    paused,
    reducedMotion: reduced,
    onPetClick: handlePetClick,
  });

  // Quotes & thought bubble display
  const [quote, setQuote] = useState<string | null>(null);
  const [quoteVisible, setQuoteVisible] = useState(false);

  const onDismissQuote = useCallback(() => {
    setQuoteVisible(false);
  }, []);

  const prevStateRef = useRef<PetState>(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      const cat = STATE_QUOTE_CATEGORY_MAP[state];
      if (cat) {
        setQuote(getPetQuote(cat));
        setQuoteVisible(true);
      }
    }
  }, [state]);

  return (
    <div
      className="fixed top-0 left-0 z-40 pointer-events-none select-none"
      style={{
        transform: `translate3d(${motion.pos.x}px, ${motion.pos.y}px, 0)`,
        transition:
          reduced || motion.isDragging
            ? undefined
            : `transform ${motion.durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
      data-testid="launchpad-pet"
    >
      <div className="relative">
        <ThoughtBubble
          quote={quote}
          visible={quoteVisible}
          onDismiss={onDismissQuote}
          placement={motion.placement}
        />
        <button
          type="button"
          {...motion.handlers}
          onPointerEnter={onPet}
          className={`lp-pet pointer-events-auto block transition-opacity touch-none focus-visible:outline-2 focus-visible:outline-serene-primary dark:focus-visible:outline-serene-primary-dark ${
            motion.isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab opacity-95 hover:opacity-100'
          }`}
          style={{
            transform: 'translate3d(0, 0, 0)',
            ...(tier === 'streak-master'
              ? { filter: 'drop-shadow(0 0 6px rgba(245,158,11,.6))' }
              : undefined),
          }}
          aria-label={`Launchpad pet, ${state}. ${paused ? 'Movement paused' : 'Moving'}. Click to pet, drag to move, double-click to ${paused ? 'resume' : 'pause'} movement`}
          title={
            paused
              ? 'Pet: movement paused (double-click to resume)'
              : 'Pet: click to pet, drag to move, double-click to pause'
          }
          aria-pressed={paused}
        >
          <PetSprite
            state={state}
            tier={tier}
            facing={motion.facing}
            isFlying={motion.isFlying}
            isDragging={motion.isDragging}
            isSippingCoffee={state === 'coffee-break'}
            reducedMotion={reduced}
            petted={petted}
          />
        </button>
      </div>
    </div>
  );
}

export const LaunchpadPet = memo(LaunchpadPetComponent);
export default LaunchpadPet;
