import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Target,
  Calendar,
  Clock,
  Flame,
  Play,
  Pause,
  Square,
  MoreHorizontal,
  MoreVertical,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  ListTodo,
  ExternalLink,
  Timer,
  Sparkles,
  Edit3,
  Copy,
  CalendarDays,
} from 'lucide-react';
import { QuickNote } from '../../types';
import { FocusTimerState, elapsedSeconds, formatElapsed } from '../../utils/focusTimer';
import {
  calculateTaskUrgency,
  computeSubtaskContainerState,
  TaskUrgencyInfo,
} from '../../utils/taskUrgency';
import { SafeDescription } from '../Common/SafeDescription';
import { formatEventTime, formatEventDuration } from '../../utils/calendarFormatting';

export interface PrimaryFocusCardProps {
  tasks: QuickNote[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
  onToggleTask?: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenTaskEdit?: (task: QuickNote) => void;
  onOpenCalendarSettings?: () => void;
  clockFormat: '12h' | '24h';
  className?: string;
  onStartTask?: (task: QuickNote) => void;
  focusTimer?: FocusTimerState | null;
  onTimerStart?: (taskId: string) => void;
  onTimerPause?: () => void;
  onTimerResume?: () => void;
  onTimerEnd?: () => void;
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
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return {
      headerBadge: `Overdue by ${timeStr}`,
      countdownText: `${timeStr} overdue`,
      progressPercent: 100,
    };
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours < 24) {
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return {
      headerBadge: `Due in ${timeStr}`,
      countdownText: `${timeStr} left`,
      progressPercent: Math.min(100, Math.max(12, Math.round((1 - hours / 24) * 100))),
    };
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return {
    headerBadge: `Due in ${days}d ${remHours}h`,
    countdownText: `${days}d ${remHours}h left`,
    progressPercent: days < 3 ? 45 : days < 14 ? 25 : 10,
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
export const PrimaryFocusCard: React.FC<PrimaryFocusCardProps> = ({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onToggleTask,
  onToggleSubtask,
  onOpenTaskEdit,
  onOpenCalendarSettings,
  clockFormat = '12h',
  className = '',
  onStartTask,
  focusTimer = null,
  onTimerStart,
  onTimerResume,
  onTimerPause,
  onTimerEnd,
}) => {
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [procedureSort, setProcedureSort] = useState<ProcedureSort>('procedure');
  const [isProcedureMenuOpen, setIsProcedureMenuOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const procedureMenuRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (procedureMenuRef.current && !procedureMenuRef.current.contains(e.target as Node)) {
        setIsProcedureMenuOpen(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setIsOverflowMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active task:
  // 1. Explicitly selectedTaskId if exists
  // 2. Highest urgency pending task
  // 3. Fallback to first available task
  const activeTask = useMemo(() => {
    if (selectedTaskId) {
      const matched = tasks.find((t) => t.id === selectedTaskId);
      if (matched) return matched;
    }
    const pendingTasks = tasks.filter((t) => !t.isDone);
    if (pendingTasks.length === 0) {
      return tasks[0] || null;
    }
    // Sort pending tasks by urgency score descending
    const sorted = [...pendingTasks].sort((a, b) => {
      const urgA = calculateTaskUrgency(a.deadline).urgencyWeight;
      const urgB = calculateTaskUrgency(b.deadline).urgencyWeight;
      return urgB - urgA;
    });
    return sorted[0];
  }, [tasks, selectedTaskId]);

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

  const isCalendarTask = activeTask?.source === 'google_calendar';
  const durationEstimate = formatEventDuration(activeTask?.durationMinutes || 120);

  // Live timer readout for the active task (1s tick only while running).
  const isTimerOnThisTask = Boolean(focusTimer && activeTask && focusTimer.taskId === activeTask.id);
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    if (!focusTimer?.running) return;
    const id = setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [focusTimer?.running, focusTimer?.taskId]);
  const liveElapsed = focusTimer && activeTask && focusTimer.taskId === activeTask.id
    ? elapsedSeconds(focusTimer)
    : 0;
  const bankedSeconds = activeTask?.timeSpentSeconds || 0;

  // Handlers
  const handleStartNow = () => {
    if (!activeTask) return;
    // Timer owns the button when wired; otherwise fall back to selection.
    if (onTimerStart && onTimerPause && onTimerResume) {
      if (isTimerOnThisTask) {
        if (focusTimer?.running) onTimerPause();
        else onTimerResume();
      } else {
        onTimerStart(activeTask.id);
      }
      return;
    }
    if (onStartTask) {
      onStartTask(activeTask);
    } else if (onSelectTask) {
      onSelectTask(activeTask.id);
    }
  };

  const handleCopyTitle = () => {
    if (!activeTask) return;
    navigator.clipboard?.writeText(activeTask.text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
    setIsOverflowMenuOpen(false);
  };

  // EMPTY STATE (No tasks available)
  if (!activeTask) {
    return (
      <div
        className={`w-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-5 sm:p-6 shadow-subtle ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
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

        <div className="py-10 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-stone-50/50 dark:bg-stone-900/20">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
            No active focus task selected
          </h3>
          <p className="text-xs text-serene-text-muted dark:text-serene-text-darkMuted mt-1 max-w-sm mx-auto">
            Add a new action item or select a task from your queue to activate your prime objective.
          </p>
        </div>
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
    <div
      className={`w-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${className}`}
    >
      {/* 1. TOP HEADER: PRIMARY FOCUS & DUE BADGE */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 shrink-0">
            <Target className="w-4 h-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary">
            PRIMARY FOCUS
          </h2>
        </div>

        {/* Due in Xh Ym badge on right (with fire icon) */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 shadow-2xs">
          <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
          <span>{deadlineMetrics.headerBadge}</span>
        </div>
      </div>

      {/* 2. ACTIVE TASK HIGHLIGHT CARD (ROUNDED PINK/ROSE-TINTED CONTAINER) */}
      <div className="bg-[#fff5f5] dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-3.5 sm:p-4.5 space-y-3.5 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          {/* Left section: Icon box + Badges + Title + Description */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
            {/* Task Icon in elevated rounded container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-stone-900/80 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center shrink-0 shadow-2xs">
              {isCalendarTask ? (
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
              ) : (
                <Target className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityColorClass}`}
                >
                  {(activeTask.priority || 'high').toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {urgency.badgeText.toUpperCase()}
                </span>
              </div>

              {/* Task Title */}
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug truncate">
                {activeTask.text}
              </h3>

              {/* Multiline Description with safe sanitization */}
              {activeTask.description && (
                <div className="mt-0.5">
                  <SafeDescription
                    text={activeTask.description}
                    className="text-xs sm:text-sm text-serene-text-muted dark:text-serene-text-darkMuted"
                    lineClamp={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right section: Deadline Block with visual progress bar */}
          <div className="w-full sm:w-auto sm:pl-4 sm:border-l border-rose-200/60 dark:border-rose-900/40 flex sm:flex-col justify-between sm:justify-center items-start sm:items-start shrink-0 min-w-[125px] pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-200/50">
            <div>
              <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 mb-0.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold">Deadline</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight">
                <div>{deadlineDateLabel}</div>
                <div>{deadlineTimeLabel}</div>
              </div>
              <div className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted mt-0.5">
                {deadlineMetrics.countdownText}
              </div>
            </div>

            {/* Visual Deadline Progress Bar */}
            <div className="w-24 sm:w-full h-1.5 bg-rose-200/80 dark:bg-rose-950/80 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${deadlineMetrics.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metadata Pills Row */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Source pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/40">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{isCalendarTask ? 'Calendar Event' : 'Focus Task'}</span>
          </div>

          {/* Duration pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/40">
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <span>{durationEstimate} estimated</span>
          </div>

          {/* Subtasks count pill */}
          {subtaskState.totalCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-900/40">
              <ListTodo className="w-3.5 h-3.5 shrink-0" />
              <span>
                {subtaskState.completedCount}/{subtaskState.totalCount} subtasks
              </span>
            </div>
          )}

          {/* External / Calendar Link pill */}
          {isCalendarTask ? (
            <button
              onClick={onOpenCalendarSettings}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/40 hover:underline transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Google Calendar</span>
            </button>
          ) : activeTask.attachedUrls && activeTask.attachedUrls.length > 0 ? (
            <a
              href={activeTask.attachedUrls[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/40 hover:underline transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>{activeTask.attachedUrls[0].title || 'Reference Link'}</span>
            </a>
          ) : null}
        </div>
      </div>

      {/* 3. SUBTASK LIST SECTION */}
      {subtaskState.totalCount > 0 && (
        <div className="mt-4 pt-1 space-y-2.5">
        {/* Subtasks Header & By Procedure Dropdown */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-serene-text-muted dark:text-serene-text-darkMuted">
            SUBTASKS ({subtaskState.completedCount} / {subtaskState.totalCount})
          </span>

          <div className="relative" ref={procedureMenuRef}>
            <button
              type="button"
              onClick={() => setIsProcedureMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary py-1 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>
                {procedureSort === 'procedure'
                  ? 'By Procedure'
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
                  <span>By Procedure</span>
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

        {/* Stable Subtask Container: Exactly 2 visible by default, scrollable with max-h-48 when expanded */}
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
                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-stone-50/70 dark:bg-stone-900/30 border border-stone-200/60 dark:border-stone-800/50 hover:bg-stone-100/80 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Step number badge */}
                    <span className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-xs font-semibold shrink-0">
                      {displayStepNumber}
                    </span>

                    {/* Functional Circular Checkbox */}
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

                    {/* Title & multiline description */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          subtask.isDone
                            ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                            : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                        }`}
                      >
                        {title}
                      </p>
                      {subtitle && (
                        <p className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions on right */}
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

        {/* Stable Expansion Toggle Button */}
        {subtaskState.canExpand && (
          <button
            type="button"
            onClick={() => setIsSubtasksExpanded((prev) => !prev)}
            className="w-full pt-1 pb-0.5 text-center text-xs font-semibold text-serene-text-muted dark:text-serene-text-darkMuted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors flex items-center justify-center gap-1.5"
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

      {/* 4. FOOTER ACTIONS: timer start/pause, end & log, '...' Overflow Menu */}
      <div className="mt-5 pt-3 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: timer status readout or subtle guidance prompt */}
        <div className="flex items-center gap-2 min-w-0">
          {(isTimerOnThisTask || bankedSeconds > 0) ? (
            <div className="flex items-center gap-1.5 text-xs text-serene-text-muted dark:text-serene-text-darkMuted" role="status" aria-live="polite">
              <Timer className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
              <span className="font-mono font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {formatElapsed(liveElapsed)}
              </span>
              <span className="truncate">
                actual{bankedSeconds > 0 && !isTimerOnThisTask ? ` · ${formatElapsed(bankedSeconds)} logged` : bankedSeconds > 0 ? ` · ${formatElapsed(bankedSeconds)} logged before` : ''}
                {!focusTimer?.running && isTimerOnThisTask ? ' · paused' : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-serene-text-muted dark:text-serene-text-darkMuted">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Active focus target · launch the timer to log deep work</span>
            </div>
          )}
        </div>

        {/* Right: Primary action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
          {/* Timer primary button: Start / Pause / Resume with live elapsed */}
          <button
            type="button"
            onClick={handleStartNow}
            className="flex-1 sm:flex-initial sm:min-w-[150px] bg-[#0f4c4c] hover:bg-[#0a3535] active:scale-[0.99] dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isTimerOnThisTask && focusTimer?.running ? (
              <Pause className="w-4 h-4 fill-current shrink-0" />
            ) : (
              <Play className="w-4 h-4 fill-current shrink-0" />
            )}
            <span>
              {isTimerOnThisTask
                ? focusTimer?.running
                  ? `Pause · ${formatElapsed(liveElapsed)}`
                  : `Resume · ${formatElapsed(liveElapsed)}`
                : 'Start now'}
            </span>
          </button>

          {/* End & log button, only while this task is timed */}
          {isTimerOnThisTask && onTimerEnd && (
            <button
              type="button"
              onClick={onTimerEnd}
              title="Stop timer and log actual time to this task"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>End</span>
            </button>
          )}

          {/* '...' overflow menu */}
          <div className="relative shrink-0" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
            className="p-2.5 rounded-xl border border-serene-border-light dark:border-serene-border-dark bg-white dark:bg-serene-surface-dark hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Overflow Popup Menu */}
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
                  onToggleTask?.(activeTask.id);
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

              <button
                type="button"
                onClick={() => {
                  onOpenCalendarSettings?.();
                  setIsOverflowMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-serene-text-primary dark:text-serene-text-darkPrimary transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5 text-serene-text-muted" />
                <span>Calendar Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
