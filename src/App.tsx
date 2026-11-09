import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X as CloseIcon,
  Lightbulb,
  IconContext
} from '@phosphor-icons/react';
import { 
  AppData, 
  ThemeMode,
  RecommendationCandidate,
  PetSettings,
  QuickNote,
} from './types';
import { loadAppData, saveAppData, saveAppDataDebounced, flushAppDataSave, exportDataAsJson, importDataFromJson } from './utils/storage';
import { ACTIVE_CLOUD_KEY, cloudData, openCloudWorkspace, readCloudProjects, type CloudWorkspace } from './services/cloudWorkspace';
import { useCloudSync } from './services/useCloudSync';
import { recordTaskCompletion } from './utils/gamification';
import { DEFAULT_SEED_DATA } from './data/seedData';
import { Header } from './components/Header/Header';
import { BackupReminderToast } from './components/Layout/BackupReminderToast';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TaskClearReflection } from './components/Dashboard/TaskClearReflection';
import { ConfettiOverlay } from './components/Dashboard/ConfettiOverlay';
import { PrimaryFocusCard } from './components/Dashboard/PrimaryFocusCard';
import { SmartSuggestionCard } from './components/Dashboard/SmartSuggestionCard';
import LaunchpadPet from './components/Pet/LaunchpadPet';
import { usePetController } from './components/Pet/usePetController';
import { petTierForStreak } from './utils/petState';
import { CommitmentRadarWidget } from './components/Dashboard/CommitmentRadarWidget';
import TimeRadarWidget from './components/Dashboard/TimeRadarWidget';
import { toggleTaskInList, toggleSubtaskInList } from './utils/taskUrgency';
import {
  FocusTimerState,
  loadFocusTimer,
  saveFocusTimer,
  elapsedSeconds,
} from './utils/focusTimer';
import { QuickNotesWidget } from './components/QuickNotes/QuickNotesWidget';
import { QuickAddTaskModal } from './components/Modals/QuickAddTaskModal';

