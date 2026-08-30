import { POMODORO_MODE_META, formatPomodoroTime } from './pomodoroHelper.js';

export function createPomodoroComposer({ root = document } = {}) {
  const section = root.getElementById('pomodoro-section');
  if (!section) return null;

  const elements = {
    cycleCount: root.getElementById('pomodoroCycleCount'),
    everyInput: root.getElementById('pomodoroEveryInput'),
    focusInput: root.getElementById('pomodoroFocusInput'),
    label: root.getElementById('pomodoroLabel'),
    longInput: root.getElementById('pomodoroLongInput'),
    modeButtons: [...section.querySelectorAll('.pomodoro-mode-btn')],
    resetButton: root.getElementById('pomodoroResetBtn'),
    ring: root.getElementById('pomodoroRing'),
    shortInput: root.getElementById('pomodoroShortInput'),
    skipButton: root.getElementById('pomodoroSkipBtn'),
    startPauseButton: root.getElementById('pomodoroStartPauseBtn'),
    time: root.getElementById('pomodoroTime'),
    todayCount: root.getElementById('pomodoroTodayCount')
  };
  const defaultTitle = root.title;

  function readSettings() {
    return {
      focusMinutes: elements.focusInput?.value,
      shortBreakMinutes: elements.shortInput?.value,
      longBreakMinutes: elements.longInput?.value,
      longBreakEvery: elements.everyInput?.value
    };
  }

  function bind(controller) {
    elements.startPauseButton?.addEventListener('click', controller.toggleStartPause);
    elements.resetButton?.addEventListener('click', controller.reset);
    elements.skipButton?.addEventListener('click', controller.skip);
    elements.modeButtons.forEach((button) => {
      button.addEventListener('click', () => controller.changeMode(button.dataset.mode));
    });
    [elements.focusInput, elements.shortInput, elements.longInput, elements.everyInput].forEach(
      (input) => input?.addEventListener('change', () => controller.applySettings(readSettings()))
    );
  }

  function render(state) {
    const formattedTime = formatPomodoroTime(state.remainingMs);
    if (elements.time) elements.time.textContent = formattedTime;
    if (elements.label) elements.label.textContent = POMODORO_MODE_META[state.mode].label;
    if (elements.ring) {
      const progress = Math.max(0, Math.min(1, state.progress));
      elements.ring.style.setProperty('--pomodoro-progress', `${progress * 360}deg`);
    }
    if (elements.todayCount) elements.todayCount.textContent = String(state.completedToday);
    if (elements.cycleCount) {
      const cycle = state.completedFocusCount % state.settings.longBreakEvery;
      elements.cycleCount.textContent = `${cycle}/${state.settings.longBreakEvery}`;
    }
    if (elements.startPauseButton) {
      elements.startPauseButton.textContent = state.status === 'running' ? '일시정지' : '시작';
    }
    elements.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    if (elements.focusInput) elements.focusInput.value = String(state.settings.focusMinutes);
    if (elements.shortInput) elements.shortInput.value = String(state.settings.shortBreakMinutes);
    if (elements.longInput) elements.longInput.value = String(state.settings.longBreakMinutes);
    if (elements.everyInput) elements.everyInput.value = String(state.settings.longBreakEvery);
    root.title = state.status === 'running' ? `${formattedTime} 뽀모도로` : defaultTitle;
  }

  return { bind, render };
}
