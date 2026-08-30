import test from 'node:test';
import assert from 'node:assert/strict';

import { createCalendarController } from '../src/features/calendar/calendarController.js';
import { createCalendarEngine } from '../src/features/calendar/calendarEngine.js';
import { ymdKST } from '../src/features/calendar/calendarHelper.js';

const NOW = () => new Date(2026, 7, 30, 12);

test('CalendarEngine이 설정, 기준일과 작업 CRUD를 단독 변경한다', () => {
  const engine = createCalendarEngine({
    initialState: {
      tasks: [{ id: 1, title: '마감', date: '2026-08-30', complete: false }],
      viewMode: 'week',
      weekStartDay: 1
    },
    now: NOW
  });

  assert.equal(ymdKST(engine.getSnapshot().weekStart), '2026-08-24');
  engine.moveWeek(1);
  assert.equal(ymdKST(engine.getSnapshot().weekStart), '2026-08-31');
  engine.moveMonth(1);
  assert.equal(engine.getSnapshot().monthDate.getMonth(), 8);

  engine.toggleTaskComplete(1);
  assert.equal(engine.findTask(1).complete, true);
  engine.toggleTaskComplete(1, '2026-09-02');
  assert.equal(engine.findTask(1).occurrenceStatus['2026-09-02'], true);
  engine.upsertTask({ id: 2, title: '콘티', date: '' });
  assert.equal(engine.getSnapshot().tasks.length, 2);
  engine.deleteTask(1);
  assert.deepEqual(
    engine.getSnapshot().tasks.map((task) => task.id),
    [2]
  );

  engine.saveSettings({ viewMode: 'month', weekStartDay: 0 });
  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.viewMode, 'month');
  assert.equal(snapshot.weekStartDay, 0);
  assert.equal(ymdKST(snapshot.weekStart), '2026-08-30');
});

test('snapshot을 바꿔도 Engine 내부 작업은 바뀌지 않는다', () => {
  const engine = createCalendarEngine({
    initialState: { tasks: [{ id: 1, title: '원본', occurrenceStatus: {} }] },
    now: NOW
  });
  const snapshot = engine.getSnapshot();
  snapshot.tasks[0].title = '외부 변경';
  snapshot.tasks[0].occurrenceStatus.today = true;
  assert.deepEqual(engine.findTask(1), { id: 1, title: '원본', occurrenceStatus: {} });
});

test('Controller가 전역 호환 상태를 게시하고 변경 후 저장한다', async () => {
  const host = {};
  const calls = [];
  const engine = createCalendarEngine({ initialState: {}, now: NOW });
  const controller = createCalendarController({
    engine,
    ensureLogin: () => true,
    host,
    render: () => calls.push('render'),
    saveNow: async () => calls.push('save'),
    saveSettings: () => calls.push('save-settings')
  });

  await controller.upsertTask({ id: 1, title: '마감', date: '2026-08-30' });
  assert.equal(host.customTasks[0].title, '마감');
  assert.deepEqual(calls, ['render', 'save']);

  controller.saveCalendarSettings({ viewMode: 'month', weekStartDay: 0 });
  assert.equal(host.__calendarViewMode, 'month');
  assert.deepEqual(calls.slice(-2), ['render', 'save-settings']);
});
