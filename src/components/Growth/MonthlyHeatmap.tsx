import React, { useState, useMemo } from 'react';
import { Flame, Trophy, Calendar, Clock, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { DailyGrowthRecord } from '../../types';
import { formatDateKey } from '../../utils/gamification';

export interface MonthlyHeatmapProps {
  growthHistory: Record<string, DailyGrowthRecord>;
  currentStreak: number;
  longestStreak: number;
}

export type IntensityLevel = 0 | 1 | 2 | 3;

interface HeatmapDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isInCurrentMonth: boolean;
  intensity: IntensityLevel;
  record: DailyGrowthRecord;
}

/**
 * Calculates 4-level color intensity (0: empty, 1: low, 2: medium, 3: high)
 */
export function calculateHeatmapIntensity(record?: DailyGrowthRecord): IntensityLevel {
  if (!record) return 0;
  const { focusMinutes = 0, tasksCompleted = 0 } = record;
  if (focusMinutes === 0 && tasksCompleted === 0) return 0;
  if (focusMinutes >= 60 || tasksCompleted >= 4) return 3;
  if (focusMinutes >= 30 || tasksCompleted >= 2) return 2;
  return 1;
}

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({
  growthHistory = {},
  currentStreak = 0,
  longestStreak = 0,
}) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Compute trailing 35 days (5 full 7-day weeks ending with the current day or current week)
  const heatmapDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: HeatmapDay[] = [];
    const totalDaysCount = 35; // 5 full weeks

    // Calculate start date so that today is near the end or at the end
    // To align smoothly to weekday columns (Mon..Sun):
    // Let's start from (totalDaysCount - 1) days ago to today:
    for (let i = totalDaysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      const record = growthHistory[key] || {
        tasksCompleted: 0,
        focusMinutes: 0,
        xpEarned: 0,
        dailyGoalCompleted: false,
      };

      const intensity = calculateHeatmapIntensity(record);
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const isToday = i === 0;
      const isInCurrentMonth = d.getMonth() === today.getMonth();

      days.push({
        date: d,
        dateKey: key,
        dayNumber: d.getDate(),
        dayName,
        isToday,
        isInCurrentMonth,
        intensity,
        record,
      });
    }

    return days;
  }, [growthHistory]);

  // Aggregate stats over this period
  const { activeDaysCount, totalMonthMinutes, totalMonthTasks } = useMemo(() => {
    let activeCount = 0;
    let mins = 0;
    let tasks = 0;

    heatmapDays.forEach((day) => {
      if (day.intensity > 0) activeCount++;
      mins += day.record.focusMinutes || 0;
      tasks += day.record.tasksCompleted || 0;
    });

    return {
      activeDaysCount: activeCount,
      totalMonthMinutes: mins,
      totalMonthTasks: tasks,
    };
  }, [heatmapDays]);

  const totalMonthHours = (totalMonthMinutes / 60).toFixed(1);

  const formatDuration = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Intensity style helper
  const getIntensityClasses = (level: IntensityLevel, isToday: boolean) => {
    const todayRing = isToday ? 'ring-2 ring-serene-primary dark:ring-serene-primary-dark font-bold' : '';

    switch (level) {
      case 3: // High (60m+ or 4+ tasks)
        return `bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm hover:brightness-110 ${todayRing}`;
      case 2: // Medium (30-59m or 2-3 tasks)
        return `bg-emerald-400 dark:bg-emerald-600/80 text-white dark:text-emerald-50 hover:brightness-105 ${todayRing}`;
      case 1: // Low (1-29m or 1 task)
        return `bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-200/70 ${todayRing}`;
      case 0: // Empty
      default:
        return `bg-serene-surfaceAlt-light/70 dark:bg-serene-surfaceAlt-dark/60 text-serene-text-muted/80 dark:text-serene-text-darkMuted/70 border border-serene-border-light/60 dark:border-serene-border-dark/60 hover:border-serene-border-light dark:hover:border-serene-border-dark ${todayRing}`;
    }
  };

  const displayedDay = hoveredDay || selectedDay || heatmapDays[heatmapDays.length - 1];

  return (
    <div className="bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 md:p-6 shadow-card transition-all duration-200">
      {/* Top Header & Streak Indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Monthly Habit Crucible
            </h3>
            <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
              GitHub-style activity contribution matrix (Trailing 35 Days)
            </p>
          </div>
        </div>

        {/* Streak & Consistency Indicators */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Current Streak */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-xs">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700/80 dark:text-amber-400/80 leading-none">
                Current
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-300 text-xs">
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-xs">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-yellow-700/80 dark:text-yellow-400/80 leading-none">
                Longest
              </span>
              <span className="font-bold text-yellow-700 dark:text-yellow-300 text-xs">
                {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>

          {/* Active Days Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-xs flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-serene-text-muted dark:text-serene-text-darkMuted leading-none">
              Activity
            </span>
            <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary text-xs">
              {activeDaysCount} / 35 Days ({Math.round((activeDaysCount / 35) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid & Hover Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* The 35-Day Heatmap Grid (2 Columns wide on LG) */}
        <div className="lg:col-span-2">
          {/* Calendar 7-column grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {heatmapDays.map((day) => {
              const isHovered = hoveredDay?.dateKey === day.dateKey;
              const isSelected = selectedDay?.dateKey === day.dateKey;
              const intensityClass = getIntensityClasses(day.intensity, day.isToday);

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setSelectedDay(day)}
                  className={`relative aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition-all duration-150 transform ${intensityClass} ${
                    isHovered || isSelected ? 'scale-105 z-10 shadow-md ring-2 ring-serene-primary dark:ring-serene-primary-dark' : ''
                  }`}
                  aria-label={`${day.dateKey}: ${day.record.focusMinutes}m focus, ${day.record.tasksCompleted} tasks`}
                >
                  {/* Day Number */}
                  <span className="text-[10px] sm:text-xs font-semibold leading-none">
                    {day.dayNumber}
                  </span>

                  {/* Icon Indicator for Daily Goal or Tasks */}
                  {day.record.dailyGoalCompleted ? (
                    <span className="text-[9px] leading-none">🎯</span>
                  ) : day.record.tasksCompleted > 0 ? (
                    <span className="text-[8px] sm:text-[9px] leading-none opacity-90 font-medium">
                      {day.record.tasksCompleted}✓
                    </span>
                  ) : (
                    <span className="h-2" />
                  )}

                  {/* Today dot indicator */}
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-serene-primary dark:bg-serene-primary-dark absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend Bar (Less -> More) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-serene-border-light/80 dark:border-serene-border-dark/80 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              {/* Level 0 */}
              <div
                className="w-3.5 h-3.5 rounded-md bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark"
                title="0 min (Rest day)"
              />
              {/* Level 1 */}
              <div
                className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/50"
                title="1 - 29 min (Light spark)"
              />
              {/* Level 2 */}
              <div
                className="w-3.5 h-3.5 rounded-md bg-emerald-400 dark:bg-emerald-600/80"
                title="30 - 59 min (Solid focus)"
              />
              {/* Level 3 */}
              <div
                className="w-3.5 h-3.5 rounded-md bg-emerald-600 dark:bg-emerald-500"
                title="60+ min (Deep mastery)"
              />
              <span>More</span>
            </div>

            <div className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted">
              Total {totalMonthHours}h focus • {totalMonthTasks} tasks slain
            </div>
          </div>
        </div>

        {/* Interactive Hover / Selected Day Card */}
        <div className="bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/50 border border-serene-border-light dark:border-serene-border-dark rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-serene-border-light/80 dark:border-serene-border-dark/80 pb-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {displayedDay.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted">
                {displayedDay.isToday ? 'Today (In Progress)' : 'Activity Snapshot'}
              </span>
            </div>
            {displayedDay.record.dailyGoalCompleted && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Goal Won
              </span>
            )}
          </div>

          {/* Metric Rows */}
          <div className="space-y-2 text-xs">
            {/* Focus Duration */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-serene-surface-dark/70 border border-serene-border-light/50 dark:border-serene-border-dark/50">
              <span className="flex items-center gap-1.5 text-serene-text-secondary dark:text-serene-text-darkSecondary">
                <Clock className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
                Focus Time
              </span>
              <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {formatDuration(displayedDay.record.focusMinutes)}
              </span>
            </div>

            {/* Tasks Finished */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-serene-surface-dark/70 border border-serene-border-light/50 dark:border-serene-border-dark/50">
              <span className="flex items-center gap-1.5 text-serene-text-secondary dark:text-serene-text-darkSecondary">
                <Target className="w-3.5 h-3.5 text-serene-accent-emerald" />
                Tasks Slain
              </span>
              <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {displayedDay.record.tasksCompleted} {displayedDay.record.tasksCompleted === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* XP Earned */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-serene-surface-dark/70 border border-serene-border-light/50 dark:border-serene-border-dark/50">
              <span className="flex items-center gap-1.5 text-serene-text-secondary dark:text-serene-text-darkSecondary">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                XP Earned
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                +{displayedDay.record.xpEarned || 0} XP
              </span>
            </div>

            {/* Daily Goal Status */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-serene-surface-dark/70 border border-serene-border-light/50 dark:border-serene-border-dark/50">
              <span className="flex items-center gap-1.5 text-serene-text-secondary dark:text-serene-text-darkSecondary">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                Daily Focus Goal
              </span>
              <span
                className={`font-semibold ${
                  displayedDay.record.dailyGoalCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-serene-text-muted dark:text-serene-text-darkMuted'
                }`}
              >
                {displayedDay.record.dailyGoalCompleted ? 'Conquered 🎯' : 'Not completed'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted italic text-center mt-1">
            Hover or click any calendar square to inspect details.
          </p>
        </div>
      </div>
    </div>
  );
};
