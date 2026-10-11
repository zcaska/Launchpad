import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowLeft, 
  Plus, 
  Folder as FolderIcon,
  BookmarkCheck,
  X as CloseIcon
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
import { CompactIconGrid } from './components/LinkGrid/CompactIconGrid';
import { CalendarScheduleTimeline } from './components/Calendar/CalendarScheduleTimeline';
import { QuickNotesWidget } from './components/QuickNotes/QuickNotesWidget';
import { TaskManagementScreen } from './components/Tasks/TaskManagementScreen';
import { AddEditLinkModal } from './components/Modals/AddEditLinkModal';
import { ManageFoldersModal } from './components/Modals/ManageFoldersModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { BookmarkImportModal } from './components/Modals/BookmarkImportModal';
import { ConfirmDeleteModal } from './components/Modals/ConfirmDeleteModal';
import { FolderActionDialog } from './components/Modals/FolderActionDialog';
import { classifyBookmark } from './utils/bookmarkClassifier';
import { calculateCalendarScheduleSummary } from './utils/calendarSchedule';
import { 
  fetchTodayGoogleEvents, 
  getInMemoryGoogleToken, 
  isGoogleTokenExpired 
} from './services/googleCalendarService';
import { normalizeUrl, createCustomFolder, isGenericBrowserFolder } from './utils/bookmarkParser';
import { initBookmarkSyncChannel, BookmarkSyncPayload } from './utils/bookmarkSyncChannel';
import { 
  getDescendantFolderIds, 
  getFolderBreadcrumbs,
  hideFolderWithSubfolders,
  hideFolderWithoutSubfolders,
  unhideFolderWithSubfolders,
  unhideFolderWithoutSubfolders,
  deleteFolderWithSubfolders,
  deleteFolderWithoutSubfolders
} from './utils/folderTree';
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
  drawerVariants 
} from './utils/motion';

