import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowLeft, 
  Grid, 
  List, 
  Plus, 
  Folder as FolderIcon 
} from 'lucide-react';
import { 
  AppData, 
  Folder, 
  LinkItem, 
  DailyFocus, 
  QuickNote, 
  ThemeMode,
  RecommendationCandidate 
} from './types';
import { loadAppData, saveAppData } from './utils/storage';
import { DEFAULT_SEED_DATA } from './data/seedData';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FocusHeroBanner } from './components/Dashboard/FocusHeroBanner';
import { TimeRadarWidget } from './components/Dashboard/TimeRadarWidget';
import { SmartSuggestionCard } from './components/Dashboard/SmartSuggestionCard';
import { FolderCard } from './components/LinkGrid/FolderCard';
import { CategorySection } from './components/LinkGrid/CategorySection';
import { CompactIconGrid } from './components/LinkGrid/CompactIconGrid';
import { QuickNotesWidget } from './components/QuickNotes/QuickNotesWidget';
import { TaskManagementScreen } from './components/Tasks/TaskManagementScreen';
import { AddEditLinkModal } from './components/Modals/AddEditLinkModal';
import { ManageFoldersModal } from './components/Modals/ManageFoldersModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { 
  calculateDayTimeRemaining, 
  calculateTaskLoad, 
  calculateBuffer, 
  getTimeOfDayBucket 
} from './utils/timeBudget';
import { 
  generateCandidatePool, 
  getRankedRecommendations, 
  recordApproval, 
  recordRejection,
  fetchOpenRouterIdea
} from './utils/recommender';
import { 
  pageTransitionVariants, 
  drawerVariants, 
  staggerContainerVariants, 
  staggerItemVariants 
} from './utils/motion';

