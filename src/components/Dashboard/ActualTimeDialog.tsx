import { useEffect, useRef, useState } from 'react';
import type { QuickNote } from '../../types';

export function ActualTimeDialog({ tasks, onSave, onCancel, maxMinutes = 525600, description = 'Enter the time you spent on each task. Your reflection comes next.' }: { tasks: QuickNote[]; onSave: (minutes: Record<string, number>) => void; onCancel: () => void; maxMinutes?: number; description?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(tasks.map(task => [task.id, task.actualMinutes ? String(task.actualMinutes) : ''])));
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby="actual-time-title" onCancel={event => { event.preventDefault(); onCancel(); }} className="fixed inset-0 m-auto w-[min(92vw,32rem)] max-w-none rounded-2xl border border-serene-border-light bg-serene-surface-light p-6 text-serene-text-primary shadow-2xl backdrop:bg-stone-950/65 dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary">
    <form onSubmit={event => { event.preventDefault(); const result = Object.fromEntries(tasks.map(task => [task.id, Number(values[task.id])])); if (Object.values(result).every(value => Number.isFinite(value) && value > 0 && value <= maxMinutes)) onSave(result); }}>
      <h2 id="actual-time-title" className="text-xl font-bold">Actual time</h2><p className="mt-2 text-sm text-serene-text-muted">{description}</p>
      <div className="mt-5 max-h-[50vh] space-y-4 overflow-y-auto">{tasks.map(task => <label key={task.id} className="block text-sm font-semibold">{task.text}{task.partialMinutes ? ` (${task.partialMinutes} minutes already recorded)` : ''}<span className="mt-1 flex items-center gap-2"><input required type="number" min={Math.max(1, task.partialMinutes ?? 0)} max={maxMinutes} step="1" value={values[task.id] ?? ''} onChange={event => setValues(current => ({ ...current, [task.id]: event.target.value }))} className="w-28 rounded-lg border border-serene-border-light bg-transparent px-3 py-2 dark:border-serene-border-dark" /> minutes</span></label>)}</div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-serene-primary px-4 py-2 text-sm font-semibold text-white">Continue to reflection</button></div>
    </form>
  </dialog>;
}

