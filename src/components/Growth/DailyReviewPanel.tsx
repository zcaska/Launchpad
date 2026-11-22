import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CalendarCheck,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Lock,
} from '@phosphor-icons/react';
import { DailyGrowthReview } from './DailyGrowthReview';
import { useDialogFocusTrap } from './useDialogFocusTrap';
import { REVIEW_QUESTIONS, CompletedTaskSnapshot, ReflectionSnapshot, ReviewDraft } from '../../utils/dailyReview';
import {
  getLocalDayKey,
  getDefaultReviewSession,
  LocalReviewSession,
  SubmitOutcome,
} from '../../services/reviews/localReviewService';

/** Outcome of a confirmed permanent reflection commit (replays are retries with identical content). */
export type ReviewSubmitConfirmedOutcome = Extract<SubmitOutcome, { status: 'committed' | 'replayed' }>['status'];

export interface DailyReviewPanelProps {
  /** Tasks currently marked completed (isDone) in the app; no timestamp proof. */
  completedTasks: CompletedTaskSnapshot[];
  onClose: () => void;
  /** Fired ONLY on a confirmed permanent commit (or identical-content replay); never on failed saves. */
  onSubmitted?: (dayKey: string, outcome: ReviewSubmitConfirmedOutcome) => void;
}

type PanelPhase = 'loading' | 'editing' | 'submitted' | 'conflict' | 'error';

interface SubmitConflict {
  committedAnswers: readonly string[];
  committedSubmittedAt: string;
  attempted: ReflectionSnapshot;
}

/**
 * Manual daily review entry panel. Mounts the existing DailyGrowthReview
 * conversational component and persists everything through the local-only
 * review database session (no legacy localStorage, no XP awards, no network).
 */
