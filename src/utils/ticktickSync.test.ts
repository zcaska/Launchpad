import {
  priorityToTickTick,
  priorityFromTickTick,
  mapQuickNoteToTickTick,
  mapTickTickToQuickNote,
  reconcileTasks,
} from './ticktickSync';
import { QuickNote } from '../types';
import { TickTickTask } from '../types/ticktick';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing ticktickSync.ts ---');

// 1. priorityToTickTick
{
  assertEqual(priorityToTickTick('urgent'), 5, 'priorityToTickTick: urgent -> 5');
  assertEqual(priorityToTickTick('high'), 5, 'priorityToTickTick: high -> 5');
  assertEqual(priorityToTickTick('medium'), 3, 'priorityToTickTick: medium -> 3');
  assertEqual(priorityToTickTick('low'), 1, 'priorityToTickTick: low -> 1');
  assertEqual(priorityToTickTick(undefined), 0, 'priorityToTickTick: undefined -> 0');
  assertEqual(priorityToTickTick('' as any), 0, 'priorityToTickTick: empty string -> 0');
}

// 2. priorityFromTickTick
{
  assertEqual(priorityFromTickTick(5), 'high', 'priorityFromTickTick: 5 -> high');
  assertEqual(priorityFromTickTick(6), 'high', 'priorityFromTickTick: 6 -> high');
  assertEqual(priorityFromTickTick(3), 'medium', 'priorityFromTickTick: 3 -> medium');
  assertEqual(priorityFromTickTick(4), 'medium', 'priorityFromTickTick: 4 -> medium');
  assertEqual(priorityFromTickTick(1), 'low', 'priorityFromTickTick: 1 -> low');
  assertEqual(priorityFromTickTick(2), 'low', 'priorityFromTickTick: 2 -> low');
  assertEqual(priorityFromTickTick(0), undefined, 'priorityFromTickTick: 0 -> undefined');
  assertEqual(priorityFromTickTick(-1), undefined, 'priorityFromTickTick: -1 -> undefined');
}

// 3. mapQuickNoteToTickTick
{
  const sampleNote: QuickNote = {
    id: 'note_1',
    text: 'Buy groceries',
    description: 'Milk, bread, and eggs',
    isDone: false,
    createdAt: Date.now(),
    priority: 'high',
    deadline: '2026-10-30',
    subtasks: [
      { id: 'sub_1', text: 'Whole milk', isDone: true },
      { id: 'sub_2', text: 'Sourdough', isDone: false },
    ],
  };

  const mapped = mapQuickNoteToTickTick(sampleNote, 'proj_default');
  assertEqual(mapped.title, 'Buy groceries', 'mapQuickNoteToTickTick: title mapped');
  assertEqual(mapped.content, 'Milk, bread, and eggs', 'mapQuickNoteToTickTick: content mapped');
  assertEqual(mapped.status, 0, 'mapQuickNoteToTickTick: status is 0 when isDone is false');
  assertEqual(mapped.priority, 5, 'mapQuickNoteToTickTick: priority mapped');
  assertEqual(mapped.projectId, 'proj_default', 'mapQuickNoteToTickTick: fallback targetProjectId used');
  assert(Boolean(mapped.dueDate && mapped.dueDate.startsWith('2026-10-30')), 'mapQuickNoteToTickTick: deadline mapped to ISO format');
  assertEqual(mapped.items?.length, 2, 'mapQuickNoteToTickTick: 2 subtasks mapped');
  assertEqual(mapped.items?.[0].status, 1, 'mapQuickNoteToTickTick: subtask 1 status is 1');
  assertEqual(mapped.items?.[0].title, 'Whole milk', 'mapQuickNoteToTickTick: subtask 1 title mapped');
  assertEqual(mapped.items?.[1].status, 0, 'mapQuickNoteToTickTick: subtask 2 status is 0');
  assertEqual(mapped.id, undefined, 'mapQuickNoteToTickTick: no id if ticktickTaskId is not present');

  const noteWithId: QuickNote = {
    ...sampleNote,
    isDone: true,
    ticktickTaskId: 'tt_task_123',
    ticktickProjectId: 'proj_override',
  };
  const mappedWithId = mapQuickNoteToTickTick(noteWithId, 'proj_default');
  assertEqual(mappedWithId.id, 'tt_task_123', 'mapQuickNoteToTickTick: id preserved from ticktickTaskId');
  assertEqual(mappedWithId.projectId, 'proj_override', 'mapQuickNoteToTickTick: projectId preserved from ticktickProjectId');
  assertEqual(mappedWithId.status, 2, 'mapQuickNoteToTickTick: status is 2 when isDone is true');
}

