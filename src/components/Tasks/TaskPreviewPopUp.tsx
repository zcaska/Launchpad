import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowSquareOut as ExternalLink,
  Clock,
  Check,
  Target
} from '@phosphor-icons/react';
import { QuickNote, TaskUrl, Subtask } from '../../types';
import { formatTaskCountdown } from '../../utils/taskUrgency';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

interface TaskPreviewPopUpProps {
  task: QuickNote;
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
}

export const TaskPreviewPopUp: React.FC<TaskPreviewPopUpProps> = ({
  task,
  onClose,
  onOpenTask,
}) => {
  const countdown = formatTaskCountdown(task);
  const isOverdue = countdown.includes('overdue');
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks
    ? task.subtasks.filter((s) => s.isDone).length
    : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={handleBackdropClick}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Task preview"
        variants={modalContentVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative z-10 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal w-full sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Task Preview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary break-words leading-snug">
              {task.text}
            </h3>
            {task.priority && (
              <span className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                task.priority === 'urgent'
                  ? 'bg-red-600 text-white'
                  : task.priority === 'high'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : task.priority === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {task.priority}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span
              className={`text-xs sm:text-sm font-medium font-mono ${
                isOverdue
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary'
              }`}
            >
              {isOverdue ? `Overdue by ${countdown}` : `${countdown} left`}
            </span>
          </div>

          {task.description && (
            <div className="pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                Description
              </div>
              <div className="text-xs sm:text-sm text-serene-text-muted dark:text-serene-text-darkMuted leading-relaxed">
                {task.description}
              </div>
            </div>
          )}

          {hasSubtasks && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Subtasks
                </div>
                <span className="text-[10px] font-mono text-serene-text-muted dark:text-serene-text-darkMuted">
                  {completedSubtasks} / {totalSubtasks}
                </span>
              </div>
              <div className="space-y-1">
                {task.subtasks!.map((subtask: Subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {}}
                      disabled
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        subtask.isDone
                          ? 'border-[#0f4c4c] bg-[#0f4c4c]'
                          : 'border-current bg-transparent'
                      }`}
                    >
                      {subtask.isDone && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      )}
                    </button>
                    <span className={`text-xs sm:text-sm truncate ${
                      subtask.isDone
                        ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                        : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                    }`}>
                      {subtask.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.attachedUrls && task.attachedUrls.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                Attached Links
              </div>
              <div className="space-y-1">
                {task.attachedUrls.map((link: TaskUrl) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-primary dark:text-serene-primary-dark hover:bg-serene-primary-soft dark:hover:bg-serene-primary/20 transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors" />
                    <span className="truncate min-w-0">
                      {link.title || link.url.replace(/^https?:\/\//, '')}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-serene-border-light dark:border-serene-border-dark bg-white/50 dark:bg-serene-surface-dark/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTask(task.id);
            }}
            className="flex-1 sm:flex-initial sm:min-w-[140px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Task</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};