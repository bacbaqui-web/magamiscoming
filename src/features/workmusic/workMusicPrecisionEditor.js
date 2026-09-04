const ZOOMS = [1, 2, 3, 5, 8, 12, 20, 32, 64];
const KEYS = { drumStart: '--drum-start', drumEnd: '--drum-end', verseEnd: '--verse-end' };

export function createWorkMusicPrecisionEditor({ root, inputs, controller, timers = globalThis }) {
  const doc = typeof root.createElement === 'function' ? root : root.ownerDocument;
  const overview = root.getElementById('workMusicDrumLane');
  const panel = root.getElementById('workMusicPrecisionPanel');
  const lane = root.getElementById('workMusicPrecisionWaveform');
  const label = root.getElementById('workMusicZoomLabel');
  const status = root.getElementById('workMusicPrecisionLabel');
  const buttons = Object.fromEntries(
    ['In', 'Out', 'Reset', 'Left', 'Right'].map((key) => [
      key,
      root.getElementById(`workMusicZoom${key}`)
    ])
  );
  if (!overview || !panel || !lane) return { render() {}, renderPlayback() {} };
  overview.appendChild(panel);
  let state,
    version = '',
    zoomIndex = 0,
    start = 0,
    end = 0,
    selected = 'verseEnd';
  let pending = null,
    request = null,
    sequence = 0,
    data = null,
    playback = null;
  let green = null,
    playhead = null;
  const duration = () => Number(state?.detected?.durationSeconds || 0);
  const svgNode = (tag) =>
    doc.createElementNS?.('http://www.w3.org/2000/svg', tag) || doc.createElement(tag);
  const time = (n) => `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;

  function project() {
    const width = end - start;
    if (!(width > 0)) return;
    overview.dataset.zoomed = String(zoomIndex > 0);
    overview.dataset.verseVisible = String(
      Number(state?.draft?.verseEnd) >= start && Number(state?.draft?.verseEnd) <= end
    );
    for (const [key, input] of Object.entries(inputs)) {
      if (!input) continue;
      const value = Number(state?.draft?.[key] || 0);
      input.min = String(start);
      input.max = String(end);
      input.step = '0.01';
      input.value = String(value);
      input.style.visibility = value < start || value > end ? 'hidden' : '';
      overview.style.setProperty(KEYS[key], `${((value - start) / width) * 100}%`);
    }
    if (green) {
      const left = Math.max(0, Math.min(1, (Number(state?.draft?.drumStart || 0) - start) / width));
      const right = Math.max(
        left,
        Math.min(1, (Number(state?.draft?.drumEnd || 0) - start) / width)
      );
      green.setAttribute('x', String(left * 1000));
      green.setAttribute('width', String((right - left) * 1000));
    }
    if (label) label.textContent = `${ZOOMS[zoomIndex]}× · ${time(start)}–${time(end)}`;
    if (buttons.In) buttons.In.disabled = !state?.draft || zoomIndex === ZOOMS.length - 1;
    if (buttons.Out) buttons.Out.disabled = !state?.draft || zoomIndex === 0;
    if (buttons.Left) buttons.Left.disabled = start <= 0;
    if (buttons.Right) buttons.Right.disabled = end >= duration();
    renderPlayback(playback);
  }
  function renderPlayback(next) {
    playback = next;
    if (!playhead) return;
    const current = Number(next?.currentTime);
    const visible =
      Number.isFinite(current) &&
      current >= start &&
      current <= end &&
      (!next?.videoId || next.videoId === state?.videoId);
    playhead.setAttribute('opacity', visible ? '1' : '0');
    playhead.setAttribute('x', String(((current - start) / (end - start)) * 1000));
  }
  function draw() {
    lane.replaceChildren();
    green = null;
    playhead = null;
    if (!data) return;
    const svg = svgNode('svg');
    svg.setAttribute('viewBox', '0 0 1000 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = svgNode('path');
    path.setAttribute(
      'd',
      data.min
        .map((min, i) => {
          const left = data.startSeconds + i * data.resolutionSeconds;
          const right = Math.min(data.endSeconds, left + data.resolutionSeconds);
          const x = (((left + right) / 2 - start) / (end - start)) * 1000;
          return `M${x},${50 - data.max[i] * 48}L${x},${50 - min * 48}`;
        })
        .join(' ')
    );
    path.setAttribute('stroke', '#d6eade');
    path.setAttribute(
      'stroke-width',
      String(Math.max(0.6, (data.resolutionSeconds / (end - start)) * 1000))
    );
    svg.appendChild(path);
    green = svgNode('rect');
    green.setAttribute('height', '100');
    green.setAttribute('fill', '#4ec48e');
    green.setAttribute('fill-opacity', '0.25');
    svg.appendChild(green);
    playhead = svgNode('rect');
    playhead.setAttribute('height', '100');
    playhead.setAttribute('width', '2');
    playhead.setAttribute('fill', '#ffbc4d');
    svg.appendChild(playhead);
    lane.appendChild(svg);
    project();
  }
  function schedule() {
    timers.clearTimeout(pending);
    request?.abort();
    const token = ++sequence;
    data = null;
    draw();
    panel.hidden = zoomIndex === 0 && state?.detected?.waveformDetailVersion !== '1.0';
    if (status) status.textContent = '실제 파형 불러오는 중…';
    pending = timers.setTimeout(async () => {
      const abort = new AbortController();
      request = abort;
      try {
        const pixels = Math.max(
          1,
          Math.min(2048, Math.round(overview.getBoundingClientRect?.().width || 1000))
        );
        const result = await controller.getWaveform(state.videoId, {
          start,
          end,
          pixels,
          signal: abort.signal
        });
        if (token !== sequence || abort.signal.aborted) return;
        if (
          result.videoId !== state.videoId ||
          !Number.isFinite(result.startSeconds) ||
          !Number.isFinite(result.endSeconds) ||
          !Number.isFinite(result.resolutionSeconds) ||
          result.resolutionSeconds <= 0 ||
          result.endSeconds <= result.startSeconds ||
          !Array.isArray(result.min) ||
          !result.min.length ||
          result.min.length > 2048 ||
          result.min.length !== result.max?.length ||
          !result.min.every(
            (v, i) =>
              Number.isFinite(v) &&
              Number.isFinite(result.max[i]) &&
              v >= -1 &&
              result.max[i] <= 1 &&
              v <= result.max[i]
          )
        )
          throw new Error('invalid waveform');
        data = result;
        panel.hidden = false;
        if (status)
          status.textContent = `실제 PCM 최소·최대 파형 · 표시 집계 간격 ${(result.resolutionSeconds * 1000).toFixed(2)}ms`;
        draw();
      } catch (error) {
        if (token !== sequence || abort.signal.aborted) return;
        if (status)
          status.textContent =
            error.status === 404
              ? '고해상도 파형 없음 · 자동 재분석 완료 후 사용할 수 있습니다.'
              : '상세 파형을 불러오지 못했습니다. 서버 연결 후 확대 버튼으로 다시 시도하세요.';
      }
    }, 80);
    pending?.unref?.();
  }
  function changeZoom(index, anchor = 0.5, focus) {
    if (!state?.draft || !(duration() > 0)) return;
    const position = focus ?? start + (end - start) * anchor;
    zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, index));
    const width = Math.min(duration(), Math.max(1, duration() / ZOOMS[zoomIndex]));
    start = Math.max(0, Math.min(duration() - width, position - width * anchor));
    end = start + width;
    project();
    schedule();
  }
  function pan(direction) {
    if (!state?.draft || !(duration() > 0)) return;
    const width = end - start;
    start = Math.max(0, Math.min(duration() - width, start + (direction * width) / 2));
    end = start + width;
    project();
    schedule();
  }
  buttons.In?.addEventListener('click', () =>
    changeZoom(zoomIndex + 1, 0.5, zoomIndex === 0 ? Number(state?.draft?.[selected]) : undefined)
  );
  buttons.Out?.addEventListener('click', () => changeZoom(zoomIndex - 1));
  buttons.Reset?.addEventListener('click', () => changeZoom(0));
  buttons.Left?.addEventListener('click', () => pan(-1));
  buttons.Right?.addEventListener('click', () => pan(1));
  overview.addEventListener(
    'wheel',
    (event) => {
      if (!state?.draft || event.deltaY === 0) return;
      event.preventDefault();
      const rect = overview.getBoundingClientRect?.() || { left: 0, width: 1000 };
      const anchor = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      changeZoom(zoomIndex + (event.deltaY < 0 ? 1 : -1), anchor);
    },
    { passive: false }
  );
  Object.entries(inputs).forEach(([key, input]) => {
    input?.addEventListener('pointerdown', () => {
      selected = key;
    });
    input?.addEventListener('focus', () => {
      selected = key;
    });
  });
  overview.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') changeZoom(0);
  });
  return {
    renderPlayback,
    render(next) {
      const signature = `${next.videoId}:${next.detected?.durationSeconds || 0}:${next.detected?.waveformDetailVersion || ''}`;
      const changed = signature !== version;
      const newSong = state?.videoId !== next.videoId;
      state = next;
      if (changed) {
        version = signature;
        if (newSong) zoomIndex = 0;
        if (duration() > 0) changeZoom(zoomIndex, 0.5, newSong ? duration() / 2 : undefined);
        else {
          request?.abort();
          timers.clearTimeout(pending);
          sequence++;
          panel.hidden = true;
        }
      }
      project();
    }
  };
}
