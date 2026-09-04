const LABELS = { drumStart: '인트로 끝', drumEnd: '아웃트로 시작', verseEnd: '1절 끝' };

export function createWorkMusicPrecisionEditor({ root, inputs, controller }) {
  const doc = typeof root.createElement === 'function' ? root : root.ownerDocument;
  const panel = root.getElementById('workMusicPrecisionPanel');
  const lane = root.getElementById('workMusicPrecisionWaveform');
  const range = root.getElementById('workMusicPrecisionRange');
  const label = root.getElementById('workMusicPrecisionLabel');
  const overview = root.getElementById('workMusicDrumLane');
  if (!panel || !lane || !range) return { render() {} };
  const win = doc?.defaultView;
  let state,
    activeKey = '',
    drag = null,
    svg = null,
    frame = null;
  let zoomStart = 0,
    zoomEnd = 0;
  const time = (n) => `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;
  const value = () => Number(state?.draft?.[activeKey] || 0);
  const createSvg = (tag) =>
    doc.createElementNS?.('http://www.w3.org/2000/svg', tag) || doc.createElement(tag);

  function stopDrag(event) {
    const save = drag?.moved && event?.type !== 'pointercancel';
    drag = null;
    doc.removeEventListener?.('pointermove', move);
    doc.removeEventListener?.('pointerup', stopDrag);
    doc.removeEventListener?.('pointercancel', stopDrag);
    win?.removeEventListener?.('blur', stopDrag);
    if (save) void controller.commitDraft();
  }
  function close() {
    stopDrag({ type: 'pointercancel' });
    win?.cancelAnimationFrame?.(frame);
    frame = null;
    activeKey = '';
    panel.hidden = true;
    doc.removeEventListener?.('keydown', escape);
  }
  function position() {
    range.value = String(value());
    range.setAttribute('aria-label', `${LABELS[activeKey]} 정밀 위치`);
    range.setAttribute('aria-valuetext', time(value()));
    panel.dataset.boundary = activeKey;
    panel.style.setProperty(
      '--precision-position',
      `${((value() - zoomStart) / (zoomEnd - zoomStart)) * 100}%`
    );
    label.textContent = `${LABELS[activeKey]} ${time(value())} · 상세 음파 ${time(zoomStart)}–${time(zoomEnd)}`;
  }
  function draw(animate) {
    win?.cancelAnimationFrame?.(frame);
    lane.replaceChildren();
    const duration = Number(state.detected.durationSeconds);
    const samples = state.detected.waveform;
    svg = createSvg('svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = createSvg('path');
    const points = samples.map((n, i) => [
      (i / Math.max(1, samples.length - 1)) * duration,
      Math.max(0, Math.min(1, Number(n) || 0)) * 43
    ]);
    // Connected envelope, not stretched rectangular bins. No invented PCM detail.
    const top = points.map(([x, y]) => `${x},${50 - y}`).join(' L ');
    const bottom = [...points]
      .reverse()
      .map(([x, y]) => `${x},${50 + y}`)
      .join(' L ');
    path.setAttribute('d', `M ${top} L ${bottom} Z`);
    path.setAttribute('fill', '#cce8db');
    svg.appendChild(path);
    lane.appendChild(svg);
    const target = () => svg.setAttribute('viewBox', `${zoomStart} 0 ${zoomEnd - zoomStart} 100`);
    if (
      !animate ||
      !win?.requestAnimationFrame ||
      win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      target();
      return;
    }
    let began;
    const tick = (now) => {
      if (!activeKey) return;
      began ??= now;
      const progress = Math.min(1, (now - began) / 280);
      const eased = 1 - (1 - progress) ** 3;
      svg.setAttribute(
        'viewBox',
        `${zoomStart * eased} 0 ${duration + (zoomEnd - zoomStart - duration) * eased} 100`
      );
      if (progress < 1) frame = win.requestAnimationFrame(tick);
      else frame = null;
    };
    svg.setAttribute('viewBox', `0 0 ${duration} 100`);
    frame = win.requestAnimationFrame(tick);
  }
  function open(key, animate = true) {
    if (!state?.draft || !state.detected?.waveform?.length) return;
    activeKey = key;
    const duration = Number(state.detected.durationSeconds);
    const width = Math.min(20, duration / 5);
    if (!(width > 0)) return;
    zoomStart = Math.max(0, Math.min(duration - width, value() - width / 2));
    zoomEnd = zoomStart + width;
    range.min = String(zoomStart);
    range.max = String(zoomEnd);
    panel.hidden = false;
    overview?.style.setProperty('--zoom-start', `${(zoomStart / duration) * 100}%`);
    overview?.style.setProperty('--zoom-end', `${(zoomEnd / duration) * 100}%`);
    draw(animate);
    position();
    doc.addEventListener?.('keydown', escape);
  }
  function move(event) {
    if (!drag) return;
    event.preventDefault?.();
    const seconds = drag.value + (event.clientX - drag.x) * drag.secondsPerPixel;
    drag.moved = true;
    controller.updateDraft(
      activeKey,
      Math.max(0, Math.min(Number(state.detected.durationSeconds), seconds))
    );
  }
  function escape(event) {
    if (event.key !== 'Escape') return;
    const input = inputs[activeKey];
    close();
    input?.focus();
  }
  Object.entries(inputs).forEach(([key, input]) => {
    input?.addEventListener('pointerdown', (event) => {
      if (input.disabled || event.button > 0) return;
      event.preventDefault?.();
      stopDrag({ type: 'pointercancel' });
      open(key);
      if (!activeKey) return;
      drag = {
        x: event.clientX,
        value: value(),
        secondsPerPixel:
          (zoomEnd - zoomStart) / Math.max(1, lane.getBoundingClientRect?.().width || 800),
        moved: false
      };
      doc.addEventListener?.('pointermove', move);
      doc.addEventListener?.('pointerup', stopDrag);
      doc.addEventListener?.('pointercancel', stopDrag);
      win?.addEventListener?.('blur', stopDrag);
    });
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault?.();
        open(key);
        range.focus?.();
      }
    });
  });
  range.addEventListener(
    'input',
    () => activeKey && controller.updateDraft(activeKey, range.value)
  );
  range.addEventListener('change', () => controller.commitDraft());
  root.getElementById('workMusicPrecisionClose')?.addEventListener('click', close);
  return {
    render(next) {
      if (state?.videoId !== next.videoId || !next.draft) close();
      state = next;
      if (!activeKey) return;
      if (value() < zoomStart || value() > zoomEnd) open(activeKey, false);
      else position();
    }
  };
}
