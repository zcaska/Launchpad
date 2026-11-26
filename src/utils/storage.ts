import { AppData, QuickNote } from '../types';
import { DEFAULT_SEED_DATA, DEFAULT_INITIAL_PREFERENCES } from '../data/seedData';
import { validateCastleEconomy } from './castleEconomy';
import { isValidLocalDate, parseLocalDate } from './taskPeriod';
import { FOCUS_TIMER_STORAGE_KEY } from './focusTimer';
import { createStorageDraftKey, readStorageDrafts, removeStorageDraft, withStorageLock, writeStorageDraft } from './storageConflict';

export const STORAGE_KEY = 'launchpad_app_data_v3';
export const STORAGE_BACKUP_KEY = 'launchpad_app_data_backup_v3';
const LEGACY_STORAGE_KEYS = ['launchpad_app_data_v2', 'launchpad_app_data_v1', 'launchpad_app_data_backup'];
const MAX_IMPORT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB ceiling for safety

function savedCompletionDay(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = parseLocalDate(value);
  return parts && isValidLocalDate(parts.year, parts.month, parts.day) ? value : undefined;
}

export class StorageRecoveryError extends Error {
  constructor(public readonly backup: AppData | null) {
    super('Saved data is damaged or missing. Recovery requires confirmation.');
    this.name = 'StorageRecoveryError';
  }
}

type BackupStatus = 'current' | 'stale';
let backupStatus: BackupStatus = 'current';
const backupListeners = new Set<(status: BackupStatus) => void>();
type PrimarySaveStatus = 'saved' | 'failed' | 'conflict';
let primarySaveStatus: PrimarySaveStatus = 'saved';
let loadedPrimary: string | null | undefined;
let loadedData: AppData | undefined;
const LOCAL_DRAFT_PREFIX = 'launchpad_local_conflict_v1:';
let localDraftKey = createStorageDraftKey(LOCAL_DRAFT_PREFIX);
export const readLocalConflictDrafts = () => readStorageDrafts(LOCAL_DRAFT_PREFIX, value => sanitizeAppData(value, false));
export const removeLocalConflictDraft = (key: string) => {
  removeStorageDraft(LOCAL_DRAFT_PREFIX, key);
  if (key === localDraftKey) localDraftKey = createStorageDraftKey(LOCAL_DRAFT_PREFIX);
};

function saveLocalConflict(data: AppData): boolean {
  const preserved = writeStorageDraft(localDraftKey, data);
  setPrimarySaveStatus(preserved ? 'conflict' : 'failed');
  return false;
}
const primarySaveListeners = new Set<(status: PrimarySaveStatus) => void>();
export const getPrimarySaveStatus = (): PrimarySaveStatus => primarySaveStatus;
export function subscribePrimarySaveStatus(listener: (status: PrimarySaveStatus) => void): () => void {
  primarySaveListeners.add(listener);
  return () => { primarySaveListeners.delete(listener); };
}
function setPrimarySaveStatus(status: PrimarySaveStatus): void {
  if (primarySaveStatus === status) return;
  primarySaveStatus = status;
  primarySaveListeners.forEach(listener => { try { listener(status); } catch { /* UI observers cannot prevent persistence */ } });
}
export const getBackupStatus = (): BackupStatus => backupStatus;
export function subscribeBackupStatus(listener: (status: BackupStatus) => void): () => void {
  backupListeners.add(listener);
  return () => { backupListeners.delete(listener); };
}
function setBackupStatus(status: BackupStatus): void {
  if (backupStatus === status) return;
  backupStatus = status;
  backupListeners.forEach(listener => { try { listener(status); } catch { /* a UI listener must not break persistence */ } });
}

function readRollingBackup(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_BACKUP_KEY);
    return raw ? importDataFromJson(raw, false) : null;
  } catch { return null; }
}

/** Explicitly restore a validated snapshot, preserving the damaged primary first. */
export function restoreRollingBackup(): boolean {
  const backup = readRollingBackup();
  if (!backup) throw new Error('No valid rolling backup is available.');
  return restoreImportedBackup(backup);
}

