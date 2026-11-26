import type { QuickNote, TaskPriority } from '../types';

/** All values are virtual US-dollar cents, never real money. */
export interface EconomyEntry {
  id: string;
  date: string;
  amountCents: number;
  kind: 'goal-shortfall' | 'earning' | 'missed-commitment' | 'replacement-shortfall' | 'asset-purchase';
}
export interface CastleAsset { id: string; label: string; priceCents: number }
export interface CastleMission { id: string; date: string; targetCents: number; requiredTasks: number; bonusCents: number; claimed: boolean }
export interface Commitment {
  id: string;
  title: string;
  date: string;
  estimatedValueCents: number;
  estimatedMinutes?: number;
  completed: boolean;
  actualValueCents?: number;
  earnedValueCents?: number;
  replacementIds?: string[];
}
export interface CastleEconomy {
  activatedOn: string;
  goalCents: number;
  goalChanges: Array<{ effectiveOn: string; amountCents: number }>;
  ledger: EconomyEntry[];
  exemptDays: string[];
  commitments: Commitment[];
  assets: CastleAsset[];
  missions: CastleMission[];
  missionDraws: string[];
}

function dateNumber(day: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid local date');
  const stamp = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) throw new Error('Invalid local date');
  return stamp;
}

function dayIsSettled(state: CastleEconomy, day: string): boolean {
  return state.ledger.some(entry => entry.id === `shortfall:${day}`);
}

function taskWasCompleted(state: CastleEconomy, taskId: string): boolean {
  return state.commitments.some(item => item.id === taskId && item.completed)
    || state.ledger.some(entry => entry.kind === 'earning' && entry.id === `earning:task:${entry.date}:${taskId}`);
}

export function findReflectionCommitment(state: CastleEconomy, task: Pick<QuickNote, 'id' | 'completedOn'>, throughDay: string): Commitment | undefined {
  const today = dateNumber(throughDay);
  // Older pending notes had no completion date. Recover the immediate rollover case only.
  const earliest = task.completedOn ?? new Date(today - 86400000).toISOString().slice(0, 10);
  const latestDay = task.completedOn ?? throughDay;
  if (latestDay > throughDay) return undefined;
  const latest = state.commitments.filter(item => item.id === task.id && earliest <= item.date && item.date <= latestDay)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest && !latest.completed && !latest.replacementIds ? latest : undefined;
}

/** Initial policy: $10/hour at low priority, with a deadline premium that decays after the due date. */
export function taskValueCents(minutes: number, priority: TaskPriority, deadline: string | undefined, today: string): number {
  dateNumber(today);
  const multipliers: Record<TaskPriority, number> = { low: 1, medium: 1.5, high: 2, urgent: 3 };
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 525600 || !multipliers[priority]) throw new Error('Invalid task value inputs');
  let due = deadline && /^\d{4}-\d{2}-\d{2}/.test(deadline) ? deadline.slice(0, 10)
    : deadline && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(deadline) ? today : undefined;
  if (due) { try { dateNumber(due); } catch { due = undefined; } }
  const daysLate = due && due < today ? Math.round((dateNumber(today) - dateNumber(due)) / 86400000) : 0;
  const urgency = due && due <= today ? 1.25 * Math.pow(0.8, daysLate) : 1;
  return Math.max(1, Math.round((minutes / 60) * 1000 * multipliers[priority] * urgency));
}

