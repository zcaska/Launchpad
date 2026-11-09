import React, { useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlass as Search,
  Sun,
  Moon,
  Laptop,
  GearSix as Settings,
  Command,
  RocketLaunch as Rocket,
  Plus,
  NotePencil,
  Lightbulb,
  X
} from '@phosphor-icons/react';
import { ThemeMode } from '../../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSparkIdea?: () => void;
  onNewTask: () => void;
  onOpenScratchpad: () => void;
  onOpenSettings: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSparkIdea,
  onNewTask,
  onOpenScratchpad,
  onOpenSettings,
  theme,
  onThemeChange,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopSearch = useRef<HTMLInputElement>(null);
  const mobileSearch = useRef<HTMLInputElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearch.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (searchTrigger.current?.getClientRects().length) {
        setMobileSearchOpen(true);
        mobileSearch.current?.focus();
      } else {
        desktopSearch.current?.focus();
      }
    };

    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const closeMobileSearch = () => {
    onSearchChange('');
    setMobileSearchOpen(false);
    searchTrigger.current?.focus();
  };

  const toggleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <header className="w-full bg-white/90 dark:bg-serene-surface-dark/90 backdrop-blur-md border-b border-serene-border-light dark:border-serene-border-dark sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo and brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden min-[360px]:flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/25 dark:border-serene-primary/30 items-center justify-center shadow-xs shrink-0 transition-transform hover:scale-105">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                  LaunchPad
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/20 dark:border-transparent shrink-0">
                  Focus Hub
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-serene-text-muted">
                Your intentional landing dashboard
              </p>
            </div>
          </div>

          {/* Desktop Search Filter Box */}
          <div className="hidden md:block flex-1 max-w-xs md:max-w-md lg:max-w-lg relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-serene-text-muted pointer-events-none" />
              <input
                ref={desktopSearch}
                aria-label="Search tasks"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tasks (Ctrl+K)"
                className="w-full pl-9 pr-14 py-1.5 sm:py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg text-xs sm:text-sm text-serene-text-primary dark:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary transition-all"
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

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" onClick={onNewTask} aria-label="New task" title="New task"
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-serene-primary px-2.5 text-white sm:px-3">
              <Plus size={20} aria-hidden="true" />
              <span className="text-sm font-semibold">New task</span>
            </button>
            <button type="button" onClick={onOpenScratchpad} aria-label="Scratchpad" title="Scratchpad"
              className="grid h-11 w-11 place-items-center rounded-lg hover:bg-serene-primary/10">
              <NotePencil size={22} aria-hidden="true" />
            </button>
          </div>

          <button
            ref={searchTrigger}
            type="button"
            aria-label="Search tasks"
            aria-expanded={mobileSearchOpen || Boolean(searchQuery)}
            aria-controls="mobile-task-search"
            onClick={() => {
              setMobileSearchOpen(true);
              mobileSearch.current?.focus();
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg md:hidden"
          >
            <Search size={22} />
          </button>

          {/* Desktop utilities */}
          <div className="hidden items-center gap-2 shrink-0 md:flex">
            {/* Spark Focus Idea Button */}
            {onOpenSparkIdea && (
              <button
                onClick={onOpenSparkIdea}
                title="Spark a smart focus idea or curated reading"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
              >
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Spark Idea</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Current theme: ${theme}. Click to change.`}
              className="p-1.5 sm:p-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-lg transition-colors"
            >
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
              {theme === 'dark' && <Moon className="w-4 h-4 text-sky-400" />}
              {theme === 'system' && <Laptop className="w-4 h-4 text-serene-text-muted" />}
            </button>

            {/* Settings Modal Trigger */}
            <button
              onClick={onOpenSettings}
              title="Settings, Backup & Help"
              className="p-1.5 sm:p-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="mobile-task-search" className={mobileSearchOpen || searchQuery ? "pt-2 md:hidden" : "hidden"}>
          <div className="flex items-center gap-2">
            <input
              ref={mobileSearch}
              type="search"
              aria-label="Search tasks"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeMobileSearch();
              }}
              placeholder="Search tasks"
              className="min-w-0 flex-1 rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-3 py-2.5 text-base dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark"
            />
            <button
              type="button"
              onClick={closeMobileSearch}
              aria-label="Close task search"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg"
            >
              <X />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