export function restoreRollingBackupWithLock(): Promise<boolean> {
  return withStorageLock(STORAGE_KEY, restoreRollingBackup);
}

export function restoreImportedBackupWithLock(backup: AppData): Promise<boolean> {
  return withStorageLock(STORAGE_KEY, () => restoreImportedBackup(backup));
}

/** Preserve the damaged primary before restoring a user-selected snapshot. */
export function restoreImportedBackup(backup: AppData): boolean {
  const validated = sanitizeAppData(backup, false);
  const damaged = localStorage.getItem(STORAGE_KEY);
  if (loadedPrimary !== undefined && damaged !== loadedPrimary) {
    throw new Error('Saved data changed in another tab. Reload LaunchPAD before restoring a backup.');
  }
  if (damaged !== null) {
    // Refuse to replace the only damaged copy when it cannot be archived.
    let key = `launchpad_app_data_corrupt_${Date.now()}`;
    while (localStorage.getItem(key) !== null) key += '_copy';
    localStorage.setItem(key, damaged);
  }
  // Recovery replaces the exact primary the user explicitly chose to recover.
  loadedPrimary = damaged;
  loadedData = undefined;
  return saveAppData(validated);
}

export interface StorageMetrics {
  usedBytes: number;
  usedFormatted: string;
  estimatedQuotaBytes: number;
  quotaUsagePercent: number;
  folderCount: number;
  linkCount: number;
  taskCount: number;
  hasBackup: boolean;
}

/** Check whether an error is a browser quota exceeded error */
export function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    // everything except Firefox
    (err.code === 22 ||
      // Firefox
      err.code === 1014 ||
      // test name field too, because code might not exist
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Prunes expendable ephemeral data to recover storage space if quota is exceeded.
 */
export function pruneExpendableData(data: AppData): AppData {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRejections = (data.learnedPreferences?.recentRejections || []).filter(
    (r) => r.timestamp > sevenDaysAgo
  );

  // Keep growth history bounded to last 365 days
  const growthHistory: Record<string, any> = {};
  if (data.growthHistory) {
    const keys = Object.keys(data.growthHistory).sort();
    const recentKeys = keys.slice(-365);
    for (const k of recentKeys) {
      growthHistory[k] = data.growthHistory[k];
    }
  }

  return {
    ...data,
    learnedPreferences: {
      ...data.learnedPreferences,
      recentRejections,
    },
    growthHistory,
  };
}

/**
 * Loads AppData with automatic corruption recovery and legacy migration.
 */
export function removeRetiredIntegrationCredentials(): void {
  try {
    localStorage.removeItem('launchpad_gcal_token_v1');
    localStorage.removeItem('launchpad_ticktick_settings_v1');
  } catch {
    // Storage may be unavailable.
  }
}

export function loadAppData(trackSnapshot = true): AppData {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SEED_DATA;
  }

  removeRetiredIntegrationCredentials();
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (trackSnapshot) loadedPrimary = raw;
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(legacyKey);
        if (raw) break;
      }
    }
  } catch (readErr) {
    console.error('Failed to read primary LaunchPad storage:', readErr);
  }

  // A backup may be older than the primary; never silently resume from it.
  if (!raw) {
    const backup = readRollingBackup();
    let hasBackup = false;
    try { hasBackup = localStorage.getItem(STORAGE_BACKUP_KEY) !== null; } catch { /* handled by save failure */ }
    if (hasBackup) throw new StorageRecoveryError(backup);
  }

  if (!raw) {
    if (trackSnapshot) loadedData = DEFAULT_SEED_DATA;
    return DEFAULT_SEED_DATA;
  }

  try {
    const data = sanitizeAppData(JSON.parse(raw), false);
    if (trackSnapshot) loadedData = data;
    try { setBackupStatus(localStorage.getItem(STORAGE_BACKUP_KEY) === raw ? 'current' : 'stale'); }
    catch { setBackupStatus('stale'); }
    return data;
  } catch {
    throw new StorageRecoveryError(readRollingBackup());
  }
}

/**
 * Validates, repairs, and sanitizes loaded AppData.
 */
