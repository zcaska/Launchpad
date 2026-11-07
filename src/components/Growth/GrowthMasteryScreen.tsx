import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Sparkle as Sparkles,
  Crown,
  Medal as Award,
  Lock,
  LockOpen as Unlock,
  CheckCircle as CheckCircle2,
  DownloadSimple as Download,
  UploadSimple as Upload,
  ShieldCheck,
  CalendarBlank as Calendar,
  Pulse as Activity,
  TrendUp as TrendingUp,
  Brain,
  EyeSlash,
  Question,
  Clock,
  WarningCircle as AlertCircle,
} from '@phosphor-icons/react';
import { GamificationState, DailyGrowthRecord, HeroLevelDef } from '../../types';
import { HERO_ROSTER, getHeroById } from '../../data/heroRoster';
import { getCurrentSubLevel, getHeroVisibilityState } from '../../utils/gamification';
import { WeeklyFocusChart } from './WeeklyFocusChart';
import { MonthlyHeatmap } from './MonthlyHeatmap';
import { YearlyGrowthView } from './YearlyGrowthView';

/**
 * Resolves local badge image paths reliably with Vite base path and URL encoding.
 */
const getBadgeSrc = (badgePath?: string): string => {
  if (!badgePath) return '';
  const base = ((import.meta as any).env?.BASE_URL as string) || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = badgePath.startsWith('/') ? badgePath.slice(1) : badgePath;
  return `${cleanBase}${encodeURI(cleanPath)}`;
};

export interface GrowthMasteryScreenProps {
  gamification: GamificationState;
  growthHistory: Record<string, DailyGrowthRecord>;
  onSelectHero: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (json: string) => void;
  onBackToDashboard: () => void;
}

type HorizonTab = 'weekly' | 'monthly' | 'yearly';

