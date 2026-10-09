import React from 'react';
import { 
  Star, 
  Layers, 
  Plus, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import { Folder, LinkItem } from '../../types';
import { getFolderIcon, FOLDER_COLOR_MAP } from '../../utils/icons';

interface SidebarProps {
  folders: Folder[];
  links: LinkItem[];
  selectedFolderId: string | null; // null = 'all', 'favorites' = favorites filter
  onSelectFolder: (folderId: string | null) => void;
  onOpenManageFolders: () => void;
  onOpenAddFolder: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView?: 'dashboard' | 'tasks';
  onSelectView?: (view: 'dashboard' | 'tasks') => void;
  pendingTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  links,
  selectedFolderId,
  onSelectFolder,
  onOpenManageFolders,
  onOpenAddFolder,
  isCollapsed,
  onToggleCollapse,
  currentView = 'dashboard',
  onSelectView,
  pendingTasksCount = 0,
}) => {
  const totalCount = links.length;
  const favoriteCount = links.filter((l) => l.isFavorite).length;

  const getFolderCount = (folderId: string) => {
    return links.filter((l) => l.folderId === folderId).length;
  };

  // Icon sizing: 16px (w-4 h-4) when expanded, +3px larger = 19px (w-[19px] h-[19px]) when collapsed
  const iconSizeClass = isCollapsed ? 'w-[19px] h-[19px]' : 'w-4 h-4';

  const handleSelectOverview = (folderId: string | null) => {
    if (onSelectView) {
      onSelectView('dashboard');
    }
    onSelectFolder(folderId);
  };

  return (
    <aside
      className={`relative h-full bg-white/70 dark:bg-serene-surface-dark/70 backdrop-blur-md border-r border-serene-border-light dark:border-serene-border-dark flex flex-col shrink-0 transition-all duration-300 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Collapse/Expand Floating Trigger */}
      <button
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        className="absolute -right-3 top-4 w-6 h-6 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-full flex items-center justify-center text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark shadow-xs z-20 transition-transform hover:scale-110"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Internal Scrollable Content */}
      <div className="p-3 flex-1 flex flex-col gap-5 overflow-y-auto">
        {/* Navigation Section */}
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
            <CheckSquare className={`${iconSizeClass} shrink-0 ${currentView === 'tasks' ? 'text-white' : 'text-serene-primary dark:text-serene-primary-dark'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate font-semibold">Tasks & Action Items</span>
                {pendingTasksCount > 0 ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    currentView === 'tasks' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}>
                    {pendingTasksCount}
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    currentView === 'tasks' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                  }`}>
                    0
                  </span>
                )}
              </>
            )}
          </button>

          {/* All Links */}
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
            <Layers className={`${iconSizeClass} shrink-0 ${currentView === 'dashboard' && selectedFolderId === null ? 'text-white' : 'text-serene-text-muted'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">All Resources</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  currentView === 'dashboard' && selectedFolderId === null ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                }`}>
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
            <Star className={`${iconSizeClass} shrink-0 ${currentView === 'dashboard' && selectedFolderId === 'favorites' ? 'text-white fill-current' : 'text-amber-500 fill-amber-500/20'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Favorites</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  currentView === 'dashboard' && selectedFolderId === 'favorites' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                }`}>
                  {favoriteCount}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Section Divider (Visible in both collapsed and expanded states) */}
        <div className={`h-px bg-serene-border-light dark:bg-serene-border-dark my-1 ${
          isCollapsed ? 'w-8 mx-auto' : 'mx-1'
        }`} />

        {/* Folders Section */}
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between px-3 py-1">
            {!isCollapsed && (
              <span className="text-[11px] font-semibold text-serene-text-muted uppercase tracking-wider">
                Folders & Collections
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

          <div className="space-y-1">
            {folders.map((folder) => {
              const IconComponent = getFolderIcon(folder.icon);
              const colorInfo = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.forest;
              const isSelected = selectedFolderId === folder.id;
              const count = getFolderCount(folder.id);

              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className={`w-full flex items-center gap-3 rounded-xl text-xs font-medium transition-all group ${
                    isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
                  } ${
                    isSelected
                      ? 'bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-semibold border border-serene-primary/30'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
                  }`}
                  title={`${folder.name} (${count} links)`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <IconComponent className={`${iconSizeClass} ${isSelected ? 'text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-muted group-hover:text-serene-text-secondary'}`} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${colorInfo.dot} ring-1 ring-white dark:ring-serene-surface-dark`} />
                  </div>

                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected 
                          ? 'bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-semibold' 
                          : 'bg-black/5 dark:bg-white/10 text-serene-text-muted'
                      }`}>
                        {count}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
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

        {/* Bottom Focus Stat Widget (Only when expanded) */}
        {!isCollapsed && (
          <div className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-xl border border-serene-border-light dark:border-serene-border-dark text-xs space-y-1 mt-auto shrink-0">
            <div className="flex items-center justify-between font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary text-[11px]">
              <span>Curated Hub</span>
              <span className="font-mono text-serene-primary dark:text-serene-primary-dark">{totalCount} links</span>
            </div>
            <p className="text-[10px] text-serene-text-muted leading-relaxed">
              Target for Time Snatch redirect.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
