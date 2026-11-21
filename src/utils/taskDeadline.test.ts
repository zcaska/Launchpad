import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { QuickNote } from '../types';
import { defaultPeriodRange, parsePeriodDeadline, tasksDueToday, tasksInPeriod } from './taskPeriod';
import { calculateTaskUrgency, parseTaskDeadline } from './taskUrgency';

process.env.TZ = 'America/New_York';

const now = new Date('2026-03-02T17:00:00Z');
const task = (deadline: string): QuickNote => ({
  id: deadline, deadline, text: deadline, isDone: false, createdAt: now.getTime(),
});

test('impossible deadlines stay undated and carry no urgency', () => {
  const deadlines = [
    '2026-02-30',
    '2026-02-30Z',
    '2026-02-30T10:00',
    '2026-02-30T10:00:21.123-05:00',
    '2026-02-30 9:15',
    '2026-04-31 10:00Z',
    '2026-13-02 10:00',
    '2026-03-00T10:00Z',
    '2026-03-02 10:99',
    '2026-03-02T10:10:60',
    '2026-03-02T24:01',
    '2026-03-02T24:00:01Z',
    '2026-03-02T24:00:00.001Z',
    '2026-03-02T08:15+24:00',
    '24:00',
    '9:60',
    ' ',
  ];
  const notes = deadlines.map(task);
  const range = defaultPeriodRange('Today', now);
  assert.deepEqual(tasksInPeriod(notes, 'Undated', now, range).map(({ deadline }) => deadline), deadlines);
  assert.deepEqual(tasksDueToday(notes, now), []);
  for (const deadline of deadlines) {
    assert.equal(parsePeriodDeadline(deadline, now), null, deadline);
    assert.equal(parseTaskDeadline(deadline, now), null, deadline);
    assert.equal(calculateTaskUrgency(deadline, now).tier, 'no_deadline', deadline);
  }
});

test('valid deadlines resolve to the same instant in period and urgency', () => {
  const fixtures = [
    ['9:15', '2026-03-02T14:15:00.000Z'],
    [' 09:15 ', '2026-03-02T14:15:00.000Z'],
    [' 2026-03-02 ', '2026-03-03T04:59:59.999Z'],
    ['2028-02-29', '2028-03-01T04:59:59.999Z'],
    ['2028-02-29 09:15:45', '2028-02-29T14:15:45.000Z'],
    ['2026-03-02 9:15', '2026-03-02T14:15:00.000Z'],
    [' 2026-03-02 09:15:45.123+0530 ', '2026-03-02T03:45:45.123Z'],
    ['2026-03-02T09:15:45.123+05:30', '2026-03-02T03:45:45.123Z'],
    ['2026-03-02T03:45:45.123Z', '2026-03-02T03:45:45.123Z'],
    ['2026-03-02T24:00', '2026-03-03T05:00:00.000Z'],
    ['2026-03-02 24:00:00.000+05:30', '2026-03-02T18:30:00.000Z'],
    ['03/02/2026 18:30', '2026-03-02T23:30:00.000Z'],
    ['Mon, 02 Mar 2026 18:30:00 GMT', '2026-03-02T18:30:00.000Z'],
    ['2026-03-08 02:30', '2026-03-08T07:30:00.000Z'], // Native spring-forward behavior.
    ['2026-11-01T01:30', '2026-11-01T05:30:00.000Z'], // Native fall-back behavior.
  ];
  for (const [deadline, timestamp] of fixtures) {
    assert.equal(parsePeriodDeadline(deadline, now)?.toISOString(), timestamp, deadline);
    assert.equal(parseTaskDeadline(deadline, now)?.toISOString(), timestamp, deadline);
    assert.equal(calculateTaskUrgency(deadline, now).deadlineDate?.toISOString(), timestamp, deadline);
  }
});

test('clock deadlines stay on the reference day after their time has passed', () => {
  const deadline = ' 9:15 ';
  const notes = [task(deadline)];
  assert.deepEqual(tasksDueToday(notes, now), notes);
  assert.equal(calculateTaskUrgency(deadline, now).tier, 'overdue');
  assert.equal(calculateTaskUrgency(deadline, now).isDueToday, true);

  const tomorrow = new Date('2026-03-03T13:00:00Z');
  assert.deepEqual(tasksDueToday(notes, tomorrow), notes);
  assert.equal(calculateTaskUrgency(deadline, tomorrow).diffMs, 75 * 60_000);
});

test('date-only deadlines are due through the last millisecond of the local day', () => {
  const deadline = '2026-03-02';
  const notes = [task(deadline)];
  const lastMillisecond = new Date('2026-03-03T04:59:59.999Z');
  assert.equal(parsePeriodDeadline(deadline, lastMillisecond)?.getTime(), lastMillisecond.getTime());
  assert.deepEqual(tasksDueToday(notes, lastMillisecond), notes);
  assert.equal(calculateTaskUrgency(deadline, lastMillisecond).diffMs, 0);

  const midnight = new Date('2026-03-03T05:00:00.000Z');
  assert.deepEqual(tasksDueToday(notes, midnight), []);
  assert.equal(calculateTaskUrgency(deadline, midnight).diffMs, -1);
  assert.equal(calculateTaskUrgency(deadline, midnight).tier, 'overdue');
});
