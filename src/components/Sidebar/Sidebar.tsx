import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CheckSquare,
  X,
  Compass,
  Trophy,
  Lightbulb,
  Sparkle as Sparkles,
  ArrowClockwise as RotateCw,
  ArrowSquareOut as ExternalLink,
  Check,
  Clock,
  EnvelopeSimple as Mail,
  Coffee,
  Bank,
  ChartLineUp,
  Article,
  GraduationCap,
  Scales,
  BookOpenText,
  Brain,
  Headphones,
  Code
} from '@phosphor-icons/react';
import { Folder, LinkItem, GamificationState, RecommendationCandidate } from '../../types';
import { getHeroById } from '../../data/heroRoster';
import { getCurrentSubLevel } from '../../utils/gamification';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView?: 'dashboard' | 'tasks' | 'growth' | 'settings';
  onSelectView?: (view: 'dashboard' | 'tasks' | 'growth' | 'settings') => void;
  pendingTasksCount?: number;
  gamification?: GamificationState;
  userEmail?: string;
  suggestionCandidate?: RecommendationCandidate | null;
  onApproveSuggestion?: (candidate: RecommendationCandidate) => void;
  onRejectSuggestion?: (candidate: RecommendationCandidate) => void;
  onNextSuggestion?: () => void;
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
  gamification,
  suggestionCandidate,
  onApproveSuggestion,
  onRejectSuggestion,
  onNextSuggestion,
}) => {
  const activeHero = useMemo(() => {
    if (!gamification?.activeHeroId) return null;
    return getHeroById(gamification.activeHeroId);
  }, [gamification?.activeHeroId]);

  const subLevelInfo = useMemo(() => {
    if (!activeHero) return null;
    return getCurrentSubLevel(
      activeHero,
      gamification?.currentStreak || 0,
      gamification?.currentXp || 0
    );
  }, [activeHero, gamification?.currentStreak, gamification?.currentXp]);

  const heroLevelBadge = activeHero
    ? subLevelInfo?.currentStage
      ? `Lvl ${activeHero.level}.${subLevelInfo.currentStage.stage}`
      : `Lvl ${activeHero.level}`
    : 'Lvl 1.1';

  const getSuggestionIcon = (cand: RecommendationCandidate) => {
    const text = (cand.title + ' ' + (cand.category || '') + ' ' + (cand.tags || []).join(' ')).toLowerCase();
    if (cand.category === 'Finance' || text.includes('finance') || text.includes('investing') || text.includes('markets')) {
      return <Bank className="w-4.5 h-4.5 text-emerald-500" />;
    }
    if (cand.category === 'Economics' || text.includes('economics') || text.includes('trade')) {
      return <ChartLineUp className="w-4.5 h-4.5 text-teal-500" />;
    }
    if (cand.category === 'Journalism' || text.includes('journalism') || text.includes('investigative') || text.includes('news')) {
      return <Article className="w-4.5 h-4.5 text-blue-500" />;
    }
    if (cand.category === 'Academia' || text.includes('courseware') || text.includes('lecture') || text.includes('university')) {
      return <GraduationCap className="w-4.5 h-4.5 text-indigo-500" />;
    }
    if (cand.category === 'Philosophy' || text.includes('philosophy') || text.includes('ethics') || text.includes('rationality')) {
      return <Scales className="w-4.5 h-4.5 text-purple-500" />;
    }
    if (cand.category === 'Literature' || text.includes('book') || text.includes('reading') || text.includes('literature') || text.includes('poetry')) {
      return <BookOpenText className="w-4.5 h-4.5 text-amber-500" />;
    }
    if (cand.category === 'Psychology' || text.includes('psychology') || text.includes('neuroscience') || text.includes('brain') || text.includes('behavior')) {
      return <Brain className="w-4.5 h-4.5 text-rose-500" />;
    }
    if (cand.category === 'Focus' && (text.includes('audio') || text.includes('sound') || text.includes('lofi') || text.includes('noise'))) {
      return <Headphones className="w-4.5 h-4.5 text-amber-500" />;
    }
    if (cand.category === 'Technology' || cand.category === 'Engineering' || text.includes('code') || text.includes('tech')) {
      return <Code className="w-4.5 h-4.5 text-slate-500" />;
    }
    if (text.includes('mail') || text.includes('inbox')) return <Mail className="w-4.5 h-4.5 text-sky-500" />;
    if (text.includes('posture') || text.includes('hydrate') || text.includes('breath') || text.includes('coffee') || text.includes('water')) {
      return <Coffee className="w-4.5 h-4.5 text-emerald-500" />;
    }
    if (text.includes('walk') || text.includes('outside') || text.includes('optic flow')) {
      return <Compass className="w-4.5 h-4.5 text-teal-500" />;
    }
    return <Sparkles className="w-4.5 h-4.5 text-amber-500" />;
  };

  const isHabit = suggestionCandidate?.kind === 'habit' || !suggestionCandidate?.url;

  return (
    <>
      <aside
        className={`relative h-full bg-white/80 dark:bg-serene-surface-dark/95 backdrop-blur-md border-r border-serene-border-light dark:border-serene-border-dark hidden md:flex flex-col shrink-0 transition-all duration-300 select-none ${
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
                    <div className="flex items-center gap-1.5">
                      {onNextSuggestion && (
                        <button
                          type="button"
                          onClick={onNextSuggestion}
                          title="Shuffle next suggestion (no penalty)"
                          aria-label="Shuffle next suggestion"
                          className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-serene-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        {suggestionCandidate.durationEstimateMinutes}m
                      </span>
                    </div>
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

                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-amber-500/15">
                    <button
                      type="button"
                      onClick={onNextSuggestion || (() => onRejectSuggestion?.(suggestionCandidate))}
                      title="Next focus suggestion without penalty"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Next Idea</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {onRejectSuggestion && (
                        <button
                          type="button"
                          onClick={() => onRejectSuggestion(suggestionCandidate)}
                          title="Don't suggest this again (dislike)"
                          aria-label="Don't suggest this again"
                          className="p-1.5 rounded-lg text-xs font-medium text-serene-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                  onClick={onNextSuggestion || (() => onRejectSuggestion?.(suggestionCandidate))}
                  title={`Focus Spark: ${suggestionCandidate.title} (Click to shuffle next suggestion)`}
                  className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-105 transition-all shadow-2xs cursor-pointer group"
                >
                  <Lightbulb className="w-6 h-6 transition-transform group-hover:rotate-12" />
                  <span className="sr-only">Focus Spark: {suggestionCandidate.title}</span>
                </button>
              )
            )}
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
