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

  const handleNavClick = (view: 'dashboard' | 'tasks' | 'growth') => {
    if (onSelectView) {
      onSelectView(view);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getSuggestionIcon = (cand: RecommendationCandidate) => {
    const text = (cand.title + ' ' + (cand.tags || []).join(' ')).toLowerCase();
    if (text.includes('book') || text.includes('reading')) return <BookOpen className="w-4 h-4 text-amber-500" />;
    if (text.includes('mail') || text.includes('inbox')) return <Mail className="w-4 h-4 text-sky-500" />;
    if (text.includes('posture') || text.includes('hydrate') || text.includes('breath') || text.includes('coffee')) {
      return <Coffee className="w-4 h-4 text-emerald-500" />;
    }
    return <Sparkles className="w-4 h-4 text-amber-500" />;
  };

  const isHabit = suggestionCandidate?.kind === 'habit' || !suggestionCandidate?.url;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white/95 dark:bg-serene-surface-dark/95 backdrop-blur-md border-r border-serene-border-light dark:border-serene-border-dark transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64 sm:w-72'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full p-3 select-none">
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 px-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-serene-primary flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                  <Compass className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                    LaunchPad
                  </h1>
                  <p className="text-[10px] text-serene-text-muted truncate">
                    Focus Station
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 mx-auto rounded-xl bg-serene-primary flex items-center justify-center text-white font-bold text-sm shadow-xs">
                <Compass className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Desktop Collapse / Mobile Close */}
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                className="hidden lg:flex p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-serene-text-muted">
                Workspace
              </span>
            )}

            {/* Focus Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              title={isCollapsed ? 'Focus Dashboard' : undefined}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'dashboard' && (
                <ActivePill layoutId="activeNavPill" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <Compass className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Overview</span>}
            </button>

            {/* Tasks & Action Items */}
            <button
              onClick={() => handleNavClick('tasks')}
              title={isCollapsed ? `Tasks (${pendingTasksCount} pending)` : undefined}
              className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'tasks'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'tasks' && (
                <ActivePill layoutId="activeNavPill" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <div className="flex items-center gap-3 min-w-0">
                <CheckSquare className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Tasks & Queue</span>}
              </div>
              {pendingTasksCount > 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    currentView === 'tasks'
                      ? 'bg-white/20 text-white'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  }`}
                >
                  {pendingTasksCount}
                </span>
              )}
            </button>

            {/* Growth & Mastery */}
            <button
              onClick={() => handleNavClick('growth')}
              title={isCollapsed ? `Growth (${heroLevelBadge})` : undefined}
              className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'growth'
                  ? 'text-white'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
              }`}
            >
              {currentView === 'growth' && (
                <ActivePill layoutId="activeNavPill" tone="primary" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
              )}
              <div className="flex items-center gap-3 min-w-0">
                <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
                {!isCollapsed && <span className="truncate">Growth & Mastery</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    currentView === 'growth'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {heroLevelBadge}
                </span>
              )}
            </button>

            {/* Scratchpad Toggle */}
            {onOpenScratchpad && (
              <button
                onClick={() => {
                  onOpenScratchpad();
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? 'Quick Scratchpad' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark transition-colors"
              >
                <FileText className="w-4 h-4 shrink-0 text-stone-500" />
                {!isCollapsed && <span className="truncate">Scratchpad</span>}
              </button>
            )}
          </div>

          {/* Section Divider */}
          <div
            className={`h-[1px] bg-serene-border-light dark:bg-serene-border-dark my-3.5 ${
              isCollapsed ? 'w-8 mx-auto' : 'mx-1'
            }`}
          />

          {/* Embedded Live Focus Spark Idea Card */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {!isCollapsed ? (
              suggestionCandidate ? (
                <div className="rounded-2xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 border border-serene-border-light/80 dark:border-serene-border-dark/80 p-3 flex flex-col justify-between shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        {getSuggestionIcon(suggestionCandidate)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-serene-text-muted">
                        Focus Spark
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-serene-text-muted">
                      <Clock className="w-3 h-3" />
                      {suggestionCandidate.durationEstimateMinutes}m
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug line-clamp-2">
                      {suggestionCandidate.title}
                    </h4>
                    {suggestionCandidate.description && (
                      <p className="text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 line-clamp-2 leading-relaxed">
                        {suggestionCandidate.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-serene-border-light/50 dark:border-serene-border-dark/50">
                    <button
                      onClick={() => onRejectSuggestion?.(suggestionCandidate)}
                      title="Next focus suggestion"
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Another</span>
                    </button>
                    <button
                      onClick={() => {
                        onApproveSuggestion?.(suggestionCandidate);
                        if (suggestionCandidate.url) {
                          window.open(suggestionCandidate.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title={isHabit ? "Commit to this habit" : "Open resource"}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-2xs transition-all flex items-center gap-1"
                    >
                      {isHabit ? <Check className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                      <span>{isHabit ? "I'll do this" : "Open"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center rounded-xl border border-dashed border-serene-border-light dark:border-serene-border-dark text-[11px] text-serene-text-muted">
                  <Lightbulb className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <span>Runway clear</span>
                </div>
              )
            ) : (
              suggestionCandidate && (
                <button
                  onClick={() => onRejectSuggestion?.(suggestionCandidate)}
                  title={`Focus Spark: ${suggestionCandidate.title}`}
                  className="w-10 h-10 mx-auto rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark flex items-center justify-center text-amber-500 hover:text-amber-600 transition-colors shadow-2xs"
                >
                  <Lightbulb className="w-4.5 h-4.5" />
                </button>
              )
            )}
          </div>

          {/* Bottom User Avatar Section */}
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
});

Sidebar.displayName = 'Sidebar';
