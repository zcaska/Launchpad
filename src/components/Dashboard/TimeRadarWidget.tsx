import React from 'react';
import { 
  Clock, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert,
  Target,
  Calendar,
  RefreshCw,
  CalendarClock
} from 'lucide-react';
import { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';
import { CalendarScheduleSummary } from '../../types';
import { calculateTrueFocusSurplus } from '../../utils/calendarSchedule';

interface TimeRadarWidgetProps {
  timeRemaining: DayTimeRemaining;
  taskLoad: TaskLoadSummary;
  buffer: BufferSummary;
  endHour: number;
  onOpenTasks: () => void;
  className?: string;
  calendarSummary?: CalendarScheduleSummary;
  onSyncCalendar?: () => void;
  isSyncingCalendar?: boolean;
  onOpenCalendarSettings?: () => void;
  onReauthorize?: () => void;
}

export const TimeRadarWidget: React.FC<TimeRadarWidgetProps> = ({
  timeRemaining,
  taskLoad,
  buffer,
  endHour,
  onOpenTasks,
  className = '',
  calendarSummary,
  onSyncCalendar,
  isSyncingCalendar = false,
  onOpenCalendarSettings,
  onReauthorize,
}) => {
  const formattedCutoff = endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`;

  // Calculate adjusted true focus surplus taking into account merged busy intervals
  const busyMinutes = calendarSummary?.remainingBusyMinutesToday || 0;
  const trueFocus = calculateTrueFocusSurplus(
    timeRemaining.totalMinutes,
    busyMinutes,
    taskLoad.localPendingMinutes ?? taskLoad.pendingMinutes
  );

  const displayStatus = busyMinutes > 0 ? trueFocus.status : buffer.status;
  const displaySurplusMinutes = busyMinutes > 0 ? trueFocus.surplusMinutes : buffer.bufferMinutes;
  const formattedSurplus = busyMinutes > 0
    ? `${Math.floor(Math.abs(displaySurplusMinutes) / 60)}h ${Math.abs(displaySurplusMinutes) % 60}m`
    : buffer.formatted;

  return (
    <div className={`@container w-full h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
            <Clock className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-serene-primary dark:text-serene-primary-dark">
            Time Radar & Budget
          </span>
          {calendarSummary?.isTokenExpired ? (
            <button
              onClick={onReauthorize || onOpenCalendarSettings}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 transition-colors"
              title="Google Calendar token expired. Click to re-authorize."
            >
              Re-authorize
            </button>
          ) : calendarSummary?.syncError ? (
            <button
              onClick={onSyncCalendar}
              disabled={isSyncingCalendar}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-200 transition-colors flex items-center gap-1"
              title={`Calendar sync error: ${calendarSummary.syncError}. Click to retry.`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
              <span>Sync Failed</span>
            </button>
          ) : null}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {onSyncCalendar && (
            <button
              onClick={onSyncCalendar}
              disabled={isSyncingCalendar}
              className="p-1 rounded-md text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors disabled:opacity-50"
              title="Sync Google Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin text-serene-primary' : ''}`} />
            </button>
          )}
          <button
            onClick={onOpenTasks}
            className="text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline flex items-center gap-1 transition-colors group"
            title="Open Task Management"
          >
            <span>Manage Tasks</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Next Upcoming Event Pill (if exists) */}
      {calendarSummary?.nextEvent && (
        <div className="mb-2 p-2 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarClock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="font-medium text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
              Next: <strong className="font-semibold">{calendarSummary.nextEvent.summary}</strong>
            </span>
          </div>
          <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-[10px] shrink-0 bg-white/80 dark:bg-sky-900/60 border border-sky-200/50 dark:border-sky-800/50 px-2 py-0.5 rounded-md">
            {calendarSummary.minutesUntilNextEvent !== undefined
              ? calendarSummary.minutesUntilNextEvent === 0
                ? 'Starting now'
                : `in ${calendarSummary.minutesUntilNextEvent}m`
              : 'Upcoming'}
          </span>
        </div>
      )}

      {/* 2x2 Symmetrical Metric Grid for Visual Harmony */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-1 flex-1 content-center">
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

        {/* Quadrant 3: Time Balance (Adjusted for Calendar Meetings) */}
        <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-center min-w-0 ${
          displayStatus === 'surplus'
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
            : displayStatus === 'tight'
            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
        }`}>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            {displayStatus === 'surplus' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : displayStatus === 'tight' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="truncate">True Focus Balance</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className={`text-sm sm:text-base font-bold font-mono truncate ${
              displayStatus === 'surplus'
                ? 'text-emerald-600 dark:text-emerald-400'
                : displayStatus === 'tight'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {displayStatus === 'surplus' && `+${formattedSurplus}`}
              {displayStatus === 'tight' && formattedSurplus}
              {displayStatus === 'overloaded' && `-${formattedSurplus}`}
            </span>
            <span className={`text-[10px] font-semibold shrink-0 ${
              displayStatus === 'surplus'
                ? 'text-emerald-700 dark:text-emerald-300'
                : displayStatus === 'tight'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}>
              {displayStatus === 'surplus' ? 'Surplus' : displayStatus === 'tight' ? 'Tight' : 'Over'}
            </span>
          </div>
        </div>

        {/* Quadrant 4: Calendar Meetings or Daily Cutoff */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
            {busyMinutes > 0 ? (
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            ) : (
              <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <span className="truncate">{busyMinutes > 0 ? 'Meetings' : 'Daily Cutoff'}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
            <span className="text-sm sm:text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 truncate">
              {busyMinutes > 0
                ? `${Math.floor(calendarSummary!.totalBusyMinutesToday / 60)}h ${calendarSummary!.totalBusyMinutesToday % 60}m`
                : formattedCutoff}
            </span>
            <span className="text-[10px] text-serene-text-muted shrink-0">
              {busyMinutes > 0
                ? `${calendarSummary?.events.filter((e) => !e.isAllDay).length || 0} events`
                : (displayStatus === 'surplus' ? 'On track' : 'Near limit')}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom helper */}
      <div className="mt-2.5 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 flex items-center justify-between text-[11px] text-serene-text-muted">
        <span className="truncate">
          {busyMinutes > 0
            ? `${busyMinutes}m meeting commitments deducted from focus capacity.`
            : displayStatus === 'surplus' 
            ? 'Buffer healthy: ample space for deep work.' 
            : displayStatus === 'tight'
            ? 'Buffer tight: prioritize high impact tasks.'
            : 'Overloaded: reschedule or defer tasks.'}
        </span>
        <span className="font-mono text-[10px] shrink-0 ml-2">Cutoff: {formattedCutoff}</span>
      </div>
    </div>
  );
};