export function sanitizeAppData(parsed: any, saveRollingBackup: boolean = true): AppData {
  // Ensure all required properties exist (migration guard)
  const quickNotes: QuickNote[] = Array.isArray(parsed.quickNotes)
    ? parsed.quickNotes.map((n: any, idx: number) => ({
        pendingReflection: n.pendingReflection === true,
        completedOn: n.isDone && n.pendingReflection === true ? savedCompletionDay(n.completedOn) : undefined,
        rewardAlreadyGranted: n.rewardAlreadyGranted === true,
        id: typeof n.id === 'string' && n.id ? n.id : `task-migrated-${idx}-${Date.now()}`,
        text: typeof n.text === 'string' ? n.text : 'Untitled Task',
        description: typeof n.description === 'string' ? n.description : undefined,
        isDone: Boolean(n.isDone),
        createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
        durationMinutes: Number.isFinite(n.durationMinutes) && n.durationMinutes > 0 ? n.durationMinutes : undefined,
        priority: ['urgent', 'high', 'medium', 'low'].includes(n.priority) ? n.priority : 'medium',
        deadline: typeof n.deadline === 'string' && n.deadline ? n.deadline : undefined,
        timeSpentSeconds: typeof n.timeSpentSeconds === 'number' ? n.timeSpentSeconds : undefined,
        actualMinutes: Number.isFinite(n.actualMinutes) && n.actualMinutes > 0 && n.actualMinutes <= 525600 ? n.actualMinutes : undefined,
        partialMinutes: Number.isFinite(n.partialMinutes) && n.partialMinutes > 0 ? n.partialMinutes : undefined,
        pendingProgress: Array.isArray(n.pendingProgress) ? n.pendingProgress.filter((entry: any, index: number, entries: any[]) =>
          entry && typeof entry.id === 'string' && entry.id.length > 0 && savedCompletionDay(entry.date)
          && Number.isSafeInteger(entry.minutes) && entry.minutes > 0 && entry.minutes <= 525600
          && entries.findIndex(other => other?.id === entry.id && other?.date === entry.date) === index)
          .map((entry: any) => ({ id: entry.id, date: entry.date, minutes: entry.minutes })) : undefined,
        attachedUrls: Array.isArray(n.attachedUrls)
          ? n.attachedUrls.filter((u: any) => u && typeof u.url === 'string')
          : [],
        subtasks: Array.isArray(n.subtasks)
          ? n.subtasks.map((s: any, sIdx: number) => ({
              id: typeof s.id === 'string' && s.id ? s.id : `subtask-${sIdx}`,
              text: typeof s.text === 'string' ? s.text : typeof s.title === 'string' ? s.title : 'Procedure step',
              isDone: Boolean(s.isDone),
            }))
          : [],
      }))
    : DEFAULT_SEED_DATA.quickNotes;

  const learnedPreferences = parsed.learnedPreferences || DEFAULT_INITIAL_PREFERENCES;

  const { googleCalendar: _retiredCalendar, ...savedSettings } = parsed.settings || {};
  const settings = {
    ...DEFAULT_SEED_DATA.settings,
    ...savedSettings,
    daySchedule: {
      ...DEFAULT_SEED_DATA.settings.daySchedule,
      ...(parsed.settings?.daySchedule || {}),
    },
    openRouter: {
      ...DEFAULT_SEED_DATA.settings.openRouter,
      ...(parsed.settings?.openRouter || {}),
    },
    activeMode: parsed.settings?.activeMode || 'auto',
  };

  const gamification = parsed.gamification
    ? {
        currentXp: typeof parsed.gamification.currentXp === 'number' ? parsed.gamification.currentXp : (DEFAULT_SEED_DATA.gamification?.currentXp ?? 0),
        currentStreak: typeof parsed.gamification.currentStreak === 'number' ? parsed.gamification.currentStreak : (DEFAULT_SEED_DATA.gamification?.currentStreak ?? 1),
        longestStreak: typeof parsed.gamification.longestStreak === 'number' ? parsed.gamification.longestStreak : (DEFAULT_SEED_DATA.gamification?.longestStreak ?? 1),
        lastActiveDate: typeof parsed.gamification.lastActiveDate === 'string' ? parsed.gamification.lastActiveDate : (DEFAULT_SEED_DATA.gamification?.lastActiveDate ?? new Date().toISOString().split('T')[0]),
        unlockedHeroIds: Array.isArray(parsed.gamification.unlockedHeroIds) ? parsed.gamification.unlockedHeroIds : (DEFAULT_SEED_DATA.gamification?.unlockedHeroIds ?? ['lvl-1-awakening']),
        activeHeroId: typeof parsed.gamification.activeHeroId === 'string' ? parsed.gamification.activeHeroId : (DEFAULT_SEED_DATA.gamification?.activeHeroId ?? 'lvl-1-awakening'),
        lastBackupTimestamp: typeof parsed.gamification.lastBackupTimestamp === 'number' ? parsed.gamification.lastBackupTimestamp : (DEFAULT_SEED_DATA.gamification?.lastBackupTimestamp ?? Date.now()),
      }
    : DEFAULT_SEED_DATA.gamification;

  const growthHistory = typeof parsed.growthHistory === 'object' && parsed.growthHistory !== null ? parsed.growthHistory : {};

  const loadedData: AppData = {
    version: 3,
    castleEconomy: parsed.castleEconomy == null ? undefined : validateCastleEconomy(parsed.castleEconomy),
    folders: [],
    links: [],
    quickNotes,
    scratchpadText: typeof parsed.scratchpadText === 'string' ? parsed.scratchpadText : DEFAULT_SEED_DATA.scratchpadText,
    dailyFocus: {
      date: parsed.dailyFocus?.date || new Date().toISOString().split('T')[0],
      goal: parsed.dailyFocus?.goal === 'Complete Module 3 assignment & review system design notes' ? '' : (parsed.dailyFocus?.goal || ''),
      isCompleted: Boolean(parsed.dailyFocus?.isCompleted),
      durationMinutes: parsed.dailyFocus?.goal === 'Complete Module 3 assignment & review system design notes' ? 0 : (parsed.dailyFocus?.durationMinutes || 0),
    },
    learnedPreferences,
    settings,
    gamification,
    growthHistory,
    reflections: Array.isArray(parsed.reflections) ? parsed.reflections.filter((entry: any) =>
      entry && typeof entry.date === 'string'
      && Array.isArray(entry.questions) && entry.questions.every((value: unknown) => typeof value === 'string')
      && Array.isArray(entry.answers) && entry.answers.every((value: unknown) => typeof value === 'string')
      && Array.isArray(entry.taskTitles) && entry.taskTitles.every((value: unknown) => typeof value === 'string')
    ).map(({ date, questions, answers, taskTitles }: NonNullable<AppData["reflections"]>[number]) => ({ date, questions, answers, taskTitles })) : [],
  };

  // Keep a fresh rolling backup of valid data
  if (saveRollingBackup && typeof localStorage !== 'undefined' && loadedData.quickNotes.length > 0) {
    try {
      localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(loadedData));
    } catch {
      // ignore backup write failure
    }
  }

  return loadedData;
}

