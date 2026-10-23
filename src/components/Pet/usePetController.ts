import { useCallback, useEffect, useRef, useState } from 'react';
import {
  nextPet,
  PET_OVERWHELM_THRESHOLD,
  PetCue,
  PetState,
  VariationPick,
} from '../../utils/petState';

// Inactivity thresholds (ms) — conservative defaults, easy to retune (spec §9).
const BORED_MS = 8 * 60_000;         // 8 min: wanders, gets bored, or rests
const SUBDUE_MS = 2 * 60 * 60_000;   // 2 h without interaction: looks a bit down
const DOZE_MS = 4 * 60 * 60_000;     // 4 h: falls asleep
const WELCOME_MS = 30 * 60_000;      // "meaningful absence" for greeting
const TICK_MS = 8_000;               // low-frequency poll; snappy but no per-frame work
const SEEN_WRITE_MS = 60_000;        // continuity write at most once per minute
const ROAM_MIN_MS = 3_500;
const ROAM_JITTER_MS = 2_500;
const OVERWHELM_COOLDOWN_MS = 10 * 60_000; // no repeated "concerned" nagging
const INACTIVITY_SLUMP_MS = 15 * 60_000;   // 15 min without interaction: slump
const COFFEE_COOLDOWN_MS = 8 * 60_000;     // 8 min minimum between coffee breaks

// Versioned continuity key: ONLY "last time the user was visibly here".
// No task content, no activity history — tiny, safe to lose, schema-versioned.
const PET_STORE_KEY = 'launchpad_pet_v1';

type Continuity = { v: 1; lastSeenAt: number };

function readContinuity(): Continuity | null {
  try {
    const raw = localStorage.getItem(PET_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1 || typeof parsed.lastSeenAt !== 'number' || !Number.isFinite(parsed.lastSeenAt)) return null;
    return { v: 1, lastSeenAt: parsed.lastSeenAt };
  } catch {
    return null; // malformed/unavailable storage degrades to "no continuity"
  }
}

