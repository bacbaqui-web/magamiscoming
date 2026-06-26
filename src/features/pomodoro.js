const MODE_META = {
  focus: { label: '집중', settingKey: 'focusMinutes' },
  shortBreak: { label: '짧은 휴식', settingKey: 'shortBreakMinutes' },
  longBreak: { label: '긴 휴식', settingKey: 'longBreakMinutes' }
};

const DEFAULT_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4
};

const clampNumber = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const todayKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

const minutesToMs = (minutes) => Math.max(1, Number(minutes || 1)) * 60 * 1000;

const formatTime = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const settings = src.settings && typeof src.settings === 'object' ? src.settings : {};
  const nextSettings = {
    focusMinutes: clampNumber(settings.focusMinutes, 1, 180, DEFAULT_SETTINGS.focusMinutes),
    shortBreakMinutes: clampNumber(
      settings.shortBreakMinutes,
      1,
      60,
      DEFAULT_SETTINGS.shortBreakMinutes
    ),
    longBreakMinutes: clampNumber(
      settings.longBreakMinutes,
      1,
      120,
      DEFAULT_SETTINGS.longBreakMinutes
    ),
    longBreakEvery: clampNumber(settings.longBreakEvery, 1, 12, DEFAULT_SETTINGS.longBreakEvery)
  };
  const mode = MODE_META[src.mode] ? src.mode : 'focus';
  const durationMs = getDurationMs(mode, nextSettings);
  const status = ['idle', 'running', 'paused'].includes(src.status) ? src.status : 'idle';
  const completedDate = String(src.completedDate || todayKey());
  return {
    mode,
    status,
    startedAt: Number.isFinite(Number(src.startedAt)) ? Number(src.startedAt) : null,
    endAt: Number.isFinite(Number(src.endAt)) ? Number(src.endAt) : null,
    remainingMs: Math.max(
      0,
      Math.min(
        durationMs,
        Number.isFinite(Number(src.remainingMs)) ? Number(src.remainingMs) : durationMs
      )
    ),
    completedFocusCount: Math.max(0, Number(src.completedFocusCount || 0)),
    completedToday: completedDate === todayKey() ? Math.max(0, Number(src.completedToday || 0)) : 0,
    completedDate: completedDate === todayKey() ? completedDate : todayKey(),
    settings: nextSettings
  };
}

function getDurationMs(mode, settings) {
  return minutesToMs(settings[MODE_META[mode]?.settingKey || 'focusMinutes']);
}

