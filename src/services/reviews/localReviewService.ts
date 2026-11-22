/**
 * Local-only daily review persistence service.
 *
 * - Uses the EXISTING owner-isolated openLaunchpadDatabase under an explicit
 *   local-only owner ("launchpad-local"), so review data lives in its own
 *   dedicated IndexedDB database and never touches legacy localStorage data
 *   or any other owner's database. No migration is performed.
 *
 * Concurrency correctness contract:
 * - Each opening session (LocalReviewSession) captures the draft revision at
 *   load time and advances it ONLY on its own successful commit. Saves are
 *   sent with that session-held expectedDraftRevision; a RevisionConflictError
 *   propagates unchanged. The save path NEVER re-reads the latest revision to
 *   retry over it, so a stale editor can never silently overwrite another
 *   session's newer draft.
 * - Every logical save is a DraftSaveAttempt: a UNIQUE mutation ID
 *   (`<dayKey>:<epoch>:<seq>`; no content hashing for identity) paired with a
 *   FROZEN immutable request (answers + updated_at + expected revision).
 *   Retries of the same pending attempt reuse the exact frozen request so a
 *   receipt replay is fingerprint-stable. Any content change — including
 *   returning to previously saved wording — starts a new attempt with a new
 *   mutation ID. A failed attempt stays pending (ambiguity is assumed) until
 *   it commits.
 * - Reflection submissions are immutable with a day-scoped ID. Submits are
 *   content-compared in three states: a fresh commit, an idempotent replay of
 *   the exact same content (retries reuse the frozen request so the repository
 *   receipt replay can return the exact committed snapshot), or a CONFLICT
 *   when different content is submitted for an already-submitted day — both
 *   contents are preserved in the conflict result. Existing reflections are
 *   never overwritten (the repository also enforces append-only semantics).
 *
 * - No XP, rewards, network, AI, or external services are involved here.
 */

import {
  LaunchpadDatabase,
  openLaunchpadDatabase,
} from '../db';
import type { ReflectionRecord, ReviewDraftRecord } from '../../domain/types';
import type { ReflectionSnapshot, ReviewDraft } from '../../utils/dailyReview';

/** Explicit local-only owner for the manual daily review feature. */
export const LOCAL_REVIEW_OWNER = 'launchpad-local';

type SixAnswers = readonly [string, string, string, string, string, string];

let dbPromise: Promise<LaunchpadDatabase> | null = null;

/**
 * Opens (and caches) the local review database for the whole app lifetime.
 * Falls back to reopening after an open failure so a later click can retry.
 */
