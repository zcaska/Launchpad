import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Target,
  CalendarBlank as Calendar,
  Clock,
  DotsThree as MoreHorizontal,
  DotsThreeVertical as MoreVertical,
  FileText,
  CaretDown as ChevronDown,
  CaretUp as ChevronUp,
  Check,
  ListChecks as ListTodo,
  Sparkle as Sparkles,
  PencilSimple as Edit3,
  Copy,
  Info,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  DotsSixVertical,
  Waves,
} from '@phosphor-icons/react';
import { QuickNote, RecommendationCandidate } from '../../types';
import { formatApproximateDuration } from '../../utils/timeBudget';
import {
  calculateTaskUrgency,
  computeSubtaskContainerState,
  TaskUrgencyInfo,
} from '../../utils/taskUrgency';
import { SafeDescription } from '../Common/SafeDescription';
import { TaskLinks } from '../Tasks/TaskLinks';
import { formatEventTime, formatEventDuration } from '../../utils/textFormatting';
import { SmartSuggestionCard } from './SmartSuggestionCard';

export interface PrimaryFocusCardProps {
  tasks: QuickNote[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
  onPreviewTask?: (id: string) => void;
  completedTask?: QuickNote | null;
  onCompleteTask?: (task: QuickNote) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenTaskEdit?: (task: QuickNote) => void;
  clockFormat: '12h' | '24h';
  className?: string;
  /** When true the empty state shows the recommender's smart suggestion (all-tasks-cleared). */
  showSuggestion?: boolean;
  suggestionCandidate?: RecommendationCandidate | null;
  onApproveSuggestion?: (candidate: RecommendationCandidate) => void;
  onRejectSuggestion?: (candidate: RecommendationCandidate) => void;
  onNextSuggestion?: () => void;
  approvalsCount?: number;
  rejectionsCount?: number;
}

type ProcedureSort = 'procedure' | 'pending_first' | 'completed_first';

/**
 * Formats deadline date for display (e.g. "Today, 13 Oct", "Tomorrow, 14 Oct").
 */
function formatDeadlineDateLabel(deadlineDate: Date | null, refDate: Date = new Date()): string {
  if (!deadlineDate) return 'No date';

  const isToday =
    deadlineDate.getFullYear() === refDate.getFullYear() &&
    deadlineDate.getMonth() === refDate.getMonth() &&
    deadlineDate.getDate() === refDate.getDate();

  const tomorrow = new Date(refDate);
  tomorrow.setDate(refDate.getDate() + 1);
  const isTomorrow =
    deadlineDate.getFullYear() === tomorrow.getFullYear() &&
    deadlineDate.getMonth() === tomorrow.getMonth() &&
    deadlineDate.getDate() === tomorrow.getDate();

  const dayMonth = deadlineDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });

  if (isToday) return `Today, ${dayMonth}`;
  if (isTomorrow) return `Tomorrow, ${dayMonth}`;

  const weekday = deadlineDate.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday}, ${dayMonth}`;
}

/**
 * Derives header badge and deadline countdown metrics.
 */
function deriveDeadlineMetrics(urgency: TaskUrgencyInfo): {
  headerBadge: string;
  countdownText: string;
  progressPercent: number;
} {
  if (urgency.tier === 'no_deadline' || urgency.diffMs === null) {
    return {
      headerBadge: 'Flexible Schedule',
      countdownText: 'No deadline set',
      progressPercent: 0,
    };
  }

  const diffMs = urgency.diffMs;

  if (diffMs < 0) {
    const totalMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
    const timeStr = formatApproximateDuration(totalMinutes, { allowWeeks: true });
    return {
      headerBadge: `Overdue by ${timeStr}`,
      countdownText: totalMinutes < 60 ? `${totalMinutes}m overdue` : `${timeStr} overdue`,
      progressPercent: 0,
    };
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const timeStr = formatApproximateDuration(totalMinutes, { allowWeeks: true });
  const hours = totalMinutes / 60;

  return {
    headerBadge: `Due in ${timeStr}`,
    countdownText: `${timeStr} left`,
    progressPercent: hours < 24
      ? Math.min(100, Math.max(hours > 0 ? 3 : 0, Math.round((hours / 24) * 100)))
      : 100,
  };
}

/**
 * Splits raw subtask text into title and optional subtitle/description.
 */
function parseSubtaskContent(rawText: string): { title: string; subtitle?: string } {
  if (!rawText) return { title: '' };
  if (rawText.includes('\n')) {
    const [first, ...rest] = rawText.split('\n');
    return { title: first.trim(), subtitle: rest.join(' ').trim() || undefined };
  }
  const dashMatch = rawText.match(/^(.+?)\s+[-—]\s+(.+)$/);
  if (dashMatch) {
    return { title: dashMatch[1].trim(), subtitle: dashMatch[2].trim() };
  }
  return { title: rawText.trim() };
}

/**
 * SERENE HEARTH PRIMARY FOCUS CARD
 * Visual and behavioral match for Image 1 from docs/Design-Proposal/LaunchPad Productivity Dashboard.png.
 */
export const PrimaryFocusCard: React.FC<PrimaryFocusCardProps> = React.memo(({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onPreviewTask,
  completedTask,
  onCompleteTask,
  onToggleSubtask,
  onOpenTaskEdit,
  clockFormat = '12h',
  className = '',
  showSuggestion = false,
  suggestionCandidate = null,
  onApproveSuggestion,
  onRejectSuggestion,
  onNextSuggestion,
  approvalsCount = 0,
  rejectionsCount = 0,
}) => {
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [procedureSort, setProcedureSort] = useState<ProcedureSort>('procedure');
  const [isProcedureMenuOpen, setIsProcedureMenuOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const desktopProcedureRef = useRef<HTMLDivElement>(null);
  const mobileProcedureRef = useRef<HTMLDivElement>(null);
  const desktopOverflowRef = useRef<HTMLDivElement>(null);
  const mobileOverflowRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isInsideProcedure =
        (desktopProcedureRef.current && desktopProcedureRef.current.contains(target)) ||
        (mobileProcedureRef.current && mobileProcedureRef.current.contains(target));
      if (!isInsideProcedure) {
        setIsProcedureMenuOpen(false);
      }

      const isInsideOverflow =
        (desktopOverflowRef.current && desktopOverflowRef.current.contains(target)) ||
        (mobileOverflowRef.current && mobileOverflowRef.current.contains(target));
      if (!isInsideOverflow) {
        setIsOverflowMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // `tasks` is already scoped to today by the parent (tasksDueToday). Derive pending
  // ranking for active-task selection; no re-filtering by date here.
  const pendingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => !task.isDone)
      .map((task) => ({ task, urgency: calculateTaskUrgency(task.deadline, now) }))
      .sort((a, b) => b.urgency.urgencyWeight - a.urgency.urgencyWeight)
      .map(({ task }) => task);
  }, [tasks]);

  const activeTask = completedTask ?? pendingTasks.find((task) => task.id === selectedTaskId) ?? pendingTasks[0];
  const effectiveTodayTasks = useMemo(() => {
    if (!activeTask || completedTask || pendingTasks.some((task) => task.id === activeTask.id)) return pendingTasks;
    return [activeTask, ...pendingTasks];
  }, [pendingTasks, activeTask, completedTask]);

  const currentTaskIndex = useMemo(() => {
    if (!activeTask || effectiveTodayTasks.length === 0) return -1;
    const idx = effectiveTodayTasks.findIndex((t) => t.id === activeTask.id);
    return idx >= 0 ? idx : 0;
  }, [activeTask, effectiveTodayTasks]);

  const handlePrevTask = () => {
    if (completedTask || effectiveTodayTasks.length <= 1) return;
    const newIndex = currentTaskIndex <= 0 ? effectiveTodayTasks.length - 1 : currentTaskIndex - 1;
    const nextTask = effectiveTodayTasks[newIndex];
    if (nextTask) {
      onSelectTask?.(nextTask.id);
    }
  };

  const handleNextTask = () => {
    if (completedTask || effectiveTodayTasks.length <= 1) return;
    const newIndex = currentTaskIndex >= effectiveTodayTasks.length - 1 ? 0 : currentTaskIndex + 1;
    const nextTask = effectiveTodayTasks[newIndex];
    if (nextTask) {
      onSelectTask?.(nextTask.id);
    }
  };

  const handleSelectTaskIndex = (idx: number) => {
    if (idx < 0 || idx >= effectiveTodayTasks.length) return;
    const nextTask = effectiveTodayTasks[idx];
    if (nextTask) {
      onSelectTask?.(nextTask.id);
      onPreviewTask?.(nextTask.id);
    }
  };

  // Keyboard navigation between today's tasks (Left/Right arrows when not focused on form fields)
  useEffect(() => {
    if (completedTask || effectiveTodayTasks.length <= 1) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrevTask();
      } else if (e.key === 'ArrowRight') {
        handleNextTask();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveTodayTasks, currentTaskIndex, completedTask, onSelectTask, onPreviewTask]);

  // Pure visual task switcher: Chevrons + dynamic capsule dots (No explanatory text)
  const renderVisualTaskSwitcher = () => {
    if (completedTask || effectiveTodayTasks.length <= 1) return null;

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 shadow-2xs select-none"
        role="group"
        aria-label="Today's focus task switcher"
      >
        <button
          type="button"
          onClick={handlePrevTask}
          className="w-5 h-5 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-700 transition-all cursor-pointer focus:outline-none"
          aria-label="Previous task"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 px-0.5">
          {effectiveTodayTasks.map((t, idx) => {
            const isActive = idx === currentTaskIndex;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTaskIndex(idx)}
                className={`transition-all duration-200 cursor-pointer focus:outline-none rounded-full ${
                  isActive
                    ? 'w-4 h-1.5 bg-teal-600 dark:bg-teal-400 shadow-2xs'
                    : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500 hover:scale-125'
                }`}
                aria-label={`Task ${idx + 1}`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNextTask}
          className="w-5 h-5 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-700 transition-all cursor-pointer focus:outline-none"
          aria-label="Next task"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Urgency calculation for active task
  const urgency = useMemo(() => {
    return calculateTaskUrgency(activeTask?.deadline);
  }, [activeTask?.deadline]);

  // Deadline labels and progress
  const deadlineMetrics = useMemo(() => {
    return deriveDeadlineMetrics(urgency);
  }, [urgency]);

  const deadlineDateLabel = useMemo(() => {
    return formatDeadlineDateLabel(urgency.deadlineDate);
  }, [urgency.deadlineDate]);

  const deadlineTimeLabel = useMemo(() => {
    return urgency.deadlineDate ? formatEventTime(urgency.deadlineDate, clockFormat) : '--:--';
  }, [urgency.deadlineDate, clockFormat]);

  // Subtasks list sorting
  const rawSubtasks = useMemo(() => activeTask?.subtasks || [], [activeTask?.subtasks]);

  const sortedSubtasks = useMemo(() => {
    const list = [...rawSubtasks];
    if (procedureSort === 'pending_first') {
      return list.sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1));
    }
    if (procedureSort === 'completed_first') {
      return list.sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? -1 : 1));
    }
    return list; // 'procedure' preserves natural order
  }, [rawSubtasks, procedureSort]);

  // Compute subtask state container with exactly 2 default visible items
  const subtaskState = useMemo(() => {
    return computeSubtaskContainerState(sortedSubtasks, isSubtasksExpanded, 2);
  }, [sortedSubtasks, isSubtasksExpanded]);

  const durationEstimate = formatEventDuration(activeTask?.durationMinutes || 120);

  const handleCopyTitle = () => {
    if (!activeTask) return;
    navigator.clipboard?.writeText(activeTask.text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
    setIsOverflowMenuOpen(false);
  };

  // NO-TASK EMPTY STATE. Once the celebration ran and everything stays cleared,
  // swap in the smart suggestion instead of the static "add a task" message.
  if (!activeTask) {
    return (
      <div
        className={`w-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 shrink-0">
              <Target className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary">
              PRIMARY FOCUS
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Clear Runway
          </span>
        </div>

        {showSuggestion ? (
          <SmartSuggestionCard
            candidate={suggestionCandidate}
            onApprove={(candidate) => onApproveSuggestion?.(candidate)}
            onReject={(candidate) => onRejectSuggestion?.(candidate)}
            onNext={onNextSuggestion}
            approvalsCount={approvalsCount}
            rejectionsCount={rejectionsCount}
          />
        ) : (
          <div className="py-10 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-stone-50/50 dark:bg-stone-900/20">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              No tasks due today
            </h3>
            <p className="text-xs text-serene-text-muted dark:text-serene-text-darkMuted mt-1 max-w-sm mx-auto">
              Everything due today is clear. Open Tasks to view or add upcoming tasks.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Priority Badge Styling
  const priorityColorClass =
    activeTask.priority === 'urgent'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
      : activeTask.priority === 'high'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
      : activeTask.priority === 'medium'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP VIEW (Visible on md and up: hidden md:flex)   */}
      {/* ======================================================== */}
      <div
        inert={Boolean(completedTask)}
        data-focus-completing={completedTask ? true : undefined}
        className={`hidden md:flex flex-col w-full bg-white dark:bg-[#0c1012] border border-serene-border-light dark:border-stone-800/80 rounded-2xl sm:rounded-3xl p-5 shadow-subtle hover:shadow-card transition-all justify-between ${className}`}
      >
        {/* 1. TOP HEADER: PRIMARY FOCUS */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary">
              PRIMARY FOCUS
            </h2>
          </div>
          {renderVisualTaskSwitcher()}
        </div>

        {/* 2. COMPACT TWO-COLUMN TASK CARD */}
        <div className="bg-[#fff5f5] dark:bg-[#1a0e13] border border-rose-100 dark:border-rose-950/60 rounded-2xl p-4 lg:p-5 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 items-stretch">
            {/* Left Column: Badges, Title with Elevated Icon, Duration, Subtask count */}
            <div className="flex flex-col justify-between space-y-3 min-w-0 md:pr-4 lg:pr-5 md:border-r md:border-rose-200/50 dark:md:border-rose-950/80">
              <div className="space-y-2">
                {/* Priority & Urgency Badges Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${priorityColorClass}`}
                  >
                    {(activeTask.priority || 'high').toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
                    {urgency.badgeText.toUpperCase()}
                  </span>
                </div>

                {/* Task Title Row with Elevated Completion/Target Icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onCompleteTask?.(activeTask)}
                    className="group/iconToggle w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-white dark:bg-stone-900/80 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center shrink-0 shadow-2xs hover:border-teal-600 dark:hover:border-teal-500 hover:bg-teal-50/60 dark:hover:bg-teal-950/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    title={activeTask.isDone ? 'Mark as incomplete' : 'Mark task complete'}
                    aria-label={activeTask.isDone ? 'Mark as incomplete' : 'Mark task complete'}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={completedTask ? "opacity-0" : "transition-all duration-150 group-hover/iconToggle:opacity-0 group-hover/iconToggle:scale-75"}>
                        <Target className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500 dark:text-rose-400" />
                      </span>
                      <span className={`absolute inset-0 flex items-center justify-center ${completedTask ? "opacity-100" : "opacity-0 group-hover/iconToggle:opacity-100 scale-75 group-hover/iconToggle:scale-100"} transition-all duration-150`}>
                        <Check className="w-5 h-5 lg:w-6 lg:h-6 text-teal-700 dark:text-teal-400 stroke-[3]" />
                      </span>
                    </div>
                  </button>

                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-serene-text-primary dark:text-white leading-snug min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onPreviewTask?.(activeTask.id)}
                      className="break-words text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                      title="Open in Tasks"
                    >
                      {completedTask ? <s>{activeTask.text}</s> : activeTask.text}
                    </button>
                  </h3>
                </div>

                {/* Multiline Description with safe sanitization */}
                {activeTask.description && (
                  <div className="pl-13">
                    <SafeDescription
                      text={activeTask.description}
                      className="text-xs sm:text-sm text-serene-text-muted dark:text-serene-text-darkMuted"
                    />
                  </div>
                )}
              </div>

              {/* Metadata Pills Row (Removed Focus Task badge per user request) */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {/* Duration pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{durationEstimate} estimated</span>
                </div>

                {/* Subtasks summary pill */}
                {subtaskState.totalCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-stone-800/60">
                    <ListTodo className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {subtaskState.completedCount}/{subtaskState.totalCount} subtasks
                    </span>
                  </div>
                )}

                {/* Fallback resource links when no subtasks exist */}
                {subtaskState.totalCount === 0 && activeTask.attachedUrls && activeTask.attachedUrls.length > 0 && (
                  <TaskLinks links={activeTask.attachedUrls} compact />
                )}
              </div>
            </div>

            {/* Right Column: Deadline info with large typography and progress bar */}
            <div
              className="flex flex-col justify-between min-w-0 md:pl-2 lg:pl-3 h-full"
              data-testid="focus-deadline-desktop"
            >
              <div className="w-full">
                {/* Deadline Label */}
                <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider text-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Deadline</span>
                </div>

                {/* Date & Time Headline */}
                <div className="text-xl lg:text-2xl font-bold text-serene-text-primary dark:text-white leading-tight mt-1">
                  {activeTask.deadline ? (
                    <>
                      {deadlineDateLabel}
                      {deadlineTimeLabel && (
                        <>
                          <span className="mx-2 text-stone-400 dark:text-stone-500 font-normal">•</span>
                          <span>{deadlineTimeLabel}</span>
                        </>
                      )}
                    </>
                  ) : (
                    'No deadline'
                  )}
                </div>
              </div>

              {/* Countdown text and progress bar tightly coupled */}
              <div className="w-full space-y-1.5 pt-3 mt-auto">
                {/* Remaining Time / Countdown - Increased font size and placed directly above progress bar */}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
                    {deadlineMetrics.countdownText}
                  </span>
                </div>

                {/* Visual Deadline Progress Bar (drains backward from full to empty) */}
                <div className="w-full h-2.5 bg-slate-200 dark:bg-stone-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 dark:bg-[#ff5370] rounded-full transition-all duration-300"
                    style={{ width: `${deadlineMetrics.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SUBTASK LIST SECTION (Desktop) */}
        {subtaskState.totalCount > 0 && (
          <div className="mt-4 pt-0.5 space-y-2.5">
            {/* Subtasks Header & Action Toolbar (Chat link pill + Step by step dropdown) */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-serene-text-muted dark:text-stone-400">
                SUBTASKS ({subtaskState.completedCount} / {subtaskState.totalCount})
              </span>

              <div className="flex items-center gap-2">
                {/* Chat / Attached Resource Links */}
                {activeTask.attachedUrls && activeTask.attachedUrls.length > 0 && (
                  <>
                    <TaskLinks links={activeTask.attachedUrls} compact />
                    <span className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-0.5" aria-hidden="true" />
                  </>
                )}

                <div className="relative" ref={desktopProcedureRef}>
                  <button
                    type="button"
                    onClick={() => setIsProcedureMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-stone-300 hover:text-serene-text-primary dark:hover:text-white py-1 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>
                      {procedureSort === 'procedure'
                        ? 'Step by step'
                        : procedureSort === 'pending_first'
                        ? 'Pending First'
                        : 'Completed First'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {/* Procedure Dropdown Menu */}
                  {isProcedureMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-card py-1 z-20 animate-fadeIn text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('procedure');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'procedure' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Step by step</span>
                        {procedureSort === 'procedure' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('pending_first');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'pending_first' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Pending First</span>
                        {procedureSort === 'pending_first' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('completed_first');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'completed_first' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Completed First</span>
                        {procedureSort === 'completed_first' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stable Subtask Container */}
            <div
              className={
                isSubtasksExpanded
                  ? 'space-y-2 max-h-48 overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin'
                  : 'space-y-2 overflow-hidden'
              }
            >
              {subtaskState.visibleSubtasks.map((subtask, index) => {
                const { title, subtitle } = parseSubtaskContent(subtask.text);
                const originalIndex = rawSubtasks.findIndex((s) => s.id === subtask.id);
                const displayStepNumber = originalIndex >= 0 ? originalIndex + 1 : index + 1;

                return (
                  <div
                    key={subtask.id}
                    className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-stone-50/70 dark:bg-[#13191c] border border-stone-200/60 dark:border-stone-800/80 hover:bg-stone-100/80 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-md bg-stone-100 dark:bg-[#1e262a] text-stone-600 dark:text-stone-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {displayStepNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => onToggleSubtask?.(activeTask.id, subtask.id)}
                        className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer focus:outline-none"
                        style={{
                          borderColor: subtask.isDone ? '#0f4c4c' : 'currentColor',
                          backgroundColor: subtask.isDone ? '#0f4c4c' : 'transparent',
                        }}
                        title={subtask.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {subtask.isDone ? (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full opacity-0 hover:opacity-30 bg-current transition-opacity" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs sm:text-sm font-semibold break-words ${
                            subtask.isDone
                              ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                              : 'text-serene-text-primary dark:text-white'
                          }`}
                        >
                          {title}
                        </p>
                        {subtitle && (
                          <p className="text-[11px] text-serene-text-muted dark:text-stone-400 break-words">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-stone-400">
                      <button
                        type="button"
                        onClick={() => onOpenTaskEdit?.(activeTask)}
                        className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title="View subtask details"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSubtask?.(activeTask.id, subtask.id)}
                        className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title="More options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {subtaskState.canExpand && (
              <button
                type="button"
                onClick={() => setIsSubtasksExpanded((prev) => !prev)}
                className="w-full pt-1 pb-0.5 text-center text-xs font-semibold text-serene-text-muted dark:text-serene-text-darkMuted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>
                  {isSubtasksExpanded
                    ? 'Show less subtasks'
                    : `+ ${subtaskState.hiddenCount} more subtasks • Scroll to view`}
                </span>
                {isSubtasksExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}

        {/* 4. FOOTER ACTIONS (Desktop) */}
        <div className="mt-4 pt-3 border-t border-serene-border-light/60 dark:border-stone-800/80 flex items-center justify-between gap-3">
          {/* Left: subtle guidance prompt */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-serene-text-muted dark:text-stone-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Active focus task • Make progress or mark as complete</span>
            </div>
          </div>

          {/* Right: Primary action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onCompleteTask?.(activeTask)}
              className="min-w-[140px] bg-[#0f4c4c] hover:bg-[#0a3535] active:scale-[0.99] dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Mark task as complete"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Complete task</span>
            </button>

            <div className="relative shrink-0" ref={desktopOverflowRef}>
              <button
                type="button"
                onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
                className="p-2.5 rounded-xl border border-serene-border-light dark:border-stone-800 bg-white dark:bg-[#13191c] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isOverflowMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-card py-1.5 z-30 animate-fadeIn text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTaskEdit?.(activeTask);
                      setIsOverflowMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-serene-text-muted" />
                    <span>Edit task details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onCompleteTask?.(activeTask);
                      setIsOverflowMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    <span>{activeTask.isDone ? 'Mark as incomplete' : 'Mark as complete'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTitle}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-serene-text-muted" />
                    <span>{copyFeedback ? 'Copied!' : 'Copy task title'}</span>
                  </button>

                  <div className="my-1 border-t border-serene-border-light/60 dark:border-serene-border-dark/60" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE VIEW (Visible on < md: flex md:hidden)         */}
      {/* Strictly matches mobile inspo design                     */}
      {/* ======================================================== */}
      <div
        inert={Boolean(completedTask)}
        data-focus-completing={completedTask ? true : undefined}
        className={`flex md:hidden flex-col w-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl p-3 sm:p-3.5 shadow-subtle hover:shadow-card transition-all justify-between ${className}`}
      >
        {/* 1. TOP HEADER: PRIMARY FOCUS (Mobile - with Info icon, no duplicate due date) */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 shrink-0">
              <Target className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Primary focus
            </h2>
            <Info className="w-4 h-4 text-stone-400 shrink-0" />
          </div>
          {renderVisualTaskSwitcher()}
        </div>

        {/* 2. ACTIVE TASK HIGHLIGHT CARD (ROUNDED PINK/ROSE-TINTED CONTAINER) */}
        <div className="bg-[#fff5f5] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-colors">
          {/* Row 1: Badges (left) and Compact Quick Actions (right) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${priorityColorClass}`}
              >
                {(activeTask.priority || 'high').toUpperCase()}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                {urgency.badgeText.toUpperCase()}
              </span>
            </div>

            {/* Quick Actions in a compact row: Chevron to open in Tasks + Overflow Menu */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onPreviewTask?.(activeTask.id)}
                className="w-8 h-8 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition-all cursor-pointer shadow-2xs"
                title="Open in Tasks"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="relative shrink-0" ref={mobileOverflowRef}>
                <button
                  type="button"
                  onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
                  className="w-8 h-8 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition-all cursor-pointer shadow-2xs"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isOverflowMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-card py-1.5 z-30 animate-fadeIn text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTaskEdit?.(activeTask);
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-serene-text-muted" />
                      <span>Edit task details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCompleteTask?.(activeTask);
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                    >
                      <Check className="w-4 h-4 text-teal-600" />
                      <span>{activeTask.isDone ? 'Mark as incomplete' : 'Mark as complete'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyTitle}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
                    >
                      <Copy className="w-4 h-4 text-serene-text-muted" />
                      <span>{copyFeedback ? 'Copied!' : 'Copy task title'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Title & Description */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug break-words">
              <button
                type="button"
                onClick={() => onPreviewTask?.(activeTask.id)}
                className="text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                title="Open in Tasks"
              >
                {completedTask ? <s>{activeTask.text}</s> : activeTask.text}
              </button>
            </h3>

            {activeTask.description && (
              <div className="mt-1">
                <SafeDescription
                  text={activeTask.description}
                  className="text-sm sm:text-base text-serene-text-secondary dark:text-serene-text-darkSecondary line-clamp-2"
                />
              </div>
            )}
          </div>

          {/* Row 3: Deadline & Schedule Box (Streamlined dense layout matching reference) */}
          <div className="rounded-xl border border-serene-border-light/80 dark:border-serene-border-dark bg-white p-3.5 dark:bg-serene-surfaceAlt-dark space-y-2.5 shadow-2xs" data-testid="focus-deadline-mobile">
            {/* Top row: Date and Time separated by divider */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{deadlineDateLabel}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-base sm:text-lg font-bold tabular-nums text-serene-text-primary dark:text-serene-text-darkPrimary">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{deadlineTimeLabel}</span>
              </div>
            </div>

            {/* Middle row: Countdown left, Estimate right */}
            <div className="flex items-center justify-between text-sm sm:text-base font-bold">
              <span className="text-rose-600 dark:text-rose-400">
                {deadlineMetrics.countdownText}
              </span>
              {durationEstimate && (
                <button
                  type="button"
                  onClick={() => onOpenTaskEdit?.(activeTask)}
                  className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold hover:underline"
                >
                  <Waves className="w-4 h-4 shrink-0" />
                  <span>{durationEstimate} est.</span>
                </button>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 dark:bg-rose-400 rounded-full transition-all duration-300"
                style={{ width: `${deadlineMetrics.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Row 4: Attached URLs */}
          <TaskLinks links={activeTask.attachedUrls} />

          {/* Row 5: Subtask List Section (Mobile) */}
          {subtaskState.totalCount > 0 && (
            <div className="pt-2.5 border-t border-rose-200/40 dark:border-rose-900/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Subtasks ({subtaskState.completedCount} / {subtaskState.totalCount})
                </span>

                <div className="relative" ref={mobileProcedureRef}>
                  <button
                    type="button"
                    onClick={() => setIsProcedureMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary py-1 px-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>
                      {procedureSort === 'procedure'
                        ? 'Step by step'
                        : procedureSort === 'pending_first'
                        ? 'Pending First'
                        : 'Completed First'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {isProcedureMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-card py-1 z-20 animate-fadeIn text-xs sm:text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('procedure');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'procedure' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Step by step</span>
                        {procedureSort === 'procedure' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('pending_first');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'pending_first' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Pending First</span>
                        {procedureSort === 'pending_first' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProcedureSort('completed_first');
                          setIsProcedureMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                          procedureSort === 'completed_first' ? 'font-bold text-serene-primary dark:text-serene-primary-dark' : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        <span>Completed First</span>
                        {procedureSort === 'completed_first' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={
                  isSubtasksExpanded
                    ? 'space-y-2 max-h-56 overflow-y-auto overscroll-contain pr-1 scrollbar-thin'
                    : 'space-y-2 overflow-hidden'
                }
              >
                {subtaskState.visibleSubtasks.map((subtask) => {
                  const { title, subtitle } = parseSubtaskContent(subtask.text);

                  return (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between gap-2.5 py-2 px-2.5 rounded-xl bg-stone-50/70 dark:bg-stone-900/30 border border-stone-200/60 dark:border-stone-800/50 hover:bg-stone-100/80 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Drag grip dots handle */}
                        <DotsSixVertical className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />

                        {/* Circular Checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleSubtask?.(activeTask.id, subtask.id)}
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer focus:outline-none"
                          style={{
                            borderColor: subtask.isDone ? '#0f4c4c' : 'currentColor',
                            backgroundColor: subtask.isDone ? '#0f4c4c' : 'transparent',
                          }}
                          title={subtask.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {subtask.isDone ? (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full opacity-0 hover:opacity-30 bg-current transition-opacity" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm sm:text-base font-semibold break-words ${
                              subtask.isDone
                                ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                                : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                            }`}
                          >
                            {title}
                          </p>
                          {subtitle && (
                            <p className="text-xs text-serene-text-muted dark:text-serene-text-darkMuted break-words mt-0.5">
                              {subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-stone-400">
                        <button
                          type="button"
                          onClick={() => onOpenTaskEdit?.(activeTask)}
                          className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="View subtask details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSubtask?.(activeTask.id, subtask.id)}
                          className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {subtaskState.canExpand && (
                <button
                  type="button"
                  onClick={() => setIsSubtasksExpanded((prev) => !prev)}
                  className="w-full pt-1.5 pb-0.5 text-center text-xs sm:text-sm font-semibold text-serene-text-muted dark:text-serene-text-darkMuted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {isSubtasksExpanded
                      ? 'Show less subtasks'
                      : `+ ${subtaskState.hiddenCount} more subtasks`}
                  </span>
                  {isSubtasksExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Row 6: Action Button (Mobile) - Full-width CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onCompleteTask?.(activeTask)}
              className="w-full min-h-[46px] bg-[#0f4c4c] hover:bg-[#0a3535] active:scale-[0.99] dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-semibold text-sm sm:text-base py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Mark task as complete"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Complete task</span>
            </button>
          </div>
        </div>
      </div>

    </>
  );
});

PrimaryFocusCard.displayName = 'PrimaryFocusCard';
