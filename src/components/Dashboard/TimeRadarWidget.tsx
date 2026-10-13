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
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs" aria-hidden="true">
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
            TIME BUDGET
          </h2>
          {calendarSummary?.isTokenExpired ? (
            <button
              onClick={onReauthorize || onOpenCalendarSettings}
              className="text-[10px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 transition-colors"
              title="Google Calendar token expired. Click to re-authorize."
            >
              Re-authorize
            </button>
          ) : calendarSummary?.syncError ? (
            <button
              onClick={onSyncCalendar}
              disabled={isSyncingCalendar}
              className="text-[10px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-200 transition-colors flex items-center gap-1"
              title={`Calendar sync error: ${calendarSummary.syncError}. Click to retry.`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
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

      {/* 2. HERO RUNWAY BANNER (High-craft visual focal point) */}
      <div className={`rounded-xl p-3 sm:p-3.5 border transition-all mt-1 mb-2 ${
        displayStatus === 'surplus'
          ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/40'
          : displayStatus === 'tight'
          ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-900/40'
          : 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-900/40'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              displayStatus === 'surplus'
                ? 'text-emerald-700 dark:text-emerald-300'
                : displayStatus === 'tight'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}>
              {displayStatus === 'surplus'
                ? 'Net Focus Runway'
                : displayStatus === 'tight'
                ? 'Tight Focus Buffer'
                : 'Capacity Deficit'}
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mt-1 ${
              displayStatus === 'surplus'
                ? 'text-emerald-700 dark:text-emerald-300'
                : displayStatus === 'tight'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}>
              {displayStatus === 'surplus' && `+${formattedSurplus}`}
              {displayStatus === 'tight' && formattedSurplus}
              {displayStatus === 'overloaded' && `-${formattedSurplus}`}
            </div>
            <p className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted mt-1 leading-snug">
              {timeRemaining.isPastCutoff
                ? 'Workload remaining past bedtime cutoff. Consider deferring non-critical tasks.'
                : displayStatus === 'surplus'
                ? 'Clear focus runway to comfortably finish active workload.'
                : displayStatus === 'tight'
                ? 'Less than 45m buffer remaining today. Prioritize primary focus.'
                : 'Estimated workload exceeds day capacity. Plan strategic deferrals.'}
            </p>
          </div>

          <span className={`p-2 rounded-xl shrink-0 ${
            displayStatus === 'surplus'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : displayStatus === 'tight'
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
          }`}>
            {displayStatus === 'surplus' ? (
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            ) : displayStatus === 'tight' ? (
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
            )}
          </span>
        </div>

        {/* Visual Multi-Segment Capacity Track */}
        <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
          <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex">
            {(taskLoad.localPendingMinutes ?? taskLoad.pendingMinutes) > 0 && (
              <div
                style={{ width: `${Math.min(100, Math.round(((taskLoad.localPendingMinutes ?? taskLoad.pendingMinutes) / Math.max(60, timeRemaining.isPastCutoff ? 0 : timeRemaining.totalMinutes || 120)) * 100))}%` }}
                className="h-full bg-amber-500 transition-all duration-500"
                title={`Workload: ${taskLoad.formattedPending}`}
              />
            )}
            {busyMinutes > 0 && (
              <div
                style={{ width: `${Math.min(100, Math.round((busyMinutes / Math.max(60, timeRemaining.isPastCutoff ? 0 : timeRemaining.totalMinutes || 120)) * 100))}%` }}
                className="h-full bg-indigo-500 transition-all duration-500"
                title={`Meetings: ${Math.floor(busyMinutes / 60)}h ${busyMinutes % 60}m`}
              />
            )}
            {displayStatus === 'surplus' && (
              <div
                style={{ width: `${Math.max(0, 100 - Math.min(100, Math.round((((taskLoad.localPendingMinutes ?? taskLoad.pendingMinutes) + busyMinutes) / Math.max(60, timeRemaining.totalMinutes || 120)) * 100)))}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`Free Runway: ${formattedSurplus}`}
              />
            )}
            {displayStatus === 'overloaded' && (
              <div
                className="h-full bg-rose-500 flex-1 animate-pulse"
                title={`Capacity Deficit: -${formattedSurplus}`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-serene-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Tasks: <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">{taskLoad.formattedPending || '0m'}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Meetings: <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">{busyMinutes > 0 ? `${busyMinutes}m` : '0m'}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'surplus' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>Buffer: <strong className={displayStatus === 'surplus' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                {displayStatus === 'surplus' ? `+${formattedSurplus}` : `-${formattedSurplus}`}
              </strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. THREE DETAILED METRIC ROWS (Clean, non-boxed, hairline dividers) */}
      <div className="my-1 divide-y divide-serene-border-light/60 dark:divide-serene-border-dark/60 rounded-xl bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/30 border border-serene-border-light/60 dark:border-serene-border-dark/60 overflow-hidden flex-1 flex flex-col justify-between">
        {/* Row 1: Time Left */}
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary block">
                Day Runway
              </span>
              <span className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted truncate block">
                {timeRemaining.isPastCutoff ? 'Bedtime cutoff passed' : `Until ${endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`} cutoff`}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className={`text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary whitespace-nowrap leading-none ${
              timeRemaining.isPastCutoff ? 'font-sans' : 'font-mono font-extrabold'
            }`}>
              {timeRemaining.isPastCutoff ? 'End of Day' : timeRemaining.formatted}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-serene-text-muted">
              {timeRemaining.isPastCutoff ? 'Past' : 'Available'}
            </span>
          </div>
        </div>

        {/* Row 2: Workload */}
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Hourglass className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary block">
                Task Workload
              </span>
              <span className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted truncate block">
                {taskLoad.pendingCount} active {taskLoad.pendingCount === 1 ? 'task' : 'tasks'} in queue
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="text-base sm:text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap leading-none">
              {taskLoad.pendingMinutes === 0 ? '0m' : taskLoad.formattedPending}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
              {taskLoad.pendingCount} {taskLoad.pendingCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Row 3: Calendar & Schedule */}
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              busyMinutes > 0
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
            }`}>
              {busyMinutes > 0 ? (
                <Calendar className="w-3.5 h-3.5" />
              ) : (
                <Target className="w-3.5 h-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary block">
                Calendar Schedule
              </span>
              <span className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted truncate block">
                {calendarSummary?.nextEvent
                  ? `Next: ${calendarSummary.nextEvent.summary}`
                  : busyMinutes > 0
                  ? `${calendarSummary?.events.filter((e) => !e.isAllDay).length || 0} events booked today`
                  : 'No meetings scheduled today'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className={`text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary whitespace-nowrap leading-none ${
              busyMinutes > 0 ? 'font-mono font-extrabold' : 'font-sans'
            }`}>
              {busyMinutes > 0
                ? `${Math.floor(calendarSummary!.totalBusyMinutesToday / 60)}h ${calendarSummary!.totalBusyMinutesToday % 60}m`
                : 'Clear Runway'}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              busyMinutes > 0
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50'
                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/50'
            }`}>
              {busyMinutes > 0
                ? `${calendarSummary?.events.filter((e) => !e.isAllDay).length || 0} events`
                : 'No blocks'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Capacity Runway Card matching CommitmentRadarWidget status strip */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 border border-serene-border-light/80 dark:border-serene-border-dark/80 flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            displayStatus === 'surplus'
              ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
              : displayStatus === 'tight'
              ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/60'
              : 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60'
          }`} />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary block">
              CAPACITY RUNWAY
            </span>
            <span className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate block">
              {busyMinutes > 0
                ? `${busyMinutes}m booked · ${displayStatus === 'surplus' ? 'Runway clear' : displayStatus === 'tight' ? 'Tight window' : 'Capacity deficit'}`
                : displayStatus === 'surplus'
                ? 'Ample focus runway'
                : displayStatus === 'tight'
                ? 'Tight schedule window'
                : 'Workload exceeds cutoff'}
            </span>
          </div>
        </div>
        {endHour !== undefined && (
          <div className="text-right shrink-0">
            <span className="text-[10px] text-serene-text-muted block">Day Cutoff</span>
            <span className="font-mono text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              {endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeRadarWidget;
