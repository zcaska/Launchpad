import type { AppData, QuickNote } from '../types';
import { findReflectionCommitment, partialProgressLedgerId, recordReflectedProgress, registerReflectedTasks, type CastleEconomy } from './castleEconomy';
import { formatDateKey, recordTaskCompletion } from './gamification';
import { tasksDueToday } from './taskPeriod';

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function currentDayWorkIsComplete(notes: QuickNote[], now: Date, economy?: CastleEconomy): boolean {
  const today = localDay(now);
  return !tasksDueToday(notes, now).some(task => !task.isDone)
    && !(economy?.commitments ?? []).some(item => item.date === today && !item.replacementIds
      && !item.completed && !notes.some(task => task.id === item.id && task.isDone));
}

/** Return a committed reflection batch only after every active commitment that day is done. */
function getCommittedReflectionTasks(notes: QuickNote[], now: Date, economy: CastleEconomy): QuickNote[] {
  const byId = new Map(notes.map(task => [task.id, task]));
  const today = localDay(now);
  const days = [...new Set(economy.commitments.map(item => item.date))].sort();

  // Include every recoverable batch after today's active work is complete.
  const ready: QuickNote[] = [];
  for (const day of [today, ...days.filter(value => value < today)]) {
    const commitments = economy.commitments.filter(item => item.date === day && !item.replacementIds);
    if (commitments.length === 0) continue;
    const tasks = commitments.map(item => byId.get(item.id));
    if (day === today && tasks.some((task, index) => !commitments[index].completed && (!task || !task.isDone))) continue;
    if (day === today && tasksDueToday(notes, now).some(task => !task.isDone)) continue;
    // Yesterday's finished work can still be reflected after rollover, even if
    // other commitments from that day remain unfinished and will be penalized.
    const pending = tasks.filter((task): task is QuickNote => !!task?.isDone && !!task.pendingReflection
      && (commitments.some(item => item.id === task.id && item.completed) || findReflectionCommitment(economy, task, today)?.date === day));
    ready.push(...pending);
  }
  // Preserve the existing flow for work that was not explicitly committed.
  const dueToday = tasksDueToday(notes, now);
  if (dueToday.length > 0 && dueToday.every(task => task.isDone)) {
    const completed = dueToday.filter(task => task.pendingReflection);
    ready.push(...completed);
  }
  if (notes.length > 0 && notes.every(task => task.isDone)) ready.push(...notes.filter(task => task.pendingReflection));
  if (economy.commitments.some(item => item.date === today && !item.replacementIds)) {
    ready.push(...notes.filter(task => task.isDone && task.pendingReflection && task.completedOn && task.completedOn <= today));
  }
  return [...new Map(ready.map(task => [task.id, task])).values()];
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
  const todayKey = localDay(now);
  if (!currentDayWorkIsComplete(notes, now, economy)) return [];
  // Unfinished partial work can be reviewed after its day has ended, without
  // losing that work or waiving the missed commitment's settlement.
  const pendingProgress = notes.filter(task => !task.isDone && task.pendingProgress?.some(entry => entry.date < todayKey));
  if (economy) return [...new Map([...getCommittedReflectionTasks(notes, now, economy), ...pendingProgress].map(task => [task.id, task])).values()];
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
  return notes.map(task => ids.has(task.id) && task.isDone ? {
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
  return registerCompletedTasks(data, startedAt, submittedAt, selectedTasks, { questions, answers });
}

export function registerCompletedTasks(data: AppData, startedAt: Date, submittedAt: Date, selectedTasks?: QuickNote[], review?: { questions: string[]; answers: string[] }): AppData {
  const reviewRequired = data.settings.dailyReviewRequired !== false;
  if (reviewRequired && !review) return data;
  if (reviewRequired && !currentDayWorkIsComplete(data.quickNotes, submittedAt, data.castleEconomy)) return data;
  const eligible = reviewRequired ? new Set(getReflectionTasks(data.quickNotes, startedAt, data.castleEconomy).map(task => task.id)) : undefined;
  const selection = selectedTasks && new Set(selectedTasks.map(task => task.id));
  const tasks = selection
    ? data.quickNotes.filter(task => selection.has(task.id) && ((task.isDone && task.pendingReflection) || (!task.isDone && !!task.pendingProgress?.length)))
    : getReflectionTasks(data.quickNotes, startedAt, data.castleEconomy);
  if (tasks.length === 0) return data;
  if (eligible && tasks.some(task => !eligible.has(task.id))) return data;
  const completedTasks = tasks.filter(task => task.isDone && task.pendingReflection);
  const ids = new Set(completedTasks.map(task => task.id));
  const startedDay = formatDateKey(startedAt);
  if (data.castleEconomy && !canRegisterReflectionTasks(data.castleEconomy, completedTasks, startedAt, submittedAt)) return data;
  const progressData = releasePendingProgress(data, submittedAt, tasks.filter(task => !task.isDone).map(task => task.id), reviewRequired ? startedDay : undefined);
  if (tasks.some(task => !task.isDone) && progressData === data) return data;
  const castleEconomy = progressData.castleEconomy
    ? completedTasks.reduce((economy, task) => {
      // A manual reflection may contain commitments from different days.
      // Attribute each task independently, preserving the original day when
      // it is still open and falling back to submission day after settlement.
      const commitment = findReflectionCommitment(economy, task, startedDay);
      const day = reflectionCreditDay(economy, commitment?.date ?? startedDay, formatDateKey(submittedAt));
      return registerReflectedTasks(economy, [task], day, commitment?.date ?? null);
    }, progressData.castleEconomy)
    : undefined;
  let gamification = data.gamification;
  let growthHistory = data.growthHistory;
  for (const task of completedTasks) {
    if (task.rewardAlreadyGranted) continue;
    const result = recordTaskCompletion(gamification, growthHistory, task, startedAt);
    gamification = result.gamification;
    growthHistory = result.history;
  }
  return {
    ...progressData,
    ...(data.castleEconomy ? { castleEconomy } : {}),
    gamification,
    growthHistory,
    ...(review ? { reflections: [...(data.reflections || []), {
      date: submittedAt.toISOString(), questions: [...review.questions], answers: [...review.answers], taskTitles: tasks.map(task => task.text),
    }] } : {}),
    quickNotes: progressData.quickNotes.filter(task => !ids.has(task.id)),
  };
}

/** Record partial manual time and reflection; the stable entry ID makes replay harmless. */
export function applyPartialTaskReflection(data: AppData, entry: { taskId: string; date: string; id: string; minutes: number }, submittedAt: Date, questions: string[], answers: string[]): AppData {
  if (!validReflection(questions, answers)) return data;
  return registerPartialProgress(data, entry, submittedAt, { questions, answers });
}

export function registerPartialProgress(data: AppData, entry: { taskId: string; date: string; id: string; minutes: number }, submittedAt: Date, review?: { questions: string[]; answers: string[] }): AppData {
  const task = data.quickNotes.find(item => item.id === entry.taskId);
  if (!task || task.isDone || task.pendingReflection || !data.castleEconomy || !Number.isSafeInteger(entry.minutes) || entry.minutes <= 0) return data;
  const ledgerId = partialProgressLedgerId(entry.taskId, entry.date, entry.id);
  if (data.castleEconomy.ledger.some(item => item.id === ledgerId)) return data;
  if (task.pendingProgress?.some(item => item.id === entry.id && item.date === entry.date)) return data;
  const totalMinutes = (task.partialMinutes || 0) + (task.pendingProgress ?? []).reduce((sum, item) => sum + item.minutes, 0) + entry.minutes;
  if (totalMinutes > 525600) throw new Error('Partial time exceeds the remaining supported final total');
  const submittedDay = formatDateKey(submittedAt);
  if (entry.date > submittedDay) return data;
  if (!entry.id || !data.castleEconomy.commitments.some(item => item.id === task.id && item.date === entry.date && !item.completed && !item.replacementIds)) return data;
  if (data.settings.dailyReviewRequired !== false) {
    return { ...data, quickNotes: data.quickNotes.map(item => item.id === task.id
      ? { ...item, pendingProgress: [...(item.pendingProgress ?? []), { id: entry.id, date: entry.date, minutes: entry.minutes }] } : item) };
  }
  // If review was switched off, pay any already recorded entries before this one.
  const released = releasePendingProgress(data, submittedAt, [task.id]);
  const paidTask = released.quickNotes.find(item => item.id === task.id)!;
  const postingDay = reflectionCreditDay(released.castleEconomy!, entry.date, submittedDay);
  const castleEconomy = recordReflectedProgress(released.castleEconomy!, paidTask, entry.date, entry.id, totalMinutes, postingDay);
  return {
    ...released,
    castleEconomy,
    quickNotes: released.quickNotes.map(item => item.id === task.id
      ? { ...item, partialMinutes: totalMinutes }
      : item),
    ...(review ? { reflections: [...(data.reflections || []), {
      date: submittedAt.toISOString(), questions: [...review.questions], answers: [...review.answers], taskTitles: [task.text],
    }] } : {}),
  };
}

/** Release recorded partial work exactly once. Reviews only accept ended days. */
export function releasePendingProgress(data: AppData, submittedAt: Date, taskIds?: string[], beforeDay?: string): AppData {
  if (!data.castleEconomy) return data;
  if (data.settings.dailyReviewRequired !== false && !beforeDay) return data;
  let economy = data.castleEconomy;
  let changed = false;
  const submittedDay = formatDateKey(submittedAt);
  const quickNotes = data.quickNotes.map(task => {
    if (task.isDone || (taskIds && !taskIds.includes(task.id)) || !task.pendingProgress?.length) return task;
    let partialMinutes = task.partialMinutes ?? 0;
    const remaining: NonNullable<QuickNote['pendingProgress']> = [];
    for (const entry of task.pendingProgress) {
      if (entry.date > submittedDay || (beforeDay && entry.date >= beforeDay)) { remaining.push(entry); continue; }
      const ledgerId = partialProgressLedgerId(task.id, entry.date, entry.id);
      if (!economy.ledger.some(item => item.id === ledgerId)) {
        const postingDay = reflectionCreditDay(economy, entry.date, submittedDay);
        economy = recordReflectedProgress(economy, { ...task, partialMinutes }, entry.date, entry.id, partialMinutes + entry.minutes, postingDay);
      }
      partialMinutes += entry.minutes;
      changed = true;
    }
    return remaining.length === task.pendingProgress.length ? task : { ...task, partialMinutes, pendingProgress: remaining.length ? remaining : undefined };
  });
  return changed ? { ...data, castleEconomy: economy, quickNotes } : data;
}
