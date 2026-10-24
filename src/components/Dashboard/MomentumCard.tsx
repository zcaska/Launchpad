import React, { useState, useMemo } from 'react';
import {
  ChartBar as BarChart3,
  Plant as Leaf,
  PottedPlant as Sprout
} from '@phosphor-icons/react';
import { QuickNote, DailyGrowthRecord, GamificationState } from '../../types';

export interface MomentumCardProps {
  tasks: QuickNote[];
  growthHistory?: Record<string, DailyGrowthRecord>;
  gamification?: GamificationState;
  className?: string;
}

export type MomentumTimeframe = 'today' | 'week';

/**
 * Returns ISO date string (YYYY-MM-DD) for local date.
 */
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const MomentumCard: React.FC<MomentumCardProps> = ({
  tasks,
  growthHistory,
  gamification,
  className = '',
}) => {
  const [timeframe, setTimeframe] = useState<MomentumTimeframe>('today');
  const streakDays = gamification?.currentStreak ?? 0;

  // Compute metrics based on selected timeframe
  const { completedCount, targetCount, progressRatio, progressPercent } = useMemo(() => {
    const todayStr = getLocalDateString(new Date());

    if (timeframe === 'today') {
      // Completed tasks today from tasks array or growth history
      const localCompleted = tasks.filter((t) => t.isDone).length;
      const historyCompleted = growthHistory?.[todayStr]?.tasksCompleted ?? 0;
      const completed = Math.max(localCompleted, historyCompleted);

      // Target: user's total active/done tasks or default milestone baseline of 4
      const activeTotal = tasks.length;
      const target = Math.max(4, activeTotal > 0 ? activeTotal : 4);
      const ratio = target > 0 ? Math.min(1, completed / target) : 0;

      return {
        completedCount: completed,
        targetCount: target,
        progressRatio: ratio,
        progressPercent: Math.round(ratio * 100),
      };
    } else {
      // Week timeframe: Aggregate last 7 days from growthHistory
      let weekCompleted = 0;
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = getLocalDateString(d);
        if (growthHistory?.[dateKey]) {
          weekCompleted += growthHistory[dateKey].tasksCompleted;
        } else if (dateKey === todayStr) {
          weekCompleted += tasks.filter((t) => t.isDone).length;
        }
      }

      // Default weekly milestone target (e.g. 4 tasks/day * 5 days = 20)
      const weekTarget = Math.max(20, weekCompleted + tasks.filter((t) => !t.isDone).length);
      const ratio = weekTarget > 0 ? Math.min(1, weekCompleted / weekTarget) : 0;

      return {
        completedCount: weekCompleted,
        targetCount: weekTarget,
        progressRatio: ratio,
        progressPercent: Math.round(ratio * 100),
      };
    }
  }, [tasks, growthHistory, timeframe]);

  // SVG circular progress dimensions
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const strokeDashoffset = circumference - progressRatio * circumference;

  // 4 Milestone Leaf thresholds
  const milestoneLeaves = useMemo(() => {
    return [1, 2, 3, 4].map((step) => {
      // Milestone is active if completed tasks meets or exceeds this quarter of target
      const threshold = targetCount <= 4 ? step : Math.ceil((step / 4) * targetCount);
      const isReached = completedCount >= threshold;
      return { step, isReached };
    });
  }, [completedCount, targetCount]);

  return (
    <div
      className={`@container w-full h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-3.5 sm:p-4 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between select-none ${className}`}
      data-testid="momentum-card"
    >
      {/* 1. Header: Bar chart icon, MOMENTUM, Today | Week pill toggle */}
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-[#1b6b55] dark:text-[#a5cfc3] flex items-center justify-center shrink-0 shadow-xs"
            aria-hidden="true"
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
            MOMENTUM
          </h2>
          {streakDays > 0 && (
            <span
              className="hidden @xs:inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full border border-amber-200/70 dark:border-amber-800/60"
              title={`${streakDays}-day streak active`}
            >
              {streakDays}d
            </span>
          )}
        </div>

        {/* Pill Toggle: Today | Week */}
        <div
          className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800/90 border border-stone-200/70 dark:border-stone-700/60 text-xs font-semibold"
          role="tablist"
          aria-label="Momentum timeframe"
        >
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'today'}
            onClick={() => setTimeframe('today')}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
              timeframe === 'today'
                ? 'bg-white dark:bg-serene-surface-dark text-serene-text-primary dark:text-serene-text-darkPrimary shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'week'}
            onClick={() => setTimeframe('week')}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
              timeframe === 'week'
                ? 'bg-white dark:bg-serene-surface-dark text-serene-text-primary dark:text-serene-text-darkPrimary shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* 2. Main Content: Circular Progress Ring + Stats */}
      <div className="flex items-center gap-4 sm:gap-5 my-auto py-1">
        {/* Circular Progress SVG Ring */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full -rotate-90 transform"
            viewBox="0 0 96 96"
            aria-label={`${progressPercent}% completed`}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Background Track Ring */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-[#d1fae5]/80 dark:text-emerald-950/60"
            />
            {/* Active Progress Arc */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-[#1b6b55] dark:text-[#34d399] transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Sprout / Leaf Icon */}
          <div
            className="absolute inset-0 flex items-center justify-center text-[#1b6b55] dark:text-[#34d399] pointer-events-none"
            aria-hidden="true"
          >
            <Sprout className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Text & Milestones */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Large text 'X / Y' */}
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary font-sans">
              {completedCount}
            </span>
            <span className="text-lg sm:text-2xl font-light text-stone-400 dark:text-stone-500">
              /
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary font-sans">
              {targetCount}
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 whitespace-nowrap">
            tasks completed
          </p>

          {/* Quote: "Small wins compound." */}
          <p className="text-xs italic text-stone-500 dark:text-stone-400 mt-1 whitespace-nowrap">
            &ldquo;Small wins compound.&rdquo;
          </p>

          {/* Row of 4 Leaf Milestone Icons */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 mt-2"
            aria-label={`${completedCount} of ${targetCount} milestones reached`}
          >
            {milestoneLeaves.map(({ step, isReached }) => (
              <span
                key={step}
                className={`transition-colors duration-300 ${
                  isReached
                    ? 'text-[#1b6b55] dark:text-[#34d399]'
                    : 'text-stone-300 dark:text-stone-700'
                }`}
                title={`Milestone ${step}/4: ${isReached ? 'Achieved' : 'Pending'}`}
              >
                <Leaf
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${
                    isReached ? 'scale-105 fill-current' : 'fill-current opacity-40'
                  }`}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
