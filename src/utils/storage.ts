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
      activeMode: parsed.settings?.activeMode || 'auto',
    };

    const loadedData: AppData = {
      version: 2,
      folders: Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_SEED_DATA.folders,
      links: Array.isArray(parsed.links) ? parsed.links : DEFAULT_SEED_DATA.links,
      quickNotes,
      scratchpadText: typeof parsed.scratchpadText === 'string' ? parsed.scratchpadText : DEFAULT_SEED_DATA.scratchpadText,
      dailyFocus: {
        date: parsed.dailyFocus?.date || new Date().toISOString().split('T')[0],
        goal: parsed.dailyFocus?.goal || '',
        isCompleted: Boolean(parsed.dailyFocus?.isCompleted),
        durationMinutes: parsed.dailyFocus?.durationMinutes || 45,
      },
      learnedPreferences,
      settings,
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
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
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
  return {
    version: 2,
    folders: parsed.folders,
    links: parsed.links,
    quickNotes: Array.isArray(parsed.quickNotes) ? parsed.quickNotes : [],
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
  };
}
