import { AppData, Folder, LinkItem, QuickNote } from '../types';
import { DEFAULT_SEED_DATA, DEFAULT_INITIAL_PREFERENCES } from '../data/seedData';

export const STORAGE_KEY = 'launchpad_app_data_v3';
export const STORAGE_BACKUP_KEY = 'launchpad_app_data_backup_v3';
const LEGACY_STORAGE_KEYS = ['launchpad_app_data_v2', 'launchpad_app_data_v1', 'launchpad_app_data_backup'];
const MAX_IMPORT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB ceiling for safety

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
    // Ephemeral calendar events can be re-fetched on the next sync
    calendarEvents: [],
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
export function loadAppData(): AppData {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SEED_DATA;
  }

  let raw: string | null = null;
  let isFromBackup = false;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(legacyKey);
        if (raw) break;
      }
    }
  } catch (readErr) {
    console.error('Failed to read primary LaunchPad storage:', readErr);
  }

  // If primary is missing, try reading backup snapshot
  if (!raw) {
    try {
      raw = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (raw) isFromBackup = true;
    } catch {
      // ignore
    }
  }

  if (!raw) {
    saveAppData(DEFAULT_SEED_DATA);
    return DEFAULT_SEED_DATA;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    console.error('Corruption detected in LaunchPad primary storage JSON:', parseErr);
    // Preserve corrupt payload for emergency recovery before fallback
    try {
      localStorage.setItem(`launchpad_app_data_corrupt_${Date.now()}`, raw);
    } catch {
      // ignore
    }

    // Try fallback to backup
    try {
      const backupRaw = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (backupRaw) {
        parsed = JSON.parse(backupRaw);
        console.warn('Successfully recovered LaunchPad state from rolling backup.');
      }
    } catch {
      // ignore
    }

    if (!parsed) {
      return DEFAULT_SEED_DATA;
    }
  }

  return sanitizeAppData(parsed, isFromBackup);
}

/**
 * Validates, repairs, and sanitizes loaded AppData.
 */