// 4. mapTickTickToQuickNote
{
  const ttTask: TickTickTask = {
    id: 'task_xyz',
    projectId: 'proj_xyz',
    title: 'Review pull request',
    content: 'Check for test coverage',
    priority: 3,
    status: 2,
    dueDate: '2026-10-28T10:00:00.000Z',
    items: [
      { id: 'sub_a', title: 'Unit tests', status: 1 },
      { id: 'sub_b', title: 'Integration tests', status: 0 },
    ],
  };

  const note = mapTickTickToQuickNote(ttTask);
  assertEqual(note.id, 'tt_task_xyz', 'mapTickTickToQuickNote: id formatted as tt_<id>');
  assertEqual(note.text, 'Review pull request', 'mapTickTickToQuickNote: text mapped');
  assertEqual(note.description, 'Check for test coverage', 'mapTickTickToQuickNote: description mapped');
  assertEqual(note.isDone, true, 'mapTickTickToQuickNote: isDone is true for status 2');
  assertEqual(note.priority, 'medium', 'mapTickTickToQuickNote: priority mapped');
  assertEqual(note.source, 'ticktick', 'mapTickTickToQuickNote: source is ticktick');
  assertEqual(note.ticktickTaskId, 'task_xyz', 'mapTickTickToQuickNote: ticktickTaskId matches');
  assertEqual(note.ticktickProjectId, 'proj_xyz', 'mapTickTickToQuickNote: ticktickProjectId matches');
  assertEqual(note.syncStatus, 'synced', 'mapTickTickToQuickNote: syncStatus is synced');
  assertEqual(note.deadline, '2026-10-28', 'mapTickTickToQuickNote: deadline extracted as YYYY-MM-DD');
  assertEqual(note.subtasks?.length, 2, 'mapTickTickToQuickNote: subtasks mapped');
  assertEqual(note.subtasks?.[0].isDone, true, 'mapTickTickToQuickNote: subtask 0 isDone true');
  assertEqual(note.subtasks?.[0].text, 'Unit tests', 'mapTickTickToQuickNote: subtask 0 text mapped');
  assertEqual(note.subtasks?.[1].isDone, false, 'mapTickTickToQuickNote: subtask 1 isDone false');
}

// 5. reconcileTasks
{
  const localNote: QuickNote = {
    id: 'local_1',
    text: 'Local task untouched',
    isDone: false,
    createdAt: 1000,
    source: 'local',
  };

  const existingSyncedNote: QuickNote = {
    id: 'tt_remote_1',
    text: 'Old title',
    description: 'Old desc',
    isDone: false,
    createdAt: 2000,
    source: 'ticktick',
    ticktickTaskId: 'remote_1',
    ticktickProjectId: 'proj_1',
    syncStatus: 'pending',
  };

  const remoteTasks: TickTickTask[] = [
    {
      id: 'remote_1',
      projectId: 'proj_1',
      title: 'Updated title from remote',
      content: 'Updated desc from remote',
      priority: 5,
      status: 2,
      dueDate: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'remote_2',
      projectId: 'proj_1',
      title: 'Brand new remote task',
      content: 'New content',
      priority: 1,
      status: 0,
    },
  ];

  const reconciled = reconcileTasks([localNote, existingSyncedNote], remoteTasks, 'proj_1');

  assertEqual(reconciled.length, 3, 'reconcileTasks: total notes is 3 (1 local + 1 updated + 1 new remote)');

  const foundLocal = reconciled.find(n => n.id === 'local_1');
  assert(Boolean(foundLocal), 'reconcileTasks: local note preserved');
  assertEqual(foundLocal?.text, 'Local task untouched', 'reconcileTasks: local note contents untouched');

  const foundUpdated = reconciled.find(n => n.ticktickTaskId === 'remote_1');
  assert(Boolean(foundUpdated), 'reconcileTasks: synced note found');
  assertEqual(foundUpdated?.text, 'Updated title from remote', 'reconcileTasks: title updated from remote');
  assertEqual(foundUpdated?.description, 'Updated desc from remote', 'reconcileTasks: description updated');
  assertEqual(foundUpdated?.isDone, true, 'reconcileTasks: isDone updated to true');
  assertEqual(foundUpdated?.priority, 'high', 'reconcileTasks: priority updated');
  assertEqual(foundUpdated?.deadline, '2026-11-01', 'reconcileTasks: deadline updated');
  assertEqual(foundUpdated?.syncStatus, 'synced', 'reconcileTasks: syncStatus set to synced');

  const foundNew = reconciled.find(n => n.ticktickTaskId === 'remote_2');
  assert(Boolean(foundNew), 'reconcileTasks: new remote note appended');
  assertEqual(foundNew?.id, 'tt_remote_2', 'reconcileTasks: new remote note id formatted');
  assertEqual(foundNew?.text, 'Brand new remote task', 'reconcileTasks: new remote note text mapped');
  assertEqual(foundNew?.source, 'ticktick', 'reconcileTasks: new note source set to ticktick');
  assertEqual(foundNew?.syncStatus, 'synced', 'reconcileTasks: new note syncStatus set to synced');

  // Verify missing remote task is preserved
  const missingRemoteReconciled = reconcileTasks([localNote, existingSyncedNote], [], 'proj_1');
  assertEqual(missingRemoteReconciled.length, 2, 'reconcileTasks: notes preserved when remote is empty');
}

if (failures > 0) {
  console.error(`\nTotal failures: ${failures}`);
  process.exit(1);
} else {
  console.log('\nAll tests passed successfully! 🎉');
  process.exit(0);
}
