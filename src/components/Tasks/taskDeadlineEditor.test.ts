import assert from 'node:assert/strict';
import { projectDeadlineEditor } from './taskDeadlineEditor';

const timeZones = [
  {
    zone: 'Asia/Kolkata',
    offsetMinutes: -330,
    utc: '2026-11-21T23:30:41.123Z',
    offset: '2026-11-22 05:00:41.123+05:30',
    date: '2026-11-22',
    time: '05:00',
    rfcDate: '2026-11-22',
    rfcTime: '00:00',
  },
  {
    zone: 'America/Los_Angeles',
    offsetMinutes: 480,
    utc: '2026-11-22T02:30:41.123Z',
    offset: '2026-11-21T18:30:41.123-08:00',
    date: '2026-11-21',
    time: '18:30',
    rfcDate: '2026-11-21',
    rfcTime: '10:30',
  },
];

for (const fixture of timeZones) {
  process.env.TZ = fixture.zone;
  const observedZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date(2026, 10, 20, 8);
  assert.equal(now.getTimezoneOffset(), fixture.offsetMinutes, fixture.zone);

  for (const deadline of [fixture.utc, fixture.offset, ` ${fixture.utc} `]) {
    const editor = projectDeadlineEditor(deadline, now);
    assert.deepEqual([editor.date, editor.time], [fixture.date, fixture.time], deadline);
    assert.equal(editor.value, deadline, 'An unrelated edit preserves the original deadline verbatim');
    assert.equal(editor.withTime('05:15'), `${fixture.date} 05:15`, 'Editing time keeps the local calendar date');
    assert.equal(editor.withDate('2026-11-23'), `2026-11-23 ${fixture.time}`, 'Editing date keeps the local clock time');
    assert.equal(editor.withDate(fixture.date), deadline, 'Selecting the already active date preserves the original instant');
    assert.equal(editor.withTime(fixture.time), deadline, 'An unchanged clock time preserves the original instant');
    assert.equal(editor.withDate(''), fixture.time);
    assert.equal(editor.withTime(''), fixture.date);
  }

  for (const [deadline, date, time] of [
    ['Sat, 21 Nov 2026 18:30:00 GMT', fixture.rfcDate, fixture.rfcTime],
    ['11/21/2026 18:30', '2026-11-21', '18:30'],
  ]) {
    const editor = projectDeadlineEditor(deadline, now);
    assert.deepEqual([editor.date, editor.time], [date, time], deadline);
    assert.equal(editor.value, deadline);
    assert.equal(editor.withTime('05:15'), `${date} 05:15`);
  }

  for (const [deadline, date, time] of [
    ['', '', ''],
    ['2026-11-22', '2026-11-22', ''],
    ['17:45', '', '17:45'],
    ['2026-11-22 17:45', '2026-11-22', '17:45'],
    ['2026-11-22T17:45:00', '2026-11-22', '17:45'],
    ['2026-02-30', '2026-02-30', ''],
    ['2026-11-22T25:00:00Z', '2026-11-22', '25:00'],
    ['unparsed with time 17:45', '', '17:45'],
  ]) {
    const editor = projectDeadlineEditor(deadline, now);
    assert.deepEqual([editor.date, editor.time], [date, time], deadline);
    assert.equal(editor.value, deadline || undefined);
  }
  assert.equal(projectDeadlineEditor('17:45', now).withTime('18:00'), '2026-11-20 18:00');
  assert.equal(projectDeadlineEditor('', now).withTime('18:00'), '2026-11-20 18:00');
  assert.equal(projectDeadlineEditor('17:45', now).withDate('2026-11-22'), '2026-11-22 17:45');
  console.log(`Task deadline editor tests passed in ${fixture.zone} (observed ${observedZone}, offset ${now.getTimezoneOffset()} minutes)`);
}
