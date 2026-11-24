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
import { loadAppData, saveAppDataWithLock, saveAppDataDebounced, flushAppDataSaveWithLock, preserveAppDataOnLeave, exportDataAsJson, importDataFromJson, clearAllLocalData, clearAllLocalDataWithLock, removeRetiredIntegrationCredentials, StorageRecoveryError, getBackupStatus, subscribeBackupStatus, getPrimarySaveStatus, subscribePrimarySaveStatus } from './utils/storage';
import { WorkspaceRecoveryNotice } from './components/Modals/WorkspaceRecoveryNotice';
import { ACTIVE_CLOUD_KEY, openCloudWorkspace, readCloudProjects, type CloudWorkspace } from './services/cloudWorkspace';
import { useCloudSync } from './services/useCloudSync';
import { formatDateKey } from './utils/gamification';
import { findReflectionCommitment, offerMission, partialProgressLedgerId, settlePastDays } from './utils/castleEconomy';
import { Header } from './components/Header/Header';
import { BackupReminderToast } from './components/Layout/BackupReminderToast';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TaskClearReflection } from './components/Dashboard/TaskClearReflection';
import { ActualTimeDialog } from './components/Dashboard/ActualTimeDialog';
import { ConfettiOverlay } from './components/Dashboard/ConfettiOverlay';
import { PrimaryFocusCard } from './components/Dashboard/PrimaryFocusCard';
import { TaskPreviewPopUp } from './components/Tasks/TaskPreviewPopUp';
import { isTaskDialogOpen, type TaskDialogTrigger } from './components/Tasks/TaskDialog';
import { SmartSuggestionCard } from './components/Dashboard/SmartSuggestionCard';
import LaunchpadPet from './components/Pet/LaunchpadPet';
import { usePetController } from './components/Pet/usePetController';
import { petTierForStreak, petTaskChanges } from './utils/petState';
import { earnedPetLevel } from './utils/petEvolution';
import { CommitmentRadarWidget } from './components/Dashboard/CommitmentRadarWidget';
import TimeRadarWidget from './components/Dashboard/TimeRadarWidget';
import { transitionTask, type TaskAction } from './utils/taskCompletion';
import {
  loadFocusTimer,
  saveFocusTimer,
} from './utils/focusTimer';
import { QuickNotesWidget } from './components/QuickNotes/QuickNotesWidget';
import { QuickAddTaskModal } from './components/Modals/QuickAddTaskModal';
import { StorageRecovery } from './components/Modals/StorageRecovery';
import { FeatureGuideProvider } from './components/Common/FeatureGuideContext';

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
import { applyCompletedTaskReflection, applyPartialTaskReflection, getDailyReviewTasks, getReflectionTasks, resetReflectionTasks } from './utils/taskReflection';
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

interface PendingTaskCompletion {
  originalTask: QuickNote;
  previewTask: QuickNote;
  action: TaskAction;
  requestedAt: number;
  fromFocus: boolean;
}

const interruptedCompletionMessage = 'The task list changed while you were entering time. Your time was not saved. If the task is still open, mark it done again to enter its time.';

