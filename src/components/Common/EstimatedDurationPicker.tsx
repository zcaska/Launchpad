import { useId, useRef } from 'react';
import { formatMinutesToHours } from '../../utils/timeBudget';
import { MAX_ESTIMATED_MINUTES, updateEstimatedHours, updateEstimatedMinutes } from '../../utils/estimatedDuration';
import { DurationDial } from './DurationDial';

interface EstimatedDurationPickerProps {
  minutes: number;
  onChange: (minutes: number) => void;
  label?: string;
}

export function EstimatedDurationPicker({ minutes, onChange, label = 'Estimated duration' }: EstimatedDurationPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hours = Math.floor(minutes / 60);
  const minutePart = minutes % 60;
  const maxMinutes = Math.max(MAX_ESTIMATED_MINUTES, minutes);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">{label}</span>
        <button
          type="button"
          aria-label={`${label}, ${formatMinutesToHours(minutes)}. Change estimate`}
          onClick={() => dialog.current?.showModal()}
          className="min-h-10 rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-3 py-1.5 text-sm font-semibold tabular-nums text-serene-primary transition-colors hover:border-serene-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark dark:text-serene-primary-dark dark:focus-visible:outline-serene-primary-dark"
        >
          {formatMinutesToHours(minutes)}
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={event => event.stopPropagation()}
        onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(92vw,28rem)] max-w-none rounded-2xl border border-serene-border-light bg-serene-surface-light p-4 text-serene-text-primary shadow-2xl backdrop:bg-stone-950/60 dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-bold">Estimated duration</h2>
            <p className="mt-1 text-sm text-serene-text-muted dark:text-serene-text-darkMuted">{formatMinutesToHours(minutes)}</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-serene-text-secondary hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary dark:text-serene-text-darkSecondary dark:hover:bg-white/10" autoFocus>
            Done
          </button>
        </div>
        <div className="mt-4 flex max-h-[70dvh] flex-wrap items-start justify-center gap-3 overflow-y-auto sm:gap-4">
          <DurationDial
            unit="hours"
            value={String(hours)}
            maximum={Math.floor((maxMinutes - minutePart) / 60)}
            onChange={value => onChange(updateEstimatedHours(minutes, Number(value)))}
          />
          <DurationDial
            unit="minutes"
            value={String(minutePart)}
            maximum={Math.min(59, maxMinutes - hours * 60)}
            onChange={value => onChange(updateEstimatedMinutes(minutes, Math.min(59, Number(value))))}
          />
        </div>
      </dialog>
    </>
  );
}