/**
 * Saves AppData to localStorage with automatic QuotaExceeded recovery
 * and rolling backup creation.
 */
export function saveAppData(data: AppData): boolean {
  if (typeof localStorage === 'undefined') { setPrimarySaveStatus('failed'); return false; }

  // The primary write is authoritative; a quota failure updating the backup
  // must not turn an already successful primary save into a failed save.
  const updateBackup = (serialized: string) => {
    try {
      const snapshot = JSON.parse(serialized);
      if (snapshot.castleEconomy != null) validateCastleEconomy(snapshot.castleEconomy);
      localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
      setBackupStatus('current');
    } catch (error) {
      setBackupStatus('stale');
      console.warn('Could not update the rolling backup; it may contain older data.', error);
    }
  };

  try {
    const serialized = JSON.stringify(data);
    const current = localStorage.getItem(STORAGE_KEY);
    if (current === serialized) {
      loadedPrimary = current;
      loadedData = data;
      setPrimarySaveStatus('saved');
      if (backupStatus === 'stale') updateBackup(serialized);
      return true;
    }
    if (loadedPrimary !== undefined && current !== loadedPrimary) {
      // Mount-time autosave must not manufacture a recovery draft in a tab
      // that has never changed the snapshot it loaded.
      if (data === loadedData) return false;
      return saveLocalConflict(data);
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    loadedPrimary = serialized;
    loadedData = data;
    setPrimarySaveStatus('saved');
    updateBackup(serialized);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('Storage quota exceeded. Pruning ephemeral cache and retrying...');
      try {
        const pruned = pruneExpendableData(data);
        const serialized = JSON.stringify(pruned);
        localStorage.setItem(STORAGE_KEY, serialized);
        loadedPrimary = serialized;
        loadedData = data;
        setPrimarySaveStatus('saved');
        updateBackup(serialized);
        console.info('Successfully saved after pruning ephemeral data.');
        return true;
      } catch (retryErr) {
        console.error('Critical: Storage quota still exceeded after pruning cache:', retryErr);
        setPrimarySaveStatus('failed');
        return false;
      }
    }
    console.error('Failed to save LaunchPad data to localStorage:', error);
    setPrimarySaveStatus('failed');
    return false;
  }
}

