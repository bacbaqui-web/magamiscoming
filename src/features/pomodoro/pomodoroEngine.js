import {
  POMODORO_MODE_META,
  getPomodoroDurationMs,
  getTodayKey,
  normalizePomodoroSettings,
  normalizePomodoroState
} from './pomodoroHelper.js';

function copyState(state) {
  return { ...state, settings: { ...state.settings } };
}

export function createPomodoroEngine({
  initialState,
  now = () => Date.now(),
  today = () => getTodayKey(new Date(now()))
} = {}) {
  let state = normalizePomodoroState(initialState, today());

  function resetTodayIfNeeded() {
    const currentDate = today();
    if (state.completedDate === currentDate) return false;
    state.completedDate = currentDate;
    state.completedToday = 0;
    return true;
  }

  function currentRemainingMs() {
    if (state.status !== 'running' || !state.endAt) return state.remainingMs;
    return Math.max(0, state.endAt - now());
  }

  function moveToMode(mode) {
    if (!POMODORO_MODE_META[mode]) return false;
    state.mode = mode;
    state.status = 'idle';
    state.startedAt = null;
    state.endAt = null;
    state.remainingMs = getPomodoroDurationMs(mode, state.settings);
    return true;
  }

  function finish({ countFocus = true } = {}) {
    resetTodayIfNeeded();
    const finishedMode = state.mode;
    const nextFocusCount = state.completedFocusCount + 1;
    const nextMode =
      finishedMode !== 'focus'
        ? 'focus'
        : nextFocusCount % state.settings.longBreakEvery === 0
          ? 'longBreak'
          : 'shortBreak';

    if (finishedMode === 'focus' && countFocus) {
      state.completedFocusCount += 1;
      state.completedToday += 1;
    }
    moveToMode(nextMode);
    return { finishedMode, nextMode };
  }

  return {
    applySettings(settings) {
      state.settings = normalizePomodoroSettings(settings);
      if (state.status !== 'running') {
        state.status = 'idle';
        state.startedAt = null;
        state.endAt = null;
        state.remainingMs = getPomodoroDurationMs(state.mode, state.settings);
      }
    },
    finish,
    getSnapshot() {
      return copyState(state);
    },
    getViewState() {
      const remainingMs = currentRemainingMs();
      const durationMs = getPomodoroDurationMs(state.mode, state.settings);
      return {
        ...copyState(state),
        durationMs,
        remainingMs,
        progress: durationMs ? 1 - remainingMs / durationMs : 0
      };
    },
    hydrate(nextState) {
      state = normalizePomodoroState(nextState, today());
    },
    moveToMode,
    pause() {
      state.remainingMs = currentRemainingMs();
      state.status = 'paused';
      state.startedAt = null;
      state.endAt = null;
    },
    reset() {
      state.status = 'idle';
      state.startedAt = null;
      state.endAt = null;
      state.remainingMs = getPomodoroDurationMs(state.mode, state.settings);
    },
    start() {
      resetTodayIfNeeded();
      const remainingMs = currentRemainingMs() || getPomodoroDurationMs(state.mode, state.settings);
      const startedAt = now();
      state.status = 'running';
      state.startedAt = startedAt;
      state.endAt = startedAt + remainingMs;
      state.remainingMs = remainingMs;
    },
    tick() {
      const dateChanged = resetTodayIfNeeded();
      if (state.status === 'running' && currentRemainingMs() <= 0) {
        return { completed: true, dateChanged, ...finish() };
      }
      return { completed: false, dateChanged };
    }
  };
}
