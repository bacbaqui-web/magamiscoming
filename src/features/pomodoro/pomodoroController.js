function playCompletionBeep(host) {
  try {
    const AudioContext = host.AudioContext || host.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.48);
    host.setTimeout(() => context.close(), 700);
  } catch (_) {
    // 오디오 출력을 막는 브라우저에서도 타이머 전환은 계속한다.
  }
}

export function createPomodoroController({ engine, host = window, render }) {
  let saveTimer = null;

  function publishState() {
    // 저장과 기존 Cloud Sync를 위한 임시 Compatibility 경계이다.
    host.__pomodoroState = engine.getSnapshot();
  }

  function renderCurrent() {
    publishState();
    render(engine.getViewState());
  }

  function save() {
    publishState();
    host.clearTimeout(saveTimer);
    saveTimer = host.setTimeout(() => host.cloudSavePomodoro?.(), 150);
  }

  function renderAndSave() {
    renderCurrent();
    save();
  }

  return {
    applySettings(settings) {
      engine.applySettings(settings);
      renderAndSave();
    },
    changeMode(mode) {
      if (!engine.moveToMode(mode)) return;
      renderAndSave();
    },
    hydrate(state) {
      engine.hydrate(state);
      renderCurrent();
    },
    render: renderCurrent,
    reset() {
      engine.reset();
      renderAndSave();
    },
    skip() {
      engine.finish({ countFocus: false });
      renderAndSave();
    },
    tick() {
      const result = engine.tick();
      renderCurrent();
      if (!result.completed) return;
      save();
      playCompletionBeep(host);
      host.showFeedbackMessage?.(result.finishedMode === 'focus' ? '집중 완료' : '휴식 완료');
    },
    toggleStartPause() {
      if (engine.getSnapshot().status === 'running') engine.pause();
      else engine.start();
      renderAndSave();
    }
  };
}
