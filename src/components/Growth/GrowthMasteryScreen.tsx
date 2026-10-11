import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Sparkles,
  Cpu,
  Shield,
  Crown,
  Zap,
  Sun,
  Award,
  Lock,
  Unlock,
  CheckCircle2,
  Download,
  Upload,
  ShieldCheck,
  Calendar,
  Activity,
  TrendingUp,
  Brain,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { GamificationState, DailyGrowthRecord, HeroLevelDef } from '../../types';
import { HERO_ROSTER, getHeroById } from '../../data/heroRoster';
import { WeeklyFocusChart } from './WeeklyFocusChart';
import { MonthlyHeatmap } from './MonthlyHeatmap';
import { YearlyGrowthView } from './YearlyGrowthView';

export interface GrowthMasteryScreenProps {
  gamification: GamificationState;
  growthHistory: Record<string, DailyGrowthRecord>;
  onSelectHero: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (json: string) => void;
  onBackToDashboard: () => void;
}

type HorizonTab = 'weekly' | 'monthly' | 'yearly';

/**
 * Maps avatar icon identifiers to corresponding Lucide icons.
 */
const HeroAvatarIcon: React.FC<{ iconName: string; className?: string }> = ({
  iconName,
  className = 'w-6 h-6',
}) => {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    default:
      return <Award className={className} />;
  }
};

/**
 * Exact gradient classes corresponding to hero roster definitions
 * ensuring zero Tailwind purge issues.
 */
const HERO_GRADIENTS: Record<string, string> = {
  'lvl-1-awakening': 'from-amber-500 to-orange-600',
  'lvl-2-iron-will': 'from-orange-500 to-red-600',
  'lvl-3-flow-architect': 'from-cyan-500 to-blue-600',
  'lvl-4-dark-knight': 'from-slate-600 to-zinc-900',
  'lvl-5-shadow-monarch': 'from-purple-600 to-indigo-950',
  'lvl-6-limit-breaker': 'from-yellow-400 to-amber-600',
  'lvl-7-stoic-sovereign': 'from-emerald-500 to-teal-800',
};

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
              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${
                  HERO_GRADIENTS[activeHero.id] || activeHero.gradient
                } text-white flex items-center justify-center shadow-lg ring-4 ring-serene-primary/20 dark:ring-serene-primary-dark/20 shrink-0`}
              >
                <HeroAvatarIcon iconName={activeHero.avatarIcon} className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="absolute -bottom-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-sm border border-white/20">
                  Lvl {activeHero.level}
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

            {/* Right: Next Locked Hero Progress Bar */}
            <div className="w-full lg:w-80 shrink-0 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark/60 rounded-2xl p-4 border border-serene-border-light dark:border-serene-border-dark space-y-3">
              {nextHeroMetrics ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-serene-text-muted" />
                      Next: Level {nextHeroMetrics.nextLockedHero.level}
                    </span>
                    <span className="font-bold text-serene-primary dark:text-serene-primary-dark">
                      {nextHeroMetrics.overallPct}%
                    </span>
                  </div>

                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary font-medium truncate">
                    {nextHeroMetrics.nextLockedHero.name} ({nextHeroMetrics.nextLockedHero.title})
                  </p>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2.5 rounded-full bg-serene-border-light dark:bg-serene-border-dark overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-serene-primary to-serene-accent-emerald transition-all duration-500 ease-out"
                      style={{ width: `${nextHeroMetrics.overallPct}%` }}
                    />
                  </div>

                  {/* Unlock Requirement Details */}
                  <div className="space-y-1 text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    <div className="flex justify-between items-center">
                      <span>Streak Needed:</span>
                      <span className="font-medium text-serene-text-primary dark:text-serene-text-darkPrimary">
                        {gamification.currentStreak} / {nextHeroMetrics.nextLockedHero.minStreakDays} days
                        {nextHeroMetrics.streakRemaining > 0 && (
                          <span className="text-serene-text-muted ml-1">
                            ({nextHeroMetrics.streakRemaining}d to go)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>XP Needed:</span>
                      <span className="font-medium text-serene-text-primary dark:text-serene-text-darkPrimary">
                        {(gamification.currentXp || 0).toLocaleString()} /{' '}
                        {nextHeroMetrics.nextLockedHero.minLifetimeXp.toLocaleString()} XP
                        {nextHeroMetrics.xpRemaining > 0 && (
                          <span className="text-serene-text-muted ml-1">
                            ({nextHeroMetrics.xpRemaining.toLocaleString()} XP left)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-2 space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-serene-accent-amber font-semibold text-xs">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>Stoic Sovereign Mastery</span>
                  </div>
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    All 7 Hero Ranks Mastered. Lifelong sovereignty of mind achieved.
                  </p>
                  <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 mt-2" />
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
            <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-subtle shrink-0">
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
              const categoryBadge = getCategoryBadge(hero.category);

              return (
                <div
                  key={hero.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-serene-surface-dark border-serene-primary dark:border-serene-primary-dark ring-2 ring-serene-primary/30 shadow-card'
                      : isUnlocked
                      ? 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/30 shadow-card hover:shadow-card-hover'
                      : 'bg-slate-50/75 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 opacity-70 hover:opacity-85'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Avatar, Level, Category & Lock Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                            HERO_GRADIENTS[hero.id] || hero.gradient
                          } text-white flex items-center justify-center shadow-md ${
                            !isUnlocked ? 'filter grayscale-[40%]' : ''
                          }`}
                        >
                          <HeroAvatarIcon iconName={hero.avatarIcon} className="w-6 h-6" />
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
                      {isUnlocked ? (
                        <div
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                          title="Unlocked"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"
                          title="Locked"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="text-xs font-semibold text-serene-primary dark:text-serene-primary-dark">
                      {hero.title}
                    </div>

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
                    {/* Criteria readout */}
                    <div className="text-[11px] text-serene-text-muted flex items-center justify-between">
                      <span>Requirement:</span>
                      <span className="font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
                        {hero.minStreakDays === 1 && hero.minLifetimeXp === 0
                          ? 'Starting Rank (0 XP)'
                          : `${hero.minStreakDays}d streak or ${hero.minLifetimeXp.toLocaleString()} XP`}
                      </span>
                    </div>

                    {/* Button */}
                    {isUnlocked ? (
                      isActive ? (
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
                      )
                    ) : (
                      <div className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-center text-xs font-medium border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Requires Level Qualification</span>
                      </div>
                    )}
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