function writeContinuity(value: Continuity) {
  try {
    localStorage.setItem(PET_STORE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: continuity silently degrades */
  }
}

export interface PetControllerOptions {
  enabled: boolean;
  paused: boolean;          // user paused movement (settings.pet.paused)
  focusActive: boolean;
  pendingCount: number;
  uiActive: boolean;        // a modal is open or a text input is focused
}

export interface PetController {
  state: PetState;
  /** Feed a pet cue from app events. */
  cue: (cue: PetCue) => void;
}

export function usePetController(opts: PetControllerOptions): PetController {
  const [state, setState] = useState<PetState>('idle');
  // Mirror of state so decisions read it synchronously; keeps all timer/
  // dispatch side effects OUT of state updaters (StrictMode-safe).
  const stateRef = useRef<PetState>('idle');
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const lastActivityRef = useRef(Date.now());
  const hiddenAtRef = useRef<number | null>(null);
  const transientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetedRef = useRef(false);
  const lastOverwhelmedRef = useRef(0);
  const lastCoffeeRef = useRef(0);

  // System reduced-motion: gates hopping/roaming/particles at the source.
  const [vibrateOk, setVibrateOk] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setVibrateOk(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const apply = useCallback((next: PetState) => {
    stateRef.current = next;
    setState((cur) => (cur === next ? cur : next)); // no flicker on no-ops
  }, []);

  const clearTransient = useCallback(() => {
    if (transientTimerRef.current) {
      clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
  }, []);

  const clearRoam = useCallback(() => {
    if (roamTimerRef.current) {
      clearTimeout(roamTimerRef.current);
      roamTimerRef.current = null;
    }
  }, []);

  // Single decision point: everything funnels through here, so timers can
  // never overlap (each dispatch clears the previous transient/roam timer).
  const dispatch = useCallback(
    (cue: PetCue, variation?: VariationPick) => {
      const o = { ...optsRef.current, vibrateOk };
      if (!o.enabled) return;
      const decision = nextPet(stateRef.current, cue, {
        focusActive: o.focusActive,
        pendingCount: o.pendingCount,
        vibrateOk,
        variation,
      });
      clearTransient();
      clearRoam();

      if (decision.transientMs) {
        transientTimerRef.current = setTimeout(() => {
          transientTimerRef.current = null;
          const oo = optsRef.current;
          apply(
            nextPet(stateRef.current, 'env-transient-end', {
              focusActive: oo.focusActive,
              pendingCount: oo.pendingCount,
              vibrateOk,
            }).state
          );
        }, decision.transientMs);
      }

      if (decision.state === 'roaming') {
        // Roaming is the one long-lived state: schedule its own exit.
        roamTimerRef.current = setTimeout(
          () => {
            roamTimerRef.current = null;
            const oo = optsRef.current;
            apply(
              nextPet(stateRef.current, 'env-roam-end', {
                focusActive: oo.focusActive,
                pendingCount: oo.pendingCount,
                vibrateOk,              }).state
            );
          },
          ROAM_MIN_MS + Math.floor(Math.random() * ROAM_JITTER_MS)
        );
      }

      apply(decision.state);
    },
    [apply, clearRoam, clearTransient, vibrateOk]
  );

  const cue = useCallback((c: PetCue) => dispatch(c), [dispatch]);

  // ---- Focus sessions: react to start/end, cancel any roam immediately ----
  const prevFocusRef = useRef(opts.focusActive);
  useEffect(() => {
    if (prevFocusRef.current !== opts.focusActive) {
      prevFocusRef.current = opts.focusActive;
      dispatch(opts.focusActive ? 'feed-focus-start' : 'feed-focus-end');
    } else if (opts.focusActive) {
      clearRoam();
    }
  }, [opts.focusActive, dispatch, clearRoam]);

  // Pausing movement, open modals, or focused inputs: end any roam in progress
  // and park the pet back home (otherwise it would keep the walking pose).
  const prevGateRef = useRef(opts.paused || opts.uiActive);
  useEffect(() => {
    const gate = opts.paused || opts.uiActive;
    if (gate && gate !== prevGateRef.current) {
      clearRoam();
      if (stateRef.current === 'roaming') dispatch('env-roam-end');
    }
    prevGateRef.current = gate;
  }, [opts.paused, opts.uiActive, clearRoam, dispatch]);

  // ---- User activity tracking: cheap listeners only, no mousemove ----
  useEffect(() => {
    const onInteract = () => {
      lastActivityRef.current = Date.now();
      // Sleeping pets wake on direct interaction; a sad pet perks up. The
      // reducer keeps this a no-op for every other state, so ordinary clicks
      // stay free (and never cut a celebration animation short).
      if (stateRef.current === 'sleeping' || stateRef.current === 'sad') {
        dispatch('feed-user-wake');
      }
    };
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract, { passive: true });
    window.addEventListener('wheel', onInteract, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('wheel', onInteract);
    };
  }, []);

  // ---- Visibility-aware lifecycle (a hidden tab does nothing) ----
  useEffect(() => {
    if (document.hidden) hiddenAtRef.current = Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        writeContinuity({ v: 1, lastSeenAt: Date.now() });
        return;
      }
      // Back in the foreground: did the user return after a real absence?
      const away = hiddenAtRef.current !== null ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      lastActivityRef.current = Date.now();
      const o = optsRef.current;
      if (!o.enabled) return;
      if (away >= WELCOME_MS || stateRef.current === 'sleeping') {
        dispatch('feed-user-wake'); // sleeping → welcome-back; focused stays quiet
      }
    };

    const onUnload = () => writeContinuity({ v: 1, lastSeenAt: Date.now() });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [dispatch, apply]);

  // ---- Session greeting: continuity read + first-absence check (once) ----
  useEffect(() => {
    if (!opts.enabled || greetedRef.current) return;
    greetedRef.current = true;
    const continuity = readContinuity();
    // Fresh profile (no continuity yet) still counts as a return visit; keep
    // it as a gentle hello, not a claim about productivity.
    const gap = continuity ? Date.now() - continuity.lastSeenAt : WELCOME_MS + 1;
    lastActivityRef.current = Date.now();
    if (gap >= WELCOME_MS && !optsRef.current.focusActive) {
      // Defer one beat so hydration and the initial paint settle first.
      const t = setTimeout(() => {
        if (!document.hidden && !optsRef.current.focusActive) dispatch('env-greet');
      }, 600);
      return () => clearTimeout(t);
    }
  }, [opts.enabled, dispatch]);

  // ---- Low-frequency tick: subdue / doze / idle variation ----
  useEffect(() => {
    if (!opts.enabled) return;
    const interval = setInterval(() => {
      const o = optsRef.current;
      // Open modals / typing / paused / hidden: freeze activity clock and skip.
      // (document.activeElement check covers typing without extra listeners.)
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (document.hidden || o.paused || o.uiActive || typing) {
        lastActivityRef.current = Date.now();
        return;
      }
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= DOZE_MS) {
        dispatch('env-doze');
        return;
      }
      if (idleFor >= INACTIVITY_SLUMP_MS && !o.focusActive) {
        if (stateRef.current !== 'sleeping' && stateRef.current !== 'sad') {
          dispatch('env-inactivity-slump');
        }
        return;
      }
      if (idleFor >= SUBDUE_MS) {
        dispatch('env-subdue');
        return;
      }

      // Overload check
      if (
        o.pendingCount >= PET_OVERWHELM_THRESHOLD &&
        !o.focusActive &&
        Date.now() - lastOverwhelmedRef.current > OVERWHELM_COOLDOWN_MS
      ) {
        lastOverwhelmedRef.current = Date.now();
        dispatch('feed-task-overload');
        return;
      }

      // Idle variation: only from idle, never during focus.
      if (stateRef.current !== 'idle' || o.focusActive) return;

      // Coffee break: rare idle variation
      if (Date.now() - lastCoffeeRef.current > COFFEE_COOLDOWN_MS) {
        if (Math.random() < 0.15) {
          lastCoffeeRef.current = Date.now();
          dispatch('env-coffee-break');
          return;
        }
      }

      const roll = Math.random();
      let pick: VariationPick = 'stay';
      if (
        o.pendingCount >= PET_OVERWHELM_THRESHOLD &&
        roll < 0.2 &&
        Date.now() - lastOverwhelmedRef.current > OVERWHELM_COOLDOWN_MS
      ) {
        pick = 'overwhelmed';
        lastOverwhelmedRef.current = Date.now();
      } else if (idleFor >= BORED_MS) {
        // Nobody is around: the pet gets restless — it wanders, thinks, or rests.
        pick = roll < 0.5 ? 'roam' : roll < 0.85 ? 'think' : 'stay';
      } else {
        pick = roll < 0.4 ? 'roam' : roll < 0.5 ? 'think' : 'stay';
      }
      // A gentle reminder: with tasks still open, the pet drifts into a
      // "thinking about it" pose instead of standing around.
      if (pick === 'stay' && o.pendingCount > 0 && roll > 0.7) pick = 'think';
      if (pick !== 'stay') dispatch('env-variation', pick);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [opts.enabled, dispatch]);

  // ---- Periodic continuity write (visible time counts as "seen") ----
  useEffect(() => {
    if (!opts.enabled) return;
    const interval = setInterval(() => {
      if (!document.hidden) writeContinuity({ v: 1, lastSeenAt: Date.now() });
    }, SEEN_WRITE_MS);
    return () => clearInterval(interval);
  }, [opts.enabled]);

  // ---- Full teardown on unmount ----
  useEffect(() => {
    return () => {
      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
      if (roamTimerRef.current) clearTimeout(roamTimerRef.current);
    };
  }, []);

  return { state, cue };
}
