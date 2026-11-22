/**
 * Real-DOM UI verification for the manual daily review flow.
 *
 * Mounts the ACTUAL DailyReviewPanel (which mounts the ACTUAL
 * DailyGrowthReview) with REAL IndexedDB underneath (default
 * launchpad-local owner database on a fresh ephemeral origin). Exercises
 * real DOM controls: typing, step navigation, close, save-retry and submit.
 * No mockDB, no component fakes — only the whole service callback of one
 * direct-mount DailyGrowthReview is injected to force a delay + failure
 * for pending-save and retry behavior.
 *
 * Scenario order (same day, one database):
 *  1. Two SIMULTANEOUS panel mounts (probe of the shared default
 *     LocalReviewSession): drafts only, no error state, no corruption.
 *  2. Full panel flow: type → close via the reflection modal X BEFORE the
 *     800ms debounce (handleClose flushes the save) → reopen draft restored
 *     → fill all 6 answers → submit → submitted view → reopen shows the
 *     immutable saved answers, no editor.
 *  3. Direct DailyGrowthReview with an injected onSaveDraft that delays and
 *     rejects the first two attempts: typing while a save is pending must
 *     stay possible, the failure must show the Save-error (retry) control
 *     while retaining the dirty editor, and retry must save the latest
 *     content.
 */

import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DailyReviewPanel } from '../../src/components/Growth/DailyReviewPanel';
import { DailyGrowthReview } from '../../src/components/Growth/DailyGrowthReview';
import {
  CompletedTaskSnapshot,
  ReviewDraft,
} from '../../src/utils/dailyReview';
import {
  getDefaultReviewSession,
  getLocalDayKey,
} from '../../src/services/reviews/localReviewService';

export interface UiAssertion {
  passed: boolean;
  name: string;
  error?: string;
}

export interface UiScenarioResult {
  name: string;
  passed: boolean;
  assertions: UiAssertion[];
  durationMs: number;
}

export interface UiReviewReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  totalScenarios: number;
  passedScenarios: number;
  totalAssertions: number;
  passedAssertions: number;
  scenarios: UiScenarioResult[];
  durationMs: number;
  fatal?: string;
}

let activeAssertions: UiAssertion[] = [];