export function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks'>('dashboard');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'boxy' | 'sections'>('boxy');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageFoldersOpen, setIsManageFoldersOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [defaultFolderForAdd, setDefaultFolderForAdd] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiCustomIdea, setAiCustomIdea] = useState<RecommendationCandidate | null>(null);

  // Live clock tick for time radar calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save on state change
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const mode = appData.settings.theme;
      if (mode === 'dark') {
        root.classList.add('dark');
      } else if (mode === 'light') {
        root.classList.remove('dark');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (appData.settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appData.settings.theme]);

  // Time Budget & Capacity Calculations
  const timeRemaining = useMemo(() => {
    return calculateDayTimeRemaining(
      now, 
      appData.settings.daySchedule.startHour, 
      appData.settings.daySchedule.endHour
    );
  }, [now, appData.settings.daySchedule]);

  const taskLoad = useMemo(() => {
    return calculateTaskLoad(appData.quickNotes, appData.dailyFocus);
  }, [appData.quickNotes, appData.dailyFocus]);

  const buffer = useMemo(() => {
    return calculateBuffer(timeRemaining.totalMinutes, taskLoad.pendingMinutes);
  }, [timeRemaining.totalMinutes, taskLoad.pendingMinutes]);

  const timeOfDay = useMemo(() => getTimeOfDayBucket(now), [now]);

  // Recommender Engine: Candidates & Scored Suggestions
  const candidatePool = useMemo(() => {
    return generateCandidatePool(appData.links, appData.folders);
  }, [appData.links, appData.folders]);

  const currentSuggestion = useMemo(() => {
    if (aiCustomIdea) return aiCustomIdea;
    const ranked = getRankedRecommendations(candidatePool, appData.learnedPreferences, timeOfDay, 1);
    return ranked[0] || null;
  }, [candidatePool, appData.learnedPreferences, timeOfDay, aiCustomIdea]);

  // Approve & Reject Suggestion Handlers
  const handleApproveSuggestion = useCallback((candidate: RecommendationCandidate) => {
    const updatedPrefs = recordApproval(appData.learnedPreferences, candidate, timeOfDay);
    setAppData((prev) => ({
      ...prev,
      learnedPreferences: updatedPrefs,
    }));
    setAiCustomIdea(null);
  }, [appData.learnedPreferences, timeOfDay]);

  const handleRejectSuggestion = useCallback((candidate: RecommendationCandidate) => {
    const updatedPrefs = recordRejection(appData.learnedPreferences, candidate, timeOfDay);
    setAppData((prev) => ({
      ...prev,
      learnedPreferences: updatedPrefs,
    }));
    setAiCustomIdea(null);
  }, [appData.learnedPreferences, timeOfDay]);

  const handleFetchAiIdea = async () => {
    if (!appData.settings.openRouter.apiKey) {
      setIsSettingsModalOpen(true);
      return;
    }
    setIsAiLoading(true);
    const idea = await fetchOpenRouterIdea(
      appData.settings.openRouter.apiKey,
      appData.settings.openRouter.model,
      appData.dailyFocus.goal || 'Productive learning'
    );
    setIsAiLoading(false);
    if (idea) {
      setAiCustomIdea(idea);
    } else {
      alert('Could not fetch idea from OpenRouter. Please verify your API key.');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+K / Cmd+K -> Focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }

      // Escape -> close open modals, drawers, or return to all folders
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        else if (isManageFoldersOpen) setIsManageFoldersOpen(false);
        else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        else if (isQuickNotesOpen) setIsQuickNotesOpen(false);
        else if (selectedFolderId !== null) setSelectedFolderId(null);
        return;
      }

      // Quick keybinds (only when not inside an input)
      if (!isInput) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setEditingLink(null);
          setDefaultFolderForAdd(undefined);
          setIsAddModalOpen(true);
        } else if (e.key.toLowerCase() === 'q') {
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
  }, [isAddModalOpen, isManageFoldersOpen, isSettingsModalOpen, selectedFolderId, currentSuggestion, handleRejectSuggestion]);

  // Handlers for Links
  const handleSaveLink = (linkData: Omit<LinkItem, 'id' | 'createdAt'>, linkId?: string) => {
    if (linkId) {
      setAppData((prev) => ({
        ...prev,
        links: prev.links.map((link) =>
          link.id === linkId ? { ...link, ...linkData } : link
        ),
      }));
    } else {
      const newLink: LinkItem = {
        ...linkData,
        id: `link-${Date.now()}`,
        createdAt: Date.now(),
      };
      setAppData((prev) => ({
        ...prev,
        links: [newLink, ...prev.links],
      }));
    }
    setEditingLink(null);
  };

  const handleDeleteLink = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== id),
    }));
  };

  const handleToggleFavorite = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
      ),
    }));
  };

  const handleMoveFolder = (linkId: string, targetFolderId: string) => {
    setAppData((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l.id === linkId ? { ...l, folderId: targetFolderId } : l
      ),
    }));
  };

  const handleLinkClick = (link: LinkItem) => {
    setAppData((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l.id === link.id
          ? { ...l, clickCount: (l.clickCount || 0) + 1, lastOpenedAt: Date.now() }
          : l
      ),
    }));
  };

  const handleOpenAddModalForFolder = (folderId: string) => {
    setEditingLink(null);
    setDefaultFolderForAdd(folderId);
    setIsAddModalOpen(true);
  };

  const handleEditLink = (link: LinkItem) => {
    setEditingLink(link);
    setIsAddModalOpen(true);
  };

  // Handlers for Folders
  const handleSaveFolders = (newFolders: Folder[]) => {
    setAppData((prev) => ({
      ...prev,
      folders: newFolders,
    }));
  };

  // Handlers for Daily Focus & Notes
  const handleUpdateDailyFocus = (focusUpdates: Partial<DailyFocus>) => {
    setAppData((prev) => ({
      ...prev,
      dailyFocus: {
        ...prev.dailyFocus,
        ...focusUpdates,
      },
    }));
  };

  const handleUpdateNotes = (quickNotes: QuickNote[]) => {
    setAppData((prev) => ({
      ...prev,
      quickNotes,
    }));
  };

  const handleToggleTask = (taskId: string) => {
    setAppData((prev) => ({
      ...prev,
      quickNotes: prev.quickNotes.map((task) =>
        task.id === taskId ? { ...task, isDone: !task.isDone } : task
      ),
    }));
  };

  const handleUpdateScratchpad = (scratchpadText: string) => {
    setAppData((prev) => ({
      ...prev,
      scratchpadText,
    }));
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setAppData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: newTheme,
      },
    }));
  };

  const handleResetData = () => {
    setAppData(DEFAULT_SEED_DATA);
    setSelectedFolderId(null);
  };

  // Filtered Links Calculation
  const filteredLinks = useMemo(() => {
    return appData.links.filter((link) => {
      if (selectedFolderId === 'favorites') {
        if (!link.isFavorite) return false;
      } else if (selectedFolderId !== null) {
        if (link.folderId !== selectedFolderId) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = link.title.toLowerCase().includes(q);
        const matchesUrl = link.url.toLowerCase().includes(q);
        const matchesDesc = link.description?.toLowerCase().includes(q) ?? false;
        const matchesTags = link.tags.some((tag) => tag.toLowerCase().includes(q));
        const folderName = appData.folders.find((f) => f.id === link.folderId)?.name.toLowerCase() || '';
        const matchesFolder = folderName.includes(q);

        return matchesTitle || matchesUrl || matchesDesc || matchesTags || matchesFolder;
      }

      return true;
    });
  }, [appData.links, appData.folders, selectedFolderId, searchQuery]);

  const activeFolder = useMemo(() => {
    if (selectedFolderId && selectedFolderId !== 'favorites') {
      return appData.folders.find((f) => f.id === selectedFolderId);
    }
    return null;
  }, [appData.folders, selectedFolderId]);

  // Context-Aware Intercept Condition:
  const hasPendingTasks = taskLoad.pendingCount > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
      {/* Streamlined Single-Row Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => {
          setEditingLink(null);
          setDefaultFolderForAdd(selectedFolderId && selectedFolderId !== 'favorites' ? selectedFolderId : undefined);
          setIsAddModalOpen(true);
        }}
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

      {/* Main Workspace Layout (Fluid Viewport with Independent Scroll Areas) */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Sidebar: Fixed in place, only scrolled when user scrolls inside sidebar */}
        <Sidebar
          folders={appData.folders}
          links={appData.links}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onOpenManageFolders={() => setIsManageFoldersOpen(true)}
          onOpenAddFolder={() => setIsManageFoldersOpen(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentView={activeView}
          onSelectView={setActiveView}
          pendingTasksCount={taskLoad.pendingCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content Area: Independent scroll container with container queries */}
        <AnimatePresence mode="wait" initial={false}>
          {activeView === 'tasks' ? (
            <motion.main
              key="tasks-view"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 h-full min-w-0 p-0 overflow-hidden @container"
            >
              <TaskManagementScreen
                notes={appData.quickNotes}
                scratchpadText={appData.scratchpadText}
                onUpdateNotes={handleUpdateNotes}
                onUpdateScratchpad={handleUpdateScratchpad}
                onBackToDashboard={() => setActiveView('dashboard')}
              />
            </motion.main>
          ) : (
            <motion.main
              key="dashboard-view"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 h-full min-w-0 p-3 sm:p-5 lg:p-6 overflow-y-auto space-y-5 @container"
            >
            
            {/* Top Widgets: Only visible in All Resources page (selectedFolderId === null && !searchQuery) */}
            {selectedFolderId === null && !searchQuery && (
              <>
                {/* CONTEXT-AWARE HERO INTERCEPT (Focus task on left, Time Radar in former quote space on right, horizontal quote below) */}
                {hasPendingTasks || !currentSuggestion ? (
                  <FocusHeroBanner
                    dailyFocus={appData.dailyFocus}
                    onUpdateDailyFocus={handleUpdateDailyFocus}
                    clockFormat={appData.settings.clockFormat}
                    showQuotes={appData.settings.showQuotes}
                    tasks={appData.quickNotes}
                    onToggleTask={handleToggleTask}
                    onOpenTasksScreen={() => setActiveView('tasks')}
                    timeRemaining={timeRemaining}
                    taskLoad={taskLoad}
                    buffer={buffer}
                    endHour={appData.settings.daySchedule.endHour}
                  />
                ) : (
                  <div className="@container w-full">
                    <div className="grid grid-cols-1 @2xl:grid-cols-12 gap-3.5 sm:gap-4 animate-fadeIn">
                      <div className="@2xl:col-span-7">
                        <SmartSuggestionCard
                          candidate={currentSuggestion}
                          onApprove={handleApproveSuggestion}
                          onReject={handleRejectSuggestion}
                          onFetchAiIdea={handleFetchAiIdea}
                          isOpenRouterEnabled={appData.settings.openRouter.enabled}
                          isAiLoading={isAiLoading}
                          approvalsCount={appData.learnedPreferences.approvalsCount}
                          rejectionsCount={appData.learnedPreferences.rejectionsCount}
                        />
                      </div>
                      <div className="@2xl:col-span-5 flex flex-col">
                        <TimeRadarWidget
                          timeRemaining={timeRemaining}
                          taskLoad={taskLoad}
                          buffer={buffer}
                          endHour={appData.settings.daySchedule.endHour}
                          onOpenTasks={() => setActiveView('tasks')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          {/* 3. Navigation Sub-Bar & Breadcrumb Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
            <div className="flex items-center gap-3">
              {/* Back to all folders button when in a folder */}
              {selectedFolderId !== null && (
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className="p-1.5 rounded-lg bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark border border-serene-border-light dark:border-serene-border-dark transition-colors"
                  title="Back to All Folders (Esc)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    {selectedFolderId === null && (searchQuery ? 'Search Results' : 'Resource Spaces & Folders')}
                    {selectedFolderId === 'favorites' && 'Starred Favorites'}
                    {activeFolder && activeFolder.name}
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border border-serene-border-light dark:border-serene-border-dark">
                    {selectedFolderId === null && !searchQuery
                      ? `${appData.folders.length} folders • ${appData.links.length} links`
                      : `${filteredLinks.length} ${filteredLinks.length === 1 ? 'item' : 'items'}`}
                  </span>
                </div>
                {activeFolder?.description && (
                  <p className="text-xs text-serene-text-muted mt-0.5">
                    {activeFolder.description}
                  </p>
                )}
              </div>
            </div>

            {/* View switcher & Quick Action */}
            <div className="flex items-center gap-2">
              {selectedFolderId === null && !searchQuery && (
                <div className="flex items-center bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark p-1 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                  <button
                    onClick={() => setViewMode('boxy')}
                    title="Boxy Folders View"
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                      viewMode === 'boxy'
                        ? 'bg-white dark:bg-serene-surface-dark text-serene-primary dark:text-serene-primary-dark shadow-2xs font-semibold'
                        : 'text-serene-text-muted hover:text-serene-text-primary'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Folder Tiles</span>
                  </button>
                  <button
                    onClick={() => setViewMode('sections')}
                    title="Expanded Sections View"
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                      viewMode === 'sections'
                        ? 'bg-white dark:bg-serene-surface-dark text-serene-primary dark:text-serene-primary-dark shadow-2xs font-semibold'
                        : 'text-serene-text-muted hover:text-serene-text-primary'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Expanded</span>
                  </button>
                </div>
              )}

              {activeFolder && (
                <button
                  onClick={() => handleOpenAddModalForFolder(activeFolder.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {activeFolder.name}</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. MAIN CONTENT VIEWS */}
          {searchQuery.trim() || selectedFolderId === 'favorites' ? (
            <div>
              {filteredLinks.length > 0 ? (
                <div className="p-1 animate-fadeIn">
                  <CompactIconGrid
                    links={filteredLinks}
                    folders={appData.folders}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={handleEditLink}
                    onDelete={handleDeleteLink}
                    onMoveFolder={handleMoveFolder}
                    onLinkClick={handleLinkClick}
                    openInNewTab={appData.settings.openInNewTab}
                  />
                </div>
              ) : (
                <div className="py-16 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-white/40 dark:bg-serene-surface-dark/40">
                  <div className="w-12 h-12 mx-auto rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark flex items-center justify-center text-serene-text-muted mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    No matching resources found
                  </h3>
                  <p className="text-xs text-serene-text-muted mt-1 max-w-sm mx-auto">
                    Try searching with different keywords or add a new bookmark.
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-3 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-lg text-xs font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : selectedFolderId !== null && activeFolder ? (
            <div>
              {filteredLinks.length > 0 ? (
                <div className="p-1 animate-fadeIn">
                  <CompactIconGrid
                    links={filteredLinks}
                    folders={appData.folders}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={handleEditLink}
                    onDelete={handleDeleteLink}
                    onMoveFolder={handleMoveFolder}
                    onLinkClick={handleLinkClick}
                    openInNewTab={appData.settings.openInNewTab}
                  />
                </div>
              ) : (
                <div className="py-14 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-white/30 dark:bg-serene-surface-dark/30">
                  <FolderIcon className="w-10 h-10 mx-auto text-serene-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-serene-text-muted mb-3">
                    No bookmarks inside <strong>{activeFolder.name}</strong> yet.
                  </p>
                  <button
                    onClick={() => handleOpenAddModalForFolder(activeFolder.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add first link to {activeFolder.name}
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'boxy' ? (
            <div className="space-y-6">
              <motion.div 
                className="grid grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 gap-3.5 sm:gap-4"
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
              >
                {appData.folders.map((folder) => {
                  const linksInFolder = appData.links.filter((l) => l.folderId === folder.id);
                  return (
                    <motion.div key={folder.id} variants={staggerItemVariants}>
                      <FolderCard
                        folder={folder}
                        links={linksInFolder}
                        onOpenFolder={(folderId) => setSelectedFolderId(folderId)}
                        onAddLinkToFolder={handleOpenAddModalForFolder}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Pinned / Starred Quick Dial Strip */}
              {appData.links.some((l) => l.isFavorite) && (
                <div className="pt-4 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
                        Pinned Quick Access
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedFolderId('favorites')}
                      className="text-xs text-serene-primary dark:text-serene-primary-dark hover:underline"
                    >
                      View all favorites ({appData.links.filter((l) => l.isFavorite).length}) →
                    </button>
                  </div>

                  <div className="p-1">
                    <CompactIconGrid
                      links={appData.links.filter((l) => l.isFavorite)}
                      folders={appData.folders}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={handleEditLink}
                      onDelete={handleDeleteLink}
                      onMoveFolder={handleMoveFolder}
                      onLinkClick={handleLinkClick}
                      openInNewTab={appData.settings.openInNewTab}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {appData.folders.map((folder) => {
                const linksInFolder = appData.links.filter((l) => l.folderId === folder.id);

                return (
                  <CategorySection
                    key={folder.id}
                    folder={folder}
                    links={linksInFolder}
                    allFolders={appData.folders}
                    onToggleFavorite={handleToggleFavorite}
                    onEditLink={handleEditLink}
                    onDeleteLink={handleDeleteLink}
                    onMoveFolder={handleMoveFolder}
                    onAddLinkToFolder={handleOpenAddModalForFolder}
                    onLinkClick={handleLinkClick}
                    openInNewTab={appData.settings.openInNewTab}
                  />
                );
              })}
            </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>

        {/* Quick Notes Slide-over Panel */}
        <AnimatePresence>
          {isQuickNotesOpen && (
            <>
              {/* Mobile / Tablet Backdrop when drawer is open */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsQuickNotesOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
                aria-hidden="true"
              />
              <motion.aside
                variants={drawerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed lg:static right-0 top-0 lg:top-auto bottom-0 lg:bottom-auto w-80 max-w-[85vw] lg:w-88 2xl:w-96 h-full p-3 sm:p-4 border-l border-serene-border-light dark:border-serene-border-dark bg-white/95 dark:bg-serene-surface-dark/95 lg:bg-white/80 lg:dark:bg-serene-surface-dark/80 backdrop-blur-md shrink-0 overflow-y-auto z-40 lg:z-20 shadow-2xl lg:shadow-none"
              >
                <QuickNotesWidget
                  notes={appData.quickNotes}
                  scratchpadText={appData.scratchpadText}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdateScratchpad={handleUpdateScratchpad}
                  onClose={() => setIsQuickNotesOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AddEditLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveLink}
        editingLink={editingLink}
        folders={appData.folders}
        defaultFolderId={defaultFolderForAdd}
        onOpenAddFolder={() => setIsManageFoldersOpen(true)}
      />

      <ManageFoldersModal
        isOpen={isManageFoldersOpen}
        onClose={() => setIsManageFoldersOpen(false)}
        folders={appData.folders}
        onSaveFolders={handleSaveFolders}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appData={appData}
        onUpdateAppData={setAppData}
        onResetData={handleResetData}
      />
    </div>
  );
}
export default App;