export function saveAppDataWithLock(data: AppData): Promise<boolean> {
  return withStorageLock(STORAGE_KEY, () => saveAppData(data)).catch(() => saveLocalConflict(data));
}

/**
 * Debounced auto-save mechanism for high-frequency state changes (typing, timer ticks).
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDataToSave: AppData | null = null;

function cancelPendingAppDataSave(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingDataToSave = null;
}

export function preserveAppDataOnLeave(data: AppData): void {
  cancelPendingAppDataSave();
  // Locks may not execute during unload. A synchronous save still checks its
  // baseline and preserves a stale tab's branch in an isolated draft.
  saveAppData(data);
}

export function saveAppDataDebounced(data: AppData, delayMs: number = 250): void {
  pendingDataToSave = data;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const candidate = pendingDataToSave;
    if (!candidate) return;
    void withStorageLock(STORAGE_KEY, () => {
      if (pendingDataToSave !== candidate) return;
      pendingDataToSave = null;
      saveAppData(candidate);
    }).catch(() => {
      if (pendingDataToSave === candidate) {
        pendingDataToSave = null;
        saveLocalConflict(candidate);
      }
    });
  }, delayMs);
}

/**
 * Flushes any pending debounced save immediately (e.g. before unload).
 */
export function flushAppDataSave(): void {
  if (pendingDataToSave) preserveAppDataOnLeave(pendingDataToSave);
}

export function flushAppDataSaveWithLock(): Promise<boolean> {
  const data = pendingDataToSave;
  cancelPendingAppDataSave();
  return data ? saveAppDataWithLock(data) : Promise.resolve(primarySaveStatus === 'saved');
}

// Wire beforeunload listener to flush pending saves on page exit
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushAppDataSave();
  });
}

/**
 * Returns diagnostic storage metrics including used bytes and quota percentage.
 */
