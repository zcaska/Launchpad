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
  /** Manual sidebar ordering. Absent = fall back to createdAt (legacy links). */
  order?: number;
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
  parentId?: string; // ID of parent folder if this is a subfolder
  isHidden?: boolean; // When true, folder is hidden from sidebar and standard views
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

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
  description?: string;
  isDone: boolean;
  createdAt: number;
  durationMinutes?: number; // e.g. 15, 30, 45, 60, 90, 120
  deadline?: string; // Optional HH:MM or date string
  priority?: TaskPriority;
  attachedUrls?: TaskUrl[];
  subtasks?: Subtask[];
  source?: 'local' | 'google_calendar';
  eventId?: string; // Google Calendar event ID if synced
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

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  startMs: number;   // Epoch timestamp in ms
  endMs: number;     // Epoch timestamp in ms
  durationMinutes: number;
  isAllDay: boolean;
  transparency?: 'opaque' | 'transparent'; // opaque = Busy (default), transparent = Free
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  location?: string;
  colorId?: string;
}

export interface GoogleCalendarConfig {
  enabled: boolean;
  clientId: string;
  calendarId: string; // default: 'primary'
  syncIntervalMinutes: number; // default: 5
  lastSyncedAt?: number; // Epoch timestamp of last successful sync
  userEmail?: string; // Connected Google account email for login_hint bypass
}

export interface CalendarScheduleSummary {
  events: CalendarEventItem[];
  totalBusyMinutesToday: number;
  remainingBusyMinutesToday: number;
  nextEvent?: CalendarEventItem;
  minutesUntilNextEvent?: number;
  currentEvent?: CalendarEventItem;
  isTokenExpired?: boolean;
  syncError?: string;
}

export interface DailyGrowthRecord {
  tasksCompleted: number;
  focusMinutes: number;
  xpEarned: number;
  dailyGoalCompleted: boolean;
}

export interface HeroLevelDef {
  id: string;
  level: number;
  name: string;
  title: string;
  category: 'anime' | 'fiction' | 'real_world';
  minStreakDays: number;
  minLifetimeXp: number;
  avatarIcon: string;
  gradient: string;
  realLifeMeaning: string;
  quote: string;
}

export interface GamificationState {
  currentXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // 'YYYY-MM-DD'
  unlockedHeroIds: string[];
  activeHeroId: string;
  lastBackupTimestamp: number;
}

export interface AppData {
  version: number;
  folders: Folder[];
  links: LinkItem[];
  quickNotes: QuickNote[];
  scratchpadText: string;
  dailyFocus: DailyFocus;
  learnedPreferences: LearnedPreferences;
  calendarEvents?: CalendarEventItem[];
  gamification: GamificationState;
  growthHistory: Record<string, DailyGrowthRecord>;
  settings: {
    theme: ThemeMode;
    clockFormat: '12h' | '24h';
    showQuotes: boolean;
    openInNewTab: boolean;
    compactView: boolean;
    daySchedule: DaySchedule;
    openRouter: OpenRouterConfig;
    activeMode: 'auto' | 'work' | 'free';
    googleCalendar?: GoogleCalendarConfig;
  };
}

export type BookmarkClassificationConfidence = 'high' | 'medium' | 'low';

export interface BookmarkClassificationRule {
  id?: string;
  pattern: string;
  type: 'domain' | 'keyword' | 'folder';
  folderId: string;
  tag?: string;
  confidence?: BookmarkClassificationConfidence;
}

export interface BookmarkClassificationResult {
  folderId: string;
  tags: string[];
  matchedRule: string;
  confidence: BookmarkClassificationConfidence;
}

export interface ParsedBookmark {
  url: string;
  title: string;
  folderId: string;
  tags: string[];
  sourceFolder?: string;
  folderHierarchy?: string[];
  addDate?: number;
  matchedRule?: string;
  confidence?: BookmarkClassificationConfidence;
  isDuplicate?: boolean;
  selected?: boolean;
}

export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  directLinks: LinkItem[];
  totalLinkCount: number;
  level: number; // 0 (root) up to 4 (5th level)
}

export interface ImportBookmarkResult {
  bookmarks: ParsedBookmark[];
  totalCount: number;
  newCount: number;
  duplicateCount: number;
  foldersDetected?: string[];
  createdFolders?: Folder[];
  categoryDistribution?: Record<string, number>;
}
