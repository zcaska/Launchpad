import { Transition, Variants } from 'motion/react';

/**
 * Reusable Motion Tokens & Constants for LaunchPAD
 * Adheres to 60fps transform/opacity-only principles and prefers-reduced-motion
 */

export const MOTION_DURATIONS = {
  instant: 0.1,
  fast: 0.15,
  base: 0.22,
  smooth: 0.32,
  slow: 0.45,
} as const;

export const MOTION_EASINGS = {
  easeOutCubic: [0.215, 0.61, 0.355, 1] as const,
  easeOutQuart: [0.165, 0.84, 0.44, 1] as const,
  easeInOutCubic: [0.645, 0.045, 0.355, 1] as const,
} as const;

export const MOTION_SPRINGS: Record<string, Transition> = {
  snappy: { type: 'spring', stiffness: 420, damping: 30 },
  gentle: { type: 'spring', stiffness: 280, damping: 26 },
  bouncy: { type: 'spring', stiffness: 500, damping: 24 },
  drawer: { type: 'spring', stiffness: 360, damping: 34 },
};

/**
 * Modal Backdrop Animation (Fast fade)
 */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' } 
  },
};

/**
 * Modal Dialog Box Animation (Spring scale & gentle elevation)
 */
export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 420, damping: 30 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 6, 
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' } 
  },
};

/**
 * Slide-over Drawer (QuickNotes panel from right edge)
 */
export const drawerVariants: Variants = {
  initial: { x: '100%', opacity: 0.4 },
  animate: { 
    x: 0, 
    opacity: 1, 
    transition: MOTION_SPRINGS.drawer 
  },
  exit: { 
    x: '100%', 
    opacity: 0, 
    transition: { duration: MOTION_DURATIONS.base, ease: MOTION_EASINGS.easeInOutCubic } 
  },
};

/**
 * Page / View Transition (Fluid cross-view transition between Dashboard & Tasks)
 */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: MOTION_DURATIONS.base, ease: MOTION_EASINGS.easeOutQuart } 
  },
  exit: { 
    opacity: 0, 
    y: -6, 
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' } 
  },
};

/**
 * Stagger Container & Child Items (For Folder Grid, Task Items, Bookmark Lists)
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: MOTION_DURATIONS.base, ease: MOTION_EASINGS.easeOutQuart } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    transition: { duration: MOTION_DURATIONS.fast } 
  },
};

/**
 * Smooth Fade & Scale (For Quote rotation, AI recommendations)
 */
export const fadeScaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: MOTION_DURATIONS.base, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' } 
  },
};

/**
 * Interactive Micro-Interaction Feedback
 */
export const MICRO_INTERACTIONS = {
  tapSmall: { scale: 0.98 },
  tapButton: { scale: 0.96 },
  hoverCard: { y: -2, transition: { duration: MOTION_DURATIONS.fast } },
  hoverButton: { scale: 1.02, transition: { duration: MOTION_DURATIONS.fast } },
};
