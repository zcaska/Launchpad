import React from 'react';
import {
  Lightning as Zap,
  Plus,
  FileText,
  CalendarBlank as Calendar,
  Target,
  Quotes as Quote
} from '@phosphor-icons/react';

export interface QuickActionsCardProps {
  onOpenAddTask: () => void;
  onToggleScratchpad: () => void;
  onOpenCalendar: () => void;
  onOpenTasks?: () => void;
  className?: string;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onOpenAddTask,
  onToggleScratchpad,
  onOpenCalendar,
  onOpenTasks,
  className = '',
}) => {
  return (
    <div
      className={`@container w-full h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between select-none ${className}`}
      data-testid="quick-actions-card"
    >
      {/* 1. Header: Zap/Lightning icon, QUICK ACTIONS */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs"
            aria-hidden="true"
          >
            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
            QUICK ACTIONS
          </h2>
        </div>
      </div>

      {/* 2. 2x2 Action Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto py-1">
        {/* + Add Task */}
        <button
          type="button"
          onClick={onOpenAddTask}
          className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:py-3.5 rounded-xl border border-serene-border-light/70 dark:border-serene-border-dark/70 bg-stone-50/60 dark:bg-serene-surfaceAlt-dark/50 hover:bg-white dark:hover:bg-serene-surfaceAlt-dark hover:border-serene-primary/40 dark:hover:border-serene-primary-dark/40 text-serene-text-primary dark:text-serene-text-darkPrimary transition-all duration-150 shadow-2xs hover:shadow-subtle group cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-stone-300 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark stroke-[2.2] transition-colors" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-white transition-colors text-center">
            Add Task
          </span>
        </button>

        {/* Capture Note */}
        <button
          type="button"
          onClick={onToggleScratchpad}
          className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:py-3.5 rounded-xl border border-serene-border-light/70 dark:border-serene-border-dark/70 bg-stone-50/60 dark:bg-serene-surfaceAlt-dark/50 hover:bg-white dark:hover:bg-serene-surfaceAlt-dark hover:border-serene-primary/40 dark:hover:border-serene-primary-dark/40 text-serene-text-primary dark:text-serene-text-darkPrimary transition-all duration-150 shadow-2xs hover:shadow-subtle group cursor-pointer active:scale-[0.98]"
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-stone-300 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark stroke-[2] transition-colors" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-white transition-colors text-center">
            Capture Note
          </span>
        </button>

        {/* Open Calendar */}
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:py-3.5 rounded-xl border border-serene-border-light/70 dark:border-serene-border-dark/70 bg-stone-50/60 dark:bg-serene-surfaceAlt-dark/50 hover:bg-white dark:hover:bg-serene-surfaceAlt-dark hover:border-serene-primary/40 dark:hover:border-serene-primary-dark/40 text-serene-text-primary dark:text-serene-text-darkPrimary transition-all duration-150 shadow-2xs hover:shadow-subtle group cursor-pointer active:scale-[0.98]"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-stone-300 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark stroke-[2] transition-colors" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-white transition-colors text-center">
            Open Calendar
          </span>
        </button>

        {/* Focus Mode */}
        <button
          type="button"
          onClick={() => onOpenTasks && onOpenTasks()}
          className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:py-3.5 rounded-xl border border-serene-border-light/70 dark:border-serene-border-dark/70 bg-stone-50/60 dark:bg-serene-surfaceAlt-dark/50 hover:bg-white dark:hover:bg-serene-surfaceAlt-dark hover:border-serene-primary/40 dark:hover:border-serene-primary-dark/40 text-serene-text-primary dark:text-serene-text-darkPrimary transition-all duration-150 shadow-2xs hover:shadow-subtle group cursor-pointer active:scale-[0.98]"
        >
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-stone-300 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark stroke-[2] transition-colors" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-white transition-colors text-center">
            Focus Mode
          </span>
        </button>
      </div>

      {/* 3. Bottom Serene Quote Card: "Progress, not perfection." in amber pill box */}
      <div className="bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200/80 dark:border-amber-900/50 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 flex items-center gap-2.5 mt-2.5 shadow-2xs">
        <Quote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/20" />
        <p className="text-xs font-semibold italic text-amber-900 dark:text-amber-200 truncate">
          &ldquo;Progress, not perfection.&rdquo;
        </p>
      </div>
    </div>
  );
};
