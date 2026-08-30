import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPomodoroTime,
  normalizePomodoroState
} from '../src/features/pomodoro/pomodoroHelper.js';

test('Pomodoro normalization preserves the existing bounds, rounding, and daily reset contract', () => {
  const state = normalizePomodoroState(
    {
      mode: 'unknown',
      status: 'unknown',
      remainingMs: 99_999_999,
      completedFocusCount: -3,
      completedToday: 7,
      completedDate: '2026-08-29',
      settings: {
        focusMinutes: 180.7,
        shortBreakMinutes: 0,
        longBreakMinutes: 'invalid',
        longBreakEvery: 3.6
      }
    },
    '2026-08-30'
  );

  assert.equal(state.mode, 'focus');
  assert.equal(state.status, 'idle');
  assert.equal(state.settings.focusMinutes, 180);
  assert.equal(state.settings.shortBreakMinutes, 1);
  assert.equal(state.settings.longBreakMinutes, 15);
  assert.equal(state.settings.longBreakEvery, 4);
  assert.equal(state.remainingMs, 180 * 60 * 1000);
  assert.equal(state.completedFocusCount, 0);
  assert.equal(state.completedToday, 0);
  assert.equal(state.completedDate, '2026-08-30');
});

test('Pomodoro time formatting keeps the existing ceil-to-next-second display', () => {
  assert.equal(formatPomodoroTime(60_001), '01:01');
  assert.equal(formatPomodoroTime(60_000), '01:00');
  assert.equal(formatPomodoroTime(-1), '00:00');
});
