import React, { useState, useMemo } from 'react';
import { Clock, Target, TrendingUp, Flame, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { DailyGrowthRecord } from '../../types';
import { formatDateKey } from '../../utils/gamification';

export interface WeeklyFocusChartProps {
  growthHistory: Record<string, DailyGrowthRecord>;
  currentStreak: number;
}

interface DayData {
  date: Date;
  dateKey: string;
  dayName: string; // Mon, Tue, etc.
  dateLabel: string; // Oct 11
  isToday: boolean;
  focusMinutes: number;
  tasksCompleted: number;
  xpEarned: number;
  dailyGoalCompleted: boolean;
}

export const WeeklyFocusChart: React.FC<WeeklyFocusChartProps> = ({
  growthHistory = {},
  currentStreak = 0,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute trailing 7 days (6 days ago -> today)
  const days: DayData[] = useMemo(() => {
    const result: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      const record: DailyGrowthRecord = growthHistory[key] || {
        tasksCompleted: 0,
        focusMinutes: 0,
        xpEarned: 0,
        dailyGoalCompleted: false,
      };

      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      result.push({
        date: d,
        dateKey: key,
        dayName,
        dateLabel,
        isToday: i === 0,
        focusMinutes: record.focusMinutes || 0,
        tasksCompleted: record.tasksCompleted || 0,
        xpEarned: record.xpEarned || 0,
        dailyGoalCompleted: !!record.dailyGoalCompleted,
      });
    }

    return result;
  }, [growthHistory]);

  // Aggregate summary metrics
  const { totalMinutes, totalTasks, avgMinutes, maxMinutes } = useMemo(() => {
    let totalM = 0;
    let totalT = 0;
    let maxM = 0;

    days.forEach((day) => {
      totalM += day.focusMinutes;
      totalT += day.tasksCompleted;
      if (day.focusMinutes > maxM) {
        maxM = day.focusMinutes;
      }
    });

    return {
      totalMinutes: totalM,
      totalTasks: totalT,
      avgMinutes: Math.round(totalM / 7),
      maxMinutes: Math.max(60, maxM), // At least 60m scale for aesthetic headroom
    };
  }, [days]);

  const totalHoursFormatted = (totalMinutes / 60).toFixed(1);
  const avgHoursFormatted = (avgMinutes / 60).toFixed(1);

  const formatDuration = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // SVG Chart Dimensions
  const svgWidth = 700;
  const svgHeight = 200;
  const chartTop = 30;
  const chartBottom = 175;
  const chartHeight = chartBottom - chartTop;
  const barSlotWidth = svgWidth / 7;
  const barWidth = 44;

  const activeDay = hoveredIndex !== null ? days[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 md:p-6 shadow-card transition-all duration-200">
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Weekly Focus Momentum
            </h3>
            <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Deep work hours & task velocity across the trailing 7 days
            </p>
          </div>
        </div>

        {/* Summary Stat Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Hours */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-xs">
            <Clock className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
            <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Focus:</span>
            <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
              {totalHoursFormatted} hrs
            </span>
          </div>

          {/* Tasks Slain */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-xs">
            <Target className="w-3.5 h-3.5 text-serene-accent-emerald" />
            <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Tasks:</span>
            <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
              {totalTasks} slain
            </span>
          </div>

          {/* Daily Average */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-xs">
            <Calendar className="w-3.5 h-3.5 text-serene-accent-sky" />
            <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Avg:</span>
            <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
              {avgHoursFormatted}h / day
            </span>
          </div>

          {/* Current Streak */}
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {currentStreak}d Streak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Interactive Bar Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 md:h-56 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Standard Serene Hearth Bar Gradient */}
            <linearGradient id="barGradientStandard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#264d44" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#3e655b" stopOpacity="0.75" />
            </linearGradient>

            {/* Perfect Goal Gradient */}
            <linearGradient id="barGradientGoal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            {/* Hovered / Highlighted Bar Gradient */}
            <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5cfc3" stopOpacity="1" />
              <stop offset="100%" stopColor="#3e655b" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Grid Lines */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = chartBottom - chartHeight * ratio;
            return (
              <line
                key={ratio}
                x1="20"
                y1={y}
                x2={svgWidth - 20}
                y2={y}
                stroke="currentColor"
                className="text-serene-border-light/70 dark:text-serene-border-dark/60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Baseline */}
          <line
            x1="15"
            y1={chartBottom}
            x2={svgWidth - 15}
            y2={chartBottom}
            stroke="currentColor"
            className="text-serene-border-light dark:text-serene-border-dark"
            strokeWidth="1.5"
          />

          {/* Render Bars for the 7 Days */}
          {days.map((day, idx) => {
            const slotCenterX = idx * barSlotWidth + barSlotWidth / 2;
            const x = slotCenterX - barWidth / 2;

            // Height calculation: minimum 8px baseline pill height
            const rawHeight = (day.focusMinutes / maxMinutes) * chartHeight;
            const barH = day.focusMinutes > 0 ? Math.max(14, rawHeight) : 8;
            const y = chartBottom - barH;

            const isHovered = hoveredIndex === idx;
            const fillGradient = isHovered
              ? 'url(#barGradientActive)'
              : day.dailyGoalCompleted
              ? 'url(#barGradientGoal)'
              : 'url(#barGradientStandard)';

            return (
              <g
                key={day.dateKey}
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible Hover Hitbox for easier cursor interaction */}
                <rect
                  x={idx * barSlotWidth}
                  y={chartTop}
                  width={barSlotWidth}
                  height={chartHeight + 20}
                  fill="transparent"
                />

                {/* Subtle Background Slot Pillar */}
                <rect
                  x={x}
                  y={chartTop}
                  width={barWidth}
                  height={chartHeight}
                  rx="6"
                  className={
                    isHovered
                      ? 'fill-serene-surfaceAlt-light dark:fill-serene-surfaceAlt-dark opacity-80'
                      : 'fill-serene-surfaceAlt-light/40 dark:fill-serene-surfaceAlt-dark/30'
                  }
                />

                {/* Foreground Filled Activity Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  fill={fillGradient}
                  className={`transition-all duration-200 ${
                    day.isToday ? 'stroke-serene-primary-dark/80 stroke-1' : ''
                  }`}
                />

                {/* Star / Sparkle Marker if dailyGoalCompleted */}
                {day.dailyGoalCompleted && day.focusMinutes > 0 && (
                  <circle
                    cx={slotCenterX}
                    cy={Math.max(chartTop + 8, y - 8)}
                    r="4"
                    className="fill-amber-400 stroke-white dark:stroke-serene-surface-dark stroke-1"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip */}
        {activeDay && (
          <div
            className="absolute top-2 pointer-events-none transition-all duration-150 z-20"
            style={{
              left: `${((hoveredIndex! + 0.5) / 7) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-gray-900/95 dark:bg-black/90 backdrop-blur-md text-white text-xs rounded-xl py-2 px-3 shadow-xl border border-white/10 whitespace-nowrap flex flex-col gap-1 items-center">
              <div className="font-semibold flex items-center gap-1.5 text-white/90">
                <span>{activeDay.dayName}, {activeDay.dateLabel}</span>
                {activeDay.isToday && (
                  <span className="px-1.5 py-0.2 bg-serene-primary/80 rounded text-[10px] text-white">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/80">
                <span className="flex items-center gap-1 text-emerald-300 font-medium">
                  <Clock className="w-3 h-3" />
                  {formatDuration(activeDay.focusMinutes)}
                </span>
                <span className="flex items-center gap-1 text-sky-300 font-medium">
                  <Target className="w-3 h-3" />
                  {activeDay.tasksCompleted} slain
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-medium">
                  <Sparkles className="w-3 h-3" />
                  +{activeDay.xpEarned} XP
                </span>
              </div>
              {activeDay.dailyGoalCompleted && (
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Daily Goal Achieved!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weekday Labels & Badge Cards Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mt-2 pt-3 border-t border-serene-border-light/80 dark:border-serene-border-dark/80">
        {days.map((day, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={day.dateKey}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex flex-col items-center text-center p-1.5 md:p-2 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark scale-[1.02]'
                  : day.isToday
                  ? 'bg-serene-primary/5 dark:bg-serene-primary-dark/10 ring-1 ring-serene-primary/20 dark:ring-serene-primary-dark/20'
                  : 'hover:bg-serene-surfaceAlt-light/60 dark:hover:bg-serene-surfaceAlt-dark/40'
              }`}
            >
              {/* Day Name */}
              <span
                className={`text-xs font-semibold ${
                  day.isToday
                    ? 'text-serene-primary dark:text-serene-primary-dark font-bold'
                    : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                }`}
              >
                {day.dayName}
              </span>

              {/* Date */}
              <span className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted mb-1">
                {day.dateLabel}
              </span>

              {/* Focus Duration Badge */}
              <span
                className={`text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded-md mb-1 ${
                  day.focusMinutes > 0
                    ? 'bg-serene-primary/10 dark:bg-serene-primary-dark/15 text-serene-primary dark:text-serene-primary-dark'
                    : 'text-serene-text-muted dark:text-serene-text-darkMuted'
                }`}
              >
                {formatDuration(day.focusMinutes)}
              </span>

              {/* Completed Tasks Badge */}
              <span
                className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                  day.tasksCompleted > 0
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'text-serene-text-muted/70 dark:text-serene-text-darkMuted/60'
                }`}
              >
                {day.tasksCompleted > 0 ? (
                  <>
                    <Target className="w-2.5 h-2.5 shrink-0" />
                    <span>{day.tasksCompleted}</span>
                  </>
                ) : (
                  <span>0 slain</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
