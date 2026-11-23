import type { AppData, QuickNote } from '../types';
import { findReflectionCommitment, partialProgressLedgerId, recordReflectedProgress, registerReflectedTasks, type CastleEconomy } from './castleEconomy';
import { formatDateKey, recordTaskCompletion } from './gamification';
import { tasksDueToday } from './taskPeriod';

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Return a committed reflection batch only after every active commitment that day is done. */
function getCommittedReflectionTasks(notes: QuickNote[], now: Date, economy: CastleEconomy): QuickNote[] {
  const byId = new Map(notes.map(task => [task.id, task]));
  const today = localDay(now);
  const days = [...new Set(economy.commitments.map(item => item.date))].sort();
  const hasCurrentCommitments = economy.commitments.some(item => item.date === today && !item.replacementIds && !item.completed);

  // Prefer today's batch. If it is not ready, an older completed batch remains recoverable.
  for (const day of [today, ...days.filter(value => value < today)]) {
    const commitments = economy.commitments.filter(item => item.date === day && !item.replacementIds && !item.completed);
    if (commitments.length === 0) continue;
    const tasks = commitments.map(item => byId.get(item.id));
    if (day === today && tasks.some(task => !task || !task.isDone)) continue;
    // Yesterday's finished work can still be reflected after rollover, even if
    // other commitments from that day remain unfinished and will be penalized.
    const pending = tasks.filter((task): task is QuickNote => !!task?.isDone && !!task.pendingReflection
      && findReflectionCommitment(economy, task, today)?.date === day);
    if (pending.length) return pending;
  }
  if (hasCurrentCommitments) return [];
  // Preserve the existing flow for work that was not explicitly committed.
  const dueToday = tasksDueToday(notes, now);
  if (dueToday.length > 0 && dueToday.every(task => task.isDone)) {
    const completed = dueToday.filter(task => task.pendingReflection);
    if (completed.length) return completed;
  }
  return notes.length > 0 && notes.every(task => task.isDone)
    ? notes.filter(task => task.pendingReflection)
    : [];
}

/** Completed current-day commitments that can be reflected through an explicit user action. */
export function getCompletedCommittedReflectionTasks(notes: QuickNote[], now: Date, economy: CastleEconomy): QuickNote[] {
  const day = localDay(now);
  const ids = new Set(economy.commitments.filter(item => item.date === day && !item.replacementIds && !item.completed).map(item => item.id));
  return notes.filter(task => ids.has(task.id) && task.isDone && task.pendingReflection);
}

/** An explicit Daily Review can reflect completed work while other tasks are still open. */
export function getDailyReviewTasks(notes: QuickNote[]): QuickNote[] {
  return notes.filter(task => task.isDone && task.pendingReflection);
}

/** Today's completed work is ready only after all of today's commitments are complete. */
export function getReflectionTasks(notes: QuickNote[], now: Date, economy?: CastleEconomy): QuickNote[] {
  if (economy) return getCommittedReflectionTasks(notes, now, economy);
  const today = tasksDueToday(notes, now);
  if (today.length > 0 && today.every(task => task.isDone)) {
    const completed = today.filter(task => task.pendingReflection);
    if (completed.length > 0) return completed;
  }
  // Also support finishing an undated/past task list through the Tasks view.
  return notes.length > 0 && notes.every(task => task.isDone)
    ? notes.filter(task => task.pendingReflection) : [];
}

/** Closing/leaving reflection resets only the work awaiting that reflection. */
export function resetReflectionTasks(notes: QuickNote[], now: Date, economy?: CastleEconomy, taskIds?: string[]): QuickNote[] {
  const ids = new Set(taskIds ?? getReflectionTasks(notes, now, economy).map(task => task.id));
  if (ids.size === 0) return notes;
  return notes.map(task => ids.has(task.id) ? {
    ...task, isDone: false, pendingReflection: false, completedOn: undefined, actualMinutes: undefined,
    subtasks: task.subtasks?.map(subtask => ({ ...subtask, isDone: false })),
  } : task);
}

function validReflection(questions: string[], answers: string[]): boolean {
  return questions.length === 5 && answers.length === 5
    && answers.every(answer => answer.trim().split(/\s+/u).filter(Boolean).length >= 150);
}

function isOpenDay(economy: CastleEconomy, day: string): boolean {
  return day >= economy.activatedOn && !economy.ledger.some(item => item.id === `shortfall:${day}`);
}

