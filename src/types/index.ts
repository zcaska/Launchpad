export type FolderColor = 
  | 'forest'
  | 'emerald'
  | 'slate'
  | 'amber'
  | 'sky'
  | 'indigo'
  | 'rose'
  | 'purple';

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  folderId: string;
  isFavorite: boolean;
  tags: string[];
  createdAt: number;
  lastOpenedAt?: number;
  clickCount?: number;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  icon: string; // Lucide icon name
  color: FolderColor;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  order: number;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskUrl {
  id: string;
  title?: string;
  url: string;
}

export interface Subtask {
  id: string;
  text: string;
  isDone: boolean;
}

export interface QuickNote {
  id: string;
  text: string;
  isDone: boolean;
  createdAt: number;
  durationMinutes?: number; // e.g. 15, 30, 45, 60, 90, 120
  deadline?: string; // Optional HH:MM or date string
  priority?: TaskPriority;
  attachedUrls?: TaskUrl[];
  subtasks?: Subtask[];
}

export interface DailyFocus {
  date: string; // YYYY-MM-DD
  goal: string;
  isCompleted: boolean;
  durationMinutes?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type TimeOfDayBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DaySchedule {
  startHour: number; // e.g. 9 (9:00 AM)
  endHour: number;   // e.g. 22 (10:00 PM)
  workDays: number[]; // e.g. [1,2,3,4,5]
}

export interface OpenRouterConfig {
  apiKey?: string;
  model: string;
  enabled: boolean;
  dailyLimit: number;
  requestsToday: number;
  lastRequestDate?: string;
}

export interface LearnedPreferences {
  categoryWeights: Record<string, number>; // folderId / category -> weight (-5 to +10)
  tagWeights: Record<string, number>;      // tag -> weight (-5 to +10)
  timeOfDayAffinity: Record<TimeOfDayBucket, Record<string, number>>; // bucket -> category -> weight
  approvalsCount: number;
  rejectionsCount: number;
  recentRejections: Array<{ id: string; timestamp: number }>;
}

export interface RecommendationCandidate {
  id: string;
  title: string;
  url: string;
  description?: string;
  folderName: string;
  folderId?: string;
  tags: string[];
  durationEstimateMinutes: number;
  sourceType: 'bookmark' | 'reading_list' | 'micro_quest' | 'ai_web';
  rationale: string;
  score?: number;
}

export interface AppData {
  version: number;
  folders: Folder[];
  links: LinkItem[];
  quickNotes: QuickNote[];
  scratchpadText: string;
  dailyFocus: DailyFocus;
  learnedPreferences: LearnedPreferences;
  settings: {
    theme: ThemeMode;
    clockFormat: '12h' | '24h';
    showQuotes: boolean;
    openInNewTab: boolean;
    compactView: boolean;
    daySchedule: DaySchedule;
    openRouter: OpenRouterConfig;
    activeMode: 'auto' | 'work' | 'free';
  };
}
