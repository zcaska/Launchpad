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
import { isTaskDialogOpen } from '../Tasks/TaskDialog';
import { GuideTarget } from '../Common/GuideTarget';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSparkIdea?: () => void;
  onNewTask: (event: React.MouseEvent<HTMLButtonElement>) => void;
  newTaskButtonRef?: React.Ref<HTMLButtonElement>;
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
  newTaskButtonRef,
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
      if (isTaskDialogOpen()) return;
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
    else if (theme === 'dark') onThemeChange('pitch-black');
    else if (theme === 'pitch-black') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <header className="launchpad-header w-full bg-white/90 dark:bg-serene-surface-dark/90 backdrop-blur-md border-b border-serene-border-light dark:border-serene-border-dark sticky top-0 z-30 transition-colors">
      <div className="launchpad-header-inner max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:grid md:grid-cols-[minmax(max-content,1fr)_minmax(0,32rem)_minmax(max-content,1fr)]">
          
          {/* Logo and brand */}
          <GuideTarget id="header.brand" hoverLabel="Focus Hub" className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-default">
              <div className="hidden min-[360px]:flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/25 dark:border-serene-primary/30 items-center justify-center shadow-xs shrink-0 transition-transform hover:scale-105">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="launchpad-wordmark text-sm sm:text-base font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                    LaunchPad
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/20 dark:border-transparent shrink-0">
                    Focus Hub
                  </span>
                </div>
              </div>
            </div>
          </GuideTarget>

          {/* Desktop Search Filter Box */}
          <div className="relative hidden min-w-0 md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-serene-text-muted pointer-events-none" />
              <input
                ref={desktopSearch}
                aria-label="Search tasks"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tasks (Ctrl+K)"
                className="w-full pl-9 pr-14 py-1.5 sm:py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-xl text-xs sm:text-sm text-serene-text-primary dark:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary transition-all"
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

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:justify-self-end">
            {/* New Task - Icon First */}
            <GuideTarget id="header.newTask" hoverLabel="New task (Ctrl+N)">
              <button
                ref={newTaskButtonRef}
                type="button"
                onClick={onNewTask}
                aria-label="New task"
                className="launchpad-new-task flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-serene-primary hover:bg-serene-primary-hover text-white shadow-xs hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={19} weight="bold" aria-hidden="true" />
              </button>
            </GuideTarget>

            {/* Spark Focus Idea - Icon First */}
            {onOpenSparkIdea && (
              <GuideTarget id="header.sparkIdea" hoverLabel="Spark idea">
                <button
                  type="button"
                  onClick={onOpenSparkIdea}
                  aria-label="Spark idea"
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <Lightbulb size={19} weight="fill" />
                </button>
              </GuideTarget>
            )}

            {/* Scratchpad - Icon First */}
            <GuideTarget id="header.scratchpad" hoverLabel="Quick scratchpad">
              <button
                type="button"
                onClick={onOpenScratchpad}
                aria-label="Scratchpad"
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-serene-border-light dark:border-serene-border-dark bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary hover:scale-105 active:scale-95 transition-all"
              >
                <NotePencil size={19} aria-hidden="true" />
              </button>
            </GuideTarget>

            {/* Theme Toggle - Icon First */}
            <GuideTarget id="header.theme" hoverLabel={`Theme: ${theme}`}>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Current theme: ${theme}. Click to change.`}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-xl hover:scale-105 active:scale-95 transition-all"
              >
                {theme === 'light' && <Sun size={19} className="text-amber-500" />}
                {theme === 'dark' && <Moon size={19} className="text-sky-400" />}
                {theme === 'pitch-black' && <Moon size={19} weight="fill" className="text-emerald-400" />}
                {theme === 'system' && <Laptop size={19} className="text-serene-text-muted" />}
              </button>
            </GuideTarget>

            {/* Settings Modal Trigger - Icon First */}
            <GuideTarget id="header.settings" hoverLabel="Settings" className="hidden md:inline-flex">
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-xl hover:scale-105 active:scale-95 transition-all"
              >
                <Settings size={19} />
              </button>
            </GuideTarget>
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl md:hidden"
          >
            <Search size={20} />
          </button>
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
