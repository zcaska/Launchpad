import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  Layers, 
  Plus, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  X,
  Compass,
  ExternalLink,
  EyeOff,
  Trophy
} from 'lucide-react';
import { Folder, LinkItem, FolderTreeNode, GamificationState } from '../../types';
import { getFolderIcon, FOLDER_COLOR_MAP } from '../../utils/icons';
import { getFaviconUrl } from '../../utils/favicon';
import { 
  buildFolderTree, 
  getFolderBreadcrumbs
} from '../../utils/folderTree';
import { getHeroById } from '../../data/heroRoster';

interface SidebarProps {
  folders: Folder[];
  links: LinkItem[];
  selectedFolderId: string | null; // null = 'all', 'favorites' = favorites filter
  onSelectFolder: (folderId: string | null) => void;
  onOpenManageFolders: () => void;
  onOpenAddFolder: () => void;
  onHideFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView?: 'dashboard' | 'tasks' | 'growth';
  onSelectView?: (view: 'dashboard' | 'tasks' | 'growth') => void;
  pendingTasksCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  gamification?: GamificationState;
}

interface FolderTreeItemProps {
  node: FolderTreeNode;
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onHideFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onMobileAction?: () => void;
  isCollapsed: boolean;
}

/**
 * Recursive Folder Tree Item supporting up to 5 levels (level 0 to 4)
 * with progressive disclosure of subfolders and direct bookmarks.
 */
