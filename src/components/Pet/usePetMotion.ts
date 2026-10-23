import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';

export interface PetMotionOptions {
  roaming?: boolean;
  paused: boolean;
  reducedMotion: boolean;
  dockPosition?: { x: number; y: number };
  focusActive?: boolean;
  onPetClick?: () => void;
}

export interface PetMotionState {
  pos: { x: number; y: number };
  facing: 1 | -1;
  isFlying: boolean;
  isDragging: boolean;
  placement: 'top' | 'bottom';
  durationMs: number;
  size: number;
  isMobile: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
}

export const MASCOT_BOUNDS = {
  width: 84,
  height: 70,
  padding: 12,
};

export const MAX_ROAM_RADIUS_PX = 6;

export function clampCoordinate(val: number, min: number, max: number): number {
  if (min >= max) return min;
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates adaptive mascot size based on viewport width:
 * - Mobile (<480px): 56px (compact, unobtrusive on 360-430px screens)
 * - Tablet (480px–767px): 68px
 * - Desktop (>=768px): 84px
 */
export function getAdaptiveMascotSize(viewportWidth?: number): number {
  const w = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  if (w < 480) return 56;
  if (w < 768) return 68;
  return 84;
}

/**
 * Calculates safe screen bounds accounting for screen dimensions, mascot size,
 * mobile sticky headers (top ~56px), and mobile bottom navigation / gesture bars (~64px).
 */
export function getScreenBounds(
  viewportWidth?: number,
  viewportHeight?: number,
  mascotSize?: number
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: number;
  height: number;
  padding: number;
  isMobile: boolean;
} {
  const w = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const h = viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
  const isMobile = w < 640;
  const size = mascotSize ?? getAdaptiveMascotSize(w);
  const mascotHeight = Math.round((size * 100) / 120);
  const padding = w < 480 ? 8 : w < 768 ? 10 : 12;

  // Protect sticky header (top ~56px) and bottom navigation / gesture pill (bottom ~64px) on mobile
  const topSafeInset = isMobile ? 56 : padding;
  const bottomSafeInset = isMobile ? 64 : padding;

  const maxX = Math.max(padding, w - size - padding);
  const maxY = Math.max(topSafeInset, h - mascotHeight - bottomSafeInset);

  return {
    minX: padding,
    maxX,
    minY: topSafeInset,
    maxY,
    size,
    height: mascotHeight,
    padding,
    isMobile,
  };
}

/**
 * Calculates next autonomous roam waypoint adapted to screen dimensions:
 * - On mobile: explores the right-side safe corridor without obstructing center content
 * - On desktop: explores the right margin band
 */
export function calculateRoamWaypoint(
  width: number,
  height: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number; size?: number; padding?: number; isMobile: boolean }
): { x: number; y: number } {
  if (bounds.isMobile) {
    const size = bounds.size ?? 56;
    const padding = bounds.padding ?? 8;
    // Right margin corridor on mobile (e.g. within 12-40px from right edge)
    const targetX = width - (padding + size + Math.random() * Math.min(32, width * 0.1));
    const targetY = bounds.minY + 12 + Math.random() * Math.max(20, bounds.maxY - bounds.minY - 24);
    return {
      x: clampCoordinate(Math.round(targetX), bounds.minX, bounds.maxX),
      y: clampCoordinate(Math.round(targetY), bounds.minY, bounds.maxY),
    };
  }
  // Desktop right corridor: window.innerWidth - 32..88, vertical 15%..80%
  const targetX = width - (32 + Math.random() * 56);
  const targetY = height * (0.15 + Math.random() * 0.65);
  return {
    x: clampCoordinate(Math.round(targetX), bounds.minX, bounds.maxX),
    y: clampCoordinate(Math.round(targetY), bounds.minY, bounds.maxY),
  };
}