function assert(condition: boolean, name: string): void {
  if (!condition) {
    const err = new Error(`Assertion failed: ${name}`);
    activeAssertions.push({ passed: false, name, error: err.stack });
    throw err;
  }
  activeAssertions.push({ passed: true, name });
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitFor(desc: string, cond: () => boolean, timeoutMs = 10000): Promise<void> {
  const start = performance.now();
  while (!cond()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms: ${desc}`);
    }
    await delay(50);
  }
}

function holder(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing fixture holder #${id}`);
  return el;
}

/** React-controlled textarea: set the value through the native setter. */
function typeInto(ta: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Native value setter unavailable for textarea');
  setter.call(ta, text);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function buttonWith(container: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'));
  return (buttons.find((b) => (b.textContent || '').includes(text)) as HTMLButtonElement) || null;
}

function innerCloseButton(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector('button[aria-label="Close reflection modal"]');
}

async function waitTextarea(container: HTMLElement, desc: string, timeoutMs = 10000): Promise<HTMLTextAreaElement> {
  await waitFor(desc, () => !!container.querySelector('textarea'), timeoutMs);
  return container.querySelector('textarea') as HTMLTextAreaElement;
}

interface MountHandle {
  /** Triggers onClose handling (e.g. flush-close path) without removing React. */
  closeViaState: () => void;
  /** Fully removes the mount. */
  unmount: () => void;
}

function mountPanel(
  holderId: string,
  completedTasks: CompletedTaskSnapshot[]
): MountHandle {
  const el = holder(holderId);
  el.innerHTML = '';
  const root: Root = createRoot(el);
  const ctrl = { setOpen: (_open: boolean) => {} };
  const Panel = () => {
    const [open, setOpen] = useState(true);
    ctrl.setOpen = setOpen;
    return open ? (
      <DailyReviewPanel completedTasks={completedTasks} onClose={() => setOpen(false)} />
    ) : null;
  };
  root.render(<Panel />);
  return {
    closeViaState: () => ctrl.setOpen(false),
    unmount: () => {
      ctrl.setOpen(false);
      root.unmount();
      el.innerHTML = '';
    },
  };
}

function mountDirectReview(
  holderId: string,
  onSaveDraft: (draft: ReviewDraft) => Promise<void>
): MountHandle {
  const el = holder(holderId);
  el.innerHTML = '';
  const root: Root = createRoot(el);
  const ctrl = { setOpen: (_open: boolean) => {} };
  const Review = () => {
    const [open, setOpen] = useState(true);
    ctrl.setOpen = setOpen;
    return open ? (
      <DailyGrowthReview
        dayKey={getLocalDayKey()}
        initialDraft={null}
        completedTasks={[]}
        onSaveDraft={onSaveDraft}
        onSubmit={async () => {}}
        onClose={() => setOpen(false)}
      />
    ) : null;
  };
  root.render(<Review />);
  return {
    closeViaState: () => ctrl.setOpen(false),
    unmount: () => {
      ctrl.setOpen(false);
      root.unmount();
      el.innerHTML = '';
    },
  };
}

const SAMPLE_TASKS: CompletedTaskSnapshot[] = [
  { id: 'fixture-task-1', title: 'Fixture task one', estimatedMinutes: 25 },
  { id: 'fixture-task-2', title: 'Fixture task two', estimatedMinutes: 40 },
];

// ---------------------------------------------------------------------------

/** Scenario 1: two simultaneous panel mounts share the default session. */
async function scenarioSimultaneousMounts(): Promise<void> {
  const dayKey = getLocalDayKey();
  const hA = mountPanel('root-sim-a', SAMPLE_TASKS);
  const hB = mountPanel('root-sim-b', SAMPLE_TASKS);
  try {
    const rootA = holder('root-sim-a');
    const rootB = holder('root-sim-b');

    const taA = await waitTextarea(rootA, 'panel A reaches editing phase');
    const taB = await waitTextarea(rootB, 'panel B reaches editing phase');

    // Typed back-to-back in the same task, so both 800ms debounces expire at
    // the same time — this exercises genuinely concurrent saves.
    typeInto(taA, 'Simultaneous mount answer A');
    typeInto(taB, 'Simultaneous mount answer B');

    // Let both debounced saves fire through the shared default LocalReviewSession.
    await delay(1500);

    // Diagnosis evidence: surface any save error text (button title carries
    // saveError) before asserting.
    for (const [label, root] of [['A', rootA], ['B', rootB]] as const) {
      const retryBtn = buttonWith(root, 'Save error (retry)');
      if (retryBtn) console.log(`[diag] panel ${label} save error detail: ${retryBtn.title}`);
      else console.log(`[diag] panel ${label} header status: ${root.querySelector('.text-xs')?.textContent ?? '(none)'}`);
    }

    assert(!buttonWith(rootA, 'Save error (retry)'), 'panel A shows no save error after simultaneous saves');
    assert(!buttonWith(rootB, 'Save error (retry)'), 'panel B shows no save error after simultaneous saves');

    // Honest probe report: shared-session semantics — final stored draft must
    // be one panel's complete content, never a corrupted mix, and both saves
    // must have committed without a revision conflict blowing up either editor.
    const session = await getDefaultReviewSession();
    const state = await session.loadReviewState(dayKey);
    const storedFirst = state.draft?.answers[0] ?? '';
    assert(
      storedFirst === 'Simultaneous mount answer A' || storedFirst === 'Simultaneous mount answer B',
      `final draft content is one panel's full answer, not corrupted (got "${storedFirst}")`
    );
  } finally {
    hA.closeViaState();
    hB.closeViaState();
    await delay(50);
    hA.unmount();
    hB.unmount();
  }
}

/** Scenario 2: full flow — type, close before debounce, resume, submit, reopen. */
async function scenarioFullFlow(): Promise<void> {
  const root = holder('root-full');
  const ANSWER_ONE = 'Fixture answer one: the deep work block went well.';
  const ANSWER_SIX = 'Fixture answer six: tomorrow I will shorten the meeting block.';

  // Start: first open. Draft from scenario 1 exists; overwrite step 0 straight away.
  const h1 = mountPanel('root-full', SAMPLE_TASKS);
  let ta = await waitTextarea(root, 'panel open reaches editing phase');
  typeInto(ta, ANSWER_ONE);

  // Close via the reflection modal X BEFORE the 800ms debounce fires —
  // handleClose flushes the pending save, then the panel unmounts.
  const closeBtn = innerCloseButton(root);
  assert(!!closeBtn, 'reflection modal close (X) control exists');
  closeBtn!.click();
  await waitFor('panel closed by X before debounce', () => !root.querySelector('textarea') && !root.querySelector('[role="dialog"]'));
  h1.unmount();

  // Reopen: draft must be restored (resume) with the typed answer.
  const h2 = mountPanel('root-full', SAMPLE_TASKS);
  ta = await waitTextarea(root, 'reopened panel reaches editing phase');
  assert(ta.value === ANSWER_ONE, `draft restored on reopen (resume): expected typed answer, got "${ta.value.slice(0, 60)}"`);

  // Fill remaining five answers, stepping with the Next control.
  for (let i = 1; i <= 5; i++) {
    const nextBtn = buttonWith(root, 'Next');
    assert(!!nextBtn, `Next control available on question ${i}`);
    nextBtn!.click();
    await waitFor(`question ${i + 1} of 6 shown`, () => root.textContent!.includes(`Question ${i + 1} of 6`));
    ta = root.querySelector('textarea') as HTMLTextAreaElement;
    const text = i === 5 ? ANSWER_SIX : `Fixture answer ${i + 1} with detail ${i}.`;
    typeInto(ta, text);
  }

  // Step 5 → 6: one more Next reaches the summary + submit view.
  {
    const nextBtn = buttonWith(root, 'Next');
    assert(!!nextBtn, 'Next control available to reach the summary step');
    nextBtn!.click();
  }

  // Step 6: summary + submit.
  await waitFor('summary view reached', () => root.textContent!.includes('Reflection Summary'));
  const submitBtn = buttonWith(root, 'Submit Reflection');
  assert(!!submitBtn && !submitBtn!.disabled, 'Submit Reflection control enabled after all six answers');
  submitBtn!.click();
  await waitFor('submitted view shown', () => root.textContent!.includes('Review saved for'));
  assert(!root.querySelector('textarea'), 'no editable textarea in submitted view');
  assert(root.textContent!.includes(ANSWER_ONE), 'saved view shows answer 1 read-only');
  assert(root.textContent!.includes(ANSWER_SIX), 'saved view shows answer 6 read-only');
  assert(root.textContent!.includes('cannot be edited'), 'submitted view states immutability honestly');

  h2.closeViaState();
  await waitFor('closed after submit', () => !root.querySelector('[role="dialog"]'));
  h2.unmount();

  // Reopen AGAIN: the saved submission must be immutable — no editor.
  const h3 = mountPanel('root-full', SAMPLE_TASKS);
  await waitFor('reopen shows submitted phase', () => root.textContent!.includes('Review saved for'));
  assert(!root.querySelector('textarea'), 'reopen shows immutable saved answers, not an editor');
  assert(root.textContent!.includes(ANSWER_ONE), 'reopen shows committed answer 1');
  assert(root.textContent!.includes(ANSWER_SIX), 'reopen shows committed answer 6');
  h3.closeViaState();
  await waitFor('final close', () => !root.querySelector('[role="dialog"]'));
  h3.unmount();
}

/** Scenario 3: direct DailyGrowthReview with injected delay/reject onSaveDraft. */
async function scenarioPendingSaveAndRetry(): Promise<void> {
  const root = holder('root-direct');
  const calls: string[][] = [];
  const onSaveDraft = async (draft: ReviewDraft): Promise<void> => {
    calls.push([...draft.answers]);
    if (calls.length < 3) {
      // First call (manual Save Draft) hangs a while; second (auto-retry)
      // fails fast — both reject so the error state is observable.
      await delay(calls.length === 1 ? 900 : 300);
      throw new Error(`Injected fixture save failure #${calls.length}`);
    }
  };

  const h = mountDirectReview('root-direct', onSaveDraft);
  let ta = await waitTextarea(root, 'direct review reaches editing phase');
  typeInto(ta, 'Direct component text v1, ');
  buttonWith(root, 'Save Draft')!.click();

  // While the first save is pending: typing must still work and the value be kept.
  await delay(150); // inside the 900ms injected delay
  ta = root.querySelector('textarea') as HTMLTextAreaElement;
  assert(!ta.disabled, 'textarea is NOT disabled while a save is pending');
  typeInto(ta, 'Direct component text v1, typed during pending.');

  // Wait for a STABLE error state: the error control must persist across
  // three checks spaced >=300ms apart (guards against the transient window
  // between one failing run and the queued retry's "Saving..." flip, where
  // the button node is replaced and a stale reference click would no-op).
  let stableChecks = 0;
  let lastSeenMs = 0;
  await waitFor('save-error retry control stable', () => {
    const now = performance.now();
    const errVisible = !!buttonWith(root, 'Save error (retry)') && !root.textContent!.includes('Saving...');
    if (errVisible) {
      if (now - lastSeenMs >= 300) {
        stableChecks++;
        lastSeenMs = now;
      }
    } else {
      stableChecks = 0;
    }
    return stableChecks >= 3;
  }, 15000);
  ta = root.querySelector('textarea') as HTMLTextAreaElement;
  assert(ta !== null, 'editor still mounted after save failure');
  assert(
    ta.value.includes('typed during pending.'),
    'dirty editor retains the latest typed content after failure'
  );

  // Retry saves the LATEST content — click a freshly-queried live node.
  buttonWith(root, 'Save error (retry)')!.click();
  for (let i = 0; i < 12; i++) {
    await delay(500);
    console.log(
      `[diag] post-retry ${i}: calls=${calls.length}, hasErrBtn=${!!buttonWith(root, 'Save error (retry)')}, ` +
        `hasSavedTxt=${root.textContent!.includes('Saved')}, statusText=${root.querySelector('header .text-xs')?.textContent ?? '(none)'}`
    );
    if (root.textContent!.includes('Saved')) break;
  }
  await waitFor('Saved indicator after retry', () => root.textContent!.includes('Saved'));
  assert(calls.length >= 3, `retry produced an additional save call (calls=${calls.length})`);
  const lastCall = calls[calls.length - 1];
  assert(
    lastCall[0] === 'Direct component text v1, typed during pending.',
    `successful retry saved the latest content (got "${(lastCall[0] || '').slice(0, 60)}")`
  );

  h.closeViaState();
  await waitFor('direct review closed', () => !root.querySelector('[role="dialog"]'));
  h.unmount();
}

// ---------------------------------------------------------------------------

export async function runUiReviewVerification(): Promise<UiReviewReport> {
  const startTime = performance.now();
  const scenarios: UiScenarioResult[] = [];

  async function runScenario(name: string, fn: () => Promise<void>): Promise<void> {
    console.log(`Starting scenario: ${name}`);
    const start = performance.now();
    activeAssertions = [];
    let passed = true;
    try {
      await fn();
      console.log(`Finished scenario: ${name}`);
    } catch (err) {
      passed = false;
      console.error(`Scenario failed: ${name} -> ${err}`);
      if (activeAssertions.length === 0 || activeAssertions[activeAssertions.length - 1].passed) {
        activeAssertions.push({
          passed: false,
          name: `Scenario execution failed: ${name}`,
          error: err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err),
        });
      }
    }
    scenarios.push({
      name,
      passed,
      assertions: [...activeAssertions],
      durationMs: performance.now() - start,
    });
  }

  await runScenario('1. Two simultaneous panel mounts share one session without conflicts or corruption', scenarioSimultaneousMounts);
  await runScenario('2. Full panel flow: type, close-before-debounce flush, resume, six answers, submit, immutable reopen', scenarioFullFlow);
  await runScenario('3. Pending-save typing + injected failure/retry on actual DailyGrowthReview', scenarioPendingSaveAndRetry);

  return {
    browser: 'Orca Built-in Browser (real DOM + real IndexedDB)',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    passed: scenarios.every((s) => s.passed),
    totalScenarios: scenarios.length,
    passedScenarios: scenarios.filter((s) => s.passed).length,
    totalAssertions: scenarios.reduce((acc, s) => acc + s.assertions.length, 0),
    passedAssertions: scenarios.reduce((acc, s) => acc + s.assertions.filter((a) => a.passed).length, 0),
    scenarios,
    durationMs: performance.now() - startTime,
  };
}
