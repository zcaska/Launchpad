import React from 'react';
import { 
  Clock, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert,
  Target
} from 'lucide-react';
import { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';

interface TimeRadarWidgetProps {
  timeRemaining: DayTimeRemaining;
  taskLoad: TaskLoadSummary;
  buffer: BufferSummary;
  endHour: number;
  onOpenTasks: () => void;
  className?: string;
}

export const TimeRadarWidget: React.FC<TimeRadarWidgetProps> = ({
  timeRemaining,
  taskLoad,
  buffer,
  endHour,
  onOpenTasks,
  className = '',
}) => {
  const formattedCutoff = endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`;

  return (
    <div className={`@container w-full h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
            <Clock className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-serene-primary dark:text-serene-primary-dark">
            Time Radar & Budget
          </span>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={onOpenTasks}
          className="text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline flex items-center gap-1 transition-colors group"
          title="Open Task Management"
        >
          <span>Manage Tasks</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2x2 Symmetrical Metric Grid for Visual Harmony */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-1.5 flex-1 content-center">
        {/* Quadrant 1: Day Time Left */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">Day Time Left</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className="text-sm sm:text-base font-bold font-mono text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
              {timeRemaining.isPastCutoff ? 'End of Day' : timeRemaining.formatted}
            </span>
            <span className="text-[10px] text-serene-text-muted font-mono shrink-0">
              ({formattedCutoff})
            </span>
          </div>
        </div>

        {/* Quadrant 2: Pending Workload */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            <Hourglass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">Pending Work</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
              {taskLoad.pendingMinutes === 0 ? '0m' : taskLoad.formattedPending}
            </span>
            <span className="text-[10px] text-serene-text-muted shrink-0">
              {taskLoad.pendingCount} {taskLoad.pendingCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Quadrant 3: Time Balance */}
        <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-center min-w-0 ${
          buffer.status === 'surplus'
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
            : buffer.status === 'tight'
            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
        }`}>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            {buffer.status === 'surplus' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : buffer.status === 'tight' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="truncate">Time Balance</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className={`text-sm sm:text-base font-bold font-mono truncate ${
              buffer.status === 'surplus'
                ? 'text-emerald-600 dark:text-emerald-400'
                : buffer.status === 'tight'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {buffer.status === 'surplus' && `+${buffer.formatted}`}
              {buffer.status === 'tight' && buffer.formatted}
              {buffer.status === 'overloaded' && `-${buffer.formatted}`}
            </span>
            <span className={`text-[10px] font-semibold shrink-0 ${
              buffer.status === 'surplus'
                ? 'text-emerald-700 dark:text-emerald-300'
                : buffer.status === 'tight'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}>
              {buffer.status === 'surplus' ? 'Surplus' : buffer.status === 'tight' ? 'Tight' : 'Over'}
            </span>
          </div>
        </div>

        {/* Quadrant 4: Schedule Target Cutoff */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">Daily Cutoff</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className="text-sm sm:text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 truncate">
              {formattedCutoff}
            </span>
            <span className="text-[10px] text-serene-text-muted shrink-0">
              {buffer.status === 'surplus' ? 'On track' : buffer.status === 'tight' ? 'Near limit' : 'Exceeded'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom helper */}
      <div className="mt-2.5 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 flex items-center justify-between text-[11px] text-serene-text-muted">
        <span className="truncate">
          {buffer.status === 'surplus' 
            ? 'Buffer healthy: ample space for deep work.' 
            : buffer.status === 'tight'
            ? 'Buffer tight: prioritize high impact tasks.'
            : 'Overloaded: reschedule or defer tasks.'}
        </span>
        <span className="font-mono text-[10px] shrink-0 ml-2">Cutoff: {formattedCutoff}</span>
      </div>
    </div>
  );
};
