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

export function getScreenBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  if (typeof window === 'undefined') {
    return { minX: 12, maxX: 1200, minY: 12, maxY: 800 };
  }
  const maxX = Math.max(MASCOT_BOUNDS.padding, window.innerWidth - MASCOT_BOUNDS.width - MASCOT_BOUNDS.padding);
  const maxY = Math.max(MASCOT_BOUNDS.padding, window.innerHeight - MASCOT_BOUNDS.height - MASCOT_BOUNDS.padding);
  return {
    minX: MASCOT_BOUNDS.padding,
    maxX,
    minY: MASCOT_BOUNDS.padding,
    maxY,
  };
}

export function calculateRoamTarget(
  anchor: { x: number; y: number },
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  maxOffset: number = MAX_ROAM_RADIUS_PX
): { x: number; y: number } {
  // Ensure visible organic orbital drift bounded strictly by maxOffset
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.max(1, (0.5 + Math.random() * 0.5) * maxOffset);
  const deltaX = Math.round(Math.cos(angle) * distance);
  const deltaY = Math.round(Math.sin(angle) * distance);

  return {
    x: clampCoordinate(anchor.x + deltaX, bounds.minX, bounds.maxX),
    y: clampCoordinate(anchor.y + deltaY, bounds.minY, bounds.maxY),
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

export function getDefaultPosition(dockPosition?: { x: number; y: number }): { x: number; y: number } {
  const bounds = getScreenBounds();
  if (dockPosition) {
    return {
      x: clampCoordinate(dockPosition.x, bounds.minX, bounds.maxX),
      y: clampCoordinate(dockPosition.y, bounds.minY, bounds.maxY),
    };
  }
  if (typeof window !== 'undefined') {
    // Predecided section of site: bottom-right corner perch with comfortable headroom
    const targetX = Math.max(bounds.minX, bounds.maxX - 28);
    const targetY = Math.max(bounds.minY, bounds.maxY - 24);
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

  const posRef = useRef(pos);
  posRef.current = pos;

  // The anchor represents the predecided section/perch point around which 6px roaming occurs
  const anchorRef = useRef<{ x: number; y: number }>(pos);

  const onPetClickRef = useRef(onPetClick);
  onPetClickRef.current = onPetClick;

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const posStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const hasMovedPastThresholdRef = useRef(false);

  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-clamp position and home anchor on window resize so mascot NEVER exits screen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const bounds = getScreenBounds();
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
    return () => window.removeEventListener('resize', onResize);
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

      const dur = Math.floor(1800 + Math.random() * 600); // 1800-2400 ms smooth glide
      const bounds = getScreenBounds();
      // Ensure anchor has breathing room from clamp walls so roam moves freely in all directions
      const safeAnchor = {
        x: clampCoordinate(anchorRef.current.x, bounds.minX + 8, bounds.maxX - 8),
        y: clampCoordinate(anchorRef.current.y, bounds.minY + 8, bounds.maxY - 8),
      };
      const nextPos = calculateRoamTarget(safeAnchor, bounds, MAX_ROAM_RADIUS_PX);

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

        // Schedule next gentle micro-drift after 4–7s rest at perch
        const nextRest = 4200 + Math.random() * 2800;
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

  // Pointer drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;

    activePointerIdRef.current = e.pointerId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { x: posRef.current.x, y: posRef.current.y };
    hasMovedPastThresholdRef.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current == null || posStartRef.current == null) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (!hasMovedPastThresholdRef.current) {
      if (dist >= 5) {
        hasMovedPastThresholdRef.current = true;
        setIsDragging(true);
        setDurationMs(0);
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          // Ignore
        }
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
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}

export default usePetMotion;