export const DailyReviewPanel: React.FC<DailyReviewPanelProps> = ({
  completedTasks,
  onClose,
  onSubmitted,
}) => {
  // Resolved once per mount; the panel is manual-trigger only and covers the
  // local calendar day at the moment it is opened.
  const [dayKey] = useState<string>(() => getLocalDayKey());
  const [session, setSession] = useState<LocalReviewSession | null>(null);
  const [phase, setPhase] = useState<PanelPhase>('loading');
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [reflection, setReflection] = useState<ReflectionSnapshot | null>(null);
  const [conflict, setConflict] = useState<SubmitConflict | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setLoadError(null);
    (async () => {
      try {
        const reviewSession = await getDefaultReviewSession();
        if (cancelled) return;
        setSession(reviewSession);
        // Re-opening re-seeds the session-held draft revision for this day.
        const state = await reviewSession.loadReviewState(dayKey);
        if (cancelled) return;
        // Permanent reflection exists: show saved answers, never overwrite.
        if (state.reflection) {
          setReflection(mapCommitted(dayKey, state.reflection));
          setPhase('submitted');
        } else {
          setConflict(null);
          setDraft(
            state.draft
              ? { dayKey: state.draft.day_key, answers: [...state.draft.answers] as [string, string, string, string, string, string] }
              : null
          );
          setPhase('editing');
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'Failed to open the local review database.');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayKey, loadAttempt]);

  const handleSaveDraft = useCallback(
    async (next: ReviewDraft) => {
      if (!session) throw new Error('Local review storage is not ready yet.');
      // Conflicts/errors propagate unchanged so DailyGrowthReview keeps its
      // dirty editor open with a visible retry affordance; the session-held
      // revision is NOT refreshed to silently retry over another session.
      await session.saveReviewDraft(next);
    },
    [session]
  );

  const handleSubmit = useCallback(
    async (snapshot: ReflectionSnapshot) => {
      if (!session) throw new Error('Local review storage is not ready yet.');
      const outcome: SubmitOutcome = await session.submitReviewReflection({
        ...snapshot,
        submittedAt: snapshot.submittedAt,
      });
      if (outcome.status === 'conflict') {
        setConflict({
          committedAnswers: [...outcome.committed.answers],
          committedSubmittedAt: outcome.committed.submitted_at,
          attempted: outcome.attempted,
        });
        setPhase('conflict'); // both contents preserved; no overwrite
        return;
      }
      // All UI fields mapped from the exact committed record (commit or replay).
      setReflection(mapCommitted(snapshot.dayKey, outcome.reflection));
      setConflict(null);
      setPhase('submitted');
      // Permanent commit confirmed — the parent may celebrate / mark the day.
      onSubmitted?.(snapshot.dayKey, outcome.status);
    },
    [session, onSubmitted]
  );

  const retryLoad = useCallback(() => setLoadAttempt((n) => n + 1), []);

  // During the editing phase DailyGrowthReview is the single dialog (it owns
  // its own shell, trap and Escape handling); other phases use this shell.
  const isPanelShell = phase !== 'editing';
  const trapRef = useDialogFocusTrap(isPanelShell, isPanelShell ? onClose : undefined);

  if (phase === 'editing') {
    // SINGLE dialog: mount the conversational review alone — no nested dialogs,
    // no fullscreen overlay behind it, no backdrop click-to-dismiss.
    return createPortal(
      <DailyGrowthReview
        dayKey={dayKey}
        initialDraft={draft}
        completedTasks={completedTasks}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onClose={onClose}
      />,
      document.body
    );
  }

  return createPortal(
    <div
      data-review-dialog="true"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Review"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm"
    >
      {/* No backdrop click handler: clicks must never discard edits. */}
      <div
        ref={trapRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 outline-none focus:outline-none"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarCheck size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Daily Review
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {dayKey}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manual local-only review • drafts and submissions saved on this device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily review"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          {phase === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
              <ArrowClockwise size={22} className="animate-spin text-indigo-400" />
              Loading your saved review…
            </div>
          )}

          {phase === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <WarningCircle size={30} className="text-rose-400" />
              <p className="text-sm text-slate-300">{loadError}</p>
              <p className="text-xs text-slate-500">
                Nothing was modified. Your unsaved work from this session is not affected.
              </p>
              <button
                type="button"
                onClick={retryLoad}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <ArrowClockwise size={14} />
                Retry
              </button>
            </div>
          )}

          {phase === 'conflict' && conflict && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <WarningCircle size={18} weight="fill" className="shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-semibold">A reflection already exists for {dayKey} with different content.</p>
                  <p className="text-[11px] text-amber-400/90 mt-0.5">
                    Submissions are permanent and immutable, so your attempted answers below were NOT submitted. Nothing was overwritten.
                  </p>
                </div>
              </div>

              {/* Committed (kept) content */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Lock size={14} />
                  Saved submission ({new Date(conflict.committedSubmittedAt).toLocaleString()})
                </div>
                {REVIEW_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className="text-[11px]">
                    <span className="text-slate-400 font-medium">{idx + 1}. {q.title}</span>
                    <p className="text-slate-400 whitespace-pre-wrap">{conflict.committedAnswers[idx]?.trim() || '[Not answered]'}</p>
                  </div>
                ))}
              </div>

              {/* Attempted (not submitted) content */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-amber-300">Your attempted answers (not saved — different content)</div>
                {REVIEW_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className="text-[11px]">
                    <span className="text-slate-400 font-medium">{idx + 1}. {q.title}</span>
                    <p className="text-slate-400 whitespace-pre-wrap">{conflict.attempted.answers[idx]?.trim() || '[Not answered]'}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500">
                To keep your attempted answers, copy them elsewhere now — the day stays permanently saved with the existing submission.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {phase === 'submitted' && reflection && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Review saved for {reflection.dayKey}</p>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    Submitted {new Date(reflection.submittedAt).toLocaleString()} • Submissions are permanent and cannot be edited. No XP or rewards are awarded from this review.
                  </p>
                </div>
              </div>

              {completedTasks.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No tasks were marked completed at submission-reopen time. (Marked-complete items carry no timestamp proof of today's completion.)
                </p>
              ) : null}

              <div className="space-y-2.5">
                {REVIEW_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="text-xs font-medium text-slate-300 mb-1">
                      {idx + 1}. {q.title}
                    </div>
                    <p className="text-xs text-slate-400 whitespace-pre-wrap">
                      {reflection.answers[idx]?.trim() || <span className="italic text-slate-500">[Not answered]</span>}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Lock size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <p>
                  These answers are stored permanently in the local review database. Reopening the review for {dayKey} will always show this saved submission.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Maps every UI field from the committed record — no mixing with local state. */
function mapCommitted(dayKey: string, record: {
  day_key: string;
  answers: readonly string[];
  completion_ids: readonly string[];
  word_count: number;
  submitted_at: string;
}): ReflectionSnapshot {
  return {
    dayKey: record.day_key ?? dayKey,
    answers: [...record.answers] as [string, string, string, string, string, string],
    wordCount: record.word_count,
    eligible: false, // informational only in the saved view; no XP is awarded anywhere
    issues: [],
    submittedAt: record.submitted_at,
    completedTaskIds: [...record.completion_ids],
  };
}
