import { AppData } from '../types';
import { DEFAULT_SEED_DATA, DEFAULT_INITIAL_PREFERENCES } from '../data/seedData';

const STORAGE_KEY = 'launchpad_app_data_v2';

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('launchpad_app_data_v1');
    if (!raw) {
      saveAppData(DEFAULT_SEED_DATA);
      return DEFAULT_SEED_DATA;
    }
    const parsed = JSON.parse(raw);
    
    // Ensure all required properties exist (migration guard)
    const quickNotes = Array.isArray(parsed.quickNotes)
      ? parsed.quickNotes.map((n: any) => ({
          ...n,
          durationMinutes: n.durationMinutes || 30,
          priority: n.priority || 'medium',
          deadline: n.deadline || undefined,
          attachedUrls: Array.isArray(n.attachedUrls) ? n.attachedUrls : [],
          subtasks: Array.isArray(n.subtasks) ? n.subtasks : [],
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

    const loadedData: AppData = {
      version: 2,
      folders: Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_SEED_DATA.folders,
      links: Array.isArray(parsed.links) ? parsed.links : DEFAULT_SEED_DATA.links,
      quickNotes,
      calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
      scratchpadText: typeof parsed.scratchpadText === 'string' ? parsed.scratchpadText : DEFAULT_SEED_DATA.scratchpadText,
      dailyFocus: {
        date: parsed.dailyFocus?.date || new Date().toISOString().split('T')[0],
        goal: parsed.dailyFocus?.goal || '',
        isCompleted: Boolean(parsed.dailyFocus?.isCompleted),
        durationMinutes: parsed.dailyFocus?.durationMinutes || 45,
      },
      learnedPreferences,
      settings,
      gamification,
      growthHistory,
    };

    return loadedData;
  } catch (error) {
    console.error('Failed to read LaunchPad data from localStorage:', error);
    return DEFAULT_SEED_DATA;
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save LaunchPad data to localStorage:', error);
  }
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

export function importDataFromJson(jsonStr: string): AppData {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.folders) || !Array.isArray(parsed.links)) {
    throw new Error('Invalid LaunchPad backup file format. Must contain folders and links.');
  }

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

  return {
    version: 2,
    folders: parsed.folders,
    links: parsed.links,
    quickNotes: Array.isArray(parsed.quickNotes) ? parsed.quickNotes : [],
    calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
    scratchpadText: typeof parsed.scratchpadText === 'string' ? parsed.scratchpadText : '',
    dailyFocus: parsed.dailyFocus || {
      date: new Date().toISOString().split('T')[0],
      goal: '',
      isCompleted: false,
      durationMinutes: 45,
    },
    learnedPreferences: parsed.learnedPreferences || DEFAULT_INITIAL_PREFERENCES,
    settings: {
      ...DEFAULT_SEED_DATA.settings,
      ...(parsed.settings || {}),
    },
    gamification,
    growthHistory,
  };
}
