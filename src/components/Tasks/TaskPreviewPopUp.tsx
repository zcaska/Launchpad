import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Circle, PencilSimple, X } from '@phosphor-icons/react';
import type { QuickNote } from '../../types';
import { formatElapsed } from '../../utils/focusTimer';
import { formatTaskCountdown, parseTaskDeadline } from '../../utils/taskUrgency';
import { formatEventDuration, formatEventTime, isSafeUrl } from '../../utils/textFormatting';
import { SafeDescription } from '../Common/SafeDescription';
import { TaskLinks } from './TaskLinks';

interface TaskPreviewPopUpProps {
  task: QuickNote;
  now: Date;
  clockFormat: '12h' | '24h';
  onClose: () => void;
  onEdit: () => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function TaskPreviewPopUp({ task, now, clockFormat, onClose, onEdit }: TaskPreviewPopUpProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const deadline = parseTaskDeadline(task.deadline, now);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(task.deadline?.trim() ?? '');
  const deadlineTime = deadline && !dateOnly ? formatEventTime(deadline, clockFormat) : '';
  const createdAt = new Date(task.createdAt);
  const subtasks = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.isDone).length;
  const links = task.attachedUrls?.filter((link) => isSafeUrl(link.url));

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="task-details-dialog fixed inset-0 m-auto w-[calc(100%_-_1.5rem)] max-w-lg overflow-hidden rounded-2xl border border-serene-border-light bg-white text-serene-text-primary shadow-modal dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary"
    >
      <div className="flex max-h-[min(86dvh,48rem)] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-serene-border-light py-1.5 pl-4 pr-2 dark:border-serene-border-dark sm:pl-5">
          <h2 id={titleId} className="text-base font-bold">Task details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-serene-text-muted hover:bg-black/5 dark:text-serene-text-darkMuted dark:hover:bg-white/10"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <h3 className="text-lg font-bold leading-snug [overflow-wrap:anywhere] sm:text-xl">{task.text}</h3>
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-serene-border-light bg-serene-surfaceAlt-light p-3 text-sm dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark">
            <div>
              <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Status</dt>
              <dd className="font-semibold">{task.isDone ? 'Completed' : 'Pending'}</dd>
            </div>
            <div>
              <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Priority</dt>
              <dd className="font-semibold capitalize">{task.priority ?? 'Unspecified'}</dd>
            </div>
            <div>
              <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Estimate</dt>
              <dd className="font-semibold tabular-nums">{task.durationMinutes == null ? 'Unspecified' : formatEventDuration(task.durationMinutes)}</dd>
            </div>
            {task.timeSpentSeconds != null && (
              <div>
                <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Time logged</dt>
                <dd className="font-semibold tabular-nums">{formatElapsed(task.timeSpentSeconds)}</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Deadline</dt>
              <dd className="font-semibold tabular-nums">
                {deadline ? dateFormat.format(deadline) : 'No deadline'}
                {deadlineTime && <> · {deadlineTime}</>}
                {deadline && !task.isDone && (
                  <span className="block text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    {formatTaskCountdown(task, now)}
                  </span>
                )}
              </dd>
            </div>
            {Number.isFinite(createdAt.getTime()) && (
              <div className="col-span-2">
                <dt className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">Created</dt>
                <dd className="font-semibold tabular-nums">{dateFormat.format(createdAt)}</dd>
              </div>
            )}
          </dl>

          {task.description && (
            <section className="space-y-1">
              <h4 className="text-sm font-bold">Description</h4>
              <SafeDescription text={task.description} className="text-sm leading-relaxed [overflow-wrap:anywhere]" />
            </section>
          )}

          {subtasks.length > 0 && (
            <section className="space-y-1">
              <h4 className="text-sm font-bold">Checklist ({completedSubtasks}/{subtasks.length})</h4>
              <ul className="divide-y divide-serene-border-light text-sm dark:divide-serene-border-dark">
                {subtasks.map((subtask) => (
                  <li key={subtask.id} className="flex items-start gap-2 py-2">
                    {subtask.isDone
                      ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-serene-primary dark:text-serene-primary-dark" aria-hidden="true" />
                      : <Circle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
                    <span className="sr-only">{subtask.isDone ? 'Completed: ' : 'Pending: '}</span>
                    <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{subtask.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!links?.length && (
            <section className="space-y-1">
              <h4 className="text-sm font-bold">Attached links</h4>
              <TaskLinks links={links} />
            </section>
          )}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-serene-border-light p-2.5 dark:border-serene-border-dark sm:px-5">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10">Close</button>
          <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-serene-primary px-3 text-sm font-semibold text-white hover:bg-serene-primary-hover">
            <PencilSimple size={16} aria-hidden="true" /> Edit task
          </button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
