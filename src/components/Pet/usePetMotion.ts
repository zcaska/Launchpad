import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';

export interface PetMotionOptions {
  roaming: boolean;
  paused: boolean;
  reducedMotion: boolean;
  dockPosition?: { x: number; y: number };
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

export function clampCoordinate(val: number, min: number, max: number): number {
  if (min >= max) return min;
  return Math.max(min, Math.min(max, val));
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
      const maxX = Math.max(16, window.innerWidth - 72);
      const maxY = Math.max(16, window.innerHeight - 72);
      return {
        x: clampCoordinate(parsed.x, 16, maxX),
        y: clampCoordinate(parsed.y, 16, maxY),
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

function getDefaultPosition(dockPosition?: { x: number; y: number }): { x: number; y: number } {
  if (dockPosition) {
    const maxX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 72) : 500;
    const maxY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 72) : 500;
    return {
      x: clampCoordinate(dockPosition.x, 16, maxX),
      y: clampCoordinate(dockPosition.y, 16, maxY),
    };
  }
  if (typeof window !== 'undefined') {
    const maxX = Math.max(16, window.innerWidth - 72);
    const maxY = Math.max(16, window.innerHeight - 72);
    return {
      x: clampCoordinate(window.innerWidth - 72, 16, maxX),
      y: clampCoordinate(window.innerHeight - 80, 16, maxY),
    };
  }
  return { x: 0, y: 0 };
}

export function usePetMotion({
  roaming,
  paused,
  reducedMotion,
  dockPosition,
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

  const savedPosRef = useRef<{ x: number; y: number }>(pos);

  const onPetClickRef = useRef(onPetClick);
  onPetClickRef.current = onPetClick;

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const posStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const hasMovedPastThresholdRef = useRef(false);

  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-clamp position on window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const maxX = Math.max(16, window.innerWidth - 72);
      const maxY = Math.max(16, window.innerHeight - 72);
      setPos((prev) => {
        const clampedX = clampCoordinate(prev.x, 16, maxX);
        const clampedY = clampCoordinate(prev.y, 16, maxY);
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Roaming gentle flight along right margin
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (paused || isDragging) {
      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
      if (restTimerRef.current) clearTimeout(restTimerRef.current);
      setIsFlying(false);
      return;
    }

    if (roaming) {
      let cancelled = false;

      const scheduleFlight = (delayMs: number) => {
        restTimerRef.current = setTimeout(() => {
          if (cancelled) return;

          const dur = Math.floor(4500 + Math.random() * 2000); // 4500-6500 ms
          const maxX = Math.max(16, window.innerWidth - 72);
          const maxY = Math.max(16, window.innerHeight - 72);

          const nextX = clampCoordinate(window.innerWidth - (32 + Math.random() * 56), 16, maxX);
          const nextY = clampCoordinate(window.innerHeight * (0.15 + Math.random() * 0.65), 16, maxY);

          setDurationMs(reducedMotion ? 0 : dur);
          setIsFlying(true);
          setFacing((prevFacing) => {
            if (nextX < posRef.current.x) return -1;
            if (nextX > posRef.current.x) return 1;
            return prevFacing;
          });
          setPos({ x: nextX, y: nextY });

          flightTimerRef.current = setTimeout(() => {
            if (cancelled) return;
            setIsFlying(false);
            const restDur = Math.floor(1500 + Math.random() * 1500);
            scheduleFlight(restDur);
          }, dur);
        }, delayMs);
      };

      scheduleFlight(600);

      return () => {
        cancelled = true;
        if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
        if (restTimerRef.current) clearTimeout(restTimerRef.current);
      };
    } else {
      setIsFlying(false);
      const target = savedPosRef.current;
      if (target && (posRef.current.x !== target.x || posRef.current.y !== target.y)) {
        const dur = reducedMotion ? 0 : 2200;
        setDurationMs(dur);
        if (target.x < posRef.current.x) setFacing(-1);
        else if (target.x > posRef.current.x) setFacing(1);
        setPos(target);
      }
    }
  }, [roaming, paused, isDragging, reducedMotion]);

  // Pointer drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;

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

    if (!hasMovedPastThresholdRef.current) {
      if (dist >= 5) {
        hasMovedPastThresholdRef.current = true;
        setIsDragging(true);
        setDurationMs(0);
      } else {
        return;
      }
    }

    const maxX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 72) : 500;
    const maxY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 72) : 500;
    const targetX = clampCoordinate(posStartRef.current.x + dx, 16, maxX);
    const targetY = clampCoordinate(posStartRef.current.y + dy, 16, maxY);

    if (targetX < posRef.current.x) {
      setFacing(-1);
    } else if (targetX > posRef.current.x) {
      setFacing(1);
    }

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
      savedPosRef.current = finalPos;
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
      savedPosRef.current = finalPos;
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