export function getLocalReviewDatabase(): Promise<LaunchpadDatabase> {
  if (!dbPromise) {
    dbPromise = openLaunchpadDatabase({ ownerId: LOCAL_REVIEW_OWNER }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Local calendar day (YYYY-MM-DD) — deliberately NOT a UTC date truncation. */
export function getLocalDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Per-day auto-offer/celebration marker (dedicated keys, no legacy rewrite). */
export type ReviewOfferMarker = 'offered' | 'celebrated';

const REVIEW_OFFER_MARKER_PREFIX = 'launchpad.review.autooffer.';

/**
 * Writes the per-day auto-offer marker. Returns true only when the write is
 * verifiably persisted (write succeeded and reads back identical). Callers use
 * a false return to SKIP auto-opening rather than risk reopen loops.
 */
export function markReviewOffered(dayKey: string, marker: ReviewOfferMarker = 'offered'): boolean {
  try {
    const key = REVIEW_OFFER_MARKER_PREFIX + dayKey;
    localStorage.setItem(key, marker);
    return localStorage.getItem(key) === marker;
  } catch {
    return false; // persistence failed (quota/privacy mode): caller must skip
  }
}

/** Reads the per-day marker, or null when absent/unreadable. */
export function getReviewOfferMarker(dayKey: string): ReviewOfferMarker | null {
  try {
    const raw = localStorage.getItem(REVIEW_OFFER_MARKER_PREFIX + dayKey);
    return raw === 'offered' || raw === 'celebrated' ? raw : null;
  } catch {
    return null;
  }
}

/** SHA-256 hex of UTF-8 text. Web Crypto is required — no weak fallback. */
async function sha256Hex(text: string): Promise<string> {
  const subtle = typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined;
  if (!subtle || typeof subtle.digest !== 'function') {
    throw new Error(
      'Web Crypto API (subtle.digest) is unavailable; integrity hashing requires it (no weak fallback).'
    );
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function answersEqual(a: readonly string[], b: readonly string[]): boolean {
  for (let i = 0; i < 6; i++) {
    if ((a[i] ?? '') !== (b[i] ?? '')) return false;
  }
  return true;
}

function sameReflectionContent(
  committed: ReflectionRecord,
  snapshot: ReflectionSnapshot
): boolean {
  return (
    answersEqual(committed.answers, snapshot.answers) &&
    JSON.stringify([...committed.completion_ids]) ===
      JSON.stringify(snapshot.completedTaskIds) &&
    committed.word_count === snapshot.wordCount
  );
}

export interface ReviewState {
  reflection: ReflectionRecord | null;
  draft: ReviewDraftRecord | null;
}

/**
 * A frozen immutable draft-save request with a unique-per-logical-edit
 * mutation ID. Retries reuse it verbatim; content changes start a new attempt.
 */
export interface DraftSaveAttempt {
  readonly mutationId: string;
  readonly dayKey: string;
  readonly answers: SixAnswers;
  /** Frozen at attempt creation so retries have a fingerprint-stable payload. */
  readonly updatedAt: string;
  /** Committed=true means the attempt resolved successfully at least once. */
  readonly committed: boolean;
}

export interface DraftSaveResult {
  attempt: DraftSaveAttempt;
  draft: ReviewDraftRecord;
  /** True when the repository replayed an existing receipt of this attempt. */
  wasReplay: boolean;
}

export type SubmitOutcome =
  | { status: 'committed'; reflection: ReflectionRecord }
  /** Ambiguous-failure retry with identical content; fields map from the committed record. */
  | { status: 'replayed'; reflection: ReflectionRecord }
  /** Different content submitted for an already-submitted day; nothing is overwritten. */
  | {
      status: 'conflict';
      committed: ReflectionRecord;
      attempted: ReflectionSnapshot;
    };

interface DayDraftState {
  attempt: DraftSaveAttempt | null;
  /** Session-held expected revision, advanced only on own successful commits. */
  expectedDraftRevision: number;
}

interface SubmitAttempt {
  /** Unique per logical submit (no content hashing); frozen for stable retries. */
  mutationId: string;
  answers: SixAnswers;
  record: ReflectionRecord;
  committed: boolean;
}

/**
 * One opening of the review flow. Holds draft revisions and pending attempts
 * for this session only, so concurrent openings behave as independent writers
 * with optimistic conflict detection instead of silent overwrites.
 */
export class LocalReviewSession {
  private dayDrafts = new Map<string, DayDraftState>();
  private submitAttempts = new Map<string, SubmitAttempt>();
  private saveSeq = 0;
  private readonly epoch: string;

  constructor(public readonly db: LaunchpadDatabase) {
    // crypto.randomUUID may be unavailable in some non-secure contexts; fall
    // back to a random state seed. This is session scoping only — not identity hashing.
    this.epoch = Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }

  /** Loads the permanent reflection and the draft, seeding the held revision. */
  async loadReviewState(dayKey: string): Promise<ReviewState> {
    const [reflection, draft] = await Promise.all([
      this.db.getReflection(dayKey),
      this.db.getReviewDraft(dayKey),
    ]);
    const dayState = this.dayDrafts.get(dayKey) ?? { attempt: null, expectedDraftRevision: 0 };
    dayState.expectedDraftRevision = draft ? draft.draft_revision : 0;
    this.dayDrafts.set(dayKey, dayState);
    return { reflection, draft };
  }

  /**
   * Saves a draft with the session-held expectedDraftRevision:
   * - reuses the pending attempt when this is a retry with identical content
   *   (fingerprint-stable: same mutation ID, same frozen updated_at and revision),
   * - starts a NEW attempt (new unique mutation ID) for any content change,
   *   including returning to previously saved wording,
   * - on RevisionConflictError rethrows WITHOUT re-reading the latest revision,
   *   and the pending attempt stays retained for honest retry.
   *
   * Overlapping saves for the same day are serialized (per-day queue) so each
   * save captures the session-held expected revision AFTER the previous save
   * in this session has committed/rejected — two simultaneous panel mounts
   * sharing this session would otherwise both capture the same expected
   * revision and race (reproduced: REVISION_CONFLICT expected 0, current 1).
   */
  async saveReviewDraft(draft: ReviewDraft): Promise<DraftSaveResult> {
    const previous = this.daySaveQueues.get(draft.dayKey) ?? Promise.resolve();
    const queued = previous.then(
      () => this.saveReviewDraftLocked(draft),
      () => this.saveReviewDraftLocked(draft)
    );
    // Store a never-rejecting marker so later saves are never blocked.
    this.daySaveQueues.set(draft.dayKey, queued.catch(() => undefined));
    return queued;
  }

  private daySaveQueues = new Map<string, Promise<unknown>>();

  private async saveReviewDraftLocked(draft: ReviewDraft): Promise<DraftSaveResult> {
    const answers: SixAnswers = [
      draft.answers[0] ?? '',
      draft.answers[1] ?? '',
      draft.answers[2] ?? '',
      draft.answers[3] ?? '',
      draft.answers[4] ?? '',
      draft.answers[5] ?? '',
    ];
    const dayState = this.dayDrafts.get(draft.dayKey) ?? { attempt: null, expectedDraftRevision: 0 };
    this.dayDrafts.set(draft.dayKey, dayState);

    const pending = dayState.attempt;
    const isRetry =
      pending !== null && !pending.committed && answersEqual(pending.answers, draft.answers);

    const attempt: DraftSaveAttempt = isRetry
      ? pending
      : {
          mutationId: `save-review-draft:${draft.dayKey}:${this.epoch}:${++this.saveSeq}`,
          dayKey: draft.dayKey,
          answers,
          updatedAt: new Date().toISOString(),
          committed: false,
        };
    dayState.attempt = attempt;

    const record: ReviewDraftRecord = {
      owner_id: this.db.ownerId,
      day_key: attempt.dayKey,
      answers: attempt.answers,
      // Task IDs are not known at draft-save time (the save contract only
      // carries the six answers); they are captured on permanent submission.
      completion_ids: [],
      plan_revision: 0,
      draft_revision: 1,
      updated_at: attempt.updatedAt,
    };

    let result;
    try {
      result = await this.db.saveReviewDraft(
        record,
        attempt.mutationId,
        dayState.expectedDraftRevision
      );
    } catch (err) {
      // Retain the pending (frozen) attempt for retry; do NOT re-read the
      // latest revision here — that would retry over another session's write.
      dayState.attempt = attempt;
      throw err;
    }

    const committedDraft = result.entity ?? { ...record, draft_revision: dayState.expectedDraftRevision + 1 };
    dayState.attempt = { ...attempt, committed: true };
    // Advance ONLY on own successful commit (explicit CAS keeps this true).
    dayState.expectedDraftRevision = committedDraft.draft_revision;
    return { attempt: dayState.attempt, draft: committedDraft, wasReplay: result.wasReplayed };
  }

  /**
   * Submits the immutable daily reflection.
   * - Day-scoped ID (`reflection:<dayKey>`): one submission per day, ever.
   * - Identical-content retry reuses the frozen request/mutation ID (receipt
   *   replay) or maps an existing identical record to 'replayed' with ALL UI
   *   fields taken from the committed record.
   * - Different content for an already-submitted day returns 'conflict' with
   *   BOTH contents retained; the committed reflection is never overwritten.
   */
  async submitReviewReflection(snapshot: ReflectionSnapshot): Promise<SubmitOutcome> {
    const answers: SixAnswers = [
      snapshot.answers[0] ?? '',
      snapshot.answers[1] ?? '',
      snapshot.answers[2] ?? '',
      snapshot.answers[3] ?? '',
      snapshot.answers[4] ?? '',
      snapshot.answers[5] ?? '',
    ];

    const existing = await this.db.getReflection(snapshot.dayKey);
    if (existing) {
      return sameReflectionContent(existing, snapshot)
        ? { status: 'replayed', reflection: existing }
        : { status: 'conflict', committed: existing, attempted: snapshot };
    }

    const submissionHash = await sha256Hex(
      JSON.stringify({ dayKey: snapshot.dayKey, answers, completedTaskIds: snapshot.completedTaskIds })
    );
    const record: ReflectionRecord = {
      // Immutable day-scoped record ID (one submission per day).
      id: `reflection:${snapshot.dayKey}`,
      owner_id: this.db.ownerId,
      day_key: snapshot.dayKey,
      answers,
      completion_ids: [...snapshot.completedTaskIds],
      word_count: snapshot.wordCount,
      submitted_at: snapshot.submittedAt,
      submission_hash: submissionHash,
    };

    const pending = this.submitAttempts.get(snapshot.dayKey);
    const isRetry =
      pending !== undefined && !pending.committed && answersEqual(pending.answers, answers);
    const attempt: SubmitAttempt = isRetry
      ? pending
      : {
          // Unique logical-save operation ID (new edit ⇒ new attempt); retries
          // reuse the frozen immutable request (same mutation ID + payload).
          mutationId: `submit-review-reflection:${snapshot.dayKey}:${this.epoch}:${++this.saveSeq}`,
          answers,
          record,
          committed: false,
        };
    this.submitAttempts.set(snapshot.dayKey, attempt);

    try {
      const result = await this.db.submitReflection(attempt.record, attempt.mutationId);
      this.submitAttempts.set(snapshot.dayKey, { ...attempt, committed: true });
      // Serve the exact committed snapshot on both fresh commit and receipt replay.
      return {
        status: result.wasReplayed ? 'replayed' : 'committed',
        reflection: result.entity ?? attempt.record,
      };
    } catch (err) {
      this.submitAttempts.set(snapshot.dayKey, attempt); // retain pending attempt through ambiguous failure
      // Recovery: a committed submission is never overwritten; classify the
      // failure by exact content comparison of what is stored right now.
      const committed = await this.db.getReflection(snapshot.dayKey);
      if (committed) {
        return sameReflectionContent(committed, snapshot)
          ? { status: 'replayed', reflection: committed }
          : { status: 'conflict', committed, attempted: snapshot };
      }
      throw err;
    }
  }
}

let defaultSessionPromise: Promise<LocalReviewSession> | null = null;

/**
 * Session-scoped singleton used by the panel. loadReviewState() re-seeds the
 * held revision every time the panel opens, so stale session state cannot
 * outlive a reopen.
 */
export function getDefaultReviewSession(): Promise<LocalReviewSession> {
  if (!defaultSessionPromise) {
    defaultSessionPromise = getLocalReviewDatabase()
      .then((db) => new LocalReviewSession(db))
      .catch((err) => {
        defaultSessionPromise = null;
        throw err;
      });
  }
  return defaultSessionPromise;
}