/** Reject invalid financial snapshots instead of silently replacing a user's history. */
export function validateCastleEconomy(value: unknown): CastleEconomy {
  const data = value as CastleEconomy;
  const fail = () => { throw new Error('Invalid castle economy data'); };
  try {
    if (!data || typeof data !== 'object') return fail();
    dateNumber(data.activatedOn);
    if (!Number.isSafeInteger(data.goalCents) || data.goalCents <= 0 || !Array.isArray(data.goalChanges)
      || !data.goalChanges.length || !Array.isArray(data.ledger) || !Array.isArray(data.exemptDays)
      || !Array.isArray(data.commitments) || !Array.isArray(data.assets) || !Array.isArray(data.missions) || !Array.isArray(data.missionDraws)) return fail();
    for (const change of data.goalChanges) {
      dateNumber(change.effectiveOn);
      if (!Number.isSafeInteger(change.amountCents) || change.amountCents <= 0) return fail();
    }
    const ids = new Set<string>();
    for (const entry of data.ledger) {
      dateNumber(entry.date);
      if (!entry.id || ids.has(entry.id) || !Number.isSafeInteger(entry.amountCents)
        || !['goal-shortfall', 'earning', 'missed-commitment', 'replacement-shortfall', 'asset-purchase'].includes(entry.kind)) return fail();
      ids.add(entry.id);
    }
    for (const day of data.exemptDays) dateNumber(day);
    const assetIds = new Set<string>();
    for (const asset of data.assets) {
      if (!asset.id || !asset.label || assetIds.has(asset.id) || !Number.isSafeInteger(asset.priceCents) || asset.priceCents <= 0) return fail();
      assetIds.add(asset.id);
    }
    for (const day of data.missionDraws) dateNumber(day);
    const missionDays = new Set<string>();
    for (const mission of data.missions) {
      dateNumber(mission.date);
      if (mission.id !== `mission:${mission.date}` || missionDays.has(mission.date)
        || !Number.isSafeInteger(mission.targetCents) || mission.targetCents <= 0
        || !Number.isSafeInteger(mission.requiredTasks) || mission.requiredTasks <= 0
        || !Number.isSafeInteger(mission.bonusCents) || mission.bonusCents <= 0 || typeof mission.claimed !== 'boolean') return fail();
      missionDays.add(mission.date);
    }
    const commitments = new Map<string, Commitment>();
    for (const item of data.commitments) {
      dateNumber(item.date);
      const key = `${item.date}:${item.id}`;
      if (!item.id || !item.title || commitments.has(key) || !Number.isSafeInteger(item.estimatedValueCents)
        || item.estimatedValueCents <= 0 || typeof item.completed !== 'boolean') return fail();
      if (item.actualValueCents !== undefined && (!Number.isSafeInteger(item.actualValueCents) || item.actualValueCents < 0)) return fail();
      if (item.earnedValueCents !== undefined && (!Number.isSafeInteger(item.earnedValueCents) || item.earnedValueCents < 0)) return fail();
      if (item.estimatedMinutes !== undefined && !validTaskMinutes(item.estimatedMinutes)) return fail();
      if (item.replacementIds !== undefined && (!Array.isArray(item.replacementIds) || item.completed
        || !item.replacementIds.length || !item.replacementIds.every(id => typeof id === 'string' && !!id))) return fail();
      commitments.set(key, item);
    }
    const usedReplacements = new Set<string>();
    for (const item of commitments.values()) {
      if (!item.replacementIds) continue;
      let replacementValue = 0;
      for (const id of item.replacementIds) {
        const key = `${item.date}:${id}`;
        const replacement = commitments.get(key);
        if (!replacement || replacement.replacementIds || usedReplacements.has(key)) return fail();
        usedReplacements.add(key);
        replacementValue += replacement.estimatedValueCents;
      }
      if (replacementValue < item.estimatedValueCents) return fail();
    }
    return data;
  } catch {
    return fail();
  }
}

export function activateEconomy(goalCents: number, today: string): CastleEconomy {
  dateNumber(today);
  if (!Number.isSafeInteger(goalCents) || goalCents <= 0) throw new Error('Daily goal must be positive whole cents');
  return { activatedOn: today, goalCents, goalChanges: [{ effectiveOn: today, amountCents: goalCents }], ledger: [], exemptDays: [], commitments: [], assets: [], missions: [], missionDraws: [] };
}

export function balanceCents(state: CastleEconomy): number {
  return state.ledger.reduce((total, entry) => total + entry.amountCents, 0);
}

export function netWorthCents(state: CastleEconomy): number {
  return balanceCents(state) + state.assets.reduce((total, asset) => total + asset.priceCents, 0);
}

export function purchaseAsset(state: CastleEconomy, asset: CastleAsset, day: string): CastleEconomy {
  dateNumber(day);
  if (!asset.id || !asset.label.trim() || !Number.isSafeInteger(asset.priceCents) || asset.priceCents <= 0) throw new Error('Invalid castle asset');
  if (state.assets.some(item => item.id === asset.id)) return state;
  if (state.ledger.some(entry => entry.id === `asset:${asset.id}`)) throw new Error('A purchase record already exists without matching ownership; restore a consistent backup before purchasing this addition.');
  if (day < state.activatedOn || dayIsSettled(state, day)) throw new Error('Day has already settled');
  if (balanceCents(state) < asset.priceCents) throw new Error('Insufficient balance');
  return { ...state, assets: [...state.assets, asset], ledger: [...state.ledger, { id: `asset:${asset.id}`, date: day, amountCents: -asset.priceCents, kind: 'asset-purchase' }] };
}