const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  node,
  selectedFolderId,
  expandedFolderIds,
  onToggleExpand,
  onSelectFolder,
  onHideFolder,
  onDeleteFolder,
  onMobileAction,
  isCollapsed,
}) => {
  const isExpanded = expandedFolderIds.has(node.folder.id);
  const isSelected = selectedFolderId === node.folder.id;
  const hasSubfolders = node.children.length > 0;
  const hasLinks = node.directLinks.length > 0;
  const hasChildren = hasSubfolders || hasLinks;

  const IconComponent = getFolderIcon(node.folder.icon);
  const colorInfo = FOLDER_COLOR_MAP[node.folder.color] || FOLDER_COLOR_MAP.forest;

  const handleRowClick = () => {
    onSelectFolder(node.folder.id);
    if (onMobileAction) onMobileAction();
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.folder.id);
  };

  // Indentation calculation based on tree depth (levels 0 to 4)
  const paddingLeftPx = isCollapsed ? 0 : Math.min(node.level, 4) * 14 + 8;

  if (isCollapsed && node.level > 0) {
    // In collapsed sidebar, only render top-level root folders
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Folder Row */}
      <div
        onClick={handleRowClick}
        style={{ paddingLeft: `${paddingLeftPx}px` }}
        className={`w-full flex items-center gap-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer group select-none ${
          isCollapsed ? 'p-2.5 justify-center' : 'pr-2.5 py-1.5'
        } ${
          isSelected
            ? 'bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-semibold border border-serene-primary/30'
            : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
        }`}
        title={`${node.folder.name} (${node.totalLinkCount} items)`}
      >
        {/* Expand / Collapse Chevron (Only when expanded sidebar) */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={handleToggleClick}
            className={`p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors shrink-0 ${
              !hasChildren ? 'invisible pointer-events-none' : ''
            }`}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Folder Icon + Colored Status Dot */}
        <div className="relative shrink-0 flex items-center justify-center">
          <IconComponent
            className={`w-4 h-4 ${
              isSelected
                ? 'text-serene-primary dark:text-serene-primary-dark'
                : 'text-serene-text-muted group-hover:text-serene-text-secondary'
            }`}
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${colorInfo.dot} ring-1 ring-white dark:ring-serene-surface-dark`}
          />
        </div>

        {/* Name & Count */}
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{node.folder.name}</span>
            {onHideFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHideFolder(node.folder);
                }}
                title={`Hide "${node.folder.name}" (with or without subfolders)`}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-serene-text-muted hover:text-amber-500 transition-all shrink-0"
              >
                <EyeOff className="w-3 h-3" />
              </button>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                isSelected
                  ? 'bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-semibold'
                  : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
              }`}
            >
              {node.totalLinkCount}
            </span>
          </>
        )}
      </div>

      {/* Progressive Disclosure Content (Subfolders and direct Bookmarks) */}
      {!isCollapsed && isExpanded && (
        <div className="relative flex flex-col space-y-0.5 mt-0.5">
          {/* Subtle vertical hierarchy line indicator */}
          <div
            style={{ left: `${paddingLeftPx + 14}px` }}
            className="absolute top-0 bottom-1 w-px bg-serene-border-light/60 dark:bg-serene-border-dark/60 pointer-events-none"
          />

          {/* 1. Subfolders (Nested Children up to 5 levels) */}
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.folder.id}
              node={child}
              selectedFolderId={selectedFolderId}
              expandedFolderIds={expandedFolderIds}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onHideFolder={onHideFolder}
              onDeleteFolder={onDeleteFolder}
              onMobileAction={onMobileAction}
              isCollapsed={isCollapsed}
            />
          ))}

          {/* 2. Direct Bookmarks within this folder */}
          {node.directLinks.map((link) => {
            const bookmarkIndentPx = paddingLeftPx + 22;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{ paddingLeft: `${bookmarkIndentPx}px` }}
                className="w-full flex items-center gap-2 py-1 pr-2.5 rounded-lg text-[11px] text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light/80 dark:hover:bg-serene-surfaceAlt-dark/80 transition-colors group select-none"
                title={`${link.title}\n${link.url}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMobileAction) onMobileAction();
                }}
              >
                <div className="w-3.5 h-3.5 rounded shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="flex-1 truncate">{link.title}</span>
                {link.isFavorite && (
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  links,
  selectedFolderId,
  onSelectFolder,
  onOpenManageFolders,
  onOpenAddFolder,
  onHideFolder,
  onDeleteFolder,
  isCollapsed,
  onToggleCollapse,
  currentView = 'dashboard',
  onSelectView,
  pendingTasksCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  gamification,
}) => {
  const totalCount = links.length;
  const favoriteCount = links.filter((l) => l.isFavorite).length;

  const activeHero = useMemo(() => {
    if (!gamification?.activeHeroId) return null;
    return getHeroById(gamification.activeHeroId);
  }, [gamification?.activeHeroId]);

  const heroLevelBadge = activeHero ? `Lvl ${activeHero.level}` : 'Lvl 1';

  // Build hierarchical folder tree supporting up to 5 levels
  const folderTree = useMemo(() => buildFolderTree(folders, links, 5), [folders, links]);

  // Track expanded folder state for progressive disclosure
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set<string>());

  // Auto-expand ancestors whenever selectedFolderId changes
  useEffect(() => {
    if (selectedFolderId && selectedFolderId !== 'favorites') {
      const crumbs = getFolderBreadcrumbs(selectedFolderId, folders);
      if (crumbs.length > 0) {
        setExpandedFolderIds((prev) => {
          const next = new Set(prev);
          crumbs.forEach((c) => next.add(c.id));
          return next;
        });
      }
    }
  }, [selectedFolderId, folders]);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSelectOverview = (folderId: string | null) => {
    if (onSelectView) {
      onSelectView('dashboard');
    }
    onSelectFolder(folderId);
  };

  const handleMobileNavClick = (action: () => void) => {
    action();
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const iconSizeClass = isCollapsed ? 'w-[19px] h-[19px]' : 'w-4 h-4';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-serene-surface-dark shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out border-r border-serene-border-light dark:border-serene-border-dark ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-serene-border-light dark:border-serene-border-dark">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-serene-primary/10 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-serene-text-primary dark:text-serene-text-darkPrimary">
              Navigation & Folders
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Drawer Content */}
        <div className="p-3 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
              Navigation & Focus
            </div>

            {/* Tasks & Action Items */}
            <button
              onClick={() => handleMobileNavClick(() => onSelectView && onSelectView('tasks'))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'tasks'
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="flex-1 text-left font-semibold">Tasks & Action Items</span>
              {pendingTasksCount > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {pendingTasksCount}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-serene-text-muted">
                  0
                </span>
              )}
            </button>

            {/* Growth & Mastery */}
            <button
              onClick={() => handleMobileNavClick(() => onSelectView && onSelectView('growth'))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'growth'
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="flex-1 text-left font-semibold">Growth & Mastery</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold truncate max-w-[120px] ${
                  currentView === 'growth'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {heroLevelBadge}
              </span>
            </button>

            {/* All Resources */}
            <button
              onClick={() => handleMobileNavClick(() => handleSelectOverview(null))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'dashboard' && selectedFolderId === null
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="flex-1 text-left">All Resources</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-serene-text-muted">
                {totalCount}
              </span>
            </button>

            {/* Favorites */}
            <button
              onClick={() => handleMobileNavClick(() => handleSelectOverview('favorites'))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'dashboard' && selectedFolderId === 'favorites'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="flex-1 text-left">Favorites</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-serene-text-muted">
                {favoriteCount}
              </span>
            </button>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-serene-border-light dark:bg-serene-border-dark my-1 mx-1" />

          {/* Mobile Folders Hierarchy Section */}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
                Folders & Hierarchy
              </span>
              <button
                onClick={() => handleMobileNavClick(onOpenManageFolders)}
                className="text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark p-0.5 rounded transition-colors"
                title="Manage Folders"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {folderTree.map((rootNode) => (
                <FolderTreeItem
                  key={rootNode.folder.id}
                  node={rootNode}
                  selectedFolderId={selectedFolderId}
                  expandedFolderIds={expandedFolderIds}
                  onToggleExpand={handleToggleExpand}
                  onSelectFolder={onSelectFolder}
                  onHideFolder={onHideFolder}
                  onDeleteFolder={onDeleteFolder}
                  onMobileAction={onCloseMobile}
                  isCollapsed={false}
                />
              ))}
            </div>

            <button
              onClick={() => handleMobileNavClick(onOpenAddFolder)}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark border border-dashed border-serene-border-light dark:border-serene-border-dark transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`relative h-full bg-white/70 dark:bg-serene-surface-dark/70 backdrop-blur-md border-r border-serene-border-light dark:border-serene-border-dark hidden md:flex flex-col shrink-0 transition-all duration-300 select-none ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Collapse/Expand Floating Trigger */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="absolute -right-3 top-4 w-6 h-6 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-full flex items-center justify-center text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark shadow-xs z-20 transition-transform hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Scrollable Content */}
        <div className="p-3 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Top Navigation Links */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
                Navigation & Focus
              </div>
            )}

            {/* Tasks & Action Items */}
            <button
              onClick={() => onSelectView && onSelectView('tasks')}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-all ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'tasks'
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="Tasks & Action Items"
            >
              <CheckSquare
                className={`${iconSizeClass} shrink-0 ${
                  currentView === 'tasks' ? 'text-white' : 'text-serene-primary dark:text-serene-primary-dark'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate font-semibold">Tasks & Action Items</span>
                  {pendingTasksCount > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        currentView === 'tasks'
                          ? 'bg-white/20 text-white'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {pendingTasksCount}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        currentView === 'tasks' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                      }`}
                    >
                      0
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Growth & Mastery */}
            <button
              onClick={() => onSelectView && onSelectView('growth')}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-all ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'growth'
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title={`Growth & Mastery (${heroLevelBadge})`}
            >
              <Trophy
                className={`${iconSizeClass} shrink-0 ${
                  currentView === 'growth' ? 'text-white' : 'text-amber-500 dark:text-amber-400'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate font-semibold">Growth & Mastery</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold truncate max-w-[110px] ${
                      currentView === 'growth'
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {heroLevelBadge}
                  </span>
                </>
              )}
            </button>

            {/* All Resources */}
            <button
              onClick={() => handleSelectOverview(null)}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-all ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'dashboard' && selectedFolderId === null
                  ? 'bg-serene-primary text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="All Resources"
            >
              <Layers
                className={`${iconSizeClass} shrink-0 ${
                  currentView === 'dashboard' && selectedFolderId === null ? 'text-white' : 'text-serene-text-muted'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">All Resources</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      currentView === 'dashboard' && selectedFolderId === null
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                    }`}
                  >
                    {totalCount}
                  </span>
                </>
              )}
            </button>

            {/* Favorites */}
            <button
              onClick={() => handleSelectOverview('favorites')}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-all ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'dashboard' && selectedFolderId === 'favorites'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="Favorites"
            >
              <Star
                className={`${iconSizeClass} shrink-0 ${
                  currentView === 'dashboard' && selectedFolderId === 'favorites'
                    ? 'text-white fill-current'
                    : 'text-amber-500 fill-amber-500/20'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">Favorites</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      currentView === 'dashboard' && selectedFolderId === 'favorites'
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                    }`}
                  >
                    {favoriteCount}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Section Divider */}
          <div
            className={`h-px bg-serene-border-light dark:bg-serene-border-dark my-1 ${
              isCollapsed ? 'w-8 mx-auto' : 'mx-1'
            }`}
          />

          {/* Folders Hierarchy Tree Section */}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between px-3 py-1">
              {!isCollapsed && (
                <span className="text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
                  Folders & Hierarchy
                </span>
              )}
              {!isCollapsed && (
                <button
                  onClick={onOpenManageFolders}
                  title="Manage Folders"
                  className="text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tree Navigation with Progressive Disclosure */}
            <div className="space-y-0.5">
              {folderTree.map((rootNode) => (
                <FolderTreeItem
                  key={rootNode.folder.id}
                  node={rootNode}
                  selectedFolderId={selectedFolderId}
                  expandedFolderIds={expandedFolderIds}
                  onToggleExpand={handleToggleExpand}
                  onSelectFolder={onSelectFolder}
                  onHideFolder={onHideFolder}
                  onDeleteFolder={onDeleteFolder}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>

            {/* Quick Add Folder Button */}
            {!isCollapsed && (
              <button
                onClick={onOpenAddFolder}
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark border border-dashed border-serene-border-light dark:border-serene-border-dark transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>
            )}
          </div>

          {/* Bottom Widget */}
          {!isCollapsed && (
            <div className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-xl border border-serene-border-light dark:border-serene-border-dark text-xs space-y-1 mt-auto shrink-0">
              <div className="flex items-center justify-between font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary text-[11px]">
                <span>Curated Hub</span>
                <span className="font-mono text-serene-primary dark:text-serene-primary-dark">{totalCount} links</span>
              </div>
              <p className="text-[10px] text-serene-text-muted leading-relaxed">
                Multi-level progressive hierarchy.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
