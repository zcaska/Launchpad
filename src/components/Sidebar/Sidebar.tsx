import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  X,
  Compass,
  Trophy,
  User,
  FileText,
  Lightbulb,
  Sparkles,
  RotateCw,
  ExternalLink,
  Check,
  Clock,
  BookOpen,
  Mail,
  Coffee
} from 'lucide-react';
import { Folder, LinkItem, GamificationState, RecommendationCandidate } from '../../types';
import { getHeroById } from '../../data/heroRoster';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView?: 'dashboard' | 'tasks' | 'growth';
  onSelectView?: (view: 'dashboard' | 'tasks' | 'growth') => void;
  pendingTasksCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  gamification?: GamificationState;
  userEmail?: string;
  onOpenScratchpad?: () => void;
  suggestionCandidate?: RecommendationCandidate | null;
  onApproveSuggestion?: (candidate: RecommendationCandidate) => void;
  onRejectSuggestion?: (candidate: RecommendationCandidate) => void;
  // Legacy props kept optional for backward compatibility
  folders?: Folder[];
  links?: LinkItem[];
  selectedFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  onOpenManageFolders?: () => void;
  onOpenAddFolder?: () => void;
  onHideFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
}

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

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isCollapsed,
  onToggleCollapse,
  currentView = 'dashboard',
  onSelectView,
  pendingTasksCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  gamification,
  userEmail,
  onOpenScratchpad,
  suggestionCandidate,
  onApproveSuggestion,
  onRejectSuggestion,
}) => {
  const activeHero = useMemo(() => {
    if (!gamification?.activeHeroId) return null;
    return getHeroById(gamification.activeHeroId);
  }, [gamification?.activeHeroId]);

  const heroLevelBadge = activeHero ? `Lvl ${activeHero.level}` : 'Lvl 1';

  const handleMobileNavClick = (view: 'dashboard' | 'tasks' | 'growth') => {
    if (onSelectView) {
      onSelectView(view);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getSuggestionIcon = (cand: RecommendationCandidate) => {
    const text = (cand.title + ' ' + (cand.tags || []).join(' ')).toLowerCase();
    if (text.includes('book') || text.includes('reading')) return <BookOpen className="w-4.5 h-4.5 text-amber-500" />;
    if (text.includes('mail') || text.includes('inbox')) return <Mail className="w-4.5 h-4.5 text-sky-500" />;
    if (text.includes('posture') || text.includes('hydrate') || text.includes('breath') || text.includes('coffee')) {
      return <Coffee className="w-4.5 h-4.5 text-emerald-500" />;
    }
    return <Sparkles className="w-4.5 h-4.5 text-amber-500" />;
  };

  const isHabit = suggestionCandidate?.kind === 'habit' || !suggestionCandidate?.url;

  return (
    <>
      {/* =========================================================================
          1. MOBILE OFF-CANVAS DRAWER (< md)
          ========================================================================= */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-serene-surface-dark shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out border-r border-serene-border-light dark:border-serene-border-dark ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-serene-border-light/70 dark:border-serene-border-dark/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-serene-primary/10 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center font-bold">
              <Compass className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="font-bold text-sm text-serene-text-primary dark:text-serene-text-darkPrimary block leading-tight">
                Navigation & Focus
              </span>
              <span className="text-[10px] text-serene-text-muted">LaunchPad</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold text-serene-text-muted uppercase tracking-wider">
              Workspace
            </div>

            {/* Overview / Dashboard */}
            <button
              type="button"
              onClick={() => handleMobileNavClick('dashboard')}
              className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'dashboard' && (
                <ActivePill layoutId="navPillMobile" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <Compass className={`w-5 h-5 shrink-0 stroke-[2] ${currentView === 'dashboard' ? 'text-white' : 'text-serene-primary dark:text-serene-primary-dark'}`} />
              <span className="flex-1 text-left truncate">Overview</span>
            </button>

            {/* Tasks & Action Items */}
            <button
              type="button"
              onClick={() => handleMobileNavClick('tasks')}
              className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'tasks'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'tasks' && (
                <ActivePill layoutId="navPillMobile" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <CheckSquare className={`w-5 h-5 shrink-0 stroke-[2] ${currentView === 'tasks' ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
              <span className="flex-1 text-left truncate">Tasks & Queue</span>
              {pendingTasksCount > 0 && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    currentView === 'tasks'
                      ? 'bg-white/25 text-white'
                      : 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20'
                  }`}
                >
                  {pendingTasksCount}
                </span>
              )}
            </button>

            {/* Growth & Mastery */}
            <button
              type="button"
              onClick={() => handleMobileNavClick('growth')}
              className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'growth'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'growth' && (
                <ActivePill layoutId="navPillMobile" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <Trophy className={`w-5 h-5 shrink-0 stroke-[2] ${currentView === 'growth' ? 'text-white' : 'text-amber-500 dark:text-amber-400'}`} />
              <span className="flex-1 text-left truncate">Growth & Mastery</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  currentView === 'growth'
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {heroLevelBadge}
              </span>
            </button>

            {/* Scratchpad Toggle */}
            {onOpenScratchpad && (
              <button
                type="button"
                onClick={() => {
                  onOpenScratchpad();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5 shrink-0 stroke-[2] text-stone-500 dark:text-stone-400" />
                <span className="flex-1 text-left truncate">Scratchpad</span>
              </button>
            )}
          </div>

          {/* Section Divider */}
          <div className="h-[1px] bg-serene-border-light/70 dark:bg-serene-border-dark/70 my-2 mx-1" />

          {/* Focus Spark Card in Mobile Drawer */}
          {suggestionCandidate && (
            <div className="rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-col justify-between shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    {getSuggestionIcon(suggestionCandidate)}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Focus Spark
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-serene-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {suggestionCandidate.durationEstimateMinutes}m
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug line-clamp-2">
                  {suggestionCandidate.title}
                </h4>
                {suggestionCandidate.description && (
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 line-clamp-2 leading-relaxed">
                    {suggestionCandidate.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/15">
                <button
                  type="button"
                  onClick={() => onRejectSuggestion?.(suggestionCandidate)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Another</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApproveSuggestion?.(suggestionCandidate);
                    if (suggestionCandidate.url) {
                      window.open(suggestionCandidate.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  {isHabit ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{isHabit ? "I'll do this" : "Open"}</span>
                </button>
              </div>
            </div>
          )}

          {/* User Profile in Mobile Drawer */}
          <div className="pt-2 mt-auto shrink-0 border-t border-serene-border-light/70 dark:border-serene-border-dark/70">
            <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-serene-surfaceAlt-light/70 dark:bg-serene-surfaceAlt-dark/70 border border-serene-border-light/60 dark:border-serene-border-dark/60">
              <div className="w-9 h-9 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/20 border border-serene-primary/20 flex items-center justify-center text-serene-primary dark:text-serene-primary-dark font-bold text-sm shrink-0">
                {userEmail ? userEmail.charAt(0).toUpperCase() : <User className="w-4 h-4 text-serene-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-serene-text-primary dark:text-serene-text-darkPrimary">
                  {userEmail ? userEmail.split('@')[0] : 'LaunchPad User'}
                </p>
                <p className="text-[11px] text-serene-text-muted truncate">
                  {userEmail || 'Focus Session Active'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. DESKTOP PERSISTENT SIDEBAR (>= md)
          In-flow flex item: relative h-full shrink-0 (NEVER overlaps main content)
          ========================================================================= */}
      <aside
        className={`relative h-full bg-white/70 dark:bg-serene-surface-dark/70 backdrop-blur-md border-r border-serene-border-light dark:border-serene-border-dark hidden md:flex flex-col shrink-0 transition-all duration-300 select-none ${
          isCollapsed ? 'w-[76px]' : 'w-64 lg:w-72'
        }`}
      >
        {/* Floating Border Collapse/Expand Trigger Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="absolute -right-3 top-5 w-6 h-6 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-full flex items-center justify-center text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark shadow-xs z-30 transition-transform hover:scale-110 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Desktop Sidebar Scrollable Content */}
        <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto">
          {/* Top Section / Header */}
          {!isCollapsed ? (
            <div className="px-3 pt-2 pb-1 text-xs font-bold text-serene-text-muted uppercase tracking-wider">
              Workspace
            </div>
          ) : (
            <div className="pt-2" />
          )}

          {/* Primary Navigation Items */}
          <div className="space-y-1.5">
            {/* Overview / Focus Dashboard */}
            <button
              type="button"
              onClick={() => onSelectView?.('dashboard')}
              title={isCollapsed ? 'Focus Dashboard' : undefined}
              className={`relative flex items-center transition-all cursor-pointer ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto justify-center rounded-xl'
                  : 'w-full gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold'
              } ${
                currentView === 'dashboard'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
            >
              {currentView === 'dashboard' && (
                <ActivePill layoutId="navPillDesktop" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <Compass
                className={`shrink-0 stroke-[2] ${
                  isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                } ${
                  currentView === 'dashboard' ? 'text-white' : 'text-serene-primary dark:text-serene-primary-dark'
                }`}
              />
              {!isCollapsed && <span className="flex-1 text-left truncate">Overview</span>}
            </button>

            {/* Tasks & Action Items */}
            <button
              type="button"
              onClick={() => onSelectView?.('tasks')}
              title={isCollapsed ? `Tasks (${pendingTasksCount} pending)` : undefined}
              className={`relative flex items-center transition-all cursor-pointer ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto justify-center rounded-xl'
                  : 'w-full gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold'
              } ${
                currentView === 'tasks'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
            >
              {currentView === 'tasks' && (
                <ActivePill layoutId="navPillDesktop" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <CheckSquare
                className={`shrink-0 stroke-[2] ${
                  isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                } ${
                  currentView === 'tasks' ? 'text-white' : 'text-teal-600 dark:text-teal-400'
                }`}
              />
              {!isCollapsed ? (
                <>
                  <span className="flex-1 text-left truncate">Tasks & Queue</span>
                  {pendingTasksCount > 0 && (
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        currentView === 'tasks'
                          ? 'bg-white/25 text-white'
                          : 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20'
                      }`}
                    >
                      {pendingTasksCount}
                    </span>
                  )}
                </>
              ) : (
                pendingTasksCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                  </span>
                )
              )}
            </button>

            {/* Growth & Mastery */}
            <button
              type="button"
              onClick={() => onSelectView?.('growth')}
              title={isCollapsed ? `Growth & Mastery (${heroLevelBadge})` : undefined}
              className={`relative flex items-center transition-all cursor-pointer ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto justify-center rounded-xl'
                  : 'w-full gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold'
              } ${
                currentView === 'growth'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
              }`}
            >
              {currentView === 'growth' && (
                <ActivePill layoutId="navPillDesktop" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <Trophy
                className={`shrink-0 stroke-[2] ${
                  isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                } ${
                  currentView === 'growth' ? 'text-white' : 'text-amber-500 dark:text-amber-400'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">Growth & Mastery</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      currentView === 'growth'
                        ? 'bg-white/25 text-white'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {heroLevelBadge}
                  </span>
                </>
              )}
            </button>

            {/* Quick Scratchpad */}
            {onOpenScratchpad && (
              <button
                type="button"
                onClick={onOpenScratchpad}
                title={isCollapsed ? 'Quick Scratchpad' : undefined}
                className={`flex items-center transition-all cursor-pointer ${
                  isCollapsed
                    ? 'w-12 h-12 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium'
                } text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary`}
              >
                <FileText
                  className={`shrink-0 stroke-[2] text-stone-500 dark:text-stone-400 ${
                    isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                  }`}
                />
                {!isCollapsed && <span className="flex-1 text-left truncate">Scratchpad</span>}
              </button>
            )}
          </div>

          {/* Section Divider */}
          <div
            className={`h-[1px] bg-serene-border-light/70 dark:bg-serene-border-dark/70 my-2 ${
              isCollapsed ? 'w-8 mx-auto' : 'mx-1'
            }`}
          />

          {/* Embedded Live Focus Spark Idea Card */}
          <div className="flex-1 flex flex-col justify-start min-h-0">
            {!isCollapsed ? (
              suggestionCandidate ? (
                <div className="rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-col justify-between shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        {getSuggestionIcon(suggestionCandidate)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Focus Spark
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-serene-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {suggestionCandidate.durationEstimateMinutes}m
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug line-clamp-2">
                      {suggestionCandidate.title}
                    </h4>
                    {suggestionCandidate.description && (
                      <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 line-clamp-2 leading-relaxed">
                        {suggestionCandidate.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/15">
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion?.(suggestionCandidate)}
                      title="Next focus suggestion"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Another</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveSuggestion?.(suggestionCandidate);
                        if (suggestionCandidate.url) {
                          window.open(suggestionCandidate.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title={isHabit ? "Commit to this habit" : "Open resource"}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isHabit ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      <span>{isHabit ? "I'll do this" : "Open"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark text-xs text-serene-text-muted">
                  <Lightbulb className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
                  <span>Runway clear</span>
                </div>
              )
            ) : (
              suggestionCandidate && (
                <button
                  type="button"
                  onClick={() => onRejectSuggestion?.(suggestionCandidate)}
                  title={`Focus Spark: ${suggestionCandidate.title} (Click for another)`}
                  className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-105 transition-all shadow-2xs cursor-pointer group"
                >
                  <Lightbulb className="w-6 h-6 transition-transform group-hover:rotate-12" />
                  <span className="sr-only">Focus Spark: {suggestionCandidate.title}</span>
                </button>
              )
            )}
          </div>

          {/* Bottom User Avatar Section */}
          <div className="pt-2 mt-auto shrink-0 border-t border-serene-border-light/70 dark:border-serene-border-dark/70">
            {isCollapsed ? (
              <div
                className="w-12 h-12 mx-auto rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark flex items-center justify-center text-serene-primary dark:text-serene-primary-dark font-bold text-sm shadow-xs"
                title={userEmail ? `User: ${userEmail}` : 'LaunchPad User'}
              >
                {userEmail ? (
                  <span>{userEmail.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="w-5 h-5 text-serene-text-muted" />
                )}
              </div>
            ) : (
              <div className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-serene-surfaceAlt-light/70 dark:bg-serene-surfaceAlt-dark/70 border border-serene-border-light/60 dark:border-serene-border-dark/60">
                <div className="w-9 h-9 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/20 border border-serene-primary/20 flex items-center justify-center text-serene-primary dark:text-serene-primary-dark font-bold text-sm shrink-0">
                  {userEmail ? (
                    userEmail.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-4 h-4 text-serene-primary dark:text-serene-primary-dark" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-serene-text-primary dark:text-serene-text-darkPrimary">
                    {userEmail ? userEmail.split('@')[0] : 'LaunchPad User'}
                  </p>
                  <p className="text-[11px] text-serene-text-muted truncate">
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
});

Sidebar.displayName = 'Sidebar';
