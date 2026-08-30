import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  getMonthGridRange,
  getTaskOccurrenceCount,
  getWeekRange,
  normalizeWeekStartDay,
  taskOccursOnDate,
  ymdKST
} from '../src/features/calendar/calendarHelper.js';

test('주 시작일에 맞춰 7일 범위를 계산한다', () => {
  const monday = getWeekRange(new Date(2026, 7, 30), 1);
  assert.equal(ymdKST(monday.start), '2026-08-24');
  assert.equal(ymdKST(monday.end), '2026-08-30');

  const sunday = getWeekRange(new Date(2026, 7, 30), 0);
  assert.equal(ymdKST(sunday.start), '2026-08-30');
  assert.equal(ymdKST(sunday.end), '2026-09-05');
  assert.equal(normalizeWeekStartDay(9), 1);
});

test('월간 달력 범위는 주 시작일부터 42일이다', () => {
  const range = getMonthGridRange(new Date(2026, 7, 15), 1);
  assert.equal(ymdKST(range.start), '2026-07-27');
  assert.equal(ymdKST(range.end), '2026-09-06');
});

test('기간 작업과 반복 작업의 발생일을 계산한다', () => {
  const rangeTask = { date: '2026-08-29', endDate: '2026-08-31' };
  assert.equal(taskOccursOnDate(rangeTask, new Date(2026, 7, 30), '2026-08-30'), true);
  assert.equal(taskOccursOnDate(rangeTask, new Date(2026, 8, 1), '2026-09-01'), false);

  const recurring = {
    date: '2026-08-24',
    repeatEnabled: true,
    repeatDays: [1, 3],
    countAnchor: 3,
    repeatStartDate: '2026-08-24'
  };
  assert.equal(taskOccursOnDate(recurring, new Date(2026, 7, 26), '2026-08-26'), true);
  assert.equal(getTaskOccurrenceCount(recurring, addDays(new Date(2026, 7, 24), 2)), 4);
});
