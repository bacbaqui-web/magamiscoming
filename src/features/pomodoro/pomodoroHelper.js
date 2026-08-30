export const POMODORO_MODE_META = {
  focus: { label: '집중', settingKey: 'focusMinutes' },
  shortBreak: { label: '짧은 휴식', settingKey: 'shortBreakMinutes' },
  longBreak: { label: '긴 휴식', settingKey: 'longBreakMinutes' }
};

export const DEFAULT_POMODORO_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

export function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function minutesToMilliseconds(minutes) {
  return Math.max(1, Number(minutes || 1)) * 60 * 1000;
}

export function formatPomodoroTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function normalizePomodoroSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    focusMinutes: clampNumber(source.focusMinutes, 1, 180, DEFAULT_POMODORO_SETTINGS.focusMinutes),
    shortBreakMinutes: clampNumber(
      source.shortBreakMinutes,
      1,
      60,
      DEFAULT_POMODORO_SETTINGS.shortBreakMinutes
    ),
    longBreakMinutes: clampNumber(
      source.longBreakMinutes,
      1,
      120,
      DEFAULT_POMODORO_SETTINGS.longBreakMinutes
    ),
    longBreakEvery: clampNumber(
      source.longBreakEvery,
      1,
      12,
      DEFAULT_POMODORO_SETTINGS.longBreakEvery
    )
  };
}

export function getPomodoroDurationMs(mode, settings) {
  const settingKey = POMODORO_MODE_META[mode]?.settingKey || 'focusMinutes';
  return minutesToMilliseconds(settings[settingKey]);
}

export function normalizePomodoroState(rawState, today = getTodayKey()) {
  const source = rawState && typeof rawState === 'object' ? rawState : {};
  const settings = normalizePomodoroSettings(source.settings);
  const mode = POMODORO_MODE_META[source.mode] ? source.mode : 'focus';
  const durationMs = getPomodoroDurationMs(mode, settings);
  const status = ['idle', 'running', 'paused'].includes(source.status) ? source.status : 'idle';
  const completedDate = String(source.completedDate || today);

  return {
    mode,
    status,
    startedAt: Number.isFinite(Number(source.startedAt)) ? Number(source.startedAt) : null,
    endAt: Number.isFinite(Number(source.endAt)) ? Number(source.endAt) : null,
    remainingMs: Math.max(
      0,
      Math.min(
        durationMs,
        Number.isFinite(Number(source.remainingMs)) ? Number(source.remainingMs) : durationMs
      )
    ),
    completedFocusCount: Math.max(0, Number(source.completedFocusCount || 0)),
    completedToday: completedDate === today ? Math.max(0, Number(source.completedToday || 0)) : 0,
    completedDate: completedDate === today ? completedDate : today,
    settings
  };
}