// Code-split heavy screens and modals into on-demand bundles for 0ms initial load
const GrowthMasteryScreen = lazy(() =>
  import('./components/Growth/GrowthMasteryScreen').then((m) => ({ default: m.GrowthMasteryScreen }))
);
const TaskManagementScreen = lazy(() =>
  import('./components/Tasks/TaskManagementScreen').then((m) => ({ default: m.TaskManagementScreen }))
);
const SettingsModal = lazy(() =>
  import('./components/Modals/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);

import { calculateCalendarScheduleSummary, syncCalendarEventsToQuickNotes } from './utils/calendarSchedule';
import { 
  fetchTodayGoogleEvents, 
  getInMemoryGoogleToken, 
  isGoogleTokenExpired,
  requestGoogleAccessToken,
  GoogleAuthError
} from './services/googleCalendarService';
import { 
  calculateTaskLoad, 
  getTimeOfDayBucket,
  calculateDayTimeRemaining,
  calculateBuffer
} from './utils/timeBudget';
import { 
  generateCandidatePool, 
  getRankedRecommendations, 
  recordApproval,
  recordRejection 
} from './utils/recommender';
import { 
  pageTransitionVariants, 
  drawerVariants 
} from './utils/motion';
import { useTickTickSyncManager } from './services/ticktickSyncManager';

export function App({ workspace = null, onSwitchWorkspace, cloudNotice }: {
  workspace?: CloudWorkspace | null;
  onSwitchWorkspace?: (workspace: CloudWorkspace | null) => void;
  cloudNotice?: string;
} = {}) {
  const [appData, setAppData] = useState<AppData>(() => workspace?.initial.data ?? loadAppData());
  const workspaceScope = workspace ? `${workspace.project.url}:${workspace.userId}` : undefined;
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'growth'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const isSyncingCalendarRef = useRef(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  const gcalConfigRef = useRef(appData.settings.googleCalendar);
  useEffect(() => {
    gcalConfigRef.current = appData.settings.googleCalendar;
  }, [appData.settings.googleCalendar]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSparkIdeaModalOpen, setIsSparkIdeaModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isBackupDismissed, setIsBackupDismissed] = useState(false);
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string | null>(null);
  const [editingTaskIdForScreen, setEditingTaskIdForScreen] = useState<string | null>(null);

  // --- TickTick Two-Way Sync Hook --------------------------------------
  const setSyncedNotes = useCallback<Parameters<typeof useTickTickSyncManager>[1]>((updatedNotesOrUpdater) => {
    setAppData((prev) => ({
      ...prev,
      quickNotes: typeof updatedNotesOrUpdater === 'function'
        ? updatedNotesOrUpdater(prev.quickNotes)
        : updatedNotesOrUpdater,
    }));
  }, []);
  const tickTickSync = useTickTickSyncManager(appData.quickNotes, setSyncedNotes, Boolean(workspace));

  // Live clock tick for time radar calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Sync state changes to localStorage debounced
  useEffect(() => {
    if (!workspace) saveAppDataDebounced(appData);
  }, [appData, workspace]);

  // Apply dark/light theme classes to <html>
  useEffect(() => {
    const root = document.documentElement;
    const theme = appData.settings.theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [appData.settings.theme]);

  // Re-check system theme on OS changes when in 'system' mode
  useEffect(() => {
    if (appData.settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [appData.settings.theme]);

  // --- Focus Timer State -----------------------------------------------
  const [focusTimer, setFocusTimer] = useState<FocusTimerState | null>(() => loadFocusTimer(workspaceScope));

  // Save timer whenever state changes
  useEffect(() => {
    saveFocusTimer(focusTimer, workspaceScope);
  }, [focusTimer, workspaceScope]);

  const handleTimerStart = useCallback((taskId: string) => {
    setFocusTimer({
      taskId,
      startedAt: Date.now(),
      running: true,
      baseSeconds: 0,
    });
  }, []);

  const handleTimerPause = useCallback(() => {
    setFocusTimer((prev) => {
      if (!prev || !prev.running) return prev;
      return {
        ...prev,
        running: false,
        startedAt: Date.now(),
        baseSeconds: elapsedSeconds(prev),
      };
    });
  }, []);

  const handleTimerResume = useCallback(() => {
    setFocusTimer((prev) => {
      if (!prev || prev.running) return prev;
      return {
        ...prev,
        running: true,
        startedAt: Date.now(),
      };
    });
  }, []);

  const handleTimerEnd = useCallback(() => {
    if (!focusTimer) return;
    const totalSecs = elapsedSeconds(focusTimer);
    if (totalSecs > 0) {
      setAppData((prev) => ({
        ...prev,
        quickNotes: prev.quickNotes.map((n) =>
          n.id === focusTimer.taskId
            ? { ...n, timeSpentSeconds: (n.timeSpentSeconds || 0) + totalSecs }
            : n
        ),
      }));
    }
    setFocusTimer(null);
  }, [focusTimer]);

  // --- Unified Task & Subtask Completion Handlers ----------------------
  const handleToggleTaskWithTimer = useCallback((taskId: string) => {
    const targetTask = appData.quickNotes.find((n) => n.id === taskId);
    const becomingDone = targetTask ? !targetTask.isDone : false;

    if (becomingDone && focusTimer && focusTimer.taskId === taskId) {
      const totalSecs = elapsedSeconds(focusTimer);
      if (totalSecs > 0) {
        setAppData((prev) => ({
          ...prev,
          quickNotes: prev.quickNotes.map((n) =>
            n.id === taskId ? { ...n, timeSpentSeconds: (n.timeSpentSeconds || 0) + totalSecs } : n
          ),
        }));
      }
      setFocusTimer(null);
    }

    setAppData((prev) => {
      const { updatedTasks } = toggleTaskInList(prev.quickNotes, taskId);
      return { ...prev, quickNotes: updatedTasks.map((task) => task.id === taskId
        ? { ...task, pendingReflection: task.isDone } : task) };
    });

    if (targetTask && !becomingDone && !targetTask.pendingReflection) {
      tickTickSync.pushTaskToggle({ ...targetTask, isDone: becomingDone });
    }

    if (selectedFocusTaskId === taskId && becomingDone) {
      setSelectedFocusTaskId(null);
    }
  }, [appData.quickNotes, focusTimer, selectedFocusTaskId, tickTickSync]);

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    if (focusTimer?.taskId === taskId) {
      const task = appData.quickNotes.find((note) => note.id === taskId);
      if (task && toggleSubtaskInList([task], taskId, subtaskId).parentBecameDone) {
        handleTimerEnd();
      }
    }

    setAppData((prev) => {
      const { updatedTasks, parentBecameDone } = toggleSubtaskInList(prev.quickNotes, taskId, subtaskId);
      return { ...prev, quickNotes: updatedTasks.map((task) => task.id === taskId
        ? { ...task, pendingReflection: parentBecameDone ? true : task.isDone && task.pendingReflection } : task) };
    });
  }, [appData.quickNotes, focusTimer, handleTimerEnd]);

  // --- Launchpad Pet Controller ----------------------------------------
  const petEnabled = appData.settings.pet?.enabled ?? true;
  const petPaused = appData.settings.pet?.paused ?? false;
  const streakCount = appData.gamification?.currentStreak ?? 0;
  const petTier = useMemo(() => petTierForStreak(streakCount), [streakCount]);

  const handleTogglePetPaused = useCallback(() => {
    setAppData((prev) => {
      const current = prev.settings.pet ?? {};
      const nextPet: PetSettings = { ...current, paused: !current.paused };
      return {
        ...prev,
        settings: { ...prev.settings, pet: nextPet },
      };
    });
  }, []);

  const pendingTaskCount = useMemo(
    () => appData.quickNotes.filter((t) => !t.isDone).length,
    [appData.quickNotes]
  );

  const prevPendingCountRef = useRef(pendingTaskCount);
  const pet = usePetController({
    enabled: petEnabled,
    paused: petPaused,
    focusActive: Boolean(focusTimer?.running),
    pendingCount: pendingTaskCount,
    uiActive: isSettingsModalOpen || isSparkIdeaModalOpen || isQuickNotesOpen || isQuickAddTaskOpen,
  });

  // Pet Event triggers
  useEffect(() => {
    const prev = prevPendingCountRef.current;
    prevPendingCountRef.current = pendingTaskCount;
    if (pendingTaskCount < prev) {
      pet.cue('feed-task-done');
    } else if (pendingTaskCount > prev) {
      pet.cue('feed-task-added');
    }
  }, [pendingTaskCount, pet]);

  // --- Google Calendar Sync --------------------------------------------
  const handleSyncCalendar = useCallback(async (isSilent: boolean = false) => {
    const config = gcalConfigRef.current;
    if (!config?.enabled || !config.clientId) return;
    if (isSyncingCalendarRef.current) return;

    isSyncingCalendarRef.current = true;
    if (!isSilent) setIsSyncingCalendar(true);
    setCalendarSyncError(null);

    try {
      let token = getInMemoryGoogleToken();
      if (!token || isGoogleTokenExpired()) {
        try {
          token = await requestGoogleAccessToken(config.clientId, isSilent ? '' : 'select_account', config.userEmail);
        } catch (tokenErr) {
          if (tokenErr instanceof GoogleAuthError && tokenErr.kind === 'user_cancelled') {
            return;
          }
          throw tokenErr;
        }
      }

      const events = await fetchTodayGoogleEvents(token, config.calendarId || 'primary');
      setAppData((prev) => {
        const completedEventIds = new Set((prev.reflections || []).flatMap((entry) => entry.calendarEventIds || []));
        const syncedNotes = syncCalendarEventsToQuickNotes(prev.quickNotes, events.filter((event) => !completedEventIds.has(event.id)));
        const updatedConfig: any = {
          ...prev.settings.googleCalendar,
          lastSyncedAt: Date.now(),
        };
        const updated = {
          ...prev,
          calendarEvents: events,
          quickNotes: syncedNotes,
          settings: {
            ...prev.settings,
            googleCalendar: updatedConfig,
          },
        };
        return updated;
      });
    } catch (err: any) {
      console.error('Calendar sync failed:', err);
      if (!isSilent) {
        setCalendarSyncError(err.message || 'Failed to sync Google Calendar.');
      }
    } finally {
      isSyncingCalendarRef.current = false;
      if (!isSilent) setIsSyncingCalendar(false);
    }
  }, []);

  // Auto-sync calendar every 5 minutes
  useEffect(() => {
    if (!appData.settings.googleCalendar?.enabled) return;
    const interval = (appData.settings.googleCalendar.syncIntervalMinutes || 5) * 60 * 1000;
    const timer = setInterval(() => handleSyncCalendar(true), interval);
    return () => clearInterval(timer);
  }, [appData.settings.googleCalendar?.enabled, appData.settings.googleCalendar?.syncIntervalMinutes, handleSyncCalendar]);

  // Time & Workload computations
  const timeOfDay = useMemo(() => getTimeOfDayBucket(now), [now]);
  const timeRemaining = useMemo(() => {
    return calculateDayTimeRemaining(
      now,
      appData.settings.daySchedule.startHour,
      appData.settings.daySchedule.endHour
    );
  }, [now, appData.settings.daySchedule.startHour, appData.settings.daySchedule.endHour]);

  const taskLoad = useMemo(() => calculateTaskLoad(appData.quickNotes), [appData.quickNotes]);
  const buffer = useMemo(
    () => calculateBuffer(timeRemaining.totalMinutes, taskLoad.pendingMinutes),
    [timeRemaining, taskLoad]
  );
  const calendarSummary = useMemo(
    () => calculateCalendarScheduleSummary(appData.calendarEvents || [], now),
    [appData.calendarEvents, now]
  );

  // Recommender Engine: Candidates & Scored Suggestions
  const candidatePool = useMemo(() => {
    return generateCandidatePool();
  }, []);

  const [suggestionOffset, setSuggestionOffset] = useState(0);

  const rankedSuggestions = useMemo(() => {
    return getRankedRecommendations(candidatePool, appData.learnedPreferences, timeOfDay, candidatePool.length || 50);
  }, [candidatePool, appData.learnedPreferences, timeOfDay]);

  const currentSuggestion = useMemo(() => {
    if (rankedSuggestions.length === 0) return null;
    return rankedSuggestions[suggestionOffset % rankedSuggestions.length];
  }, [rankedSuggestions, suggestionOffset]);

  const handleNextSuggestion = useCallback(() => {
    setSuggestionOffset((prev) => prev + 1);
  }, []);

  const handleRejectSuggestion = useCallback((candidate: RecommendationCandidate) => {
    const updatedPrefs = recordRejection(appData.learnedPreferences, candidate, timeOfDay);
    setAppData((prev) => ({
      ...prev,
      learnedPreferences: updatedPrefs,
    }));
    setSuggestionOffset((prev) => prev + 1);
  }, [appData.learnedPreferences, timeOfDay]);

  const handleApproveSuggestion = useCallback((candidate: RecommendationCandidate) => {
    const updatedPrefs = recordApproval(appData.learnedPreferences, candidate, timeOfDay);
    setAppData((prev) => ({
      ...prev,
      learnedPreferences: updatedPrefs,
    }));
    if (candidate.url) {
      window.open(candidate.url, '_blank', 'noopener,noreferrer');
    }
    setSuggestionOffset((prev) => prev + 1);
  }, [appData.learnedPreferences, timeOfDay]);

  const [completedFocusTask, setCompletedFocusTask] = useState<QuickNote | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [showReflectionCelebration, setShowReflectionCelebration] = useState(false);
  useEffect(() => {
    if (!showReflectionCelebration) return;
    const timeout = window.setTimeout(() => setShowReflectionCelebration(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [showReflectionCelebration]);
  const previousTasks = useRef(appData.quickNotes);
  const allTasksDone = appData.quickNotes.length > 0 && pendingTaskCount === 0 && appData.quickNotes.some((task) => task.pendingReflection);
  const applyCloudDownload = useCallback((next: AppData) => {
    previousTasks.current = next.quickNotes;
    setShowReflection(false);
    setFocusTimer((timer) => timer && next.quickNotes.some((task) => task.id === timer.taskId && !task.isDone) ? timer : null);
    setAppData(next);
  }, []);
  const cloudSync = useCloudSync(workspace, appData, applyCloudDownload);
  const leavingRef = useRef({ appData, workspace, saveOnLeave: cloudSync.saveOnLeave, resume: cloudSync.resumeAfterLeave });
  leavingRef.current = { appData, workspace, saveOnLeave: cloudSync.saveOnLeave, resume: cloudSync.resumeAfterLeave };

  useEffect(() => {
    let resetAfterLeave: AppData | null = null;
    const onLeave = () => {
      const { appData: current, workspace: activeWorkspace, saveOnLeave } = leavingRef.current;
      if (!current.quickNotes.length || current.quickNotes.some((task) => !task.isDone)
          || !current.quickNotes.some((task) => task.pendingReflection)) return;
      resetAfterLeave = { ...current, quickNotes: current.quickNotes.map((task) =>
        task.isDone ? { ...task, isDone: false, rewardAlreadyGranted: task.rewardAlreadyGranted || !task.pendingReflection, pendingReflection: false,
          subtasks: task.subtasks?.map((subtask) => ({ ...subtask, isDone: false })) } : task) };
      if (activeWorkspace) saveOnLeave(resetAfterLeave);
      else {
        flushAppDataSave();
        saveAppData(resetAfterLeave);
      }
    };
    const onReturn = (event: PageTransitionEvent) => {
      if (event.persisted && resetAfterLeave) {
        setShowReflection(false);
        setAppData(resetAfterLeave);
        if (leavingRef.current.workspace) leavingRef.current.resume();
      }
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('pageshow', onReturn);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('pageshow', onReturn);
    };
  }, []);

  useEffect(() => {
    const before = previousTasks.current;
    previousTasks.current = appData.quickNotes;
    if (!allTasksDone) {
      setShowReflection(false);
      return;
    }

    if (before !== appData.quickNotes || appData.quickNotes.some((task) => task.pendingReflection)) {
      setShowReflection(true);
    }
  }, [appData.quickNotes, allTasksDone]);

  useEffect(() => {
    if (!completedFocusTask) return;
    const timeout = window.setTimeout(() => setCompletedFocusTask(null), 420);
    return () => window.clearTimeout(timeout);
  }, [completedFocusTask]);

  const completeFocusTask = (task: QuickNote) => {
    if (completedFocusTask) return;
    setCompletedFocusTask({ ...task, isDone: true });
    handleToggleTaskWithTimer(task.id);
  };

  const toggleFocusSubtask = (taskId: string, subtaskId: string) => {
    if (completedFocusTask) return;
    const task = appData.quickNotes.find((note) => note.id === taskId);
    if (!task) return;
    const { parentBecameDone, parentTask } = toggleSubtaskInList([task], taskId, subtaskId);
    if (parentBecameDone && parentTask) {
      setCompletedFocusTask(parentTask);
      setSelectedFocusTaskId(null);
    }
    handleToggleSubtask(taskId, subtaskId);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (showReflection) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+K -> Focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }

      // N -> Quick Add Task (when not typing in an input)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsQuickAddTaskOpen(true);
        return;
      }

      // Escape -> close open modals or drawers
      if (e.key === 'Escape') {
        if (isQuickAddTaskOpen) setIsQuickAddTaskOpen(false);
        else if (isSparkIdeaModalOpen) setIsSparkIdeaModalOpen(false);
        else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        else if (isQuickNotesOpen) setIsQuickNotesOpen(false);
        return;
      }

      // Quick keybinds
      if (!isInput && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'q') {
          e.preventDefault();
          setIsQuickNotesOpen((prev) => !prev);
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          handleNextSuggestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReflection, isQuickAddTaskOpen, isSparkIdeaModalOpen, isSettingsModalOpen, isMobileSidebarOpen, isQuickNotesOpen, handleNextSuggestion]);

  const handleAddQuickTask = useCallback((taskData: {
    text: string;
    durationMinutes: number;
    priority: 'low' | 'medium' | 'high';
    deadline?: string;
  }) => {
    const newNote: QuickNote = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: taskData.text.trim(),
      isDone: false,
      createdAt: Date.now(),
      durationMinutes: taskData.durationMinutes || 30,
      priority: taskData.priority || 'medium',
      deadline: taskData.deadline || undefined,
    };
    setAppData((prev) => {
      const updatedNotes = [newNote, ...prev.quickNotes];
      const updated = {
        ...prev,
        quickNotes: updatedNotes,
      };
      return updated;
    });
    tickTickSync.pushTaskCreate(newNote);
  }, [tickTickSync]);

  const handleUpdateNotes = useCallback((newNotes: QuickNote[]) => {
    const deletedNotes = appData.quickNotes.filter(
      (oldNote) => oldNote.ticktickTaskId && !newNotes.some((n) => n.id === oldNote.id)
    );
    for (const del of deletedNotes) {
      tickTickSync.pushTaskDelete(del);
    }
    setAppData((prev) => ({ ...prev, quickNotes: newNotes }));
  }, [appData.quickNotes, tickTickSync]);

  const handleUpdateScratchpad = (text: string) => {
    setAppData((prev) => ({ ...prev, scratchpadText: text }));
  };

  const handleResetData = () => {
    setAppData(workspace ? cloudData(DEFAULT_SEED_DATA) : DEFAULT_SEED_DATA);
    if (!workspace) saveAppData(DEFAULT_SEED_DATA);
    setIsSettingsModalOpen(false);
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setAppData((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme },
    }));
  };

  const handleQuickBackup = () => {
    exportDataAsJson(appData);
    setAppData((prev) => {
      const updated = {
        ...prev,
        gamification: {
          ...prev.gamification,
          lastBackupTimestamp: Date.now(),
        },
      };
      if (!workspace) saveAppData(updated);
      return updated;
    });
    setIsBackupDismissed(true);
  };

  const daysSinceBackup = Math.floor(
    (Date.now() - (appData.gamification?.lastBackupTimestamp || 0)) / (1000 * 60 * 60 * 24)
  );

  return (
    <IconContext.Provider value={{ size: 20, weight: 'regular', mirrored: false }}>
      <div className="h-screen flex flex-col overflow-hidden bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
      {/* Streamlined Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeView !== 'tasks') {
            setActiveView('tasks');
          }
        }}
        onOpenSparkIdea={() => setIsSparkIdeaModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        theme={appData.settings.theme}
        onThemeChange={handleThemeChange}
        activeView={activeView}
        onSelectView={setActiveView}
        pendingTasksCount={taskLoad.pendingCount}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {(workspace || cloudNotice) && (
        <button type="button" onClick={() => setIsSettingsModalOpen(true)}
          className="shrink-0 truncate border-b border-teal-700/20 bg-teal-500/10 px-4 py-1.5 text-left text-xs">
          {workspace ? `${workspace.project.name} · ${cloudSync.cacheError ? 'Offline storage unavailable' : cloudSync.status}` : cloudNotice}
        </button>
      )}

      {/* 5-Day Automated Backup Reminder Banner */}
      {daysSinceBackup >= 5 && !isBackupDismissed && (
        <BackupReminderToast
          daysSinceLastBackup={daysSinceBackup}
          onQuickBackup={handleQuickBackup}
          onDismiss={() => setIsBackupDismissed(true)}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentView={activeView}
          onSelectView={setActiveView}
          pendingTasksCount={taskLoad.pendingCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          gamification={appData.gamification}
          userEmail={appData.settings.googleCalendar?.userEmail}
          onOpenScratchpad={() => setIsQuickNotesOpen(true)}
          onOpenAddTask={() => setIsQuickAddTaskOpen(true)}
          suggestionCandidate={currentSuggestion}
          onApproveSuggestion={handleApproveSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onNextSuggestion={handleNextSuggestion}
        />

        {/* Launchpad Pet */}
        {petEnabled && (
          <LaunchpadPet controller={pet} paused={petPaused} onTogglePaused={handleTogglePetPaused} tier={petTier} />
        )}

        {/* Content Area */}
        <AnimatePresence mode="wait" initial={false}>
          {activeView === 'growth' ? (
            <motion.main
              key="growth-view"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 h-full min-w-0 p-0 overflow-hidden @container"
            >
              <Suspense fallback={<div className="p-8 text-center text-sm text-serene-text-muted">Loading Growth & Mastery...</div>}>
                <GrowthMasteryScreen
                  gamification={appData.gamification}
                  growthHistory={appData.growthHistory}
                  onSelectHero={(id) => {
                    setAppData((prev) => {
                      const updated = { ...prev, gamification: { ...prev.gamification, activeHeroId: id } };
                      if (!workspace) saveAppData(updated);
                      return updated;
                    });
                  }}
                  onExportBackup={handleQuickBackup}
                  onImportBackup={(jsonStr) => {
                    try {
                      const imported = importDataFromJson(jsonStr, !workspace);
                      setAppData(workspace ? cloudData(imported) : imported);
                      if (!workspace) saveAppData(imported);
                      alert("Progress and data imported successfully!");
                    } catch (err: any) {
                      alert("Import failed: " + (err.message || "Invalid backup file"));
                    }
                  }}
                  onBackToDashboard={() => setActiveView("dashboard")}
                />
              </Suspense>
            </motion.main>
          ) : activeView === 'tasks' ? (
            <motion.main
              key="tasks-view"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 h-full min-w-0 p-0 overflow-hidden @container"
            >
              <Suspense fallback={<div className="p-8 text-center text-sm text-serene-text-muted">Loading Tasks...</div>}>
                <TaskManagementScreen
                  notes={appData.quickNotes}
                  scratchpadText={appData.scratchpadText}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdateScratchpad={handleUpdateScratchpad}
                  onBackToDashboard={() => {
                    setEditingTaskIdForScreen(null);
                    setActiveView('dashboard');
                  }}
                  calendarEvents={appData.calendarEvents || []}
                  onSyncCalendar={() => handleSyncCalendar(false)}
                  isSyncingCalendar={isSyncingCalendar}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onReauthorize={() => handleSyncCalendar(false)}
                  isTokenExpired={calendarSummary.isTokenExpired}
                  syncError={calendarSyncError || calendarSummary.syncError}
                  initialTaskId={editingTaskIdForScreen}
                  onInitialTaskOpened={() => setEditingTaskIdForScreen(null)}
                  onToggleTask={handleToggleTaskWithTimer}
                  onToggleSubtask={handleToggleSubtask}
                  tickTickSync={tickTickSync}
                />
              </Suspense>
            </motion.main>
          ) : (
            <motion.main
              key="dashboard-view"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 h-full min-w-0 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-5 lg:pb-6 overflow-y-auto space-y-5 @container"
            >
              <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                {/* ROW 1: PRIMARY FOCUS (Full Width) */}
                <div className="w-full flex flex-col">
                  <PrimaryFocusCard
                    tasks={appData.quickNotes}
                    selectedTaskId={selectedFocusTaskId}
                    onSelectTask={setSelectedFocusTaskId}
                    onPreviewTask={setSelectedFocusTaskId}
                    completedTask={completedFocusTask}
                    onCompleteTask={completeFocusTask}
                    onToggleSubtask={toggleFocusSubtask}
                    onOpenTaskEdit={(task) => {
                      setEditingTaskIdForScreen(task.id);
                      setActiveView('tasks');
                    }}
                    onOpenCalendarSettings={() => setIsSettingsModalOpen(true)}
                    clockFormat={appData.settings.clockFormat}
                    focusTimer={focusTimer}
                    onTimerStart={handleTimerStart}
                    onTimerPause={handleTimerPause}
                    onTimerResume={handleTimerResume}
                    onTimerEnd={handleTimerEnd}
                    showSuggestion={pendingTaskCount === 0}
                    suggestionCandidate={currentSuggestion}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
                    onNextSuggestion={handleNextSuggestion}
                    approvalsCount={appData.learnedPreferences.approvalsCount}
                    rejectionsCount={appData.learnedPreferences.rejectionsCount}
                  />
                </div>

                {/* ROW 2: TIME BUDGET & CAPACITY + COMMITMENT RADAR */}
                <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">
                  <div className="@4xl:col-span-5 flex flex-col">
                    <TimeRadarWidget
                      timeRemaining={timeRemaining}
                      taskLoad={taskLoad}
                      buffer={buffer}
                      endHour={appData.settings.daySchedule.endHour}
                      onOpenTasks={() => setActiveView('tasks')}
                      calendarSummary={calendarSummary}
                      onSyncCalendar={() => handleSyncCalendar(false)}
                      isSyncingCalendar={isSyncingCalendar}
                      onOpenCalendarSettings={() => setIsSettingsModalOpen(true)}
                    />
                  </div>
                  <div className="@4xl:col-span-7 flex flex-col">
                    <CommitmentRadarWidget
                      tasks={appData.quickNotes}
                      onSelectTask={(id) => {
                        setSelectedFocusTaskId(id);
                        setEditingTaskIdForScreen(id);
                        setActiveView('tasks');
                      }}
                      onPreviewTask={(id) => setSelectedFocusTaskId(id)}
                      onOpenTasks={() => setActiveView('tasks')}
                      calendarSummary={calendarSummary}
                    />
                  </div>
                </div>
              </div>
            </motion.main>
          )}
        </AnimatePresence>

        {/* Slide-out Quick Scratchpad Drawer */}
        <AnimatePresence>
          {isQuickNotesOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsQuickNotesOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-2xs z-40 lg:hidden"
              />
              <motion.aside
                variants={drawerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed top-0 bottom-0 right-0 z-50 w-full sm:w-96 shadow-2xl overflow-hidden flex flex-col"
              >
                <QuickNotesWidget
                  notes={appData.quickNotes}
                  scratchpadText={appData.scratchpadText}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdateScratchpad={handleUpdateScratchpad}
                  onClose={() => setIsQuickNotesOpen(false)}
                  onToggleTask={handleToggleTaskWithTimer}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* On-Demand Spark Focus Idea Modal */}
      <AnimatePresence>
        {isSparkIdeaModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSparkIdeaModalOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-[101] p-5"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Focus Inspiration & Ideas
                  </h3>
                </div>
                <button
                  onClick={() => setIsSparkIdeaModalOpen(false)}
                  className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <SmartSuggestionCard
                candidate={currentSuggestion}
                onApprove={(c) => {
                  handleApproveSuggestion(c);
                  setIsSparkIdeaModalOpen(false);
                }}
                onReject={handleRejectSuggestion}
                onNext={handleNextSuggestion}
                approvalsCount={appData.learnedPreferences.approvalsCount}
                rejectionsCount={appData.learnedPreferences.rejectionsCount}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Task Modal */}
      <QuickAddTaskModal
        isOpen={isQuickAddTaskOpen}
        onClose={() => setIsQuickAddTaskOpen(false)}
        onAddTask={handleAddQuickTask}
        onOpenFullTasksView={() => {
          setActiveView('tasks');
        }}
      />

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            appData={appData}
            onUpdateAppData={(next) => setAppData(workspace ? cloudData(next) : next)}
            onResetData={handleResetData}
            onSyncCalendar={() => handleSyncCalendar(false)}
            isSyncingCalendar={isSyncingCalendar}
            tickTickSync={workspace ? undefined : tickTickSync}
            workspace={workspace}
            onSwitchWorkspace={onSwitchWorkspace}
            cloudSync={cloudSync}
          />
        </Suspense>
      )}

      {showReflection && allTasksDone && !completedFocusTask && (
        <TaskClearReflection
          style={appData.settings.confettiStyle}
          onClose={() => {
            setShowReflection(false);
            setAppData((prev) => ({ ...prev, quickNotes: prev.quickNotes.map((task) =>
              task.isDone ? { ...task, isDone: false, rewardAlreadyGranted: task.rewardAlreadyGranted || !task.pendingReflection, pendingReflection: false,
                subtasks: task.subtasks?.map((subtask) => ({ ...subtask, isDone: false })) } : task) }));
          }}
          onSubmit={(questions, answers) => {
            if (questions.length !== 5 || answers.length !== 5
              || answers.some((answer) => answer.trim().split(/\s+/u).filter(Boolean).length < 150)) return;
            const completedTasks = appData.quickNotes.filter((task) => task.pendingReflection && task.isDone);
            if (!completedTasks.length || appData.quickNotes.some((task) => !task.isDone)) return;
            for (const task of completedTasks) void tickTickSync.pushTaskToggle(task);
            setAppData((prev) => {
              const completed = prev.quickNotes.filter((task) => task.pendingReflection && task.isDone);
              if (!completed.length || prev.quickNotes.some((task) => !task.isDone)) return prev;
              let gamification = prev.gamification;
              let history = prev.growthHistory;
              for (const task of completed) {
                if (task.rewardAlreadyGranted) continue;
                const result = recordTaskCompletion(gamification, history, task);
                gamification = result.gamification;
                history = result.history;
              }
              return { ...prev, gamification, growthHistory: history,
                reflections: [...(prev.reflections || []), { date: new Date().toISOString(), questions, answers,
                  taskTitles: completed.map((task) => task.text),
                  calendarEventIds: prev.quickNotes.map((task) => task.eventId).filter((id): id is string => Boolean(id)) }],
                quickNotes: [] };
            });
            setShowReflection(false);
            setShowReflectionCelebration(true);
          }}
        />
      )}
      {showReflectionCelebration && <ConfettiOverlay style={appData.settings.confettiStyle} />}
    </div>
    </IconContext.Provider>
  );
}

export default function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<CloudWorkspace | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [cloudNotice, setCloudNotice] = useState<string>();
  const switchWorkspace = useCallback((next: CloudWorkspace | null) => {
    flushAppDataSave();
    try {
      if (next) localStorage.setItem(ACTIVE_CLOUD_KEY, next.project.url);
      else localStorage.removeItem(ACTIVE_CLOUD_KEY);
    } catch {
      // The active workspace can still be used when device storage is unavailable.
    }
    setCloudNotice(undefined);
    setWorkspace(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const saved = localStorage.getItem(ACTIVE_CLOUD_KEY);
        const project = readCloudProjects().find((item) => item.url === saved);
        if (!project) return;
        const next = await openCloudWorkspace(project);
        if (cancelled) return;
        if (next) setWorkspace(next);
        else setCloudNotice('Local workspace · Sign in again to reopen your cloud workspace');
      } catch {
        if (!cancelled) setCloudNotice('Local workspace · Could not reopen the saved cloud workspace');
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const { data: { subscription } } = workspace.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (session && session.user.id !== workspace.userId)) switchWorkspace(null);
    });
    return () => subscription.unsubscribe();
  }, [workspace, switchWorkspace]);

  if (restoring) return <main className="p-6" role="status">Opening LaunchPAD…</main>;
  const key = workspace ? `${workspace.project.url}:${workspace.userId}` : 'local';
  return <App key={key} workspace={workspace} onSwitchWorkspace={switchWorkspace} cloudNotice={cloudNotice} />;
}