function reflectionCreditDay(economy: CastleEconomy, originalDay: string, submittedDay: string): string {
  return isOpenDay(economy, originalDay) ? originalDay : submittedDay;
}

/** A closed submission day cannot accept work whose original day is also closed. */
export function canRegisterReflectionTasks(economy: CastleEconomy, tasks: QuickNote[], startedAt: Date, submittedAt: Date): boolean {
  const startedDay = formatDateKey(startedAt);
  const submittedDay = formatDateKey(submittedAt);
  return tasks.every(task => {
    const commitment = findReflectionCommitment(economy, task, startedDay);
    if (!commitment) return true;
    const day = reflectionCreditDay(economy, commitment.date, submittedDay);
    return commitment.date <= day && day <= submittedDay && isOpenDay(economy, day);
  });
}

/** Apply the final daily reflection as one idempotent app-data update. */
export function applyCompletedTaskReflection(data: AppData, startedAt: Date, submittedAt: Date, questions: string[], answers: string[], selectedTasks?: QuickNote[]): AppData {
  if (!validReflection(questions, answers)) return data;
  const selection = selectedTasks && new Set(selectedTasks.filter(task => task.isDone && task.pendingReflection).map(task => task.id));
  const tasks = selection
    ? data.quickNotes.filter(task => selection.has(task.id) && task.isDone && task.pendingReflection)
    : getReflectionTasks(data.quickNotes, startedAt, data.castleEconomy);
  if (tasks.length === 0) return data;
  const ids = new Set(tasks.map(task => task.id));
  const startedDay = formatDateKey(startedAt);
  if (data.castleEconomy && !canRegisterReflectionTasks(data.castleEconomy, tasks, startedAt, submittedAt)) return data;
  const castleEconomy = data.castleEconomy
    ? tasks.reduce((economy, task) => {
      // A manual reflection may contain commitments from different days.
      // Attribute each task independently, preserving the original day when
      // it is still open and falling back to submission day after settlement.
      const commitment = findReflectionCommitment(economy, task, startedDay);
      const day = reflectionCreditDay(economy, commitment?.date ?? startedDay, formatDateKey(submittedAt));
      return registerReflectedTasks(economy, [task], day, commitment?.date ?? null);
    }, data.castleEconomy)
    : undefined;
  let gamification = data.gamification;
  let growthHistory = data.growthHistory;
  for (const task of tasks) {
    if (task.rewardAlreadyGranted) continue;
    const result = recordTaskCompletion(gamification, growthHistory, task, startedAt);
    gamification = result.gamification;
    growthHistory = result.history;
  }
  return {
    ...data,
    ...(data.castleEconomy ? { castleEconomy } : {}),
    gamification,
    growthHistory,
    reflections: [...(data.reflections || []), {
      date: submittedAt.toISOString(), questions: [...questions], answers: [...answers], taskTitles: tasks.map(task => task.text),
    }],
    quickNotes: data.quickNotes.filter(task => !ids.has(task.id)),
  };
}

/** Record partial manual time and reflection; the stable entry ID makes replay harmless. */
export function applyPartialTaskReflection(data: AppData, entry: { taskId: string; date: string; id: string; minutes: number }, submittedAt: Date, questions: string[], answers: string[]): AppData {
  if (!validReflection(questions, answers)) return data;
  const task = data.quickNotes.find(item => item.id === entry.taskId);
  if (!task || task.isDone || task.pendingReflection || !data.castleEconomy || !Number.isSafeInteger(entry.minutes) || entry.minutes <= 0) return data;
  const ledgerId = partialProgressLedgerId(entry.taskId, entry.date, entry.id);
  if (data.castleEconomy.ledger.some(item => item.id === ledgerId)) return data;
  const totalMinutes = (task.partialMinutes || 0) + entry.minutes;
  if (totalMinutes > 525600) throw new Error('Partial time exceeds the remaining supported final total');
  const submittedDay = formatDateKey(submittedAt);
  if (entry.date > submittedDay) return data;
  const postingDay = reflectionCreditDay(data.castleEconomy, entry.date, submittedDay);
  const castleEconomy = recordReflectedProgress(data.castleEconomy, task, entry.date, entry.id, totalMinutes, postingDay);
  return {
    ...data,
    castleEconomy,
    quickNotes: data.quickNotes.map(item => item.id === task.id
      ? { ...item, partialMinutes: totalMinutes }
      : item),
    reflections: [...(data.reflections || []), {
      date: submittedAt.toISOString(), questions: [...questions], answers: [...answers], taskTitles: [task.text],
    }],
  };
}
