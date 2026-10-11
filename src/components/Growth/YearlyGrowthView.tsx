import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Target, 
  Sparkles, 
  Trophy, 
  Calendar, 
  ShieldCheck
} from 'lucide-react';
import { DailyGrowthRecord } from '../../types';

export interface YearlyGrowthViewProps {
  growthHistory: Record<string, DailyGrowthRecord>;
  lifetimeXp: number;
}

interface MonthSummary {
  monthIndex: number; // 0 to 11
  monthName: string; // Jan, Feb, ...
  fullMonthName: string; // January, February, ...
  focusMinutes: number;
  focusHours: number;
  tasksCompleted: number;
  xpEarned: number;
  activeDays: number;
  perfectDays: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const YearlyGrowthView: React.FC<YearlyGrowthViewProps> = ({
  growthHistory = {},
  lifetimeXp = 0,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(currentMonthIdx);

  // Compute lifetime milestone aggregates
  const lifetimeStats = useMemo(() => {
    let totalMins = 0;
    let totalTasks = 0;
    let perfectDays = 0;
    let historyXp = 0;

    Object.values(growthHistory).forEach((rec) => {
      totalMins += rec.focusMinutes || 0;
      totalTasks += rec.tasksCompleted || 0;
      historyXp += rec.xpEarned || 0;
      if (rec.dailyGoalCompleted) {
        perfectDays++;
      }
    });

    const finalXp = Math.max(lifetimeXp || 0, historyXp);
    const totalHours = (totalMins / 60).toFixed(1);

    return {
      totalHours,
      totalMinutes: totalMins,
      totalTasks,
      perfectDays,
      finalXp,
    };
  }, [growthHistory, lifetimeXp]);

  // Compute 12-month trajectory for currentYear
  const monthsData: MonthSummary[] = useMemo(() => {
    const list: MonthSummary[] = [];

    for (let m = 0; m < 12; m++) {
      const monthPrefix = `${currentYear}-${String(m + 1).padStart(2, '0')}-`;
      let mFocus = 0;
      let mTasks = 0;
      let mXp = 0;
      let mActive = 0;
      let mPerfect = 0;

      Object.entries(growthHistory).forEach(([dateKey, rec]) => {
        if (dateKey.startsWith(monthPrefix)) {
          mFocus += rec.focusMinutes || 0;
          mTasks += rec.tasksCompleted || 0;
          mXp += rec.xpEarned || 0;
          if ((rec.focusMinutes || 0) > 0 || (rec.tasksCompleted || 0) > 0) {
            mActive++;
          }
          if (rec.dailyGoalCompleted) {
            mPerfect++;
          }
        }
      });

      const isCurrentMonth = m === currentMonthIdx;
      const isFutureMonth = m > currentMonthIdx;

      list.push({
        monthIndex: m,
        monthName: MONTH_NAMES[m],
        fullMonthName: FULL_MONTH_NAMES[m],
        focusMinutes: mFocus,
        focusHours: parseFloat((mFocus / 60).toFixed(1)),
        tasksCompleted: mTasks,
        xpEarned: mXp,
        activeDays: mActive,
        perfectDays: mPerfect,
        isCurrentMonth,
        isFutureMonth,
      });
    }

    return list;
  }, [growthHistory, currentYear, currentMonthIdx]);

  // Max monthly hours for scaling
  const maxMonthHours = useMemo(() => {
    const maxVal = Math.max(10, ...monthsData.map((m) => m.focusHours));
    return maxVal;
  }, [monthsData]);

  const activeMonth = monthsData[selectedMonthIdx] || monthsData[currentMonthIdx];

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`;
  };

  return (
    <div className="space-y-6">
      {/* 4 High-Impact Lifetime Milestone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Lifetime Hours Conquered */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-serene-surface-light to-serene-surfaceAlt-light/60 dark:from-serene-surface-dark dark:via-serene-surface-dark dark:to-serene-surfaceAlt-dark/80 border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Hours Conquered
            </span>
            <div className="w-9 h-9 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
            {lifetimeStats.totalHours} <span className="text-sm font-normal text-serene-text-muted">hrs</span>
          </div>
          <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1">
            Deep focus mastered all-time
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-serene-primary/5 dark:bg-serene-primary-dark/5 rounded-full pointer-events-none" />
        </div>

        {/* 2. Lifetime Tasks Slain */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-serene-surface-light to-serene-surfaceAlt-light/60 dark:from-serene-surface-dark dark:via-serene-surface-dark dark:to-serene-surfaceAlt-dark/80 border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Tasks Slain
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
            {lifetimeStats.totalTasks.toLocaleString()} <span className="text-sm font-normal text-serene-text-muted">slain</span>
          </div>
          <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1">
            Missions decisively executed
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/5 rounded-full pointer-events-none" />
        </div>

        {/* 3. Lifetime XP Accumulated */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-serene-surface-light to-serene-surfaceAlt-light/60 dark:from-serene-surface-dark dark:via-serene-surface-dark dark:to-serene-surfaceAlt-dark/80 border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
              XP Accumulated
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {lifetimeStats.finalXp.toLocaleString()} <span className="text-sm font-normal text-serene-text-muted">XP</span>
          </div>
          <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1">
            Hero essence accumulated
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/5 rounded-full pointer-events-none" />
        </div>

        {/* 4. Perfect Goal Days */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-serene-surface-light to-serene-surfaceAlt-light/60 dark:from-serene-surface-dark dark:via-serene-surface-dark dark:to-serene-surfaceAlt-dark/80 border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Perfect Goal Days
            </span>
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 dark:bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {lifetimeStats.perfectDays} <span className="text-sm font-normal text-serene-text-muted">days</span>
          </div>
          <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1">
            100% daily focus conquered
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-yellow-500/5 rounded-full pointer-events-none" />
        </div>
      </div>

      {/* 12-Month Progress Trajectory Card */}
      <div className="bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 md:p-6 shadow-card transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {currentYear} Annual Trajectory
              </h3>
              <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                Aggregated monthly focus volume and milestone conquest (Jan - Dec)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark">
              Selected: <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">{activeMonth.fullMonthName}</strong>
            </span>
          </div>
        </div>

        {/* 12-Month Bar Visualizer */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 pt-6 pb-2">
          {monthsData.map((m) => {
            const isSelected = selectedMonthIdx === m.monthIndex;
            // Calculate bar height ratio (min 6% for zero/empty to show slot)
            const heightPercent = m.focusHours > 0
              ? Math.max(12, Math.round((m.focusHours / maxMonthHours) * 100))
              : 6;

            return (
              <button
                key={m.monthIndex}
                type="button"
                onClick={() => setSelectedMonthIdx(m.monthIndex)}
                className={`group flex flex-col items-center focus:outline-none transition-all duration-150 p-1 rounded-xl ${
                  isSelected
                    ? 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark ring-2 ring-serene-primary dark:ring-serene-primary-dark'
                    : 'hover:bg-serene-surfaceAlt-light/60 dark:hover:bg-serene-surfaceAlt-dark/40'
                }`}
              >
                {/* Value on top (desktop only) */}
                <span className="text-[10px] font-medium text-serene-text-muted dark:text-serene-text-darkMuted mb-2 h-4 flex items-center">
                  {m.focusHours > 0 ? `${m.focusHours}h` : ''}
                </span>

                {/* Vertical Bar Slot Track */}
                <div className="relative w-full sm:w-8 h-36 bg-serene-surfaceAlt-light/80 dark:bg-serene-surfaceAlt-dark/60 rounded-lg overflow-hidden flex flex-col justify-end p-0.5 border border-serene-border-light/40 dark:border-serene-border-dark/40">
                  {/* Filled Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-md transition-all duration-300 ${
                      m.isCurrentMonth
                        ? 'bg-gradient-to-t from-serene-primary to-emerald-400 dark:from-serene-primary-dark dark:to-emerald-300 shadow-sm'
                        : m.focusHours > 0
                        ? 'bg-gradient-to-t from-serene-primary/80 to-serene-primary/50 dark:from-serene-primary-dark/80 dark:to-serene-primary-dark/50'
                        : m.isFutureMonth
                        ? 'bg-serene-border-light/20 dark:bg-serene-border-dark/20'
                        : 'bg-serene-border-light/40 dark:bg-serene-border-dark/40'
                    }`}
                  />
                </div>

                {/* Month Name */}
                <span
                  className={`mt-2 text-xs font-semibold ${
                    m.isCurrentMonth
                      ? 'text-serene-primary dark:text-serene-primary-dark underline underline-offset-4'
                      : isSelected
                      ? 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary'
                  }`}
                >
                  {m.monthName}
                </span>

                {/* Current Tag */}
                {m.isCurrentMonth && (
                  <span className="text-[9px] text-serene-primary dark:text-serene-primary-dark font-bold leading-none mt-0.5">
                    Now
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Month Detail Strip */}
        <div className="mt-6 pt-4 border-t border-serene-border-light/80 dark:border-serene-border-dark/80 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center font-bold text-sm">
              {activeMonth.monthName}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {activeMonth.fullMonthName} {currentYear} Breakdown
              </h4>
              <p className="text-xs text-serene-text-muted dark:text-serene-text-darkMuted">
                {activeMonth.isFutureMonth ? 'Upcoming month' : `${activeMonth.activeDays} active days recorded`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Hours */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Focus:</span>
              <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {formatHours(activeMonth.focusHours)}
              </span>
            </div>

            {/* Tasks */}
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Tasks:</span>
              <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {activeMonth.tasksCompleted} slain
              </span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">XP:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                +{activeMonth.xpEarned.toLocaleString()} XP
              </span>
            </div>

            {/* Perfect Days */}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Perfect Days:</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {activeMonth.perfectDays}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
