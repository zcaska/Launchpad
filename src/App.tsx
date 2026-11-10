import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  X as CloseIcon,
  Lightbulb,
  IconContext,
  House,
  CheckSquare,
  Trophy,
  GearSix
} from '@phosphor-icons/react';
import { 
  AppData, 
  ThemeMode,
  RecommendationCandidate,
  PetSettings,
  QuickNote,
} from './types';
import { loadAppData, saveAppData, saveAppDataDebounced, flushAppDataSave, exportDataAsJson, importDataFromJson, clearAllLocalData, removeRetiredIntegrationCredentials } from './utils/storage';
import { ACTIVE_CLOUD_KEY, cloudData, openCloudWorkspace, readCloudProjects, type CloudWorkspace } from './services/cloudWorkspace';
import { useCloudSync } from './services/useCloudSync';
import { recordTaskCompletion } from './utils/gamification';
import { Header } from './components/Header/Header';
import { BackupReminderToast } from './components/Layout/BackupReminderToast';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TaskClearReflection } from './components/Dashboard/TaskClearReflection';
import { ConfettiOverlay } from './components/Dashboard/ConfettiOverlay';
import { PrimaryFocusCard } from './components/Dashboard/PrimaryFocusCard';
import { TaskPreviewPopUp } from './components/Tasks/TaskPreviewPopUp';
import { SmartSuggestionCard } from './components/Dashboard/SmartSuggestionCard';
import LaunchpadPet from './components/Pet/LaunchpadPet';
import { usePetController } from './components/Pet/usePetController';
import { petTierForStreak, petTaskChanges } from './utils/petState';
import { earnedPetLevel } from './utils/petEvolution';
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
const SettingsScreen = lazy(() =>
  import('./components/Modals/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);

import { 
  calculateTaskLoad, 
  getTimeOfDayBucket,
  calculateDayTimeRemaining,
  calculateBuffer
} from './utils/timeBudget';
import { tasksDueToday } from './utils/taskPeriod';
import { getReflectionTasks, resetReflectionTasks } from './utils/taskReflection';
import { useTaskView } from './components/Tasks/useTaskView';
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

export function App({ workspace = null, onSwitchWorkspace, cloudNotice }: {
  workspace?: CloudWorkspace | null;
  onSwitchWorkspace?: (workspace: CloudWorkspace | null) => void;
  cloudNotice?: string;
} = {}) {
  const [appData, setAppData] = useState<AppData>(() => workspace?.initial.data ?? loadAppData());
  const workspaceScope = workspace ? `${workspace.project.url}:${workspace.userId}` : undefined;
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'growth' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const previousView = useRef<'dashboard' | 'tasks' | 'growth'>('dashboard');
  const openSettings = () => {
    if (activeView !== 'settings') previousView.current = activeView;
    setActiveView('settings');
  };
  const closeSettings = () => setActiveView(previousView.current);
  const [createTaskRequested, setCreateTaskRequested] = useState(false);
  const openNewTask = () => {
    if (activeView === 'tasks') setCreateTaskRequested(true);
    else setIsQuickAddTaskOpen(true);
  };
  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSparkIdeaModalOpen, setIsSparkIdeaModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isBackupDismissed, setIsBackupDismissed] = useState(false);
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string | null>(null);
  const [editingTaskIdForScreen, setEditingTaskIdForScreen] = useState<string | null>(null);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const viewingTask = viewingTaskId === null ? undefined : appData.quickNotes.find((task) => task.id === viewingTaskId);

  const openTaskEdit = (taskId: string) => {
    setViewingTaskId(null);
    setEditingTaskIdForScreen(taskId);
    if (activeView !== "tasks") setSearchQuery("");
    setActiveView("tasks");
  };


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
    }

    if (selectedFocusTaskId === taskId && becomingDone) {
      setSelectedFocusTaskId(null);
    }
  }, [appData.quickNotes, focusTimer, selectedFocusTaskId]);

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
  const petLevel = useMemo(() => earnedPetLevel(appData.gamification), [appData.gamification]);

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

  const previousPetTasks = useRef(appData.quickNotes);
  const pet = usePetController({
    enabled: petEnabled,
    paused: petPaused,
    pendingCount: pendingTaskCount,
    uiActive: activeView === 'settings' || isSparkIdeaModalOpen || isQuickNotesOpen || isQuickAddTaskOpen,
  });

  // Pet Event triggers
  const previousPetLevel = useRef(petLevel);
  useEffect(() => {
    if (petLevel > previousPetLevel.current) pet.cue('feed-streak-milestone');
    previousPetLevel.current = petLevel;
  }, [petLevel, pet.cue]);
  useEffect(() => {
    const changes = petTaskChanges(previousPetTasks.current, appData.quickNotes);
    previousPetTasks.current = appData.quickNotes;
    for (let index = 0; index < changes.completed; index++) pet.cue('feed-task-done');
    if (changes.added) pet.cue('feed-task-added');
  }, [appData.quickNotes, pet.cue, petEnabled, petPaused]);

  // Time & Workload computations
  const timeOfDay = useMemo(() => getTimeOfDayBucket(now), [now]);
  const timeRemaining = useMemo(() => {
    return calculateDayTimeRemaining(
      now,
      appData.settings.daySchedule.startHour,
      appData.settings.daySchedule.endHour
    );
  }, [now, appData.settings.daySchedule.startHour, appData.settings.daySchedule.endHour]);

  const taskView = useTaskView(appData.quickNotes, now, appData.settings.daySchedule);

  // Dashboard today-only scope: tasks due today (local date), includes done tasks.
  // Derived from actual local `now` so midnight rollover updates via the existing App clock.
  const dashboardTodayTasks = useMemo(
    () => tasksDueToday(appData.quickNotes, now),
    [appData.quickNotes, now]
  );

  // Dashboard workload and time buffer calculated strictly from today-scoped tasks.
  const todayTaskLoad = useMemo(
    () => calculateTaskLoad(dashboardTodayTasks),
    [dashboardTodayTasks]
  );
  const todayBuffer = useMemo(
    () => calculateBuffer(timeRemaining.totalMinutes, todayTaskLoad.pendingMinutes),
    [timeRemaining, todayTaskLoad]
  );
  const todayPendingCount = useMemo(
    () => dashboardTodayTasks.filter((t) => !t.isDone).length,
    [dashboardTodayTasks]
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
  const reflectionTasks = useMemo(() => getReflectionTasks(appData.quickNotes, now), [appData.quickNotes, now]);
  const reflectionKey = JSON.stringify(reflectionTasks.map(task => task.id).sort());
  const reflectionReady = reflectionTasks.length > 0;
  const applyCloudDownload = useCallback((next: AppData) => {
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
      const reset = resetReflectionTasks(current.quickNotes, new Date());
      if (reset === current.quickNotes) return;
      resetAfterLeave = { ...current, quickNotes: reset };
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
    setShowReflection(false);
    if (!reflectionReady) return;
    // A short celebration grace period, never gated by an optional pet or animation promise.
    const timer = window.setTimeout(() => setShowReflection(true), 1500);
    return () => window.clearTimeout(timer);
  }, [reflectionKey, reflectionReady]);

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
        else if (isQuickNotesOpen) setIsQuickNotesOpen(false);
        else if (activeView === 'settings') closeSettings();
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
  }, [showReflection, isQuickAddTaskOpen, isSparkIdeaModalOpen, activeView, isQuickNotesOpen, handleNextSuggestion]);

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
  }, []);

  const handleUpdateNotes = useCallback((newNotes: QuickNote[]) => {
    setAppData((prev) => ({ ...prev, quickNotes: newNotes }));
  }, []);

  const handleUpdateScratchpad = (text: string) => {
    setAppData((prev) => ({ ...prev, scratchpadText: text }));
  };

  const handleClearAllData = useCallback(async () => {
    const baseCleared = clearAllLocalData();
    const preservedSettings = {
      ...baseCleared.settings,
      theme: appData.settings.theme,
      clockFormat: appData.settings.clockFormat,
      showQuotes: appData.settings.showQuotes,
      openInNewTab: appData.settings.openInNewTab,
      compactView: appData.settings.compactView,
      daySchedule: appData.settings.daySchedule,
      activeMode: appData.settings.activeMode,
      confettiStyle: appData.settings.confettiStyle,
      pet: appData.settings.pet,
      openRouter: appData.settings.openRouter,
    };

    const nextAppData: AppData = {
      ...baseCleared,
      settings: preservedSettings,
    };

    saveAppData(nextAppData);
    setAppData(nextAppData);
    setSelectedFocusTaskId(null);
    setFocusTimer(null);

    if (workspace && cloudSync) {
      await cloudSync.clearCloud(nextAppData);
    }
  }, [appData.settings, cloudSync, workspace]);

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
    <MotionConfig reducedMotion="user">
    <IconContext.Provider value={{ size: 20, weight: 'regular', mirrored: false }}>
      <div className="launchpad-shell h-dvh flex flex-col overflow-hidden bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
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
        onOpenSettings={openSettings}
        theme={appData.settings.theme}
        onThemeChange={handleThemeChange}
        onNewTask={openNewTask}
        onOpenScratchpad={() => setIsQuickNotesOpen(true)}
      />

      {!workspace && cloudNotice && (
        <button type="button" onClick={openSettings}
          className="hidden md:block shrink-0 truncate border-b border-teal-700/20 bg-teal-500/10 px-4 py-1.5 text-left text-xs">
          {cloudNotice}
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
          pendingTasksCount={taskView.periodLoad.pendingCount}
          gamification={appData.gamification}
          suggestionCandidate={currentSuggestion}
          onApproveSuggestion={handleApproveSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onNextSuggestion={handleNextSuggestion}
        />

        {/* Launchpad Pet */}
        {petEnabled && (
          <div className="hidden md:contents"><LaunchpadPet controller={pet} paused={petPaused} onTogglePaused={handleTogglePetPaused} tier={petTier} evolutionLevel={petLevel} /></div>
        )}

        {/* Content Area */}
        <AnimatePresence mode="wait" initial={false}>
          {activeView === 'settings' ? (
            <main key="settings-view" className="min-w-0 flex-1 overflow-y-auto">
              <Suspense fallback={<p className="p-4" role="status">Loading settings…</p>}>
                <SettingsScreen
                  onClose={closeSettings}
                  onThemeChange={handleThemeChange}
                  onOpenSparkIdea={() => setIsSparkIdeaModalOpen(true)}
                  appData={appData}
                  onUpdateAppData={(next) => setAppData(workspace ? cloudData(next) : next)}
                  onClearAllData={handleClearAllData}
                  workspace={workspace}
                  onSwitchWorkspace={onSwitchWorkspace}
                  cloudSync={cloudSync}
                />
              </Suspense>
            </main>
          ) : activeView === 'growth' ? (
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
                  createTaskRequested={createTaskRequested}
                  onCreateTaskOpened={() => setCreateTaskRequested(false)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  notes={appData.quickNotes}
                  view={taskView}
                  now={now}
                  onUpdateNotes={handleUpdateNotes}
                  onViewTask={setViewingTaskId}
                  onBackToDashboard={() => {
                    setEditingTaskIdForScreen(null);
                    setActiveView('dashboard');
                  }}
                  initialTaskId={editingTaskIdForScreen}
                  onInitialTaskOpened={() => setEditingTaskIdForScreen(null)}
                  onToggleTask={handleToggleTaskWithTimer}
                  onToggleSubtask={handleToggleSubtask}
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
              className="mobile-home flex-1 h-full min-w-0 px-2 py-3 sm:p-5 lg:p-6 overflow-y-auto @container"
            >
              <div className="home-greeting md:hidden">
                <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'} <span aria-hidden="true">👋</span></h1>
                <p>Focus · Execute · Grow</p>
              </div>
              <div className="home-widgets grid grid-cols-1 items-start gap-4 sm:gap-5 @6xl:grid-cols-12 motion-safe:animate-fadeIn">
                {/* Focus and available time share a row when the workspace is wide. */}
                <div className="min-w-0 @6xl:col-span-7">
                  <PrimaryFocusCard
                    tasks={dashboardTodayTasks}
                    now={now}
                    selectedTaskId={selectedFocusTaskId}
                    onSelectTask={setSelectedFocusTaskId}
                    onPreviewTask={setViewingTaskId}
                    completedTask={dashboardTodayTasks.find((t) => t.id === completedFocusTask?.id) ?? null}
                    onCompleteTask={completeFocusTask}
                    onToggleSubtask={toggleFocusSubtask}
                    onOpenTaskEdit={(task) => openTaskEdit(task.id)}
                    clockFormat={appData.settings.clockFormat}
                    showSuggestion={todayPendingCount === 0}
                    suggestionCandidate={currentSuggestion}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
                    onNextSuggestion={handleNextSuggestion}
                    approvalsCount={appData.learnedPreferences.approvalsCount}
                    rejectionsCount={appData.learnedPreferences.rejectionsCount}
                  />
                </div>

                <div className="min-w-0 @6xl:col-span-5">
                  <TimeRadarWidget
                    timeRemaining={timeRemaining}
                    taskLoad={todayTaskLoad}
                    buffer={todayBuffer}
                    endHour={appData.settings.daySchedule.endHour}
                    onOpenTasks={() => setActiveView('tasks')}
                  />
                </div>
                <div className="min-w-0 @6xl:col-span-12">
                  <CommitmentRadarWidget
                    tasks={appData.quickNotes}
                    onSelectTask={setSelectedFocusTaskId}
                    onPreviewTask={setViewingTaskId}
                    onOpenTasks={() => setActiveView('tasks')}
                  />
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

      <nav aria-label="Main navigation" className="mobile-navigation grid shrink-0 grid-cols-4 border-t border-serene-border-light bg-white px-2 pb-[env(safe-area-inset-bottom)] dark:border-serene-border-dark dark:bg-serene-surface-dark md:hidden">
        {([
          ['dashboard', 'Home', House],
          ['tasks', 'Tasks', CheckSquare],
          ['growth', 'Growth', Trophy],
          ['settings', 'Settings', GearSix],
        ] as const).map(([view, label, Icon]) => (
          <button
            key={view}
            type="button"
            aria-current={activeView === view ? 'page' : undefined}
            onClick={() => {
              setSearchQuery('');
              if (view === 'settings') openSettings();
              else setActiveView(view);
            }}
            className="my-1 flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold aria-[current=page]:bg-serene-primary/10 aria-[current=page]:text-serene-primary dark:aria-[current=page]:text-serene-primary-dark"
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {viewingTask && (
        <TaskPreviewPopUp
          key={viewingTask.id}
          task={viewingTask}
          now={now}
          clockFormat={appData.settings.clockFormat}
          onClose={() => setViewingTaskId(null)}
          onEdit={() => openTaskEdit(viewingTask.id)}
        />
      )}

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
          setCreateTaskRequested(true);
          setActiveView('tasks');
        }}
      />

      {showReflection && reflectionReady && (
        <TaskClearReflection
          style={appData.settings.confettiStyle}
          onClose={() => {
            setShowReflection(false);
            setAppData((prev) => ({ ...prev, quickNotes: resetReflectionTasks(prev.quickNotes, new Date()) }));
          }}
          onSubmit={(questions, answers) => {
            if (questions.length !== 5 || answers.length !== 5
              || answers.some((answer) => answer.trim().split(/\s+/u).filter(Boolean).length < 150)) return;
            const completedTasks = getReflectionTasks(appData.quickNotes, new Date());
            if (!completedTasks.length) return;
            setAppData((prev) => {
              const completed = getReflectionTasks(prev.quickNotes, new Date());
              if (!completed.length) return prev;
              const completedIds = new Set(completed.map(task => task.id));
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
                  taskTitles: completed.map((task) => task.text) }],
                quickNotes: prev.quickNotes.filter(task => !completedIds.has(task.id)) };
            });
            setShowReflection(false);
            setShowReflectionCelebration(true);
          }}
        />
      )}
      {showReflectionCelebration && <ConfettiOverlay style={appData.settings.confettiStyle} />}
    </div>
    </IconContext.Provider>
    </MotionConfig>
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
    removeRetiredIntegrationCredentials();
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