export function sanitizeAppData(parsed: any, saveRollingBackup: boolean = true): AppData {
  // Ensure all required properties exist (migration guard)
  const quickNotes: QuickNote[] = Array.isArray(parsed.quickNotes)
    ? parsed.quickNotes.map((n: any, idx: number) => ({
        id: typeof n.id === 'string' && n.id ? n.id : `task-migrated-${idx}-${Date.now()}`,
        text: typeof n.text === 'string' ? n.text : 'Untitled Task',
        description: typeof n.description === 'string' ? n.description : undefined,
        isDone: Boolean(n.isDone),
        createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
        durationMinutes: typeof n.durationMinutes === 'number' && n.durationMinutes > 0 ? n.durationMinutes : 30,
        priority: ['urgent', 'high', 'medium', 'low'].includes(n.priority) ? n.priority : 'medium',
        deadline: typeof n.deadline === 'string' && n.deadline ? n.deadline : undefined,
        source: n.source === 'google_calendar' ? ('google_calendar' as const) : undefined,
        eventId: typeof n.eventId === 'string' ? n.eventId : undefined,
        timeSpentSeconds: typeof n.timeSpentSeconds === 'number' ? n.timeSpentSeconds : undefined,
        attachedUrls: Array.isArray(n.attachedUrls)
          ? n.attachedUrls.filter((u: any) => u && typeof u.url === 'string')
          : [],
        subtasks: Array.isArray(n.subtasks)
          ? n.subtasks.map((s: any, sIdx: number) => ({
              id: typeof s.id === 'string' && s.id ? s.id : `subtask-${sIdx}`,
              title: typeof s.title === 'string' ? s.title : 'Procedure step',
              isDone: Boolean(s.isDone),
            }))
          : [],
      }))
    : DEFAULT_SEED_DATA.quickNotes;

  const learnedPreferences = parsed.learnedPreferences || DEFAULT_INITIAL_PREFERENCES;

  const settings = {
    ...DEFAULT_SEED_DATA.settings,
    ...(parsed.settings || {}),
    daySchedule: {
      ...DEFAULT_SEED_DATA.settings.daySchedule,
      ...(parsed.settings?.daySchedule || {}),
    },
    openRouter: {
      ...DEFAULT_SEED_DATA.settings.openRouter,
      ...(parsed.settings?.openRouter || {}),
    },
    googleCalendar: {
      ...DEFAULT_SEED_DATA.settings.googleCalendar,
      ...(parsed.settings?.googleCalendar || {}),
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

  // Validate and sanitize folders
  const rawFolders = Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_SEED_DATA.folders;
  const folders: Folder[] = rawFolders.map((f: any, idx: number) => ({
    id: typeof f.id === 'string' && f.id ? f.id : `folder-${idx}-${Date.now()}`,
    name: typeof f.name === 'string' && f.name.trim() ? f.name.trim() : 'Unnamed Folder',
    icon: typeof f.icon === 'string' ? f.icon : 'folder',
    color: typeof f.color === 'string' ? f.color : 'amber',
    isCustom: Boolean(f.isCustom),
    parentId: typeof f.parentId === 'string' ? f.parentId : undefined,
    isHidden: Boolean(f.isHidden),
    order: typeof f.order === 'number' ? f.order : idx,
  }));

  // Validate and sanitize links
  const rawLinks = Array.isArray(parsed.links) ? parsed.links : DEFAULT_SEED_DATA.links;
  const validFolderIds = new Set(folders.map((f) => f.id));
  const defaultFolderId = folders[0]?.id || 'f-general';

  const links: LinkItem[] = rawLinks
    .filter((l: any) => l && typeof l.url === 'string' && l.url.trim())
    .map((l: any, idx: number) => ({
      id: typeof l.id === 'string' && l.id ? l.id : `link-${idx}-${Date.now()}`,
      title: typeof l.title === 'string' && l.title.trim() ? l.title.trim() : (l.url.replace(/^https?:\/\//, '').split('/')[0] || 'Saved Link'),
      url: l.url.trim(),
      folderId: validFolderIds.has(l.folderId) ? l.folderId : defaultFolderId,
      isFavorite: Boolean(l.isFavorite),
      tags: Array.isArray(l.tags) ? l.tags.filter((t: any) => typeof t === 'string' && t.trim()) : [],
      createdAt: typeof l.createdAt === 'number' ? l.createdAt : Date.now(),
      clickCount: typeof l.clickCount === 'number' ? l.clickCount : 0,
      customIcon: typeof l.customIcon === 'string' ? l.customIcon : undefined,
    }));

  const loadedData: AppData = {
    version: 3,
    folders: [],
    links: [],
    quickNotes,
    calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
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
  };

  // Keep a fresh rolling backup of valid data
  if (saveRollingBackup && typeof localStorage !== 'undefined' && loadedData.links.length > 0) {
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
  if (typeof localStorage === 'undefined') return false;

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('Storage quota exceeded. Pruning ephemeral cache and retrying...');
      try {
        const pruned = pruneExpendableData(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        console.info('Successfully saved after pruning ephemeral data.');
        return true;
      } catch (retryErr) {
        console.error('Critical: Storage quota still exceeded after pruning cache:', retryErr);
        return false;
      }
    }
    console.error('Failed to save LaunchPad data to localStorage:', error);
    return false;
  }
}

/**
 * Debounced auto-save mechanism for high-frequency state changes (typing, timer ticks).
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDataToSave: AppData | null = null;

export function saveAppDataDebounced(data: AppData, delayMs: number = 250): void {
  pendingDataToSave = data;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    if (pendingDataToSave) {
      saveAppData(pendingDataToSave);
      pendingDataToSave = null;
    }
    debounceTimer = null;
  }, delayMs);
}

/**
 * Flushes any pending debounced save immediately (e.g. before unload).
 */
export function flushAppDataSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingDataToSave) {
    saveAppData(pendingDataToSave);
    pendingDataToSave = null;
  }
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
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `launchpad-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Deeply validates, repairs, and imports backup JSON data.
 */
export function importDataFromJson(jsonStr: string): AppData {
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
  const sanitized = sanitizeAppData(parsed, true);
  return sanitized;
}