/** One draw per day, at most one offer per 14 days; all terms are visible to the user. */
export function offerMission(state: CastleEconomy, day: string, draw: number): CastleEconomy {
  const stamp = dateNumber(day);
  if (day < state.activatedOn || !Number.isFinite(draw) || draw < 0 || draw >= 1) throw new Error('Invalid mission draw');
  if (state.missionDraws.includes(day) || dayIsSettled(state, day)) return state;
  const recentlyOffered = state.missions.some(mission => Math.abs(stamp - dateNumber(mission.date)) < 14 * 86400000);
  const challenge = draw < 0.05
    ? { targetCents: 6000, requiredTasks: 2, bonusCents: 1500 }
    : { targetCents: 10000, requiredTasks: 3, bonusCents: 2500 };
  const missions = draw < 0.1 && !recentlyOffered
    ? [...state.missions, { id: `mission:${day}`, date: day, ...challenge, claimed: false }]
    : state.missions;
  return { ...state, missions, missionDraws: [...state.missionDraws, day] };
}

export function claimMission(state: CastleEconomy, missionId: string, day: string): CastleEconomy {
  const mission = state.missions.find(item => item.id === missionId);
  if (!mission || mission.date !== day) throw new Error('Mission is unavailable');
  if (mission.claimed) return state;
  if (!getMissionProgress(state, mission).ready) throw new Error('Mission requirements are not met');
  const credited = recordEarning(state, mission.id, day, mission.bonusCents);
  return { ...credited, missions: credited.missions.map(item => item.id === missionId ? { ...item, claimed: true } : item) };
}

export function getMissionProgress(state: CastleEconomy, mission: CastleMission) {
  const workValues = state.commitments.filter(item => item.date === mission.date && item.completed)
    .map(item => item.earnedValueCents ?? item.actualValueCents ?? 0).filter(value => value > 0);
  const taskCount = workValues.length;
  const valueCents = workValues.reduce((sum, value) => sum + value, 0);
  return { taskCount, valueCents, ready: taskCount >= mission.requiredTasks && valueCents >= mission.targetCents };
}

export function settlePastDays(state: CastleEconomy, today: string): CastleEconomy {
  const end = dateNumber(today);
  const existing = new Set(state.ledger.map(entry => entry.id));
  const ledger = [...state.ledger];
  for (let stamp = dateNumber(state.activatedOn); stamp < end; stamp += 86400000) {
    const day = new Date(stamp).toISOString().slice(0, 10);
    const id = `shortfall:${day}`;
    if (existing.has(id)) continue;
    const goal = state.goalChanges.filter(change => change.effectiveOn <= day).at(-1)?.amountCents ?? state.goalCents;
    const earned = ledger.filter(entry => entry.kind === 'earning' && entry.date === day).reduce((sum, entry) => sum + entry.amountCents, 0);
    const shortfall = Math.max(0, goal - earned);
    // A zero entry closes exempt and fully earned days too, preventing backdated edits.
    if (!existing.has(id)) ledger.push({ id, date: day, amountCents: state.exemptDays.includes(day) ? 0 : -shortfall, kind: 'goal-shortfall' });
    if (!state.exemptDays.includes(day)) {
      for (const commitment of state.commitments.filter(item => item.date === day && !item.completed && !item.replacementIds)) {
        const penaltyId = `missed:${commitment.id}:${day}`;
        if (!existing.has(penaltyId)) ledger.push({ id: penaltyId, date: day, amountCents: -commitment.estimatedValueCents, kind: 'missed-commitment' });
      }
      for (const original of state.commitments.filter(item => item.date === day && item.replacementIds)) {
        const replacements = state.commitments.filter(item => item.date === day && original.replacementIds!.includes(item.id));
        const covered = replacements.reduce((sum, item) => sum + (item.completed
          ? (item.actualValueCents ?? 0)
          : item.estimatedValueCents), 0);
        const missing = Math.max(0, original.estimatedValueCents - covered);
        const replacementId = `replacement:${day}:${original.id}`;
        if (missing > 0 && !existing.has(replacementId)) ledger.push({ id: replacementId, date: day, amountCents: -missing, kind: 'replacement-shortfall' });
      }
    }
  }
  return ledger.length === state.ledger.length ? state : { ...state, ledger };
}

