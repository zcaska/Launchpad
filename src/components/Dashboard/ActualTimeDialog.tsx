import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { QuickNote } from '../../types';

interface ActualTimeDialogProps {
  tasks: QuickNote[];
  onSave: (minutes: Record<string, number>) => void;
  onCancel: () => void;
  maxMinutes?: number;
  description?: string;
  submitLabel?: string;
}

const clockMarks = Array.from({ length: 12 }, (_, index) => {
  const radians = index * Math.PI / 6;
  return { minute: index * 5, left: 50 + 37 * Math.sin(radians), top: 50 - 37 * Math.cos(radians) };
});

const adjustments = [
  { change: -60, label: 'Subtract one hour', text: '−1 h' },
  { change: 60, label: 'Add one hour', text: '+1 h' },
  { change: -1, label: 'Subtract one minute', text: '−1 min' },
  { change: 1, label: 'Add one minute', text: '+1 min' },
];

function durationError(value: number | undefined, minimum: number, maximum: number) {
  if (maximum < minimum) return 'There is no remaining time available to record.';
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
  const [values, setValues] = useState<Partial<Record<string, number>>>(() =>
    Object.fromEntries(tasks.filter(task => task.actualMinutes != null).map(task => [task.id, task.actualMinutes])),
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
      const value = values[task.id];
      if (value === undefined || durationError(value, Math.max(1, Math.ceil(task.partialMinutes ?? 0)), maxMinutes)) return;
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
      className="fixed inset-0 m-auto w-[min(92vw,32rem)] max-w-none rounded-2xl border border-serene-border-light bg-serene-surface-light p-6 text-serene-text-primary shadow-2xl backdrop:bg-stone-950/65 dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary"
    >
      <form onSubmit={handleSubmit}>
        <h2 id="actual-time-title" className="text-xl font-bold">Actual time</h2>
        <p id="actual-time-description" className="mt-2 text-sm text-serene-text-muted">{description}</p>
        <div className="mt-5 max-h-[min(58dvh,32rem)] space-y-5 overflow-y-auto">
          {tasks.map(task => {
            const value = values[task.id];
            const hours = Math.floor((value ?? 0) / 60);
            const minutes = (value ?? 0) % 60;
            const minimum = Math.max(1, Math.ceil(task.partialMinutes ?? 0));
            const error = (submitted || maxMinutes < minimum) && durationError(value, minimum, maxMinutes);
            const select = (next: number) => setValues(current => ({ ...current, [task.id]: next }));

            return (
              <fieldset key={task.id} className="min-w-0 rounded-xl border border-serene-border-light px-3 pb-3 dark:border-serene-border-dark">
                <legend className="max-w-full break-words px-1 text-sm font-semibold">
                  {task.text}{task.partialMinutes ? ` (${task.partialMinutes} minutes already recorded)` : ''}
                </legend>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <div role="group" aria-label="Minutes on the clock" className="relative size-48 shrink-0 rounded-full border border-serene-border-light bg-serene-bg-light dark:border-serene-border-dark dark:bg-serene-bg-dark">
                    {value !== undefined && (
                      <span aria-hidden="true" className="pointer-events-none absolute bottom-1/2 left-1/2 h-[27%] w-0.5 origin-bottom rounded-full bg-serene-primary/60" style={{ transform: `translateX(-50%) rotate(${minutes * 6}deg)` }} />
                    )}
                    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-serene-primary" />
                    {clockMarks.map(mark => {
                      const selected = value !== undefined && mark.minute === minutes;
                      const next = hours * 60 + mark.minute;
                      return (
                        <button
                          key={mark.minute}
                          type="button"
                          disabled={next > maxMinutes}
                          aria-label={`Set minutes to ${mark.minute}`}
                          aria-pressed={selected}
                          onClick={() => select(next)}
                          className={`absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-semibold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary focus-visible:outline-offset-2 disabled:opacity-35 ${selected ? 'bg-serene-primary text-white' : 'enabled:hover:bg-serene-primary/15'}`}
                          style={{ left: `${mark.left}%`, top: `${mark.top}%` }}
                        >
                          {String(mark.minute).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  <div className="min-w-36 text-center">
                    <output className="mb-2 block text-sm font-bold tabular-nums">
                      {value === undefined ? 'No duration selected' : `${hours} h ${minutes} min`}
                    </output>
                    <div className="grid grid-cols-2 gap-1.5">
                      {adjustments.map(({ change, label, text }) => {
                        const current = value ?? 0;
                        const next = Math.max(0, Math.min(maxMinutes, current + change));
                        return (
                          <button key={change} type="button" aria-label={label} disabled={next === current} onClick={() => select(next)} className="min-h-9 rounded-lg border border-serene-border-light px-2 text-xs font-semibold enabled:hover:bg-serene-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary disabled:opacity-35 dark:border-serene-border-dark">
                            {text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
