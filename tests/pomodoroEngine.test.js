import test from 'node:test';
import assert from 'node:assert/strict';

import { createPomodoroEngine } from '../src/features/pomodoro/pomodoroEngine.js';

function createClock(start = 1_000) {
  let value = start;
  return {
    advance(milliseconds) {
      value += milliseconds;
    },
    now() {
      return value;
    }
  };
}

test('PomodoroEngine starts, advances from endAt, pauses, and restores the remaining time', () => {
  const clock = createClock();
  const engine = createPomodoroEngine({ now: clock.now, today: () => '2026-08-30' });

  engine.start();
  assert.equal(engine.getSnapshot().status, 'running');
  assert.equal(engine.getSnapshot().endAt, 1_000 + 25 * 60 * 1000);

  clock.advance(30_000);
  assert.equal(engine.getViewState().remainingMs, 24 * 60 * 1000 + 30_000);

  engine.pause();
  assert.equal(engine.getSnapshot().status, 'paused');
  assert.equal(engine.getSnapshot().remainingMs, 24 * 60 * 1000 + 30_000);

  clock.advance(60_000);
  assert.equal(engine.getViewState().remainingMs, 24 * 60 * 1000 + 30_000);
});

test('PomodoroEngine automatically completes focus and selects short or long break', () => {
  const clock = createClock();
  const engine = createPomodoroEngine({
    initialState: {
      mode: 'focus',
      status: 'idle',
      remainingMs: 1_000,
      completedFocusCount: 3,
      completedToday: 2,
      completedDate: '2026-08-30',
      settings: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4
      }
    },
    now: clock.now,
    today: () => '2026-08-30'
  });

  engine.start();
  clock.advance(1_000);
  const result = engine.tick();
  const state = engine.getSnapshot();

  assert.deepEqual(result, {
    completed: true,
    dateChanged: false,
    finishedMode: 'focus',
    nextMode: 'longBreak'
  });
  assert.equal(state.status, 'idle');
  assert.equal(state.mode, 'longBreak');
  assert.equal(state.completedFocusCount, 4);
  assert.equal(state.completedToday, 3);
  assert.equal(state.remainingMs, 15 * 60 * 1000);
});

test('PomodoroEngine hydration resumes a persisted running timer without external state mutation', () => {
  const clock = createClock(50_000);
  const persisted = {
    mode: 'focus',
    status: 'running',
    startedAt: 10_000,
    endAt: 70_000,
    remainingMs: 120_000,
    completedDate: '2026-08-30'
  };
  const engine = createPomodoroEngine({
    initialState: persisted,
    now: clock.now,
    today: () => '2026-08-30'
  });

  assert.equal(engine.getViewState().remainingMs, 20_000);
  const snapshot = engine.getSnapshot();
  snapshot.settings.focusMinutes = 1;
  snapshot.mode = 'longBreak';
  assert.equal(engine.getSnapshot().settings.focusMinutes, 25);
  assert.equal(engine.getSnapshot().mode, 'focus');
});
