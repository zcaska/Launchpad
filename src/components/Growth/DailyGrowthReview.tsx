import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  CaretLeft,
  CaretRight,
  FloppyDisk,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  PaperPlaneRight,
  ChatCircleDots,
  Info,
  ListChecks,
  Sparkle
} from '@phosphor-icons/react';
import { useDialogFocusTrap } from './useDialogFocusTrap';
import {
  REVIEW_QUESTIONS,
  CompletedTaskSnapshot,
  ReviewDraft,
  ReflectionSnapshot,
  ReviewValidationResult,
  validateDailyReview
} from '../../utils/dailyReview';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DailyGrowthReviewProps {
  dayKey: string;
  initialDraft?: ReviewDraft | null;
  completedTasks: CompletedTaskSnapshot[];
  onSaveDraft: (draft: ReviewDraft) => Promise<void>;
  onSubmit: (reflection: ReflectionSnapshot) => Promise<void>;
  onClose: () => void;
}

export const DailyGrowthReview: React.FC<DailyGrowthReviewProps> = ({
  dayKey,
  initialDraft,
  completedTasks = [],
  onSaveDraft,
  onSubmit,
  onClose
}) => {
  // Current active question index (0 to 5) or 6 for the final review/submit summary step
  const [activeStep, setActiveStep] = useState<number>(0);

  // Six conversational answers
  const [answers, setAnswers] = useState<[string, string, string, string, string, string]>(() => {
    if (initialDraft?.answers && Array.isArray(initialDraft.answers)) {
      return [
        initialDraft.answers[0] || '',
        initialDraft.answers[1] || '',
        initialDraft.answers[2] || '',
        initialDraft.answers[3] || '',
        initialDraft.answers[4] || '',
        initialDraft.answers[5] || ''
      ];
    }
    return ['', '', '', '', '', ''];
  });

  // Track save status and error state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Ref tracking latest answers and save states to prevent race conditions during debounce
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const lastSavedAnswersRef = useRef<string>(JSON.stringify(answers));
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize initialDraft if it arrives or changes
  useEffect(() => {
    if (initialDraft?.answers && Array.isArray(initialDraft.answers)) {
      const incoming: [string, string, string, string, string, string] = [
        initialDraft.answers[0] || '',
        initialDraft.answers[1] || '',
        initialDraft.answers[2] || '',
        initialDraft.answers[3] || '',
        initialDraft.answers[4] || '',
        initialDraft.answers[5] || ''
      ];
      // Only overwrite if different and user hasn't typed uncommitted changes
      if (!dirtyRef.current && JSON.stringify(incoming) !== JSON.stringify(answersRef.current)) {
        setAnswers(incoming);
        answersRef.current = incoming;
        lastSavedAnswersRef.current = JSON.stringify(incoming);
      }
    }
  }, [initialDraft]);

  // Pure validation memoized
  const validation: ReviewValidationResult = useMemo(() => {
    return validateDailyReview(answers);
  }, [answers]);

  // Execute draft save with queued retry handling
  const performSave = useCallback((): Promise<void> => {
    const run = async () => {
      while (true) {
        const snapshot = [...answersRef.current] as [string, string, string, string, string, string];
        const key = JSON.stringify(snapshot);
        if (key === lastSavedAnswersRef.current) { setSaveStatus('saved'); dirtyRef.current = false; return; }
        setSaveStatus('saving'); setSaveError(null);
        try { await onSaveDraft({ dayKey, answers: snapshot }); }
        catch (err: any) { setSaveStatus('error'); setSaveError(err?.message || 'Failed to save draft. Retry or keep this editor open.'); throw err; }
        lastSavedAnswersRef.current = key;
        if (key === JSON.stringify(answersRef.current)) { dirtyRef.current = false; setSaveStatus('saved'); return; }
      }
    };
    const queued = saveQueueRef.current.then(run, run);
    saveQueueRef.current = queued.catch(() => undefined);
    return queued;
  }, [dayKey, onSaveDraft]);

  // Debounced auto-save on answer edits
  const handleAnswerChange = (index: number, val: string) => {
    if (submittingRef.current || isSubmitting) return;
    // A new edit invalidates any stale "Saved" indicator until the debounced save completes.
    setSaveStatus('idle');
    setSaveError(null);
    setAnswers(prev => {
      const next = [...prev] as [string, string, string, string, string, string];
      next[index] = val;
      answersRef.current = next;
      dirtyRef.current = true;
      return next;
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void performSave().catch(() => undefined);
    }, 800);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Manual save trigger (e.g. Retry button)
  const handleManualSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    void performSave().catch(() => undefined);
  };

  // Submit action
  const handleSubmit = async () => {
    if (submittingRef.current || !validation.canSubmit) return;
    submittingRef.current = true;

    setIsSubmitting(true);
    setSubmitError(null);

    const reflectionSnapshot: ReflectionSnapshot = {
      dayKey,
      answers: [...answers],
      wordCount: validation.wordCount,
      eligible: validation.eligible,
      issues: validation.issues,
      submittedAt: new Date().toISOString(),
      completedTaskIds: completedTasks.map(t => t.id)
    };

    try {
      // Flush draft save first to ensure storage consistency
      await performSave();
      await onSubmit(reflectionSnapshot);
      // Parent handles durable idempotency and award settlement
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit daily reflection. Please retry.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(async () => {
    if (submittingRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    try { await performSave(); onClose(); }
    catch { /* Keep editor open so the user can retry or retain the text. */ }
  }, [performSave, onClose]);

  // Dialog a11y: focus trap with restore + Escape (awaited draft flush via
  // handleClose; a failed save keeps the dirty editor open).
  const trapRef = useDialogFocusTrap(true, () => { void handleClose(); });

  return (
    <div
      data-review-dialog="true"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Growth Reflection"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 outline-none focus:outline-none"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ChatCircleDots size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Daily Growth Review
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {dayKey}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                A quiet moment to look back honestly on your day — saved only on this device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save indicator */}
            <div className="flex items-center text-xs">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                  <ArrowClockwise size={14} className="animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle size={14} weight="fill" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  type="button"
                  onClick={handleManualSave}
                  title={saveError || 'Save failed'}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 underline font-medium"
                >
                  <WarningCircle size={14} weight="bold" />
                  Save error (retry)
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close reflection modal"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Completed Task Snapshots Reference Strip */}
        <div className="bg-slate-950/60 px-5 py-2.5 border-b border-slate-800/80 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              <ListChecks size={15} className="text-indigo-400" />
              Marked Completed ({completedTasks.length}) — no completion timestamps
            </span>
            <span className="text-[11px] text-amber-400/90 font-mono">
              Self-Reported • Not Verified
            </span>
          </div>

          {completedTasks.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">
              No tasks marked completed today. You can still complete your daily reflection.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/70 border border-slate-700/60 text-slate-200"
                >
                  <CheckCircle size={12} weight="fill" className="text-emerald-400" />
                  <span className="truncate max-w-[160px]" title={task.title}>
                    {task.title}
                  </span>
                  {typeof task.estimatedMinutes === 'number' && task.estimatedMinutes > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {task.estimatedMinutes}m
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress Stepper Bar */}
        <nav aria-label="Reflection Questions Progress" className="bg-slate-900 px-5 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {REVIEW_QUESTIONS.map((q, idx) => {
              const isDone = answers[idx].trim().length > 0;
              const isActive = activeStep === idx;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`flex-1 flex flex-col items-center gap-1 p-1 rounded transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-indigo-400 font-semibold'
                      : 'hover:bg-slate-800/50 text-slate-400'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isDone
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-[11px] truncate max-w-[80px]">
                    {q.title}
                  </span>
                </button>
              );
            })}
            {/* Step 7: Summary & Submit */}
            <button
              type="button"
              onClick={() => setActiveStep(6)}
              className={`flex-1 flex flex-col items-center gap-1 p-1 rounded transition-colors ${
                activeStep === 6
                  ? 'bg-slate-800 text-indigo-400 font-semibold'
                  : 'hover:bg-slate-800/50 text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  activeStep === 6
                    ? 'bg-indigo-600 text-white'
                    : validation.canSubmit
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                ✓
              </div>
              <span className="hidden sm:inline text-[11px] truncate max-w-[80px]">
                Submit
              </span>
            </button>
          </div>
        </nav>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeStep < 6 ? (
            /* Individual Question Input */
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Question {activeStep + 1} of 6 • {REVIEW_QUESTIONS[activeStep].title}
                  </span>
                  <h3 className="text-base font-medium text-slate-100 mt-1">
                    {REVIEW_QUESTIONS[activeStep].prompt}
                  </h3>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={answers[activeStep]}
                  onChange={e => handleAnswerChange(activeStep, e.target.value)}
                  placeholder={REVIEW_QUESTIONS[activeStep].placeholder}
                  aria-label={`Question ${activeStep + 1}: ${REVIEW_QUESTIONS[activeStep].prompt}`}
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-500 text-sm leading-relaxed resize-none transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Words in this answer: {answers[activeStep].trim().split(/\s+/).filter(Boolean).length}
                </span>
                <span>
                  Total substantive words: {validation.wordCount} / 200
                </span>
              </div>
            </div>
          ) : (
            /* Summary & Final Review View */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                  <span>Reflection Summary</span>
                  <span className="text-xs font-mono text-indigo-400">
                    {validation.wordCount} Substantive Words
                  </span>
                </h3>

                {/* Milestone eligibility banner */}
                {validation.eligible ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Sparkle size={18} weight="fill" className="shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold">Daily review milestone criteria met</p>
                      <p className="text-[11px] text-emerald-400/90">
                        All six prompts are substantively answered (≥200 words without repetitive filler).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <Info size={18} weight="fill" className="shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Shorter Reflection</p>
                      <p className="text-[11px] text-amber-300/90">
                        {validation.canSubmit
                          ? 'All six questions are answered. 200 substantive words meet the review milestone criteria.'
                          : 'Please provide at least a brief answer to all six questions before submitting.'}
                      </p>
                      {validation.issues.length > 0 && (
                        <ul className="list-disc pl-4 text-[11px] text-amber-200/80 space-y-0.5 mt-1">
                          {validation.issues.map((iss, i) => (
                            <li key={i}>{iss}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Prompt Answer Previews */}
                <div className="space-y-2.5 pt-2">
                  {REVIEW_QUESTIONS.map((q, idx) => (
                    <div
                      key={q.key}
                      onClick={() => setActiveStep(idx)}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                        <span>
                          {idx + 1}. {q.title}
                        </span>
                        <span className="text-[11px] text-slate-500">Edit</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {answers[idx].trim() || (
                          <span className="text-rose-400/80 italic font-sans">[Unanswered]</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Truthfulness & Honest Limitations Text */}
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <p>{validation.limitations}</p>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <WarningCircle size={16} weight="bold" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <footer className="px-5 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div>
            {activeStep > 0 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <CaretLeft size={14} />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <FloppyDisk size={14} />
              Save Draft
            </button>

            {activeStep < 6 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Next
                <CaretRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !validation.canSubmit}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                  !validation.canSubmit || isSubmitting
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : validation.eligible
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <ArrowClockwise size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PaperPlaneRight size={14} weight="fill" />
                    {validation.eligible ? 'Submit Review (milestone criteria met)' : 'Submit Reflection'}
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