/** Only the caller's current local day may be exempted. */
export function useExemption(state: CastleEconomy, day: string, today: string): CastleEconomy {
  dateNumber(day);
  dateNumber(today);
  if (day !== today) throw new Error('Exemptions apply only to the current day');
  if (day < state.activatedOn || state.ledger.some(entry => entry.id === `shortfall:${day}`)) throw new Error('Day has already settled');
  if (state.exemptDays.includes(day)) throw new Error('Day is already exempt');
  if (remainingMonthlyExemptions(state, day) === 0) throw new Error('No exemptions remain this month');
  return { ...state, exemptDays: [...state.exemptDays, day] };
}

export function remainingMonthlyExemptions(state: CastleEconomy, day: string): number {
  return Math.max(0, 3 - state.exemptDays.filter(value => value.slice(0, 7) === day.slice(0, 7)).length);
}

export function changeDailyGoal(state: CastleEconomy, amountCents: number, today: string): CastleEconomy {
  const stamp = dateNumber(today);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Daily goal must be positive whole cents');
  if (today < state.activatedOn) throw new Error('Date precedes activation');
  const effectiveOn = new Date(stamp + 86400000).toISOString().slice(0, 10);
  dateNumber(effectiveOn);
  if (state.ledger.some(entry => entry.kind === 'goal-shortfall' && entry.date >= today)) throw new Error('Cannot change settled history');
  return { ...state, goalChanges: [...state.goalChanges.filter(change => change.effectiveOn !== effectiveOn), { effectiveOn, amountCents }].sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn)) };
}

export function recordEarning(state: CastleEconomy, sourceId: string, day: string, amountCents: number): CastleEconomy {
  dateNumber(day);
  if (!sourceId || !Number.isSafeInteger(amountCents) || amountCents <= 0 || day < state.activatedOn) throw new Error('Invalid earning');
  return appendEarning(state, sourceId, day, amountCents);
}

function appendEarning(state: CastleEconomy, sourceId: string, day: string, amountCents: number): CastleEconomy {
  const id = `earning:${sourceId}`;
  if (state.ledger.some(entry => entry.id === id)) return state;
  if (dayIsSettled(state, day)) throw new Error('Day has already settled');
  return { ...state, ledger: [...state.ledger, { id, date: day, amountCents, kind: 'earning' }] };
}

type NewCommitment = Omit<Commitment, 'completed' | 'actualValueCents' | 'earnedValueCents' | 'replacementIds'>;

function validTaskMinutes(minutes: number | undefined): minutes is number {
  return minutes !== undefined && Number.isFinite(minutes) && minutes > 0 && minutes <= 525600;
}

function describeOpenCommitment(state: CastleEconomy, task: QuickNote, day: string): NewCommitment {
  if (task.isDone || task.pendingReflection) throw new Error('Only open tasks can be committed.');
  if (state.commitments.some(item => item.id === task.id && item.date === day && item.replacementIds)) throw new Error('This commitment has been replaced.');
  const estimatedMinutes = task.durationMinutes;
  if (!validTaskMinutes(estimatedMinutes)) throw new Error('Set a valid time estimate before committing this task.');
  if (estimatedMinutes < 30) throw new Error('Castle commitments need an estimate of at least 30 minutes.');
  const commitment = {
    id: task.id, title: task.text, date: day, estimatedMinutes,
    estimatedValueCents: taskValueCents(estimatedMinutes, task.priority ?? 'medium', task.deadline, day),
  };
  validateNewCommitment(state, commitment);
  return commitment;
}

export function previewOpenCommitment(state: CastleEconomy, task: QuickNote, day: string) {
  try {
    return { commitment: describeOpenCommitment(state, task, day) } as const;
  } catch (error) {
    return { reason: error instanceof Error ? error.message : 'This task cannot be committed.' } as const;
  }
}

