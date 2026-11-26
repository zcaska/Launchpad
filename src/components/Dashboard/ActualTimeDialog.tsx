import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { QuickNote } from '../../types';
import { DurationDial, type DurationUnit } from '../Common/DurationDial';

interface ActualTimeDialogProps {
  tasks: QuickNote[];
  onSave: (minutes: Record<string, number>) => void;
  onCancel: () => void;
  maxMinutes?: number;
  description?: string;
  submitLabel?: string;
}

type DurationFields = Record<DurationUnit, string>;

const emptyDuration: DurationFields = { hours: '', minutes: '' };

function totalMinutes({ hours, minutes }: DurationFields): number | undefined {
  if (hours === '' && minutes === '') return undefined;
  return Number(hours) * 60 + Number(minutes);
}

function durationError(fields: DurationFields, minimum: number, maximum: number) {
  const value = totalMinutes(fields);
  if (maximum < minimum) return 'There is no remaining time available to record.';
  if (Number(fields.minutes) > 59) return 'Enter minutes from 0 to 59.';
  if (value === undefined || value === 0) return 'Select a duration of at least one minute.';
  if (value < minimum) return `Enter at least ${minimum} minutes to include the time already recorded.`;
  if (!Number.isSafeInteger(value) || value > maximum) return `Enter no more than ${maximum} minutes.`;
  return '';
}

export function ActualTimeDialog({
  tasks,
  onSave,
  onCancel,
  maxMinutes = 525600,
  description = 'Enter the time you spent on each task. Your reflection comes next.',
  submitLabel = 'Continue to reflection',
}: ActualTimeDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Partial<Record<string, DurationFields>>>(() =>
    Object.fromEntries(tasks.flatMap(task => task.actualMinutes == null ? [] : [[task.id, {
      hours: String(Math.floor(task.actualMinutes / 60)),
      minutes: String(task.actualMinutes % 60),
    }]])),
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const result: Record<string, number> = {};
    for (const task of tasks) {
      const fields = values[task.id] ?? emptyDuration;
      const value = totalMinutes(fields);
      if (value === undefined || durationError(fields, Math.max(1, Math.ceil((task.partialMinutes ?? 0) + (task.pendingProgress ?? []).reduce((sum, entry) => sum + entry.minutes, 0))), maxMinutes)) return;
      result[task.id] = value;
    }
    onSave(result);
  };

  return (
    <dialog
      ref={dialog}
      data-task-dialog
      aria-labelledby="actual-time-title"
      aria-describedby="actual-time-description"
      onCancel={event => { event.preventDefault(); onCancel(); }}
      className="fixed inset-0 m-auto w-[min(94vw,32rem)] max-w-none rounded-2xl border border-serene-border-light bg-serene-surface-light p-4 text-serene-text-primary shadow-2xl backdrop:bg-stone-950/65 dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary sm:p-6"
    >
      <form onSubmit={handleSubmit}>
        <h2 id="actual-time-title" className="text-xl font-bold">Actual time</h2>
        <p id="actual-time-description" className="mt-2 text-sm text-serene-text-muted dark:text-serene-text-darkMuted">{description}</p>
        <div className="mt-5 max-h-[min(58dvh,32rem)] space-y-5 overflow-y-auto">
          {tasks.map(task => {
            const fields = values[task.id] ?? emptyDuration;
            const value = totalMinutes(fields);
            const hours = Number(fields.hours);
            const minutes = Number(fields.minutes);
            const recordedMinutes = (task.partialMinutes ?? 0) + (task.pendingProgress ?? []).reduce((sum, entry) => sum + entry.minutes, 0);
            const minimum = Math.max(1, Math.ceil(recordedMinutes));
            const error = (submitted || maxMinutes < minimum) && durationError(fields, minimum, maxMinutes);
            const select = (unit: DurationUnit, next: string) => setValues(current => ({
              ...current,
              [task.id]: { ...emptyDuration, ...current[task.id], [unit]: next },
            }));

            return (
              <fieldset key={task.id} className="min-w-0 rounded-xl border border-serene-border-light px-3 pb-3 dark:border-serene-border-dark">
                <legend className="max-w-full break-words px-1 text-sm font-semibold">
                  {task.text}{recordedMinutes ? ` (${recordedMinutes} minutes already recorded)` : ''}
                </legend>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <DurationDial unit="hours" value={fields.hours} maximum={Math.floor((maxMinutes - minutes) / 60)} onChange={next => select('hours', next)} />
                  <DurationDial unit="minutes" value={fields.minutes} maximum={maxMinutes - hours * 60} onChange={next => select('minutes', next)} />
                </div>
                <output className="mt-2 block text-center text-sm font-semibold tabular-nums">
                  {value === undefined ? 'No duration selected' : `${hours} h ${minutes} min`}
                </output>
                {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
              </fieldset>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold">Cancel</button>
          <button type="submit" className="rounded-lg bg-serene-primary px-4 py-2 text-sm font-semibold text-white">{submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
