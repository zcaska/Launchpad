import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Circle, 
  Sparkles, 
  Clock, 
  Target,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  RotateCw
} from 'lucide-react';
import { DailyFocus, QuickNote } from '../../types';
import { CALM_QUOTES } from '../../data/seedData';
import { TimeRadarWidget } from './TimeRadarWidget';
import { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';
import { fadeScaleVariants } from '../../utils/motion';

interface FocusHeroBannerProps {
  dailyFocus?: DailyFocus;
  onUpdateDailyFocus?: (focus: Partial<DailyFocus>) => void;
  clockFormat: '12h' | '24h';
  showQuotes?: boolean;
  tasks?: QuickNote[];
  onToggleTask?: (taskId: string) => void;
  onOpenTasksScreen?: () => void;
  timeRemaining?: DayTimeRemaining;
  taskLoad?: TaskLoadSummary;
  buffer?: BufferSummary;
  endHour?: number;
}

export const FocusHeroBanner: React.FC<FocusHeroBannerProps> = ({
  dailyFocus,
  clockFormat,
  showQuotes = true,
  tasks = [],
  onToggleTask,
  onOpenTasksScreen,
  timeRemaining,
  taskLoad,
  buffer,
  endHour,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Pending tasks filter
  const pendingTasks = tasks.filter((t) => !t.isDone);

  // Reset or constrain currentTaskIndex when pendingTasks count changes
  useEffect(() => {
    if (pendingTasks.length === 0) {
      setCurrentTaskIndex(0);
    } else if (currentTaskIndex >= pendingTasks.length) {
      setCurrentTaskIndex(pendingTasks.length - 1);
    }
  }, [pendingTasks.length, currentTaskIndex]);

  const activeTask = pendingTasks[currentTaskIndex] || null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNextQuote = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuoteIndex((prev) => (prev + 1) % CALM_QUOTES.length);
  };

  const currentQuote = CALM_QUOTES[quoteIndex];

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handlePrevTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTaskIndex((prev) => (prev > 0 ? prev - 1 : pendingTasks.length - 1));
  };

  const handleNextTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTaskIndex((prev) => (prev < pendingTasks.length - 1 ? prev + 1 : 0));
  };

  const hasTimeRadar = Boolean(timeRemaining && taskLoad && buffer && endHour !== undefined);

  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 @2xl:grid-cols-12 gap-3.5 sm:gap-4 animate-fadeIn">
        {/* Primary Focus / Task Card (7 cols on @2xl if Time Radar present, else 12) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
          dailyFocus?.isCompleted && pendingTasks.length === 0
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card'
        } ${hasTimeRadar ? '@2xl:col-span-7' : '@2xl:col-span-12'}`}>
          
          {/* Top meta row */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark shrink-0">
                <Target className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-serene-primary dark:text-serene-primary-dark">
                Primary Focus & Intention
              </span>
            </div>

            <div className="flex items-center gap-2">
              {pendingTasks.length > 0 ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {pendingTasks.length} {pendingTasks.length === 1 ? 'task' : 'tasks'} pending
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  All Clear
                </span>
              )}
            </div>
          </div>



          {/* Pending Tasks Section inside Card */}
          <div className="my-1.5 flex-1 flex flex-col justify-center">
            {activeTask ? (
              <div className="p-3 rounded-xl bg-serene-surfaceAlt-light/70 dark:bg-serene-surfaceAlt-dark/70 border border-serene-border-light/80 dark:border-serene-border-dark/80 space-y-2">
                {/* Task Header & Carousel Controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-serene-primary dark:text-serene-primary-dark flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      Pending Task {pendingTasks.length > 1 ? `(${currentTaskIndex + 1}/${pendingTasks.length})` : ''}
                    </span>
                    {activeTask.priority && (
                      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                        activeTask.priority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : activeTask.priority === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {activeTask.priority}
                      </span>
                    )}
                  </div>

                  {/* Cycling Controls when multiple pending tasks */}
                  {pendingTasks.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevTask}
                        title="Previous Task"
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTask}
                        title="Next Task"
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Task Title & Checkbox */}
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleTask && onToggleTask(activeTask.id)}
                    className="mt-0.5 shrink-0 transition-transform active:scale-95"
                    title="Mark task done"
                  >
                    <Circle className="w-4 h-4 text-serene-text-muted hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary break-words leading-snug">
                      {activeTask.text}
                    </p>
                  </div>
                </div>

                {/* Badges row: Estimated Time, Subtasks indicator, Attached URLs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {/* Estimated Time badge */}
                  {activeTask.durationMinutes && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                      ⏱️ {activeTask.durationMinutes}m
                    </span>
                  )}

                  {/* Subtasks indicator */}
                  {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                      {activeTask.subtasks.filter((s) => s.isDone).length}/{activeTask.subtasks.length} subtasks
                    </span>
                  )}

                  {/* Attached URLs badges */}
                  {activeTask.attachedUrls && activeTask.attachedUrls.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-primary-dark transition-colors shadow-2xs hover:border-serene-primary/40 truncate max-w-[180px]"
                      title={link.url}
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{link.title || link.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ))}
                </div>

                {/* View all pending tasks button */}
                {onOpenTasksScreen && (
                  <div className="pt-1 flex items-center justify-between border-t border-serene-border-light/40 dark:border-serene-border-dark/40">
                    <button
                      type="button"
                      onClick={onOpenTasksScreen}
                      className="text-[11px] font-medium text-serene-primary dark:text-serene-primary-dark hover:underline flex items-center gap-1"
                    >
                      <span>View all {pendingTasks.length} pending tasks</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-serene-text-muted">Click circle to mark done</span>
                  </div>
                )}
              </div>
            ) : (
              /* Zero pending tasks state */
              <div className="p-3 rounded-xl bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 border border-dashed border-serene-border-light dark:border-serene-border-dark flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    All tasks clear! Ready for focused work.
                  </span>
                </div>
                {onOpenTasksScreen && (
                  <button
                    type="button"
                    onClick={onOpenTasksScreen}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark bg-serene-primary-soft dark:bg-serene-primary/20 rounded-lg hover:bg-serene-primary/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create task</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom helper */}
          <div className="mt-2.5 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 flex items-center justify-between text-[11px] text-serene-text-muted">
            <span className="truncate">Anchor your attention before opening any tab.</span>
            <span className="font-mono text-[10px] shrink-0 ml-2">{formattedDate}</span>
          </div>
        </div>

        {/* Time Radar Widget in former quote space (5 cols on @2xl) */}
        {hasTimeRadar && timeRemaining && taskLoad && buffer && endHour !== undefined && (
          <div className="@2xl:col-span-5 flex flex-col min-w-0">
            <TimeRadarWidget
              timeRemaining={timeRemaining}
              taskLoad={taskLoad}
              buffer={buffer}
              endHour={endHour}
              onOpenTasks={onOpenTasksScreen || (() => {})}
            />
          </div>
        )}
      </div>

      {/* Mindful Calm Quote Horizontal Banner (less space, full horizontal view) */}
      {showQuotes && (
        <div 
          onClick={handleNextQuote}
          className="mt-3 sm:mt-3.5 group cursor-pointer px-4 py-2.5 sm:px-4.5 sm:py-2.5 rounded-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
          title="Click to cycle next quote"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
              Mindful Mindset
            </span>
            <span className="text-serene-border-light dark:text-serene-border-dark hidden sm:inline">•</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                variants={fadeScaleVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary truncate group-hover:text-serene-text-primary dark:group-hover:text-serene-text-darkPrimary transition-colors flex-1 min-w-0"
              >
                <span className="italic font-normal">"{currentQuote.text}"</span>
                <span className="font-semibold text-serene-text-muted ml-2">— {currentQuote.author}</span>
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-serene-text-muted">
            <button
              type="button"
              onClick={handleNextQuote}
              className="inline-flex items-center gap-1 text-[11px] hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors"
            >
              <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline text-[10px]">Cycle quote</span>
            </button>

            <span className="text-serene-border-light dark:text-serene-border-dark">•</span>

            <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
              <Clock className="w-3 h-3 text-serene-text-muted" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