export function commitOpenTask(state: CastleEconomy, task: QuickNote, day: string, expectedValueCents?: number): CastleEconomy {
  const commitment = describeOpenCommitment(state, task, day);
  if (expectedValueCents !== undefined && commitment.estimatedValueCents !== expectedValueCents) throw new Error('This task changed. Review its updated penalty and try again.');
  return appendCommitment(state, commitment);
}

function validateNewCommitment(state: CastleEconomy, task: NewCommitment): void {
  dateNumber(task.date);
  if (!task.id || !task.title.trim() || !Number.isSafeInteger(task.estimatedValueCents) || task.estimatedValueCents <= 0 || task.date < state.activatedOn) throw new Error('Invalid commitment');
  if (task.estimatedMinutes !== undefined && !validTaskMinutes(task.estimatedMinutes)) throw new Error('Invalid time estimate');
  if (state.ledger.some(entry => entry.id === `shortfall:${task.date}`)) throw new Error('Day has already settled');
  if (taskWasCompleted(state, task.id)) throw new Error('Task is already complete');
  if (state.commitments.some(item => item.id === task.id && item.date === task.date)) throw new Error('Task already committed');
}

function appendCommitment(state: CastleEconomy, task: NewCommitment): CastleEconomy {
  return { ...state, commitments: [...state.commitments, { ...task, completed: false }] };
}

export function commitTask(state: CastleEconomy, task: NewCommitment): CastleEconomy {
  validateNewCommitment(state, task);
  return appendCommitment(state, task);
}

export function substituteWithOpenTasks(state: CastleEconomy, taskId: string, day: string, tasks: QuickNote[], replacements: { id: string; estimatedValueCents: number }[]): CastleEconomy {
  const original = tasks.find(task => task.id === taskId);
  if (original?.isDone || original?.pendingReflection) throw new Error('Reflect on the finished task instead of replacing it.');
  const commitments = replacements.map(replacement => {
    const task = tasks.find(item => item.id === replacement.id);
    if (!task) throw new Error('A replacement task is no longer available.');
    const commitment = describeOpenCommitment(state, task, day);
    if (commitment.estimatedValueCents !== replacement.estimatedValueCents) throw new Error('A replacement task changed. Review its updated value and try again.');
    return commitment;
  });
  return substituteCommitment(state, taskId, day, commitments);
}

export function completeCommitment(state: CastleEconomy, taskId: string, day: string, actualValueCents: number): CastleEconomy {
  const commitment = state.commitments.find(item => item.id === taskId && item.date === day);
  if (!commitment) throw new Error('Commitment not found');
  if (commitment.replacementIds) throw new Error('Commitment has been replaced');
  if (taskWasCompleted(state, taskId)) return state;
  const prior = state.ledger.filter(entry => entry.id.startsWith(`earning:progress:${day}:${taskId}:`)).reduce((sum, entry) => sum + entry.amountCents, 0);
  if (!Number.isSafeInteger(actualValueCents) || actualValueCents < 0 || actualValueCents < prior) throw new Error('Actual value cannot be below previously credited progress');
  if (state.ledger.some(entry => entry.id === `shortfall:${day}`)) throw new Error('Day has already settled');
  const remaining = actualValueCents - prior;
  const withEarning = remaining ? recordEarning(state, `commitment:${day}:${taskId}`, day, remaining) : state;
  return { ...withEarning, commitments: state.commitments.map(item => item === commitment ? { ...item, completed: true, actualValueCents } : item) };
}

/** A replacement may consist of several new commitments; nested replacements are not allowed. */
export function substituteCommitment(state: CastleEconomy, taskId: string, day: string, replacements: NewCommitment[]): CastleEconomy {
  const original = state.commitments.find(item => item.id === taskId && item.date === day);
  if (!original || original.completed || original.replacementIds) throw new Error('An unfinished commitment is required');
  if (state.ledger.some(entry => entry.id === `shortfall:${day}`)) throw new Error('Day has already settled');
  if (state.commitments.some(item => item.date === day && item.replacementIds?.includes(taskId))) throw new Error('Replacement commitments cannot be substituted again');
  if (!replacements.length || replacements.some(item => item.date !== day) || replacements.reduce((sum, item) => sum + item.estimatedValueCents, 0) < original.estimatedValueCents) throw new Error('Replacement value must meet the original value');
  let next = state;
  for (const item of replacements) next = commitTask(next, item);
  return { ...next, commitments: next.commitments.map(item => item.id === taskId && item.date === day ? { ...item, replacementIds: replacements.map(replacement => replacement.id) } : item) };
}