export function getStorageMetrics(): StorageMetrics {
  let usedBytes = 0;
  let hasBackup = false;

  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          usedBytes += (key.length + val.length) * 2; // UTF-16 characters = 2 bytes
        }
      }
      hasBackup = Boolean(localStorage.getItem(STORAGE_BACKUP_KEY));
    } catch {
      // ignore
    }
  }

  const estimatedQuotaBytes = 5 * 1024 * 1024; // typical browser limit ~5MB
  const quotaUsagePercent = Math.min(100, Math.round((usedBytes / estimatedQuotaBytes) * 100));

  let usedFormatted = `${Math.round(usedBytes / 1024)} KB`;
  if (usedBytes >= 1024 * 1024) {
    usedFormatted = `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Count active items
  let folderCount = 0;
  let linkCount = 0;
  let taskCount = 0;

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      folderCount = Array.isArray(parsed?.folders) ? parsed.folders.length : 0;
      linkCount = Array.isArray(parsed?.links) ? parsed.links.length : 0;
      taskCount = Array.isArray(parsed?.quickNotes) ? parsed.quickNotes.length : 0;
    }
  } catch {
    // ignore
  }

  return {
    usedBytes,
    usedFormatted,
    estimatedQuotaBytes,
    quotaUsagePercent,
    folderCount,
    linkCount,
    taskCount,
    hasBackup,
  };
}

export function exportDataAsJson(data: AppData): void {
  const exportPayload: AppData = {
    ...data,
    gamification: data.gamification || DEFAULT_SEED_DATA.gamification,
    growthHistory: data.growthHistory || {},
  };
  const json = JSON.stringify(exportPayload, null, 2);
  const objectUrl = typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }))
    : undefined;
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', objectUrl ?? `data:application/json;charset=utf-8,${encodeURIComponent(json)}`);
  downloadAnchor.setAttribute('download', `launchpad-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  try { downloadAnchor.click(); }
  finally {
    downloadAnchor.remove();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

/**
 * Deeply validates, repairs, and imports backup JSON data.
 */
export function importDataFromJson(jsonStr: string, saveRollingBackup = true): AppData {
  if (typeof jsonStr !== 'string' || !jsonStr.trim()) {
    throw new Error('Backup file is empty.');
  }

  if (jsonStr.length > MAX_IMPORT_SIZE_BYTES) {
    throw new Error(`Backup file is too large (${(jsonStr.length / 1024 / 1024).toFixed(1)} MB). Limit is 15 MB.`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON format in backup file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup structure: root payload must be an object.');
  }

  // Accept legacy backups with folders/links as well as v3 backups
  const hasNotes = Array.isArray(parsed.quickNotes);
  const hasSettings = parsed.settings && typeof parsed.settings === 'object';
  const hasLegacy = Array.isArray(parsed.folders) || Array.isArray(parsed.links);
  if (!hasNotes && !hasSettings && !hasLegacy && parsed.version === undefined) {
    throw new Error('Invalid LaunchPad backup file format. Must contain valid LaunchPad state.');
  }

  // Use sanitizeAppData to apply full validation, ID repair, and migration rules
  const sanitized = sanitizeAppData(parsed, saveRollingBackup);
  return sanitized;
}

/**
 * Clears all user data from local storage while resetting to a clean empty baseline.
 * Also cleans rolling backups, legacy keys, and timer storage to prevent resurrection of deleted items.
 */
export function clearAllLocalData(persist = true): AppData {
  const cleared: AppData = {
    ...DEFAULT_SEED_DATA,
    version: 3,
    folders: [],
    links: [],
    dailyFocus: {
      date: new Date().toISOString().split('T')[0],
      goal: '',
      isCompleted: false,
      durationMinutes: 0,
    },
    learnedPreferences: DEFAULT_INITIAL_PREFERENCES,
    growthHistory: {},
    scratchpadText: '',
    quickNotes: [],
    reflections: [],
    gamification: {
      currentXp: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      unlockedHeroIds: ['lvl-1-awakening'],
      activeHeroId: 'lvl-1-awakening',
      lastBackupTimestamp: Date.now(),
    },
  };

  if (persist && typeof localStorage !== 'undefined') applyLocalClear(cleared);
  return cleared;
}

function applyLocalClear(cleared: AppData): void {
  if (loadedPrimary !== undefined && localStorage.getItem(STORAGE_KEY) !== loadedPrimary) {
    throw new Error('Another tab saved a newer copy. Export your changes, then reload before clearing this device.');
  }
  if (!saveAppData(cleared)) throw new Error('This copy could not be cleared safely. Reload LaunchPAD and try again.');
  cancelPendingAppDataSave();
  try {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('launchpad_app_data_corrupt_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error('Failed to remove legacy data from storage:', err);
  }
}

export function clearAllLocalDataWithLock(cleared: AppData = clearAllLocalData(false)): Promise<void> {
  return withStorageLock(STORAGE_KEY, () => applyLocalClear(cleared));
}
