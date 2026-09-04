const LABELS = { drumStart: '인트로 끝', drumEnd: '아웃트로 시작', verseEnd: '1절 끝' };

export function createWorkMusicPrecisionEditor({ root, inputs, controller, timers = globalThis }) {
  const documentFactory = typeof root.createElement === 'function' ? root : root.ownerDocument;
  const panel = root.getElementById('workMusicPrecisionPanel');
  const lane = root.getElementById('workMusicPrecisionWaveform');
  const range = root.getElementById('workMusicPrecisionRange');
  const label = root.getElementById('workMusicPrecisionLabel');
  const closeButton = root.getElementById('workMusicPrecisionClose');
  if (!panel || !range || !lane) return { render() {} };
  const eventRoot = documentFactory || root;
  const windowRoot = documentFactory?.defaultView;
  let state;
  let activeKey = '';
  let heldKey = '';
  let idleTimer = null;
  let zoomStart = 0;
  let zoomEnd = 0;
  let lastX;
  let lastY;

  const time = (value) => `${Math.floor(value / 60)}:${(value % 60).toFixed(2).padStart(5, '0')}`;
  const currentValue = (key) => Number(state?.draft?.[key] ?? inputs[key]?.value);

  function cancelTimer() {
    if (idleTimer !== null) timers.clearTimeout(idleTimer);
    idleTimer = null;
  }

  function finishHold() {
    cancelTimer();
    heldKey = '';
    eventRoot.removeEventListener?.('pointermove', move);
    eventRoot.removeEventListener?.('pointerup', finishHold);
    eventRoot.removeEventListener?.('pointercancel', finishHold);
    windowRoot?.removeEventListener('blur', finishHold);
  }

  function close() {
    finishHold();
    eventRoot.removeEventListener?.('keydown', handleEscape);
    activeKey = '';
    panel.hidden = true;
  }

  function drawWaveform() {
    lane.replaceChildren();
    const duration = Number(state.detected.durationSeconds);
    const waveform = state.detected.waveform || [];
    const fragment = documentFactory.createDocumentFragment();
    waveform.forEach((amplitude, index) => {
      const start = (index / waveform.length) * duration;
      const end = ((index + 1) / waveform.length) * duration;
      if (end <= zoomStart || start >= zoomEnd) return;
      const sample = documentFactory.createElement('span');
      sample.className = 'workmusic-waveform-sample';
      sample.style.left = `${((Math.max(start, zoomStart) - zoomStart) / (zoomEnd - zoomStart)) * 100}%`;
      sample.style.width = `${((Math.min(end, zoomEnd) - Math.max(start, zoomStart)) / (zoomEnd - zoomStart)) * 100}%`;
      sample.style.height = `${Math.max(1, Math.min(1, Number(amplitude) || 0) * 70)}%`;
      fragment.appendChild(sample);
    });
    lane.appendChild(fragment);
  }

  function renderPosition() {
    const value = currentValue(activeKey);
    range.value = String(value);
    range.setAttribute('aria-label', `${LABELS[activeKey]} 정밀 위치`);
    range.setAttribute('aria-valuetext', time(value));
    panel.dataset.boundary = activeKey;
    panel.style.setProperty(
      '--precision-position',
      `${((value - zoomStart) / (zoomEnd - zoomStart)) * 100}%`
    );
    label.textContent = `${LABELS[activeKey]} ${time(value)} · 확대 ${time(zoomStart)}–${time(zoomEnd)}`;
  }

  function open(key) {
    if (!state?.draft || !Array.isArray(state.detected?.waveform)) return;
    const duration = Number(state.detected.durationSeconds);
    const value = currentValue(key);
    if (!(duration > 0) || !Number.isFinite(value)) return;
    activeKey = key;
    eventRoot.addEventListener?.('keydown', handleEscape);
    const width = Math.min(20, duration / 5);
    zoomStart = Math.max(0, Math.min(duration - width, value - width / 2));
    zoomEnd = zoomStart + width;
    range.min = String(zoomStart);
    range.max = String(zoomEnd);
    // Keep the original drag's scale untouched. The next gesture uses this narrower range.
    panel.hidden = false;
    drawWaveform();
    renderPosition();
  }

  function scheduleOpen() {
    cancelTimer();
    idleTimer = timers.setTimeout(() => {
      idleTimer = null;
      if (heldKey) open(heldKey);
    }, 3000);
  }

  function move(event) {
    if (!heldKey || (event.clientX === lastX && event.clientY === lastY)) return;
    lastX = event.clientX;
    lastY = event.clientY;
    scheduleOpen();
  }

  Object.entries(inputs).forEach(([key, input]) => {
    input?.addEventListener('pointerdown', (event) => {
      if (input.disabled || event.button > 0) return;
      finishHold();
      heldKey = key;
      lastX = event.clientX;
      lastY = event.clientY;
      scheduleOpen();
      eventRoot.addEventListener?.('pointermove', move);
      eventRoot.addEventListener?.('pointerup', finishHold);
      eventRoot.addEventListener?.('pointercancel', finishHold);
      windowRoot?.addEventListener('blur', finishHold);
    });
    input?.addEventListener('input', () => {
      if (heldKey === key) scheduleOpen();
    });
    input?.addEventListener('blur', finishHold);
  });
  range.addEventListener('input', () => {
    if (activeKey) controller.updateDraft(activeKey, range.value);
  });
  range.addEventListener('change', () => controller.commitDraft());
  closeButton?.addEventListener('click', close);
  function handleEscape(event) {
    if (activeKey && event.key === 'Escape') {
      const input = inputs[activeKey];
      close();
      input?.focus();
    }
  }

  return {
    render(next) {
      if (state?.videoId !== next.videoId || !next.draft) close();
      state = next;
      if (activeKey) {
        const value = currentValue(activeKey);
        if (value < zoomStart || value > zoomEnd) open(activeKey);
        else renderPosition();
      }
    }
  };
}