export function calculateRoamTarget(
  anchor: { x: number; y: number },
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  maxOffset: number = MAX_ROAM_RADIUS_PX
): { x: number; y: number } {
  const deltaX = (Math.random() * 2 - 1) * maxOffset;
  const deltaY = (Math.random() * 2 - 1) * maxOffset;

  const rawX = Math.round(anchor.x + deltaX);
  const rawY = Math.round(anchor.y + deltaY);

  return {
    x: clampCoordinate(rawX, bounds.minX, bounds.maxX),
    y: clampCoordinate(rawY, bounds.minY, bounds.maxY),
  };
}

export function calculatePlacement(y: number): 'top' | 'bottom' {
  return y < 120 ? 'bottom' : 'top';
}

const STORAGE_KEY = 'launchpad_pet_pos_v1';

function loadSavedPosition(): { x: number; y: number } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      const bounds = getScreenBounds();
      return {
        x: clampCoordinate(parsed.x, bounds.minX, bounds.maxX),
        y: clampCoordinate(parsed.y, bounds.minY, bounds.maxY),
      };
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function savePosition(pos: { x: number; y: number }): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Ignore storage write errors
  }
}

export function getDefaultPosition(
  dockPosition?: { x: number; y: number },
  viewportWidth?: number,
  viewportHeight?: number
): { x: number; y: number } {
  const w = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const h = viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
  const bounds = getScreenBounds(w, h);
  if (dockPosition) {
    return {
      x: clampCoordinate(dockPosition.x, bounds.minX, bounds.maxX),
      y: clampCoordinate(dockPosition.y, bounds.minY, bounds.maxY),
    };
  }
  if (typeof window !== 'undefined' || viewportWidth !== undefined) {
    const isMobile = w < 640;
    const targetX = w - (isMobile ? 68 : 96);
    const targetY = h - (isMobile ? 78 : 96);
    return {
      x: clampCoordinate(targetX, bounds.minX, bounds.maxX),
      y: clampCoordinate(targetY, bounds.minY, bounds.maxY),
    };
  }
  return { x: 0, y: 0 };
}

