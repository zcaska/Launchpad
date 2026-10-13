import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
  EyeOff,
  Trophy,
  User
} from 'lucide-react';
import { Folder, LinkItem, FolderTreeNode, GamificationState } from '../../types';
import { getFolderIcon, FOLDER_COLOR_MAP } from '../../utils/icons';
import { 
  buildFolderTree, 
  getFolderBreadcrumbs
} from '../../utils/folderTree';
import { getHeroById } from '../../data/heroRoster';
import { BookmarkRow } from './BookmarkRow';
import { SidebarDndContext, useSidebarDnd, DragPayload, DropTarget, SidebarDndValue } from './SidebarDnd';
import {
  moveLinkToFolder,
  resolveLinkDrop,
  reparentFolder,
  canReparentFolder,
} from '../../utils/sidebarReorder';

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
  bookmark?: SidebarBookmarkHandlers;
  onChangeLinks?: (next: LinkItem[]) => void;
  onChangeFolders?: (next: Folder[]) => void;
  userEmail?: string;
}

/**
 * The morphing active-state pill. Shared `layoutId` makes a single element glide
 * between rows; it is rendered only by the active row so motion has two states to
 * tween between. Transform-only, so it animates on the compositor.
 *
 * `-z-10` is required, not cosmetic: an absolutely-positioned box paints AFTER
 * in-flow content, so without it the opaque pill covers the row's icon, label and
 * badge and the active nav item renders as a blank green bar.
 */
const ActivePill: React.FC<{ layoutId: string; tone: 'primary' | 'amber'; transition: object }> = ({
  layoutId,
  tone,
  transition,
}) => (
  <motion.span
    layoutId={layoutId}
    aria-hidden="true"
    transition={transition}
    className={`absolute inset-0 -z-10 rounded-xl shadow-xs pointer-events-none ${
      tone === 'primary' ? 'bg-serene-primary' : 'bg-amber-600'
    }`}
  />
);

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
  folders: Folder[];
  links: LinkItem[];
  bookmark: SidebarBookmarkHandlers;
  onDropLink: (dragId: string, anchorId: string, position: 'before' | 'after') => void;
  onDropLinkIntoFolder: (dragId: string, folderId: string) => void;
  onDropFolder: (dragId: string, targetFolderId: string, position: 'inside' | 'before' | 'after') => void;
}

/**
 * Recursive Folder Tree Item supporting up to 5 levels (level 0 to 4)
 * with progressive disclosure of subfolders and direct bookmarks.
 */
/**
 * Safe defaults so the sidebar renders unchanged when the host app has not wired
 * bookmark management (e.g. the read-only storybook/preview usage).
 */
const NOOP_BOOKMARK: SidebarBookmarkHandlers = {
  onRenameLink: () => {},
  onChangeLinkUrl: () => null,
  onMoveLink: () => {},
  onDeleteLink: () => {},
};

