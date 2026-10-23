import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X as CloseIcon,
  Lightbulb
} from 'lucide-react';
import { 
  AppData, 
  ThemeMode,
  RecommendationCandidate,
  PetSettings,
  QuickNote,
} from './types';
import { loadAppData, saveAppData, saveAppDataDebounced, exportDataAsJson, importDataFromJson } from './utils/storage';
import { recordTaskCompletion } from './utils/gamification';
import { DEFAULT_SEED_DATA } from './data/seedData';
import { Header } from './components/Header/Header';
import { BackupReminderToast } from './components/Layout/BackupReminderToast';
import { Sidebar } from './components/Sidebar/Sidebar';
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
const ConfettiOverlay = lazy(() =>
  import('./components/Dashboard/ConfettiOverlay').then((m) => ({ default: m.ConfettiOverlay }))
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

export function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
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
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSparkIdeaModalOpen, setIsSparkIdeaModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isBackupDismissed, setIsBackupDismissed] = useState(false);
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string | null>(null);
  const [editingTaskIdForScreen, setEditingTaskIdForScreen] = useState<string | null>(null);

  // Live clock tick for time radar calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Sync state changes to localStorage debounced
  useEffect(() => {
    saveAppDataDebounced(appData);
  }, [appData]);

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
  const [focusTimer, setFocusTimer] = useState<FocusTimerState | null>(() => loadFocusTimer());

  // Save timer whenever state changes
  useEffect(() => {
    saveFocusTimer(focusTimer);
  }, [focusTimer]);

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
      const { updatedTasks, toggledTask, isNowDone } = toggleTaskInList(prev.quickNotes, taskId);
      if (isNowDone && toggledTask) {
        const gamificationResult = recordTaskCompletion(
          prev.gamification,
          prev.growthHistory,
          toggledTask
        );
        return {
          ...prev,
          quickNotes: updatedTasks,
          gamification: gamificationResult.gamification,
          growthHistory: gamificationResult.history,
        };
      }
      return { ...prev, quickNotes: updatedTasks };
    });

    if (selectedFocusTaskId === taskId && becomingDone) {
      setSelectedFocusTaskId(null);
    }
  }, [appData.quickNotes, focusTimer, selectedFocusTaskId]);

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setAppData((prev) => {
      const { updatedTasks, parentTask, parentBecameDone } = toggleSubtaskInList(prev.quickNotes, taskId, subtaskId);

      if (parentBecameDone && parentTask) {
        const gamificationResult = recordTaskCompletion(
          prev.gamification,
          prev.growthHistory,
          parentTask
        );
        return {
          ...prev,
          quickNotes: updatedTasks,
          gamification: gamificationResult.gamification,
          growthHistory: gamificationResult.history,
        };
      }
      return { ...prev, quickNotes: updatedTasks };
    });
  }, []);

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
    uiActive: isSettingsModalOpen || isSparkIdeaModalOpen || isQuickNotesOpen,
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
        const syncedNotes = syncCalendarEventsToQuickNotes(prev.quickNotes, events);
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
        saveAppData(updated);
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

  const currentSuggestion = useMemo(() => {
    const ranked = getRankedRecommendations(candidatePool, appData.learnedPreferences, timeOfDay, 1);
    return ranked[0] || null;
  }, [candidatePool, appData.learnedPreferences, timeOfDay]);

  const handleRejectSuggestion = useCallback((candidate: RecommendationCandidate) => {
    const updatedPrefs = recordRejection(appData.learnedPreferences, candidate, timeOfDay);
    setAppData((prev) => ({
      ...prev,
      learnedPreferences: updatedPrefs,
    }));
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
  }, [appData.learnedPreferences, timeOfDay]);

  // All-tasks-cleared celebration
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [showAllClearSuggestion, setShowAllClearSuggestion] = useState(
    () => appData.quickNotes.every((t) => t.isDone)
  );

  useEffect(() => {
    const prev = prevPendingCountRef.current;
    if (prev > 0 && pendingTaskCount === 0 && appData.quickNotes.length > 0) {
      setIsCelebrating(true);
      setShowAllClearSuggestion(true);
      const timer = setTimeout(() => setIsCelebrating(false), 4000);
      return () => clearTimeout(timer);
    }
    if (pendingTaskCount === 0 && appData.quickNotes.length > 0) {
      setShowAllClearSuggestion(true);
    }
  }, [pendingTaskCount, appData.quickNotes.length]);

  // Keyboard shortcuts
  useEffect(() => {
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

      // Escape -> close open modals or drawers
      if (e.key === 'Escape') {
        if (isSparkIdeaModalOpen) setIsSparkIdeaModalOpen(false);
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
        } else if (e.key.toLowerCase() === 'r' && currentSuggestion) {
          e.preventDefault();
          handleRejectSuggestion(currentSuggestion);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSparkIdeaModalOpen, isSettingsModalOpen, isMobileSidebarOpen, isQuickNotesOpen, currentSuggestion, handleRejectSuggestion]);

  const handleUpdateNotes = (newNotes: QuickNote[]) => {
    setAppData((prev) => ({ ...prev, quickNotes: newNotes }));
  };

  const handleUpdateScratchpad = (text: string) => {
    setAppData((prev) => ({ ...prev, scratchpadText: text }));
  };

  const handleResetData = () => {
    setAppData(DEFAULT_SEED_DATA);
    saveAppData(DEFAULT_SEED_DATA);
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
      saveAppData(updated);
      return updated;
    });
    setIsBackupDismissed(true);
  };

  const daysSinceBackup = Math.floor(
    (Date.now() - (appData.gamification?.lastBackupTimestamp || 0)) / (1000 * 60 * 60 * 24)
  );

  return (
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
        onToggleQuickNotes={() => setIsQuickNotesOpen(!isQuickNotesOpen)}
        isQuickNotesOpen={isQuickNotesOpen}
        theme={appData.settings.theme}
        onThemeChange={handleThemeChange}
        activeView={activeView}
        onSelectView={setActiveView}
        pendingTasksCount={taskLoad.pendingCount}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

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
          suggestionCandidate={currentSuggestion}
          onApproveSuggestion={handleApproveSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
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
                      saveAppData(updated);
                      return updated;
                    });
                  }}
                  onExportBackup={handleQuickBackup}
                  onImportBackup={(jsonStr) => {
                    try {
                      const imported = importDataFromJson(jsonStr);
                      setAppData(imported);
                      saveAppData(imported);
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
              className="flex-1 h-full min-w-0 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-5 lg:pb-6 overflow-y-auto space-y-5 @container"
            >
              <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                {/* ROW 1: PRIMARY FOCUS (Full Width) */}
                <div className="w-full flex flex-col">
                  <PrimaryFocusCard
                    tasks={appData.quickNotes}
                    selectedTaskId={selectedFocusTaskId}
                    onSelectTask={(id) => setSelectedFocusTaskId(id)}
                    onPreviewTask={(id) => setSelectedFocusTaskId(id)}
                    onToggleTask={handleToggleTaskWithTimer}
                    onToggleSubtask={handleToggleSubtask}
                    onOpenTaskEdit={() => {
                      if (selectedFocusTaskId) {
                        setEditingTaskIdForScreen(selectedFocusTaskId);
                      }
                      setActiveView('tasks');
                    }}
                    onOpenCalendarSettings={() => setIsSettingsModalOpen(true)}
                    clockFormat={appData.settings.clockFormat}
                    focusTimer={focusTimer}
                    onTimerStart={handleTimerStart}
                    onTimerPause={handleTimerPause}
                    onTimerResume={handleTimerResume}
                    onTimerEnd={handleTimerEnd}
                    showSuggestion={showAllClearSuggestion}
                    suggestionCandidate={currentSuggestion}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
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
                approvalsCount={appData.learnedPreferences.approvalsCount}
                rejectionsCount={appData.learnedPreferences.rejectionsCount}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            appData={appData}
            onUpdateAppData={setAppData}
            onResetData={handleResetData}
            onSyncCalendar={() => handleSyncCalendar(false)}
            isSyncingCalendar={isSyncingCalendar}
          />
        </Suspense>
      )}

      {/* Fullscreen celebration */}
      {isCelebrating && (
        <Suspense fallback={null}>
          <ConfettiOverlay style={appData.settings.confettiStyle || 'cascade'} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
