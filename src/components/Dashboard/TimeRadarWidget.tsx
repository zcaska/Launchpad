import { memo } from 'react';
import { ArrowRight, Clock, Info } from '@phosphor-icons/react';
import type { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';
import { bufferTextColor } from '../../utils/timeBudget';

interface TimeRadarWidgetProps {
  timeRemaining: DayTimeRemaining;
  taskLoad: TaskLoadSummary;
  buffer: BufferSummary;
  endHour: number;
  onOpenTasks: () => void;
}

const statusText = {
  surplus: 'Time available after your pending tasks',
  tight: 'Little time left after your pending tasks',
  overloaded: 'Pending work exceeds your available time',
};

export const TimeRadarWidget = memo(function TimeRadarWidget({
  timeRemaining, taskLoad, buffer, endHour, onOpenTasks,
}: TimeRadarWidgetProps) {
  const cutoff = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, endHour));
  const rows = [
    ['Time left today', timeRemaining.formatted],
    ['Pending workload', taskLoad.formattedPending],
    ['Day cutoff', cutoff],
  ];

  const spare = (buffer.bufferMinutes < 0 ? '−' : '') + buffer.formatted;
  const mobileRows = [
    ['Available', timeRemaining.formatted, 'text-teal-700 dark:text-teal-300'],
    ['Pending', taskLoad.formattedPending, ''],
    ['To spare', spare, bufferTextColor[buffer.status]],
  ];

  return (
    <section className="mobile-budget min-w-0 rounded-xl border border-serene-border-light bg-white px-3 py-4 dark:border-serene-border-dark dark:bg-serene-surface-dark sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <div className="flex items-center gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Clock className="budget-icon" aria-hidden="true" /> Time budget</h2>
          <details className="budget-details md:hidden">
            <summary aria-label="Time budget details"><Info size={15} aria-hidden="true" /></summary>
            <p>Day cutoff {cutoff}<br />{statusText[buffer.status]}</p>
          </details>
        </div>
        <button type="button" onClick={onOpenTasks} className="inline-flex min-h-11 items-center text-sm font-semibold text-serene-primary dark:text-serene-primary-dark">
          <span>Manage<span className="hidden md:inline"> tasks</span></span>
          <ArrowRight size={14} className="ml-1 md:hidden" aria-hidden="true" />
        </button>
      </div>
      <p className={`hidden md:block mt-2 text-3xl font-bold tabular-nums ${bufferTextColor[buffer.status]}`}>{buffer.bufferMinutes < 0 ? '−' : buffer.bufferMinutes > 0 ? '+' : ''}{buffer.formatted}</p>
      <p className="hidden md:block mt-1 text-sm text-serene-text-secondary dark:text-serene-text-darkSecondary">{statusText[buffer.status]}</p>
      <dl className="budget-summary grid grid-cols-3 md:hidden">
        {mobileRows.map(([label, value, color]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={color}>{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="hidden divide-y md:block md:mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-serene-border-light py-2 text-sm dark:border-serene-border-dark">
            <dt>{label}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
});

export default TimeRadarWidget;