export const GrowthMasteryScreen: React.FC<GrowthMasteryScreenProps> = ({
  gamification,
  growthHistory = {},
  onSelectHero,
  onExportBackup,
  onImportBackup,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<HorizonTab>('weekly');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active hero and unlocked IDs with robust fallbacks
  const unlockedIds = useMemo(
    () => gamification.unlockedHeroIds || ['lvl-1-awakening'],
    [gamification.unlockedHeroIds]
  );
  const activeHero: HeroLevelDef = useMemo(
    () => getHeroById(gamification.activeHeroId || 'lvl-1-awakening'),
    [gamification.activeHeroId]
  );

  const highestUnlockedLevel = useMemo(() => {
    return Math.max(1, ...unlockedIds.map((id) => getHeroById(id)?.level || 1));
  }, [unlockedIds]);

  const activeSubLevel = useMemo(() => {
    return getCurrentSubLevel(
      activeHero,
      gamification.currentStreak || 0,
      gamification.currentXp || 0
    );
  }, [activeHero, gamification.currentStreak, gamification.currentXp]);

  // Next locked hero to progress towards
  const nextLockedHero = useMemo(
    () => HERO_ROSTER.find((hero) => !unlockedIds.includes(hero.id)),
    [unlockedIds]
  );

  // Progress metrics toward the next hero tier
  const nextHeroMetrics = useMemo(() => {
    if (!nextLockedHero) return null;
    const currentStreak = gamification.currentStreak || 0;
    const currentXp = gamification.currentXp || 0;

    const streakRemaining = Math.max(0, nextLockedHero.minStreakDays - currentStreak);
    const xpRemaining = Math.max(0, nextLockedHero.minLifetimeXp - currentXp);

    const streakPct = Math.min(
      100,
      Math.round((currentStreak / nextLockedHero.minStreakDays) * 100)
    );
    const xpPct = Math.min(
      100,
      Math.round((currentXp / nextLockedHero.minLifetimeXp) * 100)
    );
    // Since either criteria unlocks the hero:
    const overallPct = Math.max(streakPct, xpPct);

    return {
      streakRemaining,
      xpRemaining,
      streakPct,
      xpPct,
      overallPct,
      nextLockedHero,
    };
  }, [nextLockedHero, gamification.currentStreak, gamification.currentXp]);

  // Handle backup file selection and parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || typeof text !== 'string') {
          throw new Error('Backup file is empty or unreadable.');
        }
        // Validate JSON format
        JSON.parse(text);
        onImportBackup(text);
        setImportSuccess('Backup restored successfully!');
      } catch (err: any) {
        setImportError(
          'Failed to import backup: ' + (err?.message || 'Invalid JSON format.')
        );
      } finally {
        if (e.target) {
          e.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected backup file.');
      if (e.target) {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerImport = () => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  // Format last backup timestamp
  const formatLastBackup = (timestamp?: number) => {
    if (!timestamp || timestamp <= 0) return 'No backup recorded yet';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const daysSinceBackup = useMemo(() => {
    if (!gamification.lastBackupTimestamp || gamification.lastBackupTimestamp <= 0) return null;
    return Math.floor((Date.now() - gamification.lastBackupTimestamp) / (1000 * 60 * 60 * 24));
  }, [gamification.lastBackupTimestamp]);

  const getCategoryBadge = (category: 'anime' | 'fiction' | 'real_world') => {
    switch (category) {
      case 'anime':
        return {
          label: 'Anime',
          classes:
            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
        };
      case 'fiction':
        return {
          label: 'Fiction',
          classes:
            'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800/40',
        };
      case 'real_world':
        return {
          label: 'Real World',
          classes:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
        };
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* ========================================================= */}
        {/* 1. Header Bar                                             */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-serene-border-light dark:border-serene-border-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              aria-label="Back to Dashboard"
              className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40 shadow-subtle transition-all duration-150"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-card shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-2">
                  Growth & Mastery
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20 animate-pulse" />
                </h1>
                <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Momentum analytics, psychological milestones & hero progression
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Streak Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-semibold shadow-subtle">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{gamification.currentStreak} Day Streak</span>
              <span className="text-orange-400 dark:text-orange-500 text-[10px] font-normal ml-0.5">
                (Best: {gamification.longestStreak || gamification.currentStreak}d)
              </span>
            </div>

            {/* Lifetime XP Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark border border-serene-primary/25 text-xs font-semibold shadow-subtle">
              <Sparkles className="w-4 h-4" />
              <span>{(gamification.currentXp || 0).toLocaleString()} XP</span>
            </div>

            {/* Unlocked Heroes Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-semibold shadow-subtle">
              <Award className="w-4 h-4 text-purple-500" />
              <span>{unlockedIds.length}/7 Heroes Unlocked</span>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. Active Hero Showcase Banner                           */}
        {/* ========================================================= */}
        <section aria-label="Active Hero Showcase" className="relative overflow-hidden rounded-3xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-card p-6 sm:p-8">
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-serene-primary/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar + Title + Category + Quote */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl ring-4 ring-serene-primary/30 shrink-0 bg-slate-950 group">
                <img
                  src={getBadgeSrc(activeHero.badgeImage)}
                  alt={activeHero.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/85 text-amber-400 backdrop-blur-sm border border-amber-500/40 shadow-sm whitespace-nowrap">
                  Lvl {activeHero.level}.{activeSubLevel.currentStage.stage}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    {activeHero.name}
                  </h2>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      getCategoryBadge(activeHero.category).classes
                    }`}
                  >
                    {getCategoryBadge(activeHero.category).label}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Stage {activeSubLevel.currentStage.roman}: {activeSubLevel.currentStage.title}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark">
                    Active Avatar
                  </span>
                </div>

                <p className="text-sm font-semibold text-serene-primary dark:text-serene-primary-dark">
                  {activeHero.title}
                </p>

                {/* Emotional Achievement Quote */}
                <blockquote className="italic font-serif text-sm text-serene-text-secondary dark:text-serene-text-darkSecondary pt-1 border-l-2 border-serene-primary/40 dark:border-serene-primary-dark/40 pl-3">
                  "{activeHero.quote}"
                </blockquote>

                {/* Psychological Milestone Reflection */}
                <div className="flex items-start gap-1.5 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary pt-1">
                  <Brain className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">
                      Milestone Meaning:
                    </strong>{' '}
                    {activeHero.realLifeMeaning}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Sub-Level Micro-Progress & Horizon Stepper */}
            <div className="w-full lg:w-96 shrink-0 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark/60 rounded-2xl p-4 sm:p-5 border border-serene-border-light dark:border-serene-border-dark space-y-3.5 shadow-subtle">
              {/* Header: Sub-Level Mastery Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Discipline Sub-Stage: {activeSubLevel.currentStage.roman}</span>
                </div>
                <span className="text-xs font-bold text-serene-primary dark:text-serene-primary-dark">
                  {activeSubLevel.nextStage ? `${activeSubLevel.progressPercent}%` : 'Tier Mastered'}
                </span>
              </div>

              {/* Stepper Stages Chips */}
              {activeHero.subLevels && (
                <div className="grid grid-cols-3 gap-1.5">
                  {activeHero.subLevels.map((st) => {
                    const isCurrent = st.stage === activeSubLevel.currentStage.stage;
                    const isAchieved =
                      (gamification.currentStreak || 0) >= st.minStreakDays ||
                      (gamification.currentXp || 0) >= st.minLifetimeXp;
                    return (
                      <div
                        key={st.stage}
                        className={`flex flex-col items-center py-1.5 px-1 rounded-xl text-center border transition-all ${
                          isCurrent
                            ? 'bg-serene-primary/15 border-serene-primary text-serene-primary dark:text-serene-primary-dark font-bold ring-1 ring-serene-primary/30'
                            : isAchieved
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'bg-white dark:bg-slate-900/60 border-serene-border-light dark:border-serene-border-dark text-serene-text-muted opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                          {isAchieved && !isCurrent ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : null}
                          <span>Stage {st.roman}</span>
                        </div>
                        <span className="text-[9px] truncate max-w-full leading-tight font-medium">
                          {st.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Micro-Progress Bar to Next Sub-Stage */}
              {activeSubLevel.nextStage ? (
                <div className="space-y-2 pt-1 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary font-medium">
                      Next Step:{' '}
                      <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">
                        Stage {activeSubLevel.nextStage.roman} ({activeSubLevel.nextStage.title})
                      </strong>
                    </span>
                    <span className="text-serene-primary dark:text-serene-primary-dark font-semibold">
                      {activeSubLevel.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-serene-border-light dark:bg-serene-border-dark overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-serene-primary transition-all duration-500 ease-out"
                      style={{ width: `${activeSubLevel.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-serene-text-muted">
                    <span>
                      Streak: {gamification.currentStreak} / {activeSubLevel.nextStage.minStreakDays}d
                    </span>
                    <span>
                      XP: {(gamification.currentXp || 0).toLocaleString()} /{' '}
                      {activeSubLevel.nextStage.minLifetimeXp.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Tier {activeHero.level} Mastery Completed!
                </div>
              )}

              {/* Next Major Frontier Mystery Teaser */}
              {nextLockedHero ? (
                <div className="pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 flex items-center justify-between text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Next Frontier: <strong>Level {nextLockedHero.level} (Mystery Tier)</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {nextHeroMetrics?.overallPct || 0}%
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 flex items-center justify-center gap-1.5 text-xs text-amber-500 font-semibold">
                  <Crown className="w-4 h-4" />
                  <span>All 7 Ranks Mastered</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. Tabbed Multi-Horizon Growth Switcher                   */}
        {/* ========================================================= */}
        <section aria-label="Growth Analytics Horizons" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-2">
                <Activity className="w-5 h-5 text-serene-primary dark:text-serene-primary-dark" />
                Multi-Horizon Growth Analytics
              </h2>
              <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                Observe momentum across daily focus, monthly consistency, and annual trajectory
              </p>
            </div>

            {/* Modern Segmented Tab Control */}
            <div className="flex w-full sm:inline-flex sm:w-auto flex-wrap sm:flex-nowrap p-1 rounded-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-subtle sm:shrink-0">
              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'weekly'
                    ? 'bg-serene-primary text-white shadow-sm'
                    : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekly Focus</span>
              </button>

              <button
                onClick={() => setActiveTab('monthly')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'monthly'
                    ? 'bg-serene-primary text-white shadow-sm'
                    : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Monthly Consistency</span>
              </button>

              <button
                onClick={() => setActiveTab('yearly')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'yearly'
                    ? 'bg-serene-primary text-white shadow-sm'
                    : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Yearly Trajectory</span>
              </button>
            </div>
          </div>

          {/* Tab Views */}
          <div className="transition-all duration-200">
            {activeTab === 'weekly' && (
              <WeeklyFocusChart
                growthHistory={growthHistory}
                currentStreak={gamification.currentStreak || 0}
              />
            )}
            {activeTab === 'monthly' && (
              <MonthlyHeatmap
                growthHistory={growthHistory}
                currentStreak={gamification.currentStreak || 0}
                longestStreak={gamification.longestStreak || 0}
              />
            )}
            {activeTab === 'yearly' && (
              <YearlyGrowthView
                growthHistory={growthHistory}
                lifetimeXp={gamification.currentXp || 0}
              />
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. Hall of Heroes Codex (Roster)                          */}
        {/* ========================================================= */}
        <section aria-label="Hall of Heroes Codex" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-2">
                <Award className="w-5 h-5 text-serene-accent-amber" />
                Hall of Heroes Codex
              </h2>
              <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                All 7 Hero tiers and the real-life psychological milestones they embody
              </p>
            </div>
            <div className="text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Unlocked: <span className="font-bold text-serene-primary dark:text-serene-primary-dark">{unlockedIds.length}</span> of 7
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {HERO_ROSTER.map((hero) => {
              const isUnlocked = unlockedIds.includes(hero.id);
              const isActive = gamification.activeHeroId === hero.id;
              const visibility = getHeroVisibilityState(hero.level, highestUnlockedLevel);
              const categoryBadge = getCategoryBadge(hero.category);

              // -----------------------------------------------------------
              // Case 1: Achieved / Unlocked Hero Tier
              // -----------------------------------------------------------
              if (isUnlocked) {
                return (
                  <div
                    key={hero.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 group ${
                      isActive
                        ? 'bg-white dark:bg-serene-surface-dark border-serene-primary dark:border-serene-primary-dark ring-2 ring-serene-primary/30 shadow-card'
                        : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/30 shadow-card hover:shadow-card-hover'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Header: Badge Image, Level, Category & Checkmark */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-md shrink-0 border border-serene-border-light dark:border-serene-border-dark group-hover:scale-105 transition-transform duration-200 bg-slate-950">
                            <img
                              src={getBadgeSrc(hero.badgeImage)}
                              alt={hero.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-black/80 text-amber-300 border border-amber-400/30 whitespace-nowrap">
                              Lvl {hero.level}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-serene-primary dark:text-serene-primary-dark uppercase tracking-wider">
                                Level {hero.level}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${categoryBadge.classes}`}
                              >
                                {categoryBadge.label}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-tight">
                              {hero.name}
                            </h3>
                          </div>
                        </div>

                        {/* Status Icon */}
                        <div
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                          title="Unlocked"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-xs font-semibold text-serene-primary dark:text-serene-primary-dark">
                        {hero.title}
                      </div>

                      {/* Sub-Levels Mastery Stepper */}
                      {hero.subLevels && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-serene-text-secondary dark:text-serene-text-darkSecondary uppercase tracking-wider flex items-center justify-between">
                            <span>Mastery Sub-Levels</span>
                            <span className="text-[9px] font-medium text-serene-text-muted">
                              {hero.subLevels.length} Stages
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {hero.subLevels.map((st) => {
                              const isStageDone =
                                (gamification.currentStreak || 0) >= st.minStreakDays ||
                                (gamification.currentXp || 0) >= st.minLifetimeXp;
                              return (
                                <div
                                  key={st.stage}
                                  className={`px-1.5 py-1 rounded-lg text-center text-[10px] border truncate transition-all ${
                                    isStageDone
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : 'bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 border-serene-border-light dark:border-serene-border-dark text-serene-text-muted'
                                  }`}
                                  title={`Stage ${st.roman}: ${st.title} (${st.minStreakDays}d streak or ${st.minLifetimeXp.toLocaleString()} XP)`}
                                >
                                  {st.roman}. {st.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Emotional Quote */}
                      <p className="text-xs italic text-serene-text-secondary dark:text-serene-text-darkSecondary border-l-2 border-serene-border-light dark:border-serene-border-dark pl-2.5">
                        "{hero.quote}"
                      </p>

                      {/* Real-Life Meaning */}
                      <div className="rounded-xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 p-2.5 border border-serene-border-light/60 dark:border-serene-border-dark/60 text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary">
                        <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary block mb-0.5">
                          Psychological Meaning:
                        </span>
                        {hero.realLifeMeaning}
                      </div>
                    </div>

                    {/* Footer: Unlock Criteria & Equip Action */}
                    <div className="pt-4 mt-4 border-t border-serene-border-light dark:border-serene-border-dark space-y-2.5">
                      <div className="text-[11px] text-serene-text-muted flex items-center justify-between">
                        <span>Unlocked via:</span>
                        <span className="font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
                          {hero.minStreakDays === 1 && hero.minLifetimeXp === 0
                            ? 'Starting Rank'
                            : `${hero.minStreakDays}d streak or ${hero.minLifetimeXp.toLocaleString()} XP`}
                        </span>
                      </div>

                      {isActive ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark text-center text-xs font-bold border border-serene-primary/20 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active Avatar</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectHero(hero.id)}
                          className="w-full py-2 px-3 rounded-xl bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold shadow-subtle transition-all duration-150 flex items-center justify-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Equip as Avatar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // -----------------------------------------------------------
              // Case 2: Immediate Next Locked Frontier (Veiled Mystery)
              // -----------------------------------------------------------
              if (visibility === 'next') {
                const streakPct = Math.min(
                  100,
                  Math.round(((gamification.currentStreak || 0) / hero.minStreakDays) * 100)
                );
                const xpPct = Math.min(
                  100,
                  Math.round(((gamification.currentXp || 0) / hero.minLifetimeXp) * 100)
                );
                const overallPct = Math.max(streakPct, xpPct);

                return (
                  <div
                    key={hero.id}
                    className="flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 bg-gradient-to-b from-slate-900/90 to-slate-950 border-amber-500/30 shadow-card group"
                  >
                    <div className="space-y-4">
                      {/* Header: Shrouded Badge, Level, Category & Lock */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-slate-900 to-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
                            <Lock className="w-6 h-6 relative z-10" />
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              Lvl {hero.level}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                                Level {hero.level}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                                Next Frontier
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-100 leading-tight flex items-center gap-1.5">
                              <span>Mystery Sovereign</span>
                              <EyeSlash className="w-3.5 h-3.5 text-amber-500/70" />
                            </h3>
                          </div>
                        </div>

                        <div
                          className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"
                          title="Locked Next Tier"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-xs font-semibold text-amber-400/90 flex items-center gap-1">
                        <span>Locked Discipline Threshold</span>
                      </div>

                      {/* Shrouded Sub-Levels Teaser */}
                      {hero.subLevels && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider flex items-center justify-between">
                            <span>Uncharted Sub-Stages</span>
                            <span className="text-[9px] font-medium text-amber-500/60">
                              {hero.subLevels.length} Stages Hidden
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {hero.subLevels.map((_, idx) => (
                              <div
                                key={idx}
                                className="px-1.5 py-1 rounded-lg text-center text-[10px] border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-400/70 font-medium"
                              >
                                Stage {idx + 1}: ???
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mystery Lore Quote */}
                      <p className="text-xs italic text-slate-400 border-l-2 border-amber-500/40 pl-2.5">
                        "The mantle reveals itself only when your discipline breaches the barrier. Sacrifice is the only key."
                      </p>

                      {/* Sacrifice & Discipline Demand */}
                      <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-[11px] text-slate-300 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Discipline & Sacrifice Required:</span>
                        </div>
                        <p className="text-slate-300">
                          Requires an unbroken streak of{' '}
                          <strong className="text-amber-300">{hero.minStreakDays} days</strong> or{' '}
                          <strong className="text-amber-300">
                            {hero.minLifetimeXp.toLocaleString()} XP
                          </strong>
                          .
                        </p>
                        <div className="pt-1 flex justify-between text-[10px] text-slate-400">
                          <span>Streak: {gamification.currentStreak}/{hero.minStreakDays}d ({streakPct}%)</span>
                          <span>XP: {(gamification.currentXp || 0).toLocaleString()}/{hero.minLifetimeXp.toLocaleString()} ({xpPct}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Progress & Locked Action */}
                    <div className="pt-4 mt-4 border-t border-slate-800 space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Unlock Progress</span>
                          <span className="font-bold text-amber-400">{overallPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                            style={{ width: `${overallPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 text-amber-400 text-center text-xs font-semibold border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked — Requires Discipline</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // -----------------------------------------------------------
              // Case 3: Classified / Future Mystery Tiers
              // -----------------------------------------------------------
              return (
                <div
                  key={hero.id}
                  className="flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 bg-slate-50/50 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800/60 opacity-60 hover:opacity-75"
                >
                  <div className="space-y-4">
                    {/* Header: Mystery Question Icon, Level & Locked Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 shrink-0">
                          <Question className="w-7 h-7" />
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                            Lvl {hero.level}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Level {hero.level}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700">
                              Classified
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-400 dark:text-slate-500 leading-tight">
                            Uncharted Sovereign
                          </h3>
                        </div>
                      </div>

                      <div
                        className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 flex items-center justify-center shrink-0"
                        title="Locked Mystery"
                      >
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Undisclosed Mastery Tier
                    </div>

                    {/* Mystery Quote */}
                    <p className="text-xs italic text-slate-400 dark:text-slate-500 border-l-2 border-slate-200 dark:border-slate-800 pl-2.5">
                      "Future levels remain veiled in shadow. Conquer preceding milestones to pierce the veil."
                    </p>

                    {/* Meaning */}
                    <div className="rounded-xl bg-slate-100/60 dark:bg-slate-900/40 p-3 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                        Long-Term Mastery Threshold:
                      </span>
                      Demands profound discipline ({hero.minStreakDays}d streak or {hero.minLifetimeXp.toLocaleString()} XP). Focus on your immediate micro-steps.
                    </div>
                  </div>

                  {/* Footer: Locked Action */}
                  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                      <span>Requirement:</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {hero.minStreakDays}d streak or {hero.minLifetimeXp.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 text-center text-xs font-medium border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked Mystery</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. Data Safety & Backup Station                          */}
        {/* ========================================================= */}
        <section aria-label="Data Safety Station" className="rounded-3xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Data Safety & Backup Station
                </h2>
                <p className="text-xs sm:text-sm text-serene-text-secondary dark:text-serene-text-darkSecondary mt-0.5">
                  LaunchPAD is 100% local-first and private. Routine backups safeguard your streaks, unlocked heroes, and daily history against accidental browser data clearing.
                </p>
              </div>
            </div>

            {/* Formatted Last Backup Badge */}
            <div className="shrink-0 flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-subtle ${
                  daysSinceBackup === null
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    : daysSinceBackup >= 5
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Last Backup: {formatLastBackup(gamification.lastBackupTimestamp)}</span>
              </div>
            </div>
          </div>

          {/* Feedback messages if any */}
          {importError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExportBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-serene-primary hover:bg-serene-primary-hover text-white text-xs sm:text-sm font-semibold shadow-subtle transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              <span>Export Backup (JSON)</span>
            </button>

            <button
              onClick={handleTriggerImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 text-serene-text-primary dark:text-serene-text-darkPrimary text-xs sm:text-sm font-semibold shadow-subtle transition-all duration-150"
            >
              <Upload className="w-4 h-4" />
              <span>Import Backup</span>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <span className="text-xs text-serene-text-muted">
              Preserves 100% of your links, tasks, habits, and hero progression safely on your local device.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
