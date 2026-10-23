import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Clock, 
  AlertCircle, 
  Calendar,
  ArrowRight
} from 'lucide-react';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

export interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: {
    text: string;
    durationMinutes: number;
    priority: 'low' | 'medium' | 'high';
    deadline?: string;
  }) => void;
  onOpenFullTasksView?: () => void;
}

const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
];

const PRIORITY_OPTIONS: Array<{
  value: 'low' | 'medium' | 'high';
  label: string;
  activeClass: string;
}> = [
  { 
    value: 'low', 
    label: 'Low', 
    activeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    activeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' 
  },
  { 
    value: 'high', 
    label: 'High', 
    activeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' 
  },
];

export const QuickAddTaskModal: React.FC<QuickAddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onOpenFullTasksView,
}) => {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [deadline, setDeadline] = useState('');
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDuration(30);
      setPriority('medium');
      setDeadline('');
      setShowDeadlineInput(false);
      // Autofocus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAddTask({
      text: trimmed,
      durationMinutes: duration,
      priority,
      deadline: deadline.trim() || undefined,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 dark:bg-black/75 backdrop-blur-xs"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Modal Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-task-title"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-serene-border-light/70 dark:border-serene-border-dark/70 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-serene-primary/10 dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark flex items-center justify-center font-bold">
                  <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 
                    id="quick-add-task-title" 
                    className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-tight"
                  >
                    Quick Add Task
                  </h3>
                  <span className="text-[11px] text-serene-text-muted">
                    Capture focus item without leaving your dashboard
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Task Title Input */}
              <div>
                <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                  Task Title or Objective <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Draft design proposal, Review quarterly budget..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/70 border border-serene-border-light dark:border-serene-border-dark text-sm text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/30 dark:focus:ring-serene-primary-dark/30 transition-all font-medium"
                />
              </div>

              {/* Duration Estimate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    <Clock className="w-3.5 h-3.5 text-serene-text-muted" />
                    <span>Estimated Duration</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-serene-primary dark:text-serene-primary-dark">
                    {duration >= 60 ? `${duration / 60}h` : `${duration}m`}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setDuration(preset.minutes)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-medium font-mono border transition-all text-center cursor-pointer ${
                        duration === preset.minutes
                          ? 'bg-serene-primary text-white border-serene-primary shadow-xs font-bold'
                          : 'bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 text-serene-text-secondary dark:text-serene-text-darkSecondary border-serene-border-light dark:border-serene-border-dark hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Deadline Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Priority */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-serene-text-muted" />
                    <span>Priority</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          priority === opt.value
                            ? opt.activeClass
                            : 'bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                      <Calendar className="w-3.5 h-3.5 text-serene-text-muted" />
                      <span>Deadline</span>
                    </label>
                    {!showDeadlineInput && (
                      <button
                        type="button"
                        onClick={() => setShowDeadlineInput(true)}
                        className="text-[11px] text-serene-primary dark:text-serene-primary-dark hover:underline cursor-pointer"
                      >
                        + Add Time
                      </button>
                    )}
                  </div>
                  {showDeadlineInput ? (
                    <input
                      type="text"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="e.g. 17:00, Today, Tomorrow"
                      className="w-full px-3 py-1.5 rounded-lg bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/70 border border-serene-border-light dark:border-serene-border-dark text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary transition-all"
                    />
                  ) : (
                    <div 
                      onClick={() => setShowDeadlineInput(true)}
                      className="py-1.5 px-2.5 rounded-lg border border-dashed border-serene-border-light dark:border-serene-border-dark text-xs text-serene-text-muted text-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      No deadline set
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-serene-border-light/70 dark:border-serene-border-dark/70 mt-2">
                {onOpenFullTasksView ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFullTasksView();
                    }}
                    className="text-xs font-medium text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Full Task Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-serene-primary hover:bg-serene-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