export function App({ workspace = null, onSwitchWorkspace, cloudNotice }: {
  workspace?: CloudWorkspace | null;
  onSwitchWorkspace?: (workspace: CloudWorkspace | null) => void;
  cloudNotice?: string;
} = {}) {
  const [backupStatus, setBackupStatus] = useState(getBackupStatus);
  useEffect(() => subscribeBackupStatus(setBackupStatus), []);
  const [primarySaveStatus, setPrimarySaveStatus] = useState(getPrimarySaveStatus);
  useEffect(() => subscribePrimarySaveStatus(setPrimarySaveStatus), []);
  const workspaceScope = workspace ? `${workspace.project.url}:${workspace.userId}` : undefined;
  // Commit task completion and its timer and focus changes together.
  const [session, setSession] = useState(() => ({
    appData: workspace?.initial.data ?? loadAppData(),
    focusTimer: loadFocusTimer(workspaceScope),
    selectedFocusTaskId: null as string | null,
    completedFocusTask: null as QuickNote | null,
    pendingTaskCompletion: null as PendingTaskCompletion | null,
    completionNotice: null as string | null,
  }));
  const { appData, focusTimer, selectedFocusTaskId, completedFocusTask, pendingTaskCompletion, completionNotice } = session;
  const setAppData = useCallback((update: React.SetStateAction<AppData>) => {
    setSession(prev => {
      const next = typeof update === 'function' ? update(prev.appData) : update;
      if (next === prev.appData) return prev;
      const pending = prev.pendingTaskCompletion;
      const interrupted = pending !== null && !next.quickNotes.includes(pending.originalTask);
      return {
        ...prev,
        appData: next,
        pendingTaskCompletion: interrupted ? null : pending,
        completionNotice: interrupted ? interruptedCompletionMessage : prev.completionNotice,
      };
    });
  }, []);
  const setSelectedFocusTaskId = useCallback((id: string) => {
    setSession(prev => ({ ...prev, selectedFocusTaskId: id }));
  }, []);
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'growth' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const previousView = useRef<'dashboard' | 'tasks' | 'growth'>('dashboard');
  const openSettings = () => {
    if (activeView !== 'settings') previousView.current = activeView;
    setActiveView('settings');
  };
  const closeSettings = () => setActiveView(previousView.current);
  const [createTaskRequested, setCreateTaskRequested] = useState(false);
  const taskFormTrigger = useRef<TaskDialogTrigger | null>(null);
  const newTaskButton = useRef<HTMLButtonElement>(null);
  const openNewTask = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeView === 'tasks') {
      taskFormTrigger.current = event.currentTarget;
      setCreateTaskRequested(true);
    } else {
      setIsQuickAddTaskOpen(true);
    }
  };
  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSparkIdeaModalOpen, setIsSparkIdeaModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isBackupDismissed, setIsBackupDismissed] = useState(false);
  const [editingTaskIdForScreen, setEditingTaskIdForScreen] = useState<string | null>(null);
  const [taskDetails, setTaskDetails] = useState<{ id: string; trigger: TaskDialogTrigger | null } | null>(null);
  const viewingTask = taskDetails && appData.quickNotes.find((task) => task.id === taskDetails.id);
  const openTaskDetails = useCallback((id: string, trigger: TaskDialogTrigger | null) => {
    setTaskDetails({ id, trigger });
  }, []);

  const openTaskEdit = (taskId: string, trigger: TaskDialogTrigger | null = null) => {
    setTaskDetails(null);
    taskFormTrigger.current = trigger;
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

  // Save timer whenever state changes
  useEffect(() => {
    saveFocusTimer(focusTimer, workspaceScope);
  }, [focusTimer, workspaceScope]);

  const handleTaskAction = useCallback((id: string, action: TaskAction, fromFocus = false) => {
    const nowMs = Date.now();
    setSession(prev => {
      if (prev.pendingTaskCompletion || (fromFocus && prev.completedFocusTask)) return prev;
      const originalTask = prev.appData.quickNotes.find(task => task.id === id);
      if (!originalTask) return prev;
      const result = transitionTask(prev.appData.quickNotes, prev.focusTimer, id, action, nowMs);
      if (result.notes === prev.appData.quickNotes) return prev;
      if (result.completedTask) {
        return {
          ...prev,
          completionNotice: null,
          pendingTaskCompletion: {
            originalTask, previewTask: { ...result.completedTask, actualMinutes: undefined }, action, requestedAt: nowMs, fromFocus,
          },
        };
      }
      return {
        ...prev,
        appData: { ...prev.appData, quickNotes: result.notes },
        focusTimer: result.timer,
      };
    });
  }, []);

  const confirmTaskCompletion = (pending: PendingTaskCompletion, actualMinutes: number) => {
    setSession(prev => {
      if (prev.pendingTaskCompletion !== pending) return prev;
      if (!prev.appData.quickNotes.includes(pending.originalTask)) {
        return { ...prev, pendingTaskCompletion: null, completionNotice: interruptedCompletionMessage };
      }
      const { id } = pending.originalTask;
      const result = transitionTask(prev.appData.quickNotes, prev.focusTimer, id, pending.action, pending.requestedAt, actualMinutes);
      if (!result.completedTask) {
        return { ...prev, pendingTaskCompletion: null, completionNotice: 'This time could not be saved. Mark the task done again to enter its time.' };
      }
      return {
        ...prev,
        appData: { ...prev.appData, quickNotes: result.notes },
        focusTimer: result.timer,
        selectedFocusTaskId: prev.selectedFocusTaskId === id ? null : prev.selectedFocusTaskId,
        completedFocusTask: pending.fromFocus ? result.completedTask : prev.completedFocusTask,
        pendingTaskCompletion: null,
      };
    });
  };

  const cancelTaskCompletion = (pending: PendingTaskCompletion) => {
    setSession(prev => prev.pendingTaskCompletion === pending ? { ...prev, pendingTaskCompletion: null } : prev);
  };

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

  const [showReflection, setShowReflection] = useState(false);
  const [showDailyReflection, setShowDailyReflection] = useState(false);
  const [reflectionStartedAt, setReflectionStartedAt] = useState<Date | null>(null);
  const [partialEntry, setPartialEntry] = useState<{ taskId: string; date: string; id: string; minutes?: number } | null>(null);
  const [partialSubmission, setPartialSubmission] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string>();
  useEffect(() => {
    if (!partialSubmission) return;
    const recorded = appData.castleEconomy?.ledger.some(item => item.id === partialSubmission);
    setPartialSubmission(null);
    if (recorded) {
      setPartialError(undefined);
      setPartialEntry(null);
    } else {
      setPartialError('This progress could not be recorded. Your answers are still here. Check that the task is open and that an open date is available.');
    }
  }, [partialSubmission, appData.castleEconomy]);
  const [manualReflectionIds, setManualReflectionIds] = useState<string[] | null>(null);
  const [showReflectionCelebration, setShowReflectionCelebration] = useState(false);
  const [reflectionSubmission, setReflectionSubmission] = useState<string[] | null>(null);
  const [reflectionError, setReflectionError] = useState<string>();
  useEffect(() => {
    if (!reflectionSubmission) return;
    const stillPending = appData.quickNotes.some(task => reflectionSubmission.includes(task.id) && task.isDone && task.pendingReflection);
    setReflectionSubmission(null);
    if (stillPending) {
      setReflectionError('This reflection could not be recorded. Your work and answers are still here. Confirm the reported time and check that an open date is available.');
      return;
    }
    setReflectionError(undefined);
    setShowReflection(false);
    setReflectionStartedAt(null);
    setManualReflectionIds(null);
    setShowReflectionCelebration(true);
  }, [reflectionSubmission, appData.quickNotes]);
  useEffect(() => {
    if (!showReflectionCelebration) return;
    const timeout = window.setTimeout(() => setShowReflectionCelebration(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [showReflectionCelebration]);
  const reflectionTasks = useMemo(() => manualReflectionIds
    ? appData.quickNotes.filter(task => manualReflectionIds.includes(task.id) && task.isDone && task.pendingReflection)
    : getReflectionTasks(appData.quickNotes, reflectionStartedAt ?? now, appData.castleEconomy),
  [appData.quickNotes, appData.castleEconomy, reflectionStartedAt, manualReflectionIds, now]);
  const reflectionKey = JSON.stringify(reflectionTasks.map(task => task.id).sort());
  const reflectionReady = reflectionTasks.length > 0;
  const dayKey = formatDateKey(now);
  const reflectionDay = reflectionStartedAt ? formatDateKey(reflectionStartedAt) : dayKey;
  const reflectionEconomy = appData.castleEconomy;
  const timedReflectionTasks = reflectionEconomy
    ? reflectionTasks.filter(task => !task.actualMinutes && findReflectionCommitment(reflectionEconomy, task, reflectionDay)) : [];
  const needsActualTime = timedReflectionTasks.length > 0;
  const openCompletedTaskReflection = (taskIds: string[]) => {
    setManualReflectionIds(taskIds);
    setReflectionStartedAt(new Date());
    setShowReflection(true);
  };
  const openDailyReflection = () => {
    const taskIds = getDailyReviewTasks(appData.quickNotes).map(task => task.id);
    if (taskIds.length) {
      openCompletedTaskReflection(taskIds);
    } else {
      setShowDailyReflection(true);
    }
  };
  useEffect(() => {
    if (!appData.castleEconomy || showReflection || reflectionReady || partialEntry || pendingTaskCompletion || dayKey < appData.castleEconomy.activatedOn) return;
    const draw = Math.random();
    setAppData(previous => {
      if (!previous.castleEconomy) return previous;
      const settled = settlePastDays(previous.castleEconomy, dayKey);
      const castleEconomy = offerMission(settled, dayKey, draw);
      return castleEconomy === previous.castleEconomy ? previous : { ...previous, castleEconomy };
    });
  }, [dayKey, appData.castleEconomy, showReflection, reflectionReady, !!partialEntry, pendingTaskCompletion]);
  const applyCloudDownload = useCallback((next: AppData, tasksChanged: boolean) => {
    if (tasksChanged) {
      setShowReflection(false);
      setShowDailyReflection(false);
      setReflectionStartedAt(null);
      setPartialEntry(null);
      setManualReflectionIds(null);
    }
    setSession(prev => ({
      ...prev,
      appData: next,
      focusTimer: next.quickNotes.some(task => task.id === prev.focusTimer?.taskId && !task.isDone) ? prev.focusTimer : null,
      pendingTaskCompletion: tasksChanged ? null : prev.pendingTaskCompletion,
      completionNotice: tasksChanged && prev.pendingTaskCompletion ? interruptedCompletionMessage : prev.completionNotice,
    }));
  }, []);
  const cloudSync = useCloudSync(workspace, appData, applyCloudDownload);
  const leavingRef = useRef({ appData, workspace, reflectionStartedAt, manualReflectionIds, saveOnLeave: cloudSync.saveOnLeave, resume: cloudSync.resumeAfterLeave });
  leavingRef.current = { appData, workspace, reflectionStartedAt, manualReflectionIds, saveOnLeave: cloudSync.saveOnLeave, resume: cloudSync.resumeAfterLeave };

  useEffect(() => {
    let resetAfterLeave: AppData | null = null;
    const onLeave = () => {
      const { appData: current, workspace: activeWorkspace, reflectionStartedAt: anchor, manualReflectionIds: selectedIds, saveOnLeave } = leavingRef.current;
      const reset = resetReflectionTasks(current.quickNotes, anchor ?? new Date(), current.castleEconomy, selectedIds ?? undefined);
      if (reset === current.quickNotes) return;
      resetAfterLeave = { ...current, quickNotes: reset };
      if (activeWorkspace) saveOnLeave(resetAfterLeave);
      else preserveAppDataOnLeave(resetAfterLeave);
    };
    const onReturn = (event: PageTransitionEvent) => {
      if (event.persisted && resetAfterLeave) {
        setShowReflection(false);
        setReflectionStartedAt(null);
        setManualReflectionIds(null);
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
    if (manualReflectionIds) return;
    setShowReflection(false);
    if (!reflectionReady) return;
    // A short celebration grace period, never gated by an optional pet or animation promise.
    setReflectionStartedAt(new Date());
    const timer = window.setTimeout(() => setShowReflection(true), 1500);
    return () => window.clearTimeout(timer);
  }, [reflectionKey, reflectionReady, manualReflectionIds]);

  useEffect(() => {
    if (!completedFocusTask) return;
    const timeout = window.setTimeout(() => setSession(prev => ({ ...prev, completedFocusTask: null })), 420);
    return () => window.clearTimeout(timeout);
  }, [completedFocusTask]);

  const completeFocusTask = (task: QuickNote) => {
    handleTaskAction(task.id, { kind: 'toggleTask' }, true);
  };

  const toggleFocusSubtask = (taskId: string, subtaskId: string) => {
    handleTaskAction(taskId, { kind: 'toggleSubtask', subtaskId }, true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (showReflection) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTaskDialogOpen()) return;
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
    const baseCleared = clearAllLocalData(false);
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

    if (workspace) await cloudSync.clearCloud(nextAppData);
    else await clearAllLocalDataWithLock(nextAppData);
    setSession({ appData: nextAppData, focusTimer: null, selectedFocusTaskId: null, completedFocusTask: null, pendingTaskCompletion: null, completionNotice: null });
  }, [appData.settings, cloudSync, workspace]);

  const handleImportBackup = async (text: string) => {
    const imported = importDataFromJson(text, false);
    if (workspace) {
      setAppData(previous => ({
        ...imported,
        settings: { ...imported.settings, openRouter: previous.settings.openRouter },
      }));
      return;
    }
    if (!await flushAppDataSaveWithLock() || !await saveAppDataWithLock(imported)) {
      throw new Error('The workspace could not be replaced safely. Keep your backup file and reload LaunchPAD before trying again.');
    }
    setAppData(imported);
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
      return updated;
    });
    setIsBackupDismissed(true);
  };

  const daysSinceBackup = Math.floor(
    (Date.now() - (appData.gamification?.lastBackupTimestamp || 0)) / (1000 * 60 * 60 * 24)
  );

  return (
    <FeatureGuideProvider>
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
        newTaskButtonRef={newTaskButton}
        onOpenScratchpad={() => setIsQuickNotesOpen(true)}
      />

      {completionNotice && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm">
          <p role="alert">{completionNotice}</p>
          <button type="button" className="min-h-10 shrink-0 rounded px-2 font-semibold underline underline-offset-2" onClick={() => setSession(prev => ({ ...prev, completionNotice: null }))}>
            Dismiss
          </button>
        </div>
      )}

      {!workspace && cloudNotice && (
        <button type="button" onClick={openSettings}
          className="hidden md:block shrink-0 truncate border-b border-teal-700/20 bg-teal-500/10 px-4 py-1.5 text-left text-xs">
          {cloudNotice}
        </button>
      )}

      {workspace && cloudSync.cacheError && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm">
          <p role="alert">This device couldn’t save an offline copy. Export a backup before leaving.</p>
          <button type="button" onClick={handleQuickBackup}
            className="min-h-10 rounded px-1 font-semibold underline underline-offset-2">
            Export backup
          </button>
        </div>
      )}
      <WorkspaceRecoveryNotice
        workspace={workspace}
        conflict={workspace ? cloudSync.cacheConflict : primarySaveStatus === 'conflict'}
        data={appData}
      />
      {!workspace && primarySaveStatus === 'failed' && (
        <p role="alert" className="shrink-0 border-b border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-950">
          Your latest changes could not be saved on this device. Export a backup from Settings before closing LaunchPAD.
        </p>
      )}
      {!workspace && primarySaveStatus === 'saved' && backupStatus === 'stale' && (
        <p role="alert" className="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          Your latest changes were saved, but the recovery copy could not be updated. Export a backup from Settings to protect recent work.
        </p>
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
          castleActive={!!appData.castleEconomy}
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
                  onUpdateAppData={setAppData}
                  onImportBackup={handleImportBackup}
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
              className="launchpad-print-view flex-1 h-full min-w-0 p-0 overflow-hidden @container"
            >
              <Suspense fallback={<div className="p-8 text-center text-sm text-serene-text-muted">Loading Growth & Mastery...</div>}>
                <GrowthMasteryScreen
                  castleEconomy={appData.castleEconomy}
                  tasks={appData.quickNotes}
                  reflections={appData.reflections || []}
                  onPartialProgress={taskId => setPartialEntry({ taskId, date: formatDateKey(new Date()), id: crypto.randomUUID() })}
                  onReflectCompleted={openCompletedTaskReflection}
                  onDailyReview={openDailyReflection}
                  today={dayKey}
                  onCastleChange={(operation, onFailure) => setAppData(prev => {
                    try {
                      if (!prev.castleEconomy) throw new Error('Accountability is no longer active.');
                      const castleEconomy = operation(prev.castleEconomy, prev.quickNotes);
                      return castleEconomy === prev.castleEconomy ? prev : { ...prev, castleEconomy };
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Could not complete this action.';
                      queueMicrotask(() => onFailure(message));
                      return prev;
                    }
                  })}
                  gamification={appData.gamification}
                  growthHistory={appData.growthHistory}
                  onSelectHero={(id) => {
                    setAppData((prev) => {
                      const updated = { ...prev, gamification: { ...prev.gamification, activeHeroId: id } };
                      return updated;
                    });
                  }}
                  onExportBackup={handleQuickBackup}
                  onImportBackup={handleImportBackup}
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
              className="launchpad-print-view flex-1 h-full min-w-0 p-0 overflow-hidden @container"
            >
              <Suspense fallback={<div className="p-8 text-center text-sm text-serene-text-muted">Loading Tasks...</div>}>
                <TaskManagementScreen
                  createTaskRequested={createTaskRequested}
                  requestedFormTrigger={taskFormTrigger.current}
                  onCreateTaskOpened={() => setCreateTaskRequested(false)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  notes={appData.quickNotes}
                  view={taskView}
                  now={now}
                  onUpdateNotes={handleUpdateNotes}
                  onViewTask={openTaskDetails}
                  onBackToDashboard={() => {
                    setEditingTaskIdForScreen(null);
                    setActiveView('dashboard');
                  }}
                  initialTaskId={editingTaskIdForScreen}
                  onInitialTaskOpened={() => setEditingTaskIdForScreen(null)}
                  onTaskAction={handleTaskAction}
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
              className="launchpad-print-view mobile-home flex-1 h-full min-w-0 px-2 py-3 sm:p-5 lg:p-6 overflow-y-auto @container"
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
                    onPreviewTask={openTaskDetails}
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
                    onOpenTasks={() => setActiveView('tasks')}
                  />
                </div>
                <div className="min-w-0 @6xl:col-span-12">
                  <CommitmentRadarWidget
                    tasks={appData.quickNotes}
                    onSelectTask={setSelectedFocusTaskId}
                    onPreviewTask={openTaskDetails}
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
                  onToggleTask={id => handleTaskAction(id, { kind: 'toggleTask' })}
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

      {taskDetails && viewingTask && (
        <TaskPreviewPopUp
          key={viewingTask.id}
          task={viewingTask}
          now={now}
          clockFormat={appData.settings.clockFormat}
          returnFocus={taskDetails.trigger}
          fallbackFocus={newTaskButton}
          onClose={() => setTaskDetails(null)}
          onEdit={() => openTaskEdit(viewingTask.id, taskDetails.trigger)}
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
          taskFormTrigger.current = null;
          setCreateTaskRequested(true);
          setActiveView('tasks');
        }}
      />

      {pendingTaskCompletion && (
        <ActualTimeDialog
          tasks={[pendingTaskCompletion.previewTask]}
          description="Enter the total time spent on this task, including any previously recorded work."
          submitLabel="Mark complete"
          onCancel={() => cancelTaskCompletion(pendingTaskCompletion)}
          onSave={minutes => confirmTaskCompletion(pendingTaskCompletion, minutes[pendingTaskCompletion.originalTask.id])}
        />
      )}
      {partialEntry && partialEntry.minutes === undefined && appData.quickNotes.some(task => task.id === partialEntry.taskId) && (
        <ActualTimeDialog tasks={appData.quickNotes.filter(task => task.id === partialEntry.taskId).map(task => ({ ...task, actualMinutes: undefined, partialMinutes: undefined }))} maxMinutes={525600 - (appData.quickNotes.find(task => task.id === partialEntry.taskId)?.partialMinutes || 0)} description="Enter only the additional minutes worked since your last progress entry. Your reflection comes next." onCancel={() => setPartialEntry(null)} onSave={values => setPartialEntry(entry => entry ? { ...entry, minutes: values[entry.taskId] } : null)} />
      )}
      {partialEntry && partialEntry.minutes !== undefined && (
        <TaskClearReflection error={partialError} onClose={() => { setPartialError(undefined); setPartialEntry(null); }} onSubmit={(questions, answers) => {
          if (questions.length !== 5 || answers.length !== 5 || answers.some(answer => answer.trim().split(/\s+/u).filter(Boolean).length < 150)) return;
          const entry = partialEntry;
          const submittedAt = new Date();
          setPartialError(undefined);
          setPartialSubmission(partialProgressLedgerId(entry.taskId, entry.date, entry.id));
          setAppData(prev => {
            try {
              return entry.minutes === undefined ? prev : applyPartialTaskReflection(prev, { ...entry, minutes: entry.minutes }, submittedAt, questions, answers);
            } catch {
              return prev;
            }
          });
        }} />
      )}
      {showDailyReflection && (
        <TaskClearReflection
          mode="daily"
          onClose={() => setShowDailyReflection(false)}
          onSubmit={(questions, answers) => {
            const date = new Date().toISOString();
            setAppData(prev => ({
              ...prev,
              reflections: [...(prev.reflections || []), { date, questions, answers, taskTitles: [] }],
            }));
            setShowDailyReflection(false);
          }}
        />
      )}
      {showReflection && reflectionReady && !showDailyReflection && !partialEntry && !pendingTaskCompletion && needsActualTime && (
        <ActualTimeDialog tasks={timedReflectionTasks} description="Enter the total time spent on each task, including any previously recorded partial work. Your reflection comes next." onSave={minutes => setAppData(prev => ({ ...prev, quickNotes: prev.quickNotes.map(task => typeof minutes[task.id] === 'number' ? { ...task, actualMinutes: minutes[task.id] } : task) }))} onCancel={() => {
          setShowReflection(false);
          setAppData(prev => ({ ...prev, quickNotes: resetReflectionTasks(prev.quickNotes, reflectionStartedAt ?? new Date(), prev.castleEconomy, manualReflectionIds ?? undefined) }));
          setReflectionStartedAt(null);
          setManualReflectionIds(null);
        }} />
      )}
      {showReflection && reflectionReady && !showDailyReflection && !partialEntry && !pendingTaskCompletion && !needsActualTime && (
        <TaskClearReflection
          style={appData.settings.confettiStyle}
          error={reflectionError}
          onClose={() => {
            setShowReflection(false);
            setAppData((prev) => ({ ...prev, quickNotes: resetReflectionTasks(prev.quickNotes, reflectionStartedAt ?? new Date(), prev.castleEconomy, manualReflectionIds ?? undefined) }));
            setReflectionStartedAt(null);
            setManualReflectionIds(null);
          }}
          onSubmit={(questions, answers) => {
            if (questions.length !== 5 || answers.length !== 5
              || answers.some((answer) => answer.trim().split(/\s+/u).filter(Boolean).length < 150)) return;
            const reflectionDate = reflectionStartedAt ?? new Date();
            const submittedAt = new Date();
            const completedTasks = reflectionTasks;
            if (!completedTasks.length) return;
            const completedIds = new Set(completedTasks.map(task => task.id));
            setReflectionError(undefined);
            setReflectionSubmission([...completedIds]);
            setAppData((prev) => {
              const completed = prev.quickNotes.filter(task => completedIds.has(task.id) && task.isDone && task.pendingReflection);
              if (!completed.length) return prev;
              try {
                return applyCompletedTaskReflection(prev, reflectionDate, submittedAt, questions, answers, completed);
              } catch {
                return prev;
              }
            });
          }}
        />
      )}
      {showReflectionCelebration && <ConfettiOverlay style={appData.settings.confettiStyle} />}
    </div>
    </IconContext.Provider>
    </MotionConfig>
    </FeatureGuideProvider>
  );
}

export default function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<CloudWorkspace | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [cloudNotice, setCloudNotice] = useState<string>();
  const switchWorkspace = useCallback(async (next: CloudWorkspace | null) => {
    await flushAppDataSaveWithLock();
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

  const localStorageError = useMemo(() => {
    if (restoring || workspace) return null;
    try { loadAppData(); return null; } catch (error) { return error; }
  }, [restoring, workspace, recoveryAttempt]);

  if (restoring) return <main className="p-6" role="status">Opening LaunchPAD…</main>;
  if (localStorageError) return <StorageRecovery hasRollingBackup={localStorageError instanceof StorageRecoveryError && !!localStorageError.backup} onRecovered={() => setRecoveryAttempt(value => value + 1)} />;
  const key = workspace ? `${workspace.project.url}:${workspace.userId}` : 'local';
  return <App key={key} workspace={workspace} onSwitchWorkspace={switchWorkspace} cloudNotice={cloudNotice} />;
}
