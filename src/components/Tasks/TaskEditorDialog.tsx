import { useId, type FormEvent, type PropsWithChildren, type RefObject } from 'react';
import { PencilSimple, Plus, X } from '@phosphor-icons/react';
import { TaskDialog, type TaskDialogTrigger } from './TaskDialog';

interface TaskEditorDialogProps {
  editing: boolean;
  title: string;
  returnFocus: TaskDialogTrigger | null;
  fallbackFocus: RefObject<HTMLElement | null>;
  onTitleChange: (title: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function TaskEditorDialog({
  editing, title, returnFocus, fallbackFocus, onTitleChange, onClose, onSubmit, children,
}: PropsWithChildren<TaskEditorDialogProps>) {
  const titleId = useId();
  const titleInputId = useId();

  return (
    <TaskDialog
      titleId={titleId}
      returnFocus={returnFocus}
      fallbackFocus={fallbackFocus}
      onClose={onClose}
      className="fixed inset-0 m-auto h-dvh max-h-none w-full max-w-none overflow-hidden bg-white text-serene-text-primary shadow-modal dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary sm:h-auto sm:max-w-xl sm:rounded-2xl sm:border sm:border-serene-border-light sm:dark:border-serene-border-dark"
    >
      <form onSubmit={onSubmit} className="task-edit-form flex h-full flex-col sm:h-auto sm:max-h-[90dvh]">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-serene-border-light px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 dark:border-serene-border-dark sm:px-5 sm:pt-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-serene-primary-soft p-1.5 text-serene-primary dark:bg-serene-primary/20 dark:text-serene-primary-dark" aria-hidden="true">
              {editing ? <PencilSimple size={16} /> : <Plus size={16} />}
            </span>
            <h2 id={titleId} className="text-base font-bold">{editing ? 'Edit Task' : 'Create New Task'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={editing ? 'Close task editor' : 'Close task creation'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-serene-text-muted hover:bg-black/5 dark:text-serene-text-darkMuted dark:hover:bg-white/10"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div>
            <label htmlFor={titleInputId} className="mb-1.5 block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Task Title <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <input
              id={titleInputId}
              type="text"
              required
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="e.g. Finalize architectural diagram or write unit tests"
              className="w-full rounded-xl border border-serene-border-light bg-serene-surfaceAlt-light px-3.5 py-2 text-base placeholder:text-serene-text-muted focus:border-serene-primary focus:outline-none focus:ring-2 focus:ring-serene-primary/40 dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark sm:text-sm"
            />
          </div>
          {children}
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-serene-border-light px-4 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] dark:border-serene-border-dark sm:px-5 sm:py-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-serene-text-secondary transition-colors hover:bg-black/5 hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:bg-white/10 dark:hover:text-serene-text-darkPrimary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-serene-primary px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-serene-primary-hover"
          >
            {editing ? 'Save Changes' : 'Create Task'}
          </button>
        </footer>
      </form>
    </TaskDialog>
  );
}
