import type React from 'react';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Target,
  Lightbulb,
  NotePencil,
  CastleTurret,
  Coins,
  Flame,
  BookOpen,
  Sparkle,
  Clock,
  Trophy
} from '@phosphor-icons/react';
import { FEATURE_GUIDES, FeatureGuideItem, computeGuidePosition } from '../../data/featureGuides';

export interface FeatureGuideContextType {
  activeGuideId: string | null;
  openGuide: (id: string, anchorEl: HTMLElement) => void;
  closeGuide: () => void;
  toggleGuide: (id: string, anchorEl: HTMLElement) => void;
}

const defaultContextValue: FeatureGuideContextType = {
  activeGuideId: null,
  openGuide: () => {},
  closeGuide: () => {},
  toggleGuide: () => {},
};

const FeatureGuideContext = createContext<FeatureGuideContextType | null>(null);

export function useFeatureGuide(strict: boolean = true): FeatureGuideContextType {
  const ctx = useContext(FeatureGuideContext);
  if (!ctx) {
    if (strict) {
      throw new Error('useFeatureGuide must be used within FeatureGuideProvider');
    }
    return defaultContextValue;
  }
  return ctx;
}

export function getCategoryIcon(category: string): React.ReactElement {
  switch (category.toLowerCase()) {
    case 'navigation':
      return <Compass size={18} className="text-sky-500" />;
    case 'focus':
      return <Target size={18} className="text-serene-primary" />;
    case 'creativity':
      return <Lightbulb size={18} className="text-amber-500" />;
    case 'workspace':
      return <NotePencil size={18} className="text-emerald-500" />;
    case 'accountability':
      return <CastleTurret size={18} className="text-purple-400" />;
    case 'discipline':
      return <Flame size={18} className="text-orange-500" />;
    case 'integrity':
      return <BookOpen size={18} className="text-indigo-400" />;
    case 'castle':
      return <Coins size={18} className="text-amber-400" />;
    case 'milestones':
    case 'mastery':
    case 'milestones/mastery':
      return <Trophy size={18} className="text-yellow-500" />;
    case 'time':
      return <Clock size={18} className="text-teal-400" />;
    default:
      return <Sparkle size={18} className="text-serene-primary" />;
  }
}

export interface FeatureGuidePopupProps {
  guide: FeatureGuideItem;
  position: { top: number; left: number; placement: 'bottom' | 'top' };
  cardRef: React.RefObject<HTMLDivElement | null>;
}

export const FeatureGuidePopup: React.FC<FeatureGuidePopupProps> = ({ guide, position, cardRef }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-live="polite"
    >
      <motion.div
        ref={cardRef}
        role="tooltip"
        aria-label={guide.title}
        initial={{ opacity: 0, scale: 0.94, y: position.placement === 'bottom' ? -4 : 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: position.placement === 'bottom' ? -4 : 4 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '320px',
        }}
        className="pointer-events-auto rounded-2xl border border-serene-border-light/80 dark:border-serene-border-dark/80 bg-white/95 dark:bg-[#12151b]/95 backdrop-blur-xl p-4 shadow-2xl text-serene-text-primary dark:text-serene-text-darkPrimary select-none w-[320px]"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {getCategoryIcon(guide.category)}
            <span className="text-[11px] font-bold uppercase tracking-wider text-serene-text-muted">
              {guide.category}
            </span>
          </div>
          {guide.shortcut && (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-serene-text-muted">
              {guide.shortcut}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold tracking-tight mb-1 text-serene-text-primary dark:text-white">
          {guide.title}
        </h4>
        <p className="text-xs leading-relaxed text-serene-text-secondary dark:text-gray-300">
          {guide.summary}
        </p>
        <div className="mt-3 pt-2.5 border-t border-serene-border-light/60 dark:border-white/10 flex items-center justify-between text-[10px] text-serene-text-muted">
          <span>Right-click again to dismiss</span>
          <span className="text-serene-text-muted/60">Esc</span>
        </div>
      </motion.div>
    </div>
  );
};

export const FeatureGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; placement: 'bottom' | 'top' } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const currentAnchorRef = useRef<HTMLElement | null>(null);

  const closeGuide = useCallback(() => {
    setActiveGuideId(null);
    setPopupPos(null);
    currentAnchorRef.current = null;
  }, []);

  const openGuide = useCallback((id: string, anchorEl: HTMLElement) => {
    if (!FEATURE_GUIDES[id]) return;
    currentAnchorRef.current = anchorEl;
    const rect = anchorEl.getBoundingClientRect();
    const pos = computeGuidePosition(rect, 320, 140, window.innerWidth, window.innerHeight);
    setPopupPos(pos);
    setActiveGuideId(id);
  }, []);

  const toggleGuide = useCallback((id: string, anchorEl: HTMLElement) => {
    if (activeGuideId === id) {
      closeGuide();
    } else {
      openGuide(id, anchorEl);
    }
  }, [activeGuideId, closeGuide, openGuide]);

  // Dismiss listeners: Esc key and outside clicks
  useEffect(() => {
    if (!activeGuideId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGuide();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (currentAnchorRef.current?.contains(target)) return;
      closeGuide();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [activeGuideId, closeGuide]);

  const activeGuide: FeatureGuideItem | undefined = activeGuideId ? FEATURE_GUIDES[activeGuideId] : undefined;

  return (
    <FeatureGuideContext.Provider value={{ activeGuideId, openGuide, closeGuide, toggleGuide }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeGuide && popupPos && (
            <FeatureGuidePopup
              key={activeGuide.id}
              guide={activeGuide}
              position={popupPos}
              cardRef={cardRef}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </FeatureGuideContext.Provider>
  );
};