export function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks'>('dashboard');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const isSyncingCalendarRef = useRef(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageFoldersOpen, setIsManageFoldersOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBookmarkImportOpen, setIsBookmarkImportOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [defaultFolderForAdd, setDefaultFolderForAdd] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiCustomIdea, setAiCustomIdea] = useState<RecommendationCandidate | null>(null);
  const [syncToast, setSyncToast] = useState<{ id: string; message: string; folderName: string } | null>(null);

  // Dedicated Confirmation Modal for Item/Bookmark Deletion
  const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
  const [isDeleteLinkModalOpen, setIsDeleteLinkModalOpen] = useState(false);

  // Root Folder Action Dialog for Sidebar & Root Actions
  const [sidebarFolderAction, setSidebarFolderAction] = useState<{
    folder: Folder;
    mode: 'hide' | 'unhide' | 'delete';
  } | null>(null);

  // Live clock tick for time radar calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Bookmark Sync Channel listener (BroadcastChannel & window message)
  useEffect(() => {
    const cleanup = initBookmarkSyncChannel((incoming: BookmarkSyncPayload | BookmarkSyncPayload[]) => {
      const incomingList = Array.isArray(incoming) ? incoming : [incoming];
      const validItems = incomingList.filter(item => item && item.url && item.url.trim().length > 0);
      if (validItems.length === 0) return;

      setAppData((prev) => {
        let currentFolders = [...prev.folders];
        const existingUrls = new Set(prev.links.map((l) => normalizeUrl(l.url)));
        const newLinksToAdd: LinkItem[] = [];
        let createdFolderCount = 0;
        let lastCategorizedFolderName = 'Bookmarks';

        for (const item of validItems) {
          const cleanUrl = item.url.trim();
          const normIncomingUrl = normalizeUrl(cleanUrl);

          // Prevent duplicate addition if URL already exists
          if (existingUrls.has(normIncomingUrl)) {
            continue;
          }
          existingUrls.add(normIncomingUrl);

          // Determine target folder based on hierarchy (up to 5 levels)
          let targetFolderId: string;
          let targetTags: string[] = item.tags || [];

          const hierarchyLevels = (item.folderHierarchy && item.folderHierarchy.length > 0
            ? item.folderHierarchy
            : item.sourceFolder ? [item.sourceFolder] : []
          )
            .map(f => f.trim())
            .filter(f => !isGenericBrowserFolder(f))
            .slice(0, 5);

          if (hierarchyLevels.length > 0) {
            let currentParentId: string | undefined = undefined;

            for (let i = 0; i < hierarchyLevels.length; i++) {
              const levelName = hierarchyLevels[i];
              let existingFolder = currentFolders.find(
                (f) =>
                  f.name.toLowerCase() === levelName.toLowerCase() &&
                  (currentParentId ? f.parentId === currentParentId : !f.parentId)
              );

              if (!existingFolder) {
                existingFolder = createCustomFolder(levelName, currentFolders, currentParentId);
                currentFolders.push(existingFolder);
                createdFolderCount++;
              }

              currentParentId = existingFolder.id;
              if (!targetTags.includes(levelName)) {
                targetTags = [levelName, ...targetTags];
              }
            }

            targetFolderId = currentParentId!;
          } else if (item.folderId && currentFolders.some(f => f.id === item.folderId)) {
            targetFolderId = item.folderId;
          } else {
            // Auto-categorize via classifyBookmark using updated currentFolders
            const classification = classifyBookmark(
              cleanUrl,
              item.title,
              item.sourceFolder,
              currentFolders
            );
            targetFolderId = classification.folderId;
            targetTags = Array.from(new Set([...targetTags, ...classification.tags]));
          }

          // Derive friendly title
          let resolvedTitle = item.title?.trim();
          if (!resolvedTitle) {
            try {
              resolvedTitle = new URL(cleanUrl).hostname.replace(/^www\./, '');
            } catch {
              resolvedTitle = cleanUrl;
            }
          }

          const targetFolder = currentFolders.find((f) => f.id === targetFolderId);
          if (targetFolder) {
            lastCategorizedFolderName = targetFolder.name;
          }

          const newLink: LinkItem = {
            id: `link-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: resolvedTitle,
            url: cleanUrl,
            folderId: targetFolderId,
            isFavorite: false,
            tags: targetTags,
            createdAt: item.addDate || Date.now(),
            clickCount: 0,
          };

          newLinksToAdd.push(newLink);
        }

        if (newLinksToAdd.length === 0) {
          return prev;
        }

        if (newLinksToAdd.length === 1) {
          setSyncToast({
            id: `toast-${Date.now()}`,
            message: `"${newLinksToAdd[0].title}" automatically categorized to ${lastCategorizedFolderName}`,
            folderName: lastCategorizedFolderName,
          });
        } else {
          setSyncToast({
            id: `toast-${Date.now()}`,
            message: `Synced ${newLinksToAdd.length} bookmarks${
              createdFolderCount > 0 ? ` across ${createdFolderCount} new folder(s)` : ''
            }`,
            folderName: createdFolderCount > 0 ? `${createdFolderCount} Folders` : 'Bookmarks',
          });
        }

        return {
          ...prev,
          folders: currentFolders,
          links: [...newLinksToAdd, ...prev.links],
        };
      });
    });

    return () => cleanup();
  }, []);

  // Auto-dismiss sync toast after 4.5 seconds
  useEffect(() => {
    if (!syncToast) return;
    const timer = setTimeout(() => {
      setSyncToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [syncToast]);

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

  // Calendar Schedule Summary (merged busy intervals, next meeting, token status)
  const calendarSummary = useMemo(() => {
    const summary = calculateCalendarScheduleSummary(
      appData.calendarEvents || [],
      now,
      appData.settings.daySchedule.endHour
    );
    return {
      ...summary,
      isTokenExpired: isGoogleTokenExpired() && Boolean(appData.settings.googleCalendar?.enabled),
    };
  }, [appData.calendarEvents, now, appData.settings.daySchedule.endHour, appData.settings.googleCalendar?.enabled]);

  // Concurrency-guarded Google Calendar Synchronization
  const handleSyncCalendar = useCallback(async (silent: boolean = false) => {
    if (isSyncingCalendarRef.current) return;
    const gcal = appData.settings.googleCalendar;
    if (!gcal?.enabled || !gcal.clientId) return;

    const token = getInMemoryGoogleToken();
    if (!token) {
      if (!silent) {
        setIsSettingsModalOpen(true);
      }
      return;
    }

    try {
      isSyncingCalendarRef.current = true;
      setIsSyncingCalendar(true);
      const events = await fetchTodayGoogleEvents(token, gcal.calendarId || 'primary');
      setAppData((prev) => {
        const updated = {
          ...prev,
          calendarEvents: events,
          settings: {
            ...prev.settings,
            googleCalendar: {
              ...prev.settings.googleCalendar!,
              lastSyncedAt: Date.now(),
            },
          },
        };
        saveAppData(updated);
        return updated;
      });
    } catch (err: any) {
      console.warn('Google Calendar sync warning:', err);
      // Preserve cached calendarEvents during network failure
    } finally {
      isSyncingCalendarRef.current = false;
      setIsSyncingCalendar(false);
    }
  }, [appData.settings.googleCalendar]);

  // Periodic polling & Window Focus/Visibility listeners for Google Calendar
  useEffect(() => {
    if (!appData.settings.googleCalendar?.enabled) return;

    // Silent background sync on mount if token is in memory
    handleSyncCalendar(true);

    const onFocus = () => handleSyncCalendar(true);
    window.addEventListener('focus', onFocus);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncCalendar(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intervalMinutes = appData.settings.googleCalendar.syncIntervalMinutes || 5;
    const intervalTimer = setInterval(() => {
      handleSyncCalendar(true);
    }, intervalMinutes * 60 * 1000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(intervalTimer);
    };
  }, [appData.settings.googleCalendar?.enabled, appData.settings.googleCalendar?.syncIntervalMinutes, handleSyncCalendar]);

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
        else if (isBookmarkImportOpen) setIsBookmarkImportOpen(false);
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

  const handleImportBookmarks = (newLinks: LinkItem[], newFolders?: Folder[]) => {
    setAppData((prev) => {
      let updatedFolders = prev.folders;
      if (newFolders && newFolders.length > 0) {
        const existingIds = new Set(prev.folders.map(f => f.id));
        const foldersToAdd = newFolders.filter(f => !existingIds.has(f.id));
        if (foldersToAdd.length > 0) {
          updatedFolders = [...prev.folders, ...foldersToAdd];
        }
      }
      return {
        ...prev,
        folders: updatedFolders,
        links: [...newLinks, ...prev.links],
      };
    });
  };

  const handleDeleteLink = (id: string) => {
    const target = appData.links.find((l) => l.id === id);
    if (target) {
      setLinkToDelete(target);
      setIsDeleteLinkModalOpen(true);
    }
  };

  const handleConfirmDeleteLink = () => {
    if (linkToDelete) {
      setAppData((prev) => ({
        ...prev,
        links: prev.links.filter((l) => l.id !== linkToDelete.id),
      }));
    }
    setIsDeleteLinkModalOpen(false);
    setLinkToDelete(null);
  };

  const handleCancelDeleteLink = () => {
    setIsDeleteLinkModalOpen(false);
    setLinkToDelete(null);
  };

  const handleConfirmSidebarFolderAction = (withSubfolders: boolean) => {
    if (!sidebarFolderAction) return;
    const { folder, mode } = sidebarFolderAction;

    if (mode === 'hide') {
      const updated = withSubfolders
        ? hideFolderWithSubfolders(appData.folders, folder.id)
        : hideFolderWithoutSubfolders(appData.folders, folder.id);
      setAppData((prev) => ({ ...prev, folders: updated }));
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
    } else if (mode === 'unhide') {
      const updated = withSubfolders
        ? unhideFolderWithSubfolders(appData.folders, folder.id)
        : unhideFolderWithoutSubfolders(appData.folders, folder.id);
      setAppData((prev) => ({ ...prev, folders: updated }));
    } else if (mode === 'delete') {
      if (appData.folders.length <= 1) {
        alert('You must have at least one folder.');
        setSidebarFolderAction(null);
        return;
      }
      const res = withSubfolders
        ? deleteFolderWithSubfolders(appData.folders, appData.links, folder.id)
        : deleteFolderWithoutSubfolders(appData.folders, appData.links, folder.id);
      setAppData((prev) => ({
        ...prev,
        folders: res.updatedFolders,
        links: res.updatedLinks,
      }));
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
    }

    setSidebarFolderAction(null);
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

  const handleSaveFoldersAndLinks = (newFolders: Folder[], newLinks?: LinkItem[]) => {
    setAppData((prev) => ({
      ...prev,
      folders: newFolders,
      links: newLinks ?? prev.links,
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

  // Filtered Links Calculation (includes direct links + descendant subfolders)
  const filteredLinks = useMemo(() => {
    return appData.links.filter((link) => {
      if (selectedFolderId === 'favorites') {
        if (!link.isFavorite) return false;
      } else if (selectedFolderId !== null) {
        const matchingIds = new Set([
          selectedFolderId,
          ...getDescendantFolderIds(selectedFolderId, appData.folders),
        ]);
        if (!matchingIds.has(link.folderId)) return false;
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

  const folderBreadcrumbs = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === 'favorites') return [];
    return getFolderBreadcrumbs(selectedFolderId, appData.folders);
  }, [selectedFolderId, appData.folders]);

  const directSubfolders = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === 'favorites') return [];
    return appData.folders.filter((f) => f.parentId === selectedFolderId && !f.isHidden);
  }, [selectedFolderId, appData.folders]);

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
        onOpenBookmarkImport={() => setIsBookmarkImportOpen(true)}
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
          onHideFolder={(folder) => setSidebarFolderAction({ folder, mode: 'hide' })}
          onDeleteFolder={(folder) => setSidebarFolderAction({ folder, mode: 'delete' })}
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
                calendarEvents={appData.calendarEvents || []}
                onSyncCalendar={() => handleSyncCalendar(false)}
                isSyncingCalendar={isSyncingCalendar}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                isTokenExpired={calendarSummary.isTokenExpired}
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
                    calendarSummary={calendarSummary}
                    onSyncCalendar={() => handleSyncCalendar(false)}
                    isSyncingCalendar={isSyncingCalendar}
                    onOpenCalendarSettings={() => setIsSettingsModalOpen(true)}
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
                          calendarSummary={calendarSummary}
                          onSyncCalendar={() => handleSyncCalendar(false)}
                          isSyncingCalendar={isSyncingCalendar}
                          onOpenCalendarSettings={() => setIsSettingsModalOpen(true)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          {/* 3. Navigation Sub-Bar & Breadcrumb Controls (Only shown when browsing a folder, favorites, or searching) */}
          {(selectedFolderId !== null || searchQuery.trim() !== '') && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
              <div className="flex items-center gap-3">
                {/* Back to all folders button when in a folder */}
                {selectedFolderId !== null && (
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className="p-1.5 rounded-lg bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark border border-serene-border-light dark:border-serene-border-dark transition-colors"
                    title="Back to Dashboard (Esc)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                <div>
                  {folderBreadcrumbs.length > 1 && (
                    <nav className="flex items-center gap-1.5 text-[11px] text-serene-text-muted mb-1 flex-wrap" aria-label="Breadcrumb">
                      <button
                        onClick={() => setSelectedFolderId(null)}
                        className="hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors"
                      >
                        Dashboard
                      </button>
                      {folderBreadcrumbs.map((crumb, idx) => {
                        const isLast = idx === folderBreadcrumbs.length - 1;
                        return (
                          <span key={crumb.id} className="flex items-center gap-1.5">
                            <span className="opacity-40">/</span>
                            {isLast ? (
                              <span className="font-semibold text-serene-primary dark:text-serene-primary-dark">
                                {crumb.name}
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedFolderId(crumb.id)}
                                className="hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors"
                              >
                                {crumb.name}
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </nav>
                  )}
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                      {searchQuery ? 'Search Results' : selectedFolderId === 'favorites' ? 'Starred Favorites' : activeFolder?.name}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border border-serene-border-light dark:border-serene-border-dark">
                      {`${filteredLinks.length} ${filteredLinks.length === 1 ? 'item' : 'items'}`}
                    </span>
                  </div>
                  {activeFolder?.description && (
                    <p className="text-xs text-serene-text-muted mt-0.5">
                      {activeFolder.description}
                    </p>
                  )}
                  {/* Direct Subfolders quick navigation pills */}
                  {directSubfolders.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 text-xs">
                      <span className="text-[11px] font-semibold text-serene-text-muted shrink-0">Subfolders:</span>
                      {directSubfolders.map((sub) => {
                        const count = appData.links.filter((l) => l.folderId === sub.id).length;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedFolderId(sub.id)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors flex items-center gap-1 shrink-0"
                          >
                            <span>{sub.name}</span>
                            <span className="font-mono opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Folder Quick Action */}
              <div className="flex items-center gap-2">
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
          )}

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
          ) : (
            /* Home / Dashboard View: Clean, focused, uncluttered */
            <div className="space-y-6">
              {/* Pinned / Starred Quick Access Strip */}
              {appData.links.some((l) => l.isFavorite) ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
                        Pinned Quick Access
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedFolderId('favorites')}
                      className="text-xs text-serene-primary dark:text-serene-primary-dark hover:underline font-medium"
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
              ) : (
                <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-white/40 dark:bg-serene-surface-dark/40">
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary font-medium">
                    Your resource spaces & folders are easily accessible anytime in the left sidebar.
                  </p>
                  <p className="text-[11px] text-serene-text-muted mt-1">
                    Star any bookmark to pin it here on your home dashboard for 1-click access.
                  </p>
                </div>
              )}

              {/* Today's Calendar Schedule Timeline (if Google Calendar is enabled) */}
              {appData.settings.googleCalendar?.enabled && (
                <div className="pt-2">
                  <CalendarScheduleTimeline
                    events={appData.calendarEvents || []}
                    onSync={() => handleSyncCalendar(false)}
                    isSyncing={isSyncingCalendar}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    isTokenExpired={calendarSummary.isTokenExpired}
                  />
                </div>
              )}
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
        links={appData.links}
        onSaveFolders={handleSaveFolders}
        onSaveFoldersAndLinks={handleSaveFoldersAndLinks}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appData={appData}
        onUpdateAppData={setAppData}
        onResetData={handleResetData}
        onOpenBookmarkImport={() => setIsBookmarkImportOpen(true)}
        onSyncCalendar={() => handleSyncCalendar(false)}
        isSyncingCalendar={isSyncingCalendar}
      />

      <BookmarkImportModal
        isOpen={isBookmarkImportOpen}
        onClose={() => setIsBookmarkImportOpen(false)}
        folders={appData.folders}
        existingLinks={appData.links}
        onImportBookmarks={handleImportBookmarks}
      />

      {/* Dedicated Confirmation Modal for Bookmark/Link Deletion */}
      <ConfirmDeleteModal
        isOpen={isDeleteLinkModalOpen}
        onClose={handleCancelDeleteLink}
        onConfirm={handleConfirmDeleteLink}
        title="Delete Bookmark"
        itemName={linkToDelete?.title}
        description="Are you sure you want to delete this bookmark? This action cannot be undone."
        confirmText="Delete"
      />

      {/* Root Folder Action Dialog for Sidebar & Root Actions */}
      <FolderActionDialog
        isOpen={!!sidebarFolderAction}
        mode={sidebarFolderAction?.mode || 'hide'}
        folder={sidebarFolderAction?.folder || null}
        childCount={
          sidebarFolderAction?.folder
            ? appData.folders.filter((f) => f.parentId === sidebarFolderAction.folder.id).length
            : 0
        }
        linkCount={
          sidebarFolderAction?.folder
            ? appData.links.filter((l) => l.folderId === sidebarFolderAction.folder.id).length
            : 0
        }
        onClose={() => setSidebarFolderAction(null)}
        onConfirmWithOptions={handleConfirmSidebarFolderAction}
      />

      {/* Real-time Bookmark Sync Notification Toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md bg-white dark:bg-serene-surface-dark border border-serene-primary/30 dark:border-serene-primary-dark/40 rounded-xl shadow-xl p-3.5 flex items-start gap-3 backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <div className="w-8 h-8 rounded-lg bg-serene-primary/10 dark:bg-serene-primary-dark/20 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center shrink-0 mt-0.5">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-serene-primary dark:text-serene-primary-dark uppercase tracking-wider">
                  Live Bookmark Sync
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-serene-text-primary dark:text-serene-text-darkPrimary font-medium truncate mt-0.5">
                {syncToast.message}
              </p>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="p-1 rounded-md text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors shrink-0"
              title="Dismiss notification"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default App;
