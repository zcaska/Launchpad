import { memo, useId, useState } from 'react';
import { Clock } from '@phosphor-icons/react';
import type { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';

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
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdownId = useId();
  const cutoff = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, endHour));
  const rows = [
    ['Time left today', timeRemaining.formatted],
    ['Pending workload', taskLoad.formattedPending],
    ['Day cutoff', cutoff],
  ];

  return (
    <section className="min-w-0 rounded-xl border border-serene-border-light bg-white px-3 py-4 dark:border-serene-border-dark dark:bg-serene-surface-dark sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Clock aria-hidden="true" /> Time budget</h2>
        <button type="button" onClick={onOpenTasks} className="min-h-[44px] text-sm font-semibold text-serene-primary dark:text-serene-primary-dark">
          Manage tasks
        </button>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{buffer.bufferMinutes < 0 ? '−' : buffer.bufferMinutes > 0 ? '+' : ''}{buffer.formatted}</p>
      <p className="mt-1 text-sm text-serene-text-secondary dark:text-serene-text-darkSecondary">{statusText[buffer.status]}</p>
      <button type="button" aria-expanded={showBreakdown} aria-controls={breakdownId}
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="mt-1 min-h-[44px] text-sm font-semibold text-serene-primary dark:text-serene-primary-dark md:hidden">
        {showBreakdown ? 'Hide breakdown' : 'View breakdown'}
      </button>
      <dl id={breakdownId} className={showBreakdown ? 'divide-y' : 'hidden divide-y md:block md:mt-3'}>
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