/** The caller supplies a stable progress ID so retries cannot pay the same work twice. */
export function partialProgressLedgerId(taskId: string, day: string, progressId: string): string {
  return `earning:progress:${day}:${taskId}:${progressId}`;
}

export function recordPartialProgress(state: CastleEconomy, taskId: string, day: string, progressId: string, actualValueCents: number, postingDay = day): CastleEconomy {
  const commitment = state.commitments.find(item => item.id === taskId && item.date === day);
  if (!commitment || commitment.completed || commitment.replacementIds) throw new Error('An unfinished commitment is required');
  if (!progressId) throw new Error('A progress ID is required');
  dateNumber(postingDay);
  if (postingDay < day || postingDay < state.activatedOn || !Number.isSafeInteger(actualValueCents) || actualValueCents < 0) throw new Error('Invalid earning');
  return appendEarning(state, `progress:${day}:${taskId}:${progressId}`, postingDay, actualValueCents);
}

function priorProgressCents(state: CastleEconomy, taskId: string): number {
  return state.ledger.reduce((sum, entry) => {
    if (entry.kind !== 'earning') return sum;
    const progressKey = /^earning:progress:\d{4}-\d{2}-\d{2}:(.*):[^:]+$/.exec(entry.id);
    return progressKey?.[1] === taskId ? sum + entry.amountCents : sum;
  }, 0);
}

function uncreditedReflectionCents(state: CastleEconomy, task: QuickNote, totalCents: number, day: string): number {
  const priorValue = task.partialMinutes
    ? taskValueCents(task.partialMinutes, task.priority ?? 'medium', task.deadline, day)
    : 0;
  return Math.max(0, totalCents - Math.max(priorValue, priorProgressCents(state, task.id)));
}

export function recordReflectedProgress(state: CastleEconomy, task: QuickNote, day: string, progressId: string, totalMinutes: number, postingDay: string): CastleEconomy {
  const commitment = state.commitments.find(item => item.id === task.id && item.date === day);
  if (!commitment || commitment.completed || commitment.replacementIds || taskWasCompleted(state, task.id)) throw new Error('An unfinished commitment is required');
  const totalCents = taskValueCents(totalMinutes, task.priority ?? 'medium', task.deadline, postingDay);
  const increment = uncreditedReflectionCents(state, task, totalCents, postingDay);
  return recordPartialProgress(state, task.id, day, progressId, increment, postingDay);
}

/** Keep the commitment date for identity and penalty coverage, even when payment posts later. */
export function registerReflectedTasks(state: CastleEconomy, tasks: QuickNote[], day: string, commitmentDay: string | null = day): CastleEconomy {
  dateNumber(day);
  return tasks.reduce((economy, task) => {
    if (taskWasCompleted(economy, task.id)) return economy;
    const commitment = economy.commitments.find(item => item.id === task.id && item.date === commitmentDay && !item.replacementIds);
    if (!commitment && (day < economy.activatedOn || dayIsSettled(economy, day))) return economy;
    const { actualMinutes, partialMinutes = 0 } = task;
    if (!validTaskMinutes(actualMinutes) || actualMinutes < partialMinutes) throw new Error('Enter actual time for each completed task, including previously recorded work');
    const earnedValueCents = taskValueCents(actualMinutes, task.priority ?? 'medium', task.deadline, day);
    const increment = uncreditedReflectionCents(economy, task, earnedValueCents, day);
    if (!commitment) return appendEarning(economy, `task:${day}:${task.id}`, day, increment);
    if (day < commitment.date || day < economy.activatedOn) throw new Error('Invalid earning date');
    const actualValueCents = taskValueCents(actualMinutes, task.priority ?? 'medium', task.deadline, commitment.date);
    const credited = appendEarning(economy, `commitment:${commitment.date}:${task.id}`, day, increment);
    return { ...credited, commitments: credited.commitments.map(item => item === commitment ? {
      ...item, completed: true, actualValueCents, earnedValueCents,
    } : item) };
  }, state);
}

