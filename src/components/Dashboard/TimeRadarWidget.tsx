import React from 'react';
import { 
  Clock, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';

interface TimeRadarWidgetProps {
  timeRemaining: DayTimeRemaining;
  taskLoad: TaskLoadSummary;
  buffer: BufferSummary;
  endHour: number;
  onOpenTasks: () => void;
}

export const TimeRadarWidget: React.FC<TimeRadarWidgetProps> = ({
  timeRemaining,
  taskLoad,
  buffer,
  endHour,
  onOpenTasks,
}) => {
  const formattedCutoff = endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`;

  return (
    <div className="@container w-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-3.5 sm:p-4 shadow-subtle hover:shadow-card transition-all">
      <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-3.5">
        
        {/* Responsive 3-Metric Grid */}
        <div className="grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-3 gap-3 flex-1 min-w-0">
          
          {/* Metric 1: Day Time Left */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary truncate">
                  Day Time Left
                </span>
                <span className="text-[9px] sm:text-[10px] text-serene-text-muted font-mono whitespace-nowrap">
                  ({formattedCutoff})
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-serene-text-primary dark:text-serene-text-darkPrimary truncate mt-0.5">
                {timeRemaining.isPastCutoff ? 'End of Day' : timeRemaining.formatted}
              </div>
            </div>
          </div>

          {/* Metric 2: Pending Workload */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Hourglass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary truncate">
                  Workload
                </span>
                <span className="text-[9px] sm:text-[10px] text-serene-text-muted whitespace-nowrap">
                  ({taskLoad.pendingCount} {taskLoad.pendingCount === 1 ? 'task' : 'tasks'})
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400 truncate mt-0.5">
                {taskLoad.pendingMinutes === 0 ? '0m (All done!)' : taskLoad.formattedPending}
              </div>
            </div>
          </div>

          {/* Metric 3: Buffer Capacity Status */}
          <div className={`flex items-center gap-2.5 p-2 rounded-xl border min-w-0 @xs:col-span-2 @md:col-span-1 ${
            buffer.status === 'surplus'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              : buffer.status === 'tight'
              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-300'
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
          }`}>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
              buffer.status === 'surplus'
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : buffer.status === 'tight'
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}>
              {buffer.status === 'surplus' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : buffer.status === 'tight' ? (
                <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary block truncate">
                Time Balance
              </span>
              <div className={`text-sm sm:text-base font-bold font-mono truncate mt-0.5 ${
                buffer.status === 'surplus'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : buffer.status === 'tight'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {buffer.status === 'surplus' && `+${buffer.formatted} free`}
                {buffer.status === 'tight' && `${buffer.formatted} (Tight)`}
                {buffer.status === 'overloaded' && `-${buffer.formatted} Overloaded!`}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-2 @lg:pt-0 border-t @lg:border-t-0 @lg:border-l @lg:pl-3.5 border-serene-border-light/60 dark:border-serene-border-dark/60">
          <button
            onClick={onOpenTasks}
            className="w-full @lg:w-auto px-3 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-white dark:hover:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>Manage Tasks</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
