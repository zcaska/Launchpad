import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuickNote, TickTickSettings } from '../types';
import { 
  getProjectTasks, 
  createTask, 
  updateTask, 
  completeTask, 
  deleteTask 
} from './ticktickService';
import { 
  mapQuickNoteToTickTick, 
  reconcileTasks 
} from '../utils/ticktickSync';

export const TICKTICK_SETTINGS_STORAGE_KEY = 'launchpad_ticktick_settings_v1';

export const DEFAULT_TICKTICK_SETTINGS: TickTickSettings = {
  enabled: false,
  accessToken: '',
  selectedProjectId: '',
  selectedProjectName: '',
  autoSyncIntervalMinutes: 5,
};

export function loadTickTickSettings(): TickTickSettings {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TICKTICK_SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_TICKTICK_SETTINGS, ...JSON.parse(raw) };
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return DEFAULT_TICKTICK_SETTINGS;
}

export function saveTickTickSettings(settings: TickTickSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TICKTICK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage write error
  }
}

export type SetQuickNotes = (
  updater: QuickNote[] | ((prev: QuickNote[]) => QuickNote[])
) => void;

export interface TickTickSyncManagerReturn {
  settings: TickTickSettings;
  updateSettings: (newSettings: TickTickSettings) => void;
  isSyncing: boolean;
  syncError: string | null;
  syncNow: () => Promise<void>;
  pushTaskCreate: (note: QuickNote) => Promise<void>;
  pushTaskToggle: (note: QuickNote) => Promise<void>;
  pushTaskDelete: (note: QuickNote) => Promise<void>;
}

export function useTickTickSyncManager(
  _notes: QuickNote[],
  setNotes: SetQuickNotes,
  disabled = false
): TickTickSyncManagerReturn {
  const [settings, setSettings] = useState<TickTickSettings>(() => disabled ? DEFAULT_TICKTICK_SETTINGS : loadTickTickSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const syncInFlightRef = useRef(false);
  const pendingPushesRef = useRef(0);
  const localChangeVersionRef = useRef(0);

  const updateSettings = useCallback((newSettings: TickTickSettings) => {
    setSettings(newSettings);
  }, []);

  useEffect(() => {
    if (!disabled) saveTickTickSettings(settings);
  }, [settings, disabled]);

  // Manual & scheduled pull sync
  const syncNow = useCallback(async () => {
    const s = settingsRef.current;
    if (!s.enabled || !s.accessToken || !s.selectedProjectId || syncInFlightRef.current || pendingPushesRef.current > 0) {
      return;
    }

    syncInFlightRef.current = true;
    const versionAtStart = localChangeVersionRef.current;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const remoteTasks = await getProjectTasks(s.accessToken, s.selectedProjectId, s.proxyUrl);
      // A local update may have happened while the request was in flight.
      const canApply = pendingPushesRef.current === 0 && localChangeVersionRef.current === versionAtStart && settingsRef.current.selectedProjectId === s.selectedProjectId;
      if (canApply) {
        setNotes((current) => reconcileTasks(current, remoteTasks, s.selectedProjectId));
      }

      const now = Date.now();
      if (canApply) setSettings((current) => {
        if (current.selectedProjectId !== s.selectedProjectId || current.accessToken !== s.accessToken) return current;
        const next = { ...current, lastSyncedAt: now, lastError: undefined };
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(msg);
      setSettings((current) => {
        if (current.selectedProjectId !== s.selectedProjectId || current.accessToken !== s.accessToken) return current;
        const next = { ...current, lastError: msg };
        return next;
      });
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [setNotes]);

  // Hook background auto-sync interval & window focus
  useEffect(() => {
    if (!settings.enabled || !settings.accessToken || !settings.selectedProjectId) {
      return;
    }

    // Initial sync on mount or configuration activate
    syncNow();

    const intervalMs = (settings.autoSyncIntervalMinutes || 5) * 60 * 1000;
    const timer = setInterval(() => {
      syncNow();
    }, intervalMs);

    const onFocus = () => {
      syncNow();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [
    settings.enabled,
    settings.accessToken,
    settings.selectedProjectId,
    settings.autoSyncIntervalMinutes,
    syncNow,
  ]);

  // Optimistic Push: on task create
  const pushTaskCreate = useCallback(
    async (note: QuickNote) => {
      const s = settingsRef.current;
      if (!s.enabled || !s.accessToken || !s.selectedProjectId) return;

      pendingPushesRef.current++;
      localChangeVersionRef.current++;
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, syncStatus: 'pending' as const } : n));
      try {
        const payload = mapQuickNoteToTickTick(note, s.selectedProjectId);
        const created = await createTask(s.accessToken, payload, s.proxyUrl);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id
              ? {
                  ...n,
                  ticktickTaskId: created.id,
                  ticktickProjectId: s.selectedProjectId,
                  syncStatus: 'synced' as const,
                }
              : n
          )
        );
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Failed to create TickTick task');
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, syncStatus: 'error' as const } : n
          )
        );
      } finally {
        pendingPushesRef.current--;
      }
    },
    [setNotes]
  );

  // Optimistic Push: on task toggle
  const pushTaskToggle = useCallback(
    async (note: QuickNote) => {
      const s = settingsRef.current;
      if (!s.enabled || !s.accessToken || !note.ticktickTaskId) return;

      pendingPushesRef.current++;
      localChangeVersionRef.current++;
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, syncStatus: 'pending' as const } : n));
      try {
        const projId = note.ticktickProjectId || s.selectedProjectId;
        if (note.isDone) {
          await completeTask(s.accessToken, projId, note.ticktickTaskId, s.proxyUrl);
        } else {
          const payload = mapQuickNoteToTickTick(note, projId);
          await updateTask(s.accessToken, { ...payload, id: note.ticktickTaskId }, s.proxyUrl);
        }
        setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, syncStatus: 'synced' as const } : n));
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Failed to update TickTick task');
        setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, syncStatus: 'error' as const } : n));
      } finally {
        pendingPushesRef.current--;
      }
    },
    [setNotes]
  );

  // Optimistic Push: on task delete
  const pushTaskDelete = useCallback(
    async (note: QuickNote) => {
      const s = settingsRef.current;
      if (!s.enabled || !s.accessToken || !note.ticktickTaskId) return;

      pendingPushesRef.current++;
      localChangeVersionRef.current++;
      try {
        const projId = note.ticktickProjectId || s.selectedProjectId;
        await deleteTask(s.accessToken, projId, note.ticktickTaskId, s.proxyUrl);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Failed to delete TickTick task');
        setNotes((prev) => prev.some((n) => n.id === note.id)
          ? prev
          : [{ ...note, syncStatus: 'error' }, ...prev]);
      } finally {
        pendingPushesRef.current--;
      }
    },
    [setNotes]
  );

  return {
    settings,
    updateSettings,
    isSyncing,
    syncError,
    syncNow,
    pushTaskCreate,
    pushTaskToggle,
    pushTaskDelete,
  };
}
