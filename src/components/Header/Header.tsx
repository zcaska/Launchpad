import React from 'react';
import { 
  Search, 
  Plus, 
  Sun, 
  Moon, 
  Laptop, 
  Settings, 
  FileText,
  Command,
  Rocket,
  CheckSquare
} from 'lucide-react';
import { ThemeMode } from '../../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleQuickNotes: () => void;
  isQuickNotesOpen: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  activeView?: 'dashboard' | 'tasks';
  onSelectView?: (view: 'dashboard' | 'tasks') => void;
  pendingTasksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onToggleQuickNotes,
  isQuickNotesOpen,
  theme,
  onThemeChange,
  activeView = 'dashboard',
  onSelectView,
  pendingTasksCount = 0,
}) => {
  const toggleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <header className="w-full bg-white/90 dark:bg-serene-surface-dark/90 backdrop-blur-md border-b border-serene-border-light dark:border-serene-border-dark sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Brand (Clean & Adaptive in Light & Dark Mode) */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/25 dark:border-serene-primary/30 flex items-center justify-center shadow-xs shrink-0 transition-transform hover:scale-105">
              <Rocket className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary">
                  LaunchPad
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/20 dark:border-transparent">
                  Focus Hub
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-serene-text-muted">
                Your intentional landing dashboard
              </p>
            </div>
          </div>

          {/* Search Filter Box */}
          <div className="flex-1 max-w-lg relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-serene-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search links, tags, or folders... (Ctrl+K)"
                className="w-full pl-9 pr-14 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg text-sm text-serene-text-primary dark:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => onSearchChange('')}
                    className="text-xs text-serene-text-muted hover:text-serene-text-primary px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Clear
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-serene-text-muted bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded shadow-2xs">
                    <Command className="w-2.5 h-2.5" /> K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Add Link Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Resource</span>
            </button>

            {/* Tasks Screen View Toggle Button */}
            {onSelectView && (
              <button
                onClick={() => onSelectView(activeView === 'tasks' ? 'dashboard' : 'tasks')}
                title={activeView === 'tasks' ? "Back to Dashboard" : "Open Tasks Screen"}
                className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                  activeView === 'tasks'
                    ? 'bg-serene-primary text-white border-serene-primary shadow-xs'
                    : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {pendingTasksCount > 0 && (
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                    activeView === 'tasks' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {pendingTasksCount}
                  </span>
                )}
              </button>
            )}

            {/* Quick Notes Toggle */}
            <button
              onClick={onToggleQuickNotes}
              title="Toggle Quick Scratchpad & Tasks"
              className={`p-2 rounded-lg border transition-all ${
                isQuickNotesOpen
                  ? 'bg-serene-primary-soft dark:bg-serene-primary/30 border-serene-primary/40 text-serene-primary dark:text-serene-primary-dark'
                  : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Current theme: ${theme}. Click to change.`}
              className="p-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-lg transition-colors"
            >
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
              {theme === 'dark' && <Moon className="w-4 h-4 text-sky-400" />}
              {theme === 'system' && <Laptop className="w-4 h-4 text-serene-text-muted" />}
            </button>

            {/* Settings Modal Trigger */}
            <button
              onClick={onOpenSettingsModal}
              title="Settings, Backup & Help"
              className="p-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