export function initPomodoro() {
  const section = document.getElementById('pomodoro-section');
  if (!section) return;

  const modeButtons = [...section.querySelectorAll('.pomodoro-mode-btn')];
  const timeEl = document.getElementById('pomodoroTime');
  const labelEl = document.getElementById('pomodoroLabel');
  const ringEl = document.getElementById('pomodoroRing');
  const todayCountEl = document.getElementById('pomodoroTodayCount');
  const cycleCountEl = document.getElementById('pomodoroCycleCount');
  const startPauseBtn = document.getElementById('pomodoroStartPauseBtn');
  const resetBtn = document.getElementById('pomodoroResetBtn');
  const skipBtn = document.getElementById('pomodoroSkipBtn');
  const focusInput = document.getElementById('pomodoroFocusInput');
  const shortInput = document.getElementById('pomodoroShortInput');
  const longInput = document.getElementById('pomodoroLongInput');
  const everyInput = document.getElementById('pomodoroEveryInput');
  const defaultTitle = document.title;

  let state = normalizeState(window.__pomodoroState);
  let saveTimer = null;

  const syncState = () => {
    window.__pomodoroState = { ...state, settings: { ...state.settings } };
  };

  const saveState = () => {
    syncState();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      window.cloudSavePomodoro?.();
    }, 150);
  };

  const currentRemainingMs = () => {
    if (state.status !== 'running' || !state.endAt) return state.remainingMs;
    return Math.max(0, state.endAt - Date.now());
  };

  const resetTodayIfNeeded = () => {
    const key = todayKey();
    if (state.completedDate === key) return;
    state.completedDate = key;
    state.completedToday = 0;
  };

  const nextModeAfter = (mode) => {
    if (mode !== 'focus') return 'focus';
    const nextFocusCount = state.completedFocusCount + 1;
    return nextFocusCount % state.settings.longBreakEvery === 0 ? 'longBreak' : 'shortBreak';
  };

  const beep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.48);
      setTimeout(() => ctx.close(), 700);
    } catch (_) {}
  };

  const moveToMode = (mode, { save = true } = {}) => {
    state.mode = mode;
    state.status = 'idle';
    state.startedAt = null;
    state.endAt = null;
    state.remainingMs = getDurationMs(mode, state.settings);
    render();
    if (save) saveState();
  };

  const finishCurrent = ({ countFocus = true, notify = true } = {}) => {
    resetTodayIfNeeded();
    const finishedMode = state.mode;
    const nextMode = nextModeAfter(finishedMode);
    if (finishedMode === 'focus' && countFocus) {
      state.completedFocusCount += 1;
      state.completedToday += 1;
    }
    state.mode = nextMode;
    state.status = 'idle';
    state.startedAt = null;
    state.endAt = null;
    state.remainingMs = getDurationMs(nextMode, state.settings);
    render();
    saveState();
    if (notify) {
      beep();
      window.showFeedbackMessage?.(finishedMode === 'focus' ? '집중 완료' : '휴식 완료');
    }
  };

  const start = () => {
    resetTodayIfNeeded();
    const remainingMs = currentRemainingMs() || getDurationMs(state.mode, state.settings);
    const now = Date.now();
    state.status = 'running';
    state.startedAt = now;
    state.endAt = now + remainingMs;
    state.remainingMs = remainingMs;
    render();
    saveState();
  };

  const pause = () => {
    state.remainingMs = currentRemainingMs();
    state.status = 'paused';
    state.startedAt = null;
    state.endAt = null;
    render();
    saveState();
  };

  const reset = () => {
    state.status = 'idle';
    state.startedAt = null;
    state.endAt = null;
    state.remainingMs = getDurationMs(state.mode, state.settings);
    render();
    saveState();
  };

  const applySettings = () => {
    state.settings = {
      focusMinutes: clampNumber(focusInput.value, 1, 180, DEFAULT_SETTINGS.focusMinutes),
      shortBreakMinutes: clampNumber(shortInput.value, 1, 60, DEFAULT_SETTINGS.shortBreakMinutes),
      longBreakMinutes: clampNumber(longInput.value, 1, 120, DEFAULT_SETTINGS.longBreakMinutes),
      longBreakEvery: clampNumber(everyInput.value, 1, 12, DEFAULT_SETTINGS.longBreakEvery)
    };
    if (state.status !== 'running') {
      state.status = 'idle';
      state.startedAt = null;
      state.endAt = null;
      state.remainingMs = getDurationMs(state.mode, state.settings);
    }
    render();
    saveState();
  };

  function render() {
    resetTodayIfNeeded();
    const remainingMs = currentRemainingMs();
    const durationMs = getDurationMs(state.mode, state.settings);
    const progress = durationMs ? 1 - remainingMs / durationMs : 0;
    if (timeEl) timeEl.textContent = formatTime(remainingMs);
    if (labelEl) labelEl.textContent = MODE_META[state.mode].label;
    if (ringEl)
      ringEl.style.setProperty(
        '--pomodoro-progress',
        `${Math.max(0, Math.min(1, progress)) * 360}deg`
      );
    if (todayCountEl) todayCountEl.textContent = String(state.completedToday);
    if (cycleCountEl) {
      const cycle = state.completedFocusCount % state.settings.longBreakEvery;
      cycleCountEl.textContent = `${cycle}/${state.settings.longBreakEvery}`;
    }
    if (startPauseBtn) startPauseBtn.textContent = state.status === 'running' ? '일시정지' : '시작';
    modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    if (focusInput) focusInput.value = String(state.settings.focusMinutes);
    if (shortInput) shortInput.value = String(state.settings.shortBreakMinutes);
    if (longInput) longInput.value = String(state.settings.longBreakMinutes);
    if (everyInput) everyInput.value = String(state.settings.longBreakEvery);
    document.title =
      state.status === 'running' ? `${formatTime(remainingMs)} 뽀모도로` : defaultTitle;
    syncState();
  }

  startPauseBtn?.addEventListener('click', () => {
    if (state.status === 'running') pause();
    else start();
  });
  resetBtn?.addEventListener('click', reset);
  skipBtn?.addEventListener('click', () => finishCurrent({ countFocus: false, notify: false }));
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!MODE_META[button.dataset.mode]) return;
      moveToMode(button.dataset.mode);
    });
  });
  [focusInput, shortInput, longInput, everyInput].forEach((input) => {
    input?.addEventListener('change', applySettings);
  });

  window.renderPomodoroUI = () => {
    state = normalizeState(window.__pomodoroState || state);
    render();
  };

  setInterval(() => {
    if (state.status === 'running' && currentRemainingMs() <= 0) {
      finishCurrent();
      return;
    }
    render();
  }, 500);

  render();
}