export interface SidebarBookmarkHandlers {
  onRenameLink: (id: string, title: string) => void;
  onChangeLinkUrl: (id: string, url: string) => string | null;
  onMoveLink: (id: string, folderId: string) => void;
  onDeleteLink: (id: string) => void;
}

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
  folders,
  links,
  bookmark,
  onDropLink,
  onDropLinkIntoFolder,
  onDropFolder,
}) => {
  const dnd = useSidebarDnd();
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
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          dnd.setDrag({ kind: 'folder', id: node.folder.id });
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.folder.id);
        }}
        onDragEnd={() => { dnd.setDrag(null); dnd.setDrop(null); }}
        onDragOver={(e) => {
          const d = dnd.drag;
          if (!d || d.id === node.folder.id) return;
          e.preventDefault();
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          const offset = (e.clientY - r.top) / r.height;
          if (d.kind === 'folder' && offset > 0.25 && offset < 0.75) {
            if (!dnd.canDropFolderInto(node.folder.id)) return; // invalid: no indicator, no drop
            dnd.setDrop({ kind: 'folder', id: node.folder.id, position: 'inside' });
          } else {
            dnd.setDrop({ kind: 'folder', id: node.folder.id, position: offset < 0.5 ? 'before' : 'after' });
          }
        }}
        onDrop={(e) => {
          const d = dnd.drag;
          if (!d || d.id === node.folder.id) return;
          e.preventDefault();
          e.stopPropagation();
          const pos = dnd.drop?.position ?? 'inside';
          if (d.kind === 'folder') onDropFolder(d.id, node.folder.id, pos);
          else onDropLinkIntoFolder(d.id, node.folder.id);
          dnd.setDrag(null); dnd.setDrop(null);
        }}
        className={`relative w-full flex items-center gap-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer group select-none ${
          isCollapsed ? 'p-2.5 justify-center' : 'pr-2.5 py-1.5'
        } ${
          isSelected
            ? 'bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-semibold border border-serene-primary/30'
            : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
        } ${
          dnd.drag?.kind === 'folder' && dnd.drag.id === node.folder.id ? 'opacity-40' : ''
        } ${
          dnd.drop?.kind === 'folder' && dnd.drop.id === node.folder.id && dnd.drop.position === 'inside'
            ? 'ring-2 ring-serene-primary/60' : ''
        }`}
        title={`${node.folder.name} (${node.totalLinkCount} items)`}
      >
        {dnd.drop?.kind === 'folder' && dnd.drop.id === node.folder.id &&
          (dnd.drop.position === 'before' || dnd.drop.position === 'after') && (
            <span className={`absolute left-2 right-2 h-0.5 bg-serene-primary rounded-full z-10 ${dnd.drop.position === 'before' ? '-top-px' : '-bottom-px'}`} />
          )}
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
              folders={folders}
              links={links}
              bookmark={bookmark}
              onDropLink={onDropLink}
              onDropLinkIntoFolder={onDropLinkIntoFolder}
              onDropFolder={onDropFolder}
            />
          ))}

          {/* 2. Direct Bookmarks within this folder */}
          {node.directLinks.map((link) => (
            <BookmarkRow
              key={link.id}
              link={link}
              folders={folders}
              indentPx={paddingLeftPx + 22}
              isCollapsed={isCollapsed}
              onRename={bookmark.onRenameLink}
              onChangeUrl={bookmark.onChangeLinkUrl}
              onMove={bookmark.onMoveLink}
              onDropLink={onDropLink}
              onDelete={bookmark.onDeleteLink}
              onRowClick={onMobileAction}
            />
          ))}
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
  bookmark,
  onChangeLinks,
  onChangeFolders,
  userEmail,
}) => {
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

  // ---------------------------------------------------------------- drag & drop
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);

  const dndValue = useMemo<SidebarDndValue>(
    () => ({
      drag,
      drop,
      setDrag,
      setDrop,
      canDropFolderInto: (targetId: string) =>
        drag?.kind === 'folder' && canReparentFolder(folders, drag.id, targetId),
    }),
    [drag, drop, folders]
  );

  /**
   * Bookmark drops resolve to a tested pure function so the insert index maths lives
   * in one place (sidebarReorder.resolveLinkDrop) rather than in the component.
   */
  const handleDropLink = (dragId: string, anchorId: string, position: 'before' | 'after') => {
    if (!onChangeLinks) return;
    onChangeLinks(resolveLinkDrop(links, dragId, anchorId, position));
  };

  /** Dropping a bookmark onto a folder row files it into that folder (appended). */
  const handleDropLinkIntoFolder = (dragId: string, folderId: string) => {
    if (!onChangeLinks) return;
    onChangeLinks(moveLinkToFolder(links, dragId, folderId));
  };

  const handleDropFolder = (dragId: string, targetId: string, position: 'inside' | 'before' | 'after') => {
    if (!onChangeFolders || dragId === targetId) return;
    const parentId = position === 'inside' ? targetId : (folders.find((f) => f.id === targetId)?.parentId ?? null);
    const next = reparentFolder(folders, dragId, parentId);
    if (next === folders) return; // invalid move was rejected

    // ordering within the new parent: "before" places it ahead of the target
    if (position !== 'inside' && canReparentFolder(folders, dragId, parentId)) {
      const sibs = folders.filter((f) => (f.parentId ?? null) === parentId && f.id !== dragId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const at = Math.max(0, sibs.findIndex((f) => f.id === targetId) + (position === 'after' ? 1 : 0));
      const placed = [...sibs.slice(0, at), { id: dragId }, ...sibs.slice(at)];
      const order = new Map(placed.map((f, i) => [f.id, i]));
      onChangeFolders(next.map((f) => (order.has(f.id) ? { ...f, order: order.get(f.id)! } : f)));
      return;
    }
    onChangeFolders(next);
  };

  // Shared layoutId = one morphing pill that glides between the active nav rows
  // instead of each row snapping its background on/off.
  const NAV_SPRING = { type: 'spring' as const, stiffness: 700, damping: 44, mass: 0.6 };

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
        <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto">
          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
              Navigation & Focus
            </div>

            {/* Tasks & Action Items */}
            <button
              onClick={() => handleMobileNavClick(() => onSelectView && onSelectView('tasks'))}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                currentView === 'tasks'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'tasks' && <ActivePill layoutId="navPillMobile" tone="primary" transition={NAV_SPRING} />}
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
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                currentView === 'growth'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'growth' && <ActivePill layoutId="navPillMobile" tone="primary" transition={NAV_SPRING} />}
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

            {/* Dashboard */}
            <button
              onClick={() => handleMobileNavClick(() => handleSelectOverview(null))}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                currentView === 'dashboard' && selectedFolderId === null
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'dashboard' && selectedFolderId === null && <ActivePill layoutId="navPillMobile" tone="primary" transition={NAV_SPRING} />}
              <Layers className="w-4 h-4" />
              <span className="flex-1 text-left">Dashboard</span>
            </button>

            {/* Favorites */}
            <button
              onClick={() => handleMobileNavClick(() => handleSelectOverview('favorites'))}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                currentView === 'dashboard' && selectedFolderId === 'favorites'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'dashboard' && selectedFolderId === 'favorites' && <ActivePill layoutId="navPillMobile" tone="amber" transition={NAV_SPRING} />}
              <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="flex-1 text-left">Favorites</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-serene-text-muted">
                {favoriteCount}
              </span>
            </button>
          </div>

          {/* Section Divider */}
          <div className="h-[2px] bg-serene-border-light dark:bg-serene-border-dark my-2 mx-1.5 rounded-full" />

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

            <SidebarDndContext.Provider value={dndValue}>
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
                  folders={folders}
                  links={links}
                  bookmark={bookmark ?? NOOP_BOOKMARK}
                  onDropLink={handleDropLink}
                  onDropLinkIntoFolder={handleDropLinkIntoFolder}
                  onDropFolder={handleDropFolder}
                />
              ))}
            </div>
            </SidebarDndContext.Provider>

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
        <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto">
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
              className={`relative w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-colors ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'tasks'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="Tasks & Action Items"
            >
              {currentView === 'tasks' && <ActivePill layoutId="navPillDesktop" tone="primary" transition={NAV_SPRING} />}
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
              className={`relative w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-colors ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'growth'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title={`Growth & Mastery (${heroLevelBadge})`}
            >
              {currentView === 'growth' && <ActivePill layoutId="navPillDesktop" tone="primary" transition={NAV_SPRING} />}
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

            {/* Dashboard */}
            <button
              onClick={() => handleSelectOverview(null)}
              className={`relative w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-colors ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'dashboard' && selectedFolderId === null
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="Dashboard"
            >
              {currentView === 'dashboard' && selectedFolderId === null && <ActivePill layoutId="navPillDesktop" tone="primary" transition={NAV_SPRING} />}
              <Layers
                className={`${iconSizeClass} shrink-0 ${
                  currentView === 'dashboard' && selectedFolderId === null ? 'text-white' : 'text-serene-text-muted'
                }`}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">Dashboard</span>
              )}
            </button>

            {/* Favorites */}
            <button
              onClick={() => handleSelectOverview('favorites')}
              className={`relative w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-colors ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                currentView === 'dashboard' && selectedFolderId === 'favorites'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
              title="Favorites"
            >
              {currentView === 'dashboard' && selectedFolderId === 'favorites' && <ActivePill layoutId="navPillDesktop" tone="amber" transition={NAV_SPRING} />}
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
            className={`h-[2px] bg-serene-border-light dark:bg-serene-border-dark my-2 rounded-full ${
              isCollapsed ? 'w-8 mx-auto' : 'mx-1.5'
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
            <SidebarDndContext.Provider value={dndValue}>
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
                    folders={folders}
                    links={links}
                    bookmark={bookmark ?? NOOP_BOOKMARK}
                    onDropLink={handleDropLink}
                  onDropLinkIntoFolder={handleDropLinkIntoFolder}
                    onDropFolder={handleDropFolder}
                  />
                ))}
              </div>
            </SidebarDndContext.Provider>

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

          {/* Bottom User Profile Section matching Image 1 */}
          <div className="pt-2 mt-auto shrink-0 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
            {isCollapsed ? (
              <div
                className="w-9 h-9 mx-auto rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark flex items-center justify-center text-serene-text-primary dark:text-serene-text-darkPrimary font-bold text-xs shadow-xs"
                title={userEmail ? `User: ${userEmail}` : 'LaunchPad User'}
              >
                {userEmail ? (
                  <span className="text-serene-primary dark:text-serene-primary-dark font-bold text-xs">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-serene-text-muted" />
                )}
              </div>
            ) : (
              <div className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 border border-serene-border-light/60 dark:border-serene-border-dark/60">
                <div className="w-8 h-8 rounded-full bg-serene-primary/10 dark:bg-serene-primary-dark/20 border border-serene-primary/20 flex items-center justify-center text-serene-primary dark:text-serene-primary-dark font-bold text-xs shrink-0">
                  {userEmail ? (
                    userEmail.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-serene-text-primary dark:text-serene-text-darkPrimary">
                    {userEmail ? userEmail.split('@')[0] : 'LaunchPad User'}
                  </p>
                  <p className="text-[10px] text-serene-text-muted truncate">
                    {userEmail || 'Focus Session Active'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