export function usePetMotion({
  roaming = false,
  paused,
  reducedMotion,
  dockPosition,
  focusActive = false,
  onPetClick,
}: PetMotionOptions): PetMotionState {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = loadSavedPosition();
    if (saved) return saved;
    return getDefaultPosition(dockPosition);
  });

  const [facing, setFacing] = useState<1 | -1>(1);
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [durationMs, setDurationMs] = useState<number>(reducedMotion ? 0 : 2200);

  const [screenInfo, setScreenInfo] = useState(() => getScreenBounds());

  const posRef = useRef(pos);
  posRef.current = pos;

  // The anchor represents the perch point around which roaming occurs
  const anchorRef = useRef<{ x: number; y: number }>(pos);

  const onPetClickRef = useRef(onPetClick);
  onPetClickRef.current = onPetClick;

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const posStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<string>('mouse');
  const hasMovedPastThresholdRef = useRef(false);

  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-clamp position and home anchor on window resize or mobile orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const bounds = getScreenBounds();
      setScreenInfo(bounds);
      setPos((prev) => {
        const clampedX = clampCoordinate(prev.x, bounds.minX, bounds.maxX);
        const clampedY = clampCoordinate(prev.y, bounds.minY, bounds.maxY);
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
      if (anchorRef.current) {
        anchorRef.current = {
          x: clampCoordinate(anchorRef.current.x, bounds.minX, bounds.maxX),
          y: clampCoordinate(anchorRef.current.y, bounds.minY, bounds.maxY),
        };
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (flightTimerRef.current) {
      clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }
    if (restTimerRef.current) {
      clearTimeout(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  const scheduleFlightRef = useRef<(delayMs: number) => void>(() => {});

  scheduleFlightRef.current = (delayMs: number) => {
    if (restTimerRef.current) {
      clearTimeout(restTimerRef.current);
      restTimerRef.current = null;
    }
    // If already in flight, do not start a new flight
    if (flightTimerRef.current) {
      return;
    }

    restTimerRef.current = setTimeout(() => {
      restTimerRef.current = null;
      if (typeof window === 'undefined') return;

      const bounds = getScreenBounds();
      const dur = Math.floor(
        (bounds.isMobile ? 3800 : 4500) + Math.random() * (bounds.isMobile ? 1400 : 2000)
      );

      // Autonomous exploratory flight waypoint adapted to mobile / desktop screen dimensions
      const nextPos = calculateRoamWaypoint(window.innerWidth, window.innerHeight, bounds);

      setDurationMs(reducedMotion ? 0 : dur);
      setIsFlying(true);
      setFacing((prevFacing) => {
        if (nextPos.x < posRef.current.x - 1) return -1;
        if (nextPos.x > posRef.current.x + 1) return 1;
        return prevFacing;
      });
      posRef.current = nextPos;
      setPos(nextPos);

      flightTimerRef.current = setTimeout(() => {
        flightTimerRef.current = null;
        setIsFlying(false);
        const landingPos = nextPos;
        anchorRef.current = landingPos;
        savePosition(landingPos);

        // Schedule next gentle exploratory flight after 16–28s rest at perch
        const nextRest = 16000 + Math.random() * 12000;
        scheduleFlightRef.current(nextRest);
      }, dur);
    }, delayMs);
  };

  // Autonomous wander loop lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (paused || isDragging || focusActive || reducedMotion) {
      clearTimers();
      setIsFlying(false);
      return;
    }

    // Active: schedule gentle exploratory flight after initial perch delay (~4000ms)
    const initialDelay = roaming ? 400 : 4000;
    scheduleFlightRef.current(initialDelay);

    return () => {
      clearTimers();
    };
  }, [paused, isDragging, focusActive, reducedMotion, clearTimers]);

  // If roaming is explicitly passed as true from controller, immediately trigger exploratory glide
  useEffect(() => {
    if (roaming && !paused && !isDragging && !focusActive && !reducedMotion) {
      scheduleFlightRef.current(400);
    }
  }, [roaming, paused, isDragging, focusActive, reducedMotion]);

  // Pointer drag handlers (supporting mouse, pen, and mobile touch)
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;

    pointerTypeRef.current = e.pointerType || 'mouse';
    activePointerIdRef.current = e.pointerId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { x: posRef.current.x, y: posRef.current.y };
    hasMovedPastThresholdRef.current = false;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current == null || posStartRef.current == null) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    // Touch threshold is 8px to prevent accidental drag during mobile finger taps; mouse threshold is 5px
    const dragThreshold = pointerTypeRef.current === 'touch' ? 8 : 5;

    if (!hasMovedPastThresholdRef.current) {
      if (dist >= dragThreshold) {
        hasMovedPastThresholdRef.current = true;
        setIsDragging(true);
        setDurationMs(0);
      } else {
        return;
      }
    }

    const bounds = getScreenBounds();
    const targetX = clampCoordinate(posStartRef.current.x + dx, bounds.minX, bounds.maxX);
    const targetY = clampCoordinate(posStartRef.current.y + dy, bounds.minY, bounds.maxY);

    if (targetX < posRef.current.x) {
      setFacing(-1);
    } else if (targetX > posRef.current.x) {
      setFacing(1);
    }

    posRef.current = { x: targetX, y: targetY };
    setPos({ x: targetX, y: targetY });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    const wasDragging = hasMovedPastThresholdRef.current;

    dragStartRef.current = null;
    posStartRef.current = null;
    activePointerIdRef.current = null;
    hasMovedPastThresholdRef.current = false;

    if (wasDragging) {
      setIsDragging(false);
      const finalPos = posRef.current;
      anchorRef.current = finalPos;
      savePosition(finalPos);
    } else {
      onPetClickRef.current?.();
    }
  }, []);

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    const wasDragging = hasMovedPastThresholdRef.current;

    dragStartRef.current = null;
    posStartRef.current = null;
    activePointerIdRef.current = null;
    hasMovedPastThresholdRef.current = false;

    if (wasDragging) {
      setIsDragging(false);
      const finalPos = posRef.current;
      anchorRef.current = finalPos;
      savePosition(finalPos);
    }
  }, []);

  return {
    pos,
    facing,
    isFlying,
    isDragging,
    placement: calculatePlacement(pos.y),
    durationMs,
    size: screenInfo.size,
    isMobile: screenInfo.isMobile,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}

export default usePetMotion;
