import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  RotateCw, 
  Edit3, 
  Clock, 
  Check, 
  Target
} from 'lucide-react';
import { DailyFocus } from '../../types';
import { CALM_QUOTES } from '../../data/seedData';

interface FocusHeroBannerProps {
  dailyFocus: DailyFocus;
  onUpdateDailyFocus: (focus: Partial<DailyFocus>) => void;
  clockFormat: '12h' | '24h';
  showQuotes?: boolean;
}

export const FocusHeroBanner: React.FC<FocusHeroBannerProps> = ({
  dailyFocus,
  onUpdateDailyFocus,
  clockFormat,
  showQuotes = true,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState(dailyFocus.goal);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setGoalText(dailyFocus.goal);
  }, [dailyFocus.goal]);

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

  const handleSaveGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateDailyFocus({ goal: goalText.trim() });
    setIsEditingGoal(false);
  };

  const handleCancelGoal = () => {
    setGoalText(dailyFocus.goal);
    setIsEditingGoal(false);
  };

  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 @2xl:grid-cols-12 gap-3.5 sm:gap-4 animate-fadeIn">
        {/* Primary Focus / Task Card (7 cols on @2xl) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
          dailyFocus.isCompleted
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card'
        } ${showQuotes ? '@2xl:col-span-7' : '@2xl:col-span-12'}`}>
          
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
              {dailyFocus.isCompleted && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Completed
                </span>
              )}
              {!isEditingGoal && (
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(true)}
                  title="Edit Focus Goal"
                  className="p-1 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Task Content / Editable View with Auto-wrapping multiline */}
          <div className="my-1.5 flex-1 flex flex-col justify-center">
            {isEditingGoal ? (
              <form onSubmit={handleSaveGoal} className="space-y-2">
                <textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="What is your single most important priority right now?"
                  autoFocus
                  rows={2}
                  className="w-full text-sm font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark px-3 py-2 rounded-xl border border-serene-primary/40 focus:outline-none focus:ring-2 focus:ring-serene-primary text-serene-text-primary dark:text-serene-text-darkPrimary resize-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveGoal();
                    } else if (e.key === 'Escape') {
                      handleCancelGoal();
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelGoal}
                    className="px-2.5 py-1 text-xs font-medium text-serene-text-muted hover:text-serene-text-primary rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            ) : (
              <div 
                className="flex items-start gap-3 group cursor-pointer"
                onClick={() => onUpdateDailyFocus({ isCompleted: !dailyFocus.isCompleted })}
              >
                <button
                  type="button"
                  className="mt-0.5 shrink-0 transition-transform active:scale-95"
                  title={dailyFocus.isCompleted ? "Mark as in progress" : "Mark as completed"}
                >
                  {dailyFocus.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/40" />
                  ) : (
                    <Circle className="w-5 h-5 text-serene-text-muted group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm sm:text-base font-semibold leading-relaxed break-words whitespace-normal transition-all ${
                      dailyFocus.isCompleted
                        ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted font-normal'
                        : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                    }`}
                  >
                    {dailyFocus.goal || 'Set your primary focus goal for this session...'}
                  </p>
                  <span className="text-[11px] text-serene-text-muted opacity-0 group-hover:opacity-100 transition-opacity block mt-1">
                    Click to {dailyFocus.isCompleted ? 'uncheck' : 'complete'} • Click edit icon to change
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom helper */}
          <div className="mt-2.5 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 flex items-center justify-between text-[11px] text-serene-text-muted">
            <span className="truncate">Anchor your attention before opening any tab.</span>
            <span className="font-mono text-[10px] shrink-0 ml-2">{formattedDate}</span>
          </div>
        </div>

        {/* Mindful Calm Quote & Clock Card (5 cols on @2xl) */}
        {showQuotes && (
          <div className="@2xl:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card transition-all flex flex-col justify-between">
            {/* Header with Quote tag and Live Clock */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Mindful Mindset
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
                <Clock className="w-3 h-3 text-serene-text-muted" />
                <span>{formattedTime}</span>
              </div>
            </div>

          {/* Quote Body with wrap-content for long quotes */}
          <div 
            className="my-1.5 cursor-pointer group flex-1 flex flex-col justify-center"
            onClick={handleNextQuote}
            title="Click to cycle next quote"
          >
            <p className="text-xs sm:text-sm italic leading-relaxed text-serene-text-secondary dark:text-serene-text-darkSecondary break-words whitespace-normal group-hover:text-serene-text-primary dark:group-hover:text-serene-text-darkPrimary transition-colors">
              "{currentQuote.text}"
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-serene-text-muted">
              <span className="font-medium">— {currentQuote.author}</span>
              <button
                type="button"
                onClick={handleNextQuote}
                className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:text-serene-primary dark:hover:text-serene-primary-dark transition-all text-[10px]"
              >
                <span>Cycle quote</span>
                <RotateCw className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Calming reassurance footer */}
          <div className="mt-2.5 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 text-[11px] text-serene-text-muted flex items-center justify-between">
            <span>Take a conscious breath.</span>
            <span className="text-[10px]">✨ Focus Mode</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
