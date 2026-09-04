const ZOOMS = [1, 2, 3, 5, 8, 12, 20, 32, 64];
const KEYS = { drumStart: '--drum-start', drumEnd: '--drum-end', verseEnd: '--verse-end' };

export function createWorkMusicPrecisionEditor({
  root,
  inputs,
  controller,
  onSeek,
  timers = globalThis
}) {
  const doc = typeof root.createElement === 'function' ? root : root.ownerDocument;
  const overview = root.getElementById('workMusicDrumLane');
  const panel = root.getElementById('workMusicPrecisionPanel');
  const lane = root.getElementById('workMusicPrecisionWaveform');
  const label = root.getElementById('workMusicZoomLabel');
  const status = root.getElementById('workMusicPrecisionLabel');
  const seek = root.getElementById('workMusicSeekRange');
  const durationLabel = root.getElementById('workMusicSeekEndTime');
  const playbackLine = root.getElementById('workMusicPlaybackLine');
  const timeLabels = {
    drumStart: root.getElementById('workMusicDrumStartTime'),
    verseEnd: root.getElementById('workMusicVerseEndTime'),
    drumEnd: root.getElementById('workMusicDrumEndTime')
  };
  const buttons = Object.fromEntries(
    ['In', 'Out', 'Reset', 'Left', 'Right'].map((key) => [
      key,
      root.getElementById(`workMusicZoom${key}`)
    ])
  );
  if (!overview || !panel || !lane) return { render() {}, renderPlayback() {} };
  overview.appendChild(panel);
  if (seek) {
    overview.appendChild(seek);
    seek.classList?.add('workmusic-waveform-seek');
    seek.setAttribute('aria-label', '음파 재생 위치');
  }
  let scrub = false,
    previewUntil = 0,
    drag = null;
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
  const duration = () => Number(state?.detected?.durationSeconds || playback?.duration || 0);
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
    overview.dataset.startVisible = String(
      !!state?.draft && state.draft.drumStart >= start && state.draft.drumStart <= end
    );
    overview.dataset.endVisible = String(
      !!state?.draft && state.draft.drumEnd >= start && state.draft.drumEnd <= end
    );
    const occupied = [];
    const pixelWidth = overview.getBoundingClientRect?.().width || 800;
    let rows = 1;
    for (const [key, input] of Object.entries(inputs)) {
      if (!input) continue;
      const value = Number(state?.draft?.[key] || 0);
      input.min = String(start);
      input.max = String(end);
      input.step = '0.01';
      input.value = String(value);
      input.style.visibility = value < start || value > end ? 'hidden' : '';
      overview.style.setProperty(KEYS[key], `${((value - start) / width) * 100}%`);
      const caption = timeLabels[key];
      if (caption) {
        caption.hidden = !state?.draft || value < start || value > end;
        caption.textContent = time(value);
        const x = ((value - start) / width) * pixelWidth;
        const labelWidth = Math.min(80, pixelWidth);
        const left = Math.max(0, Math.min(pixelWidth - labelWidth, x - labelWidth / 2));
        let row = 0;
        while (occupied.some((item) => item.row === row && Math.abs(item.left - left) < labelWidth))
          row++;
        if (!caption.hidden) {
          occupied.push({ row, left });
          rows = Math.max(rows, row + 1);
        }
        caption.style.left = `${left}px`;
        caption.style.width = `${labelWidth}px`;
        caption.style.top = `calc(100% + ${22 + row * 20}px)`;
      }
    }
    overview.style.marginBottom = `${26 + rows * 20}px`;
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
    if ((scrub || Date.now() < previewUntil) && next?.videoId === playback?.videoId)
      next = playback;
    playback = next;
    if (durationLabel) {
      const total = duration();
      durationLabel.textContent =
        Number.isFinite(total) && total > 0
          ? `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`
          : '—:—';
    }
    if (!(end > start) && duration() > 0) {
      start = 0;
      end = duration();
    }
    const current = Number(next?.currentTime);
    const visible =
      Number.isFinite(current) &&
      current >= start &&
      current <= end &&
      (!next?.videoId || next.videoId === state?.videoId);
    if (seek) {
      seek.min = String(start);
      seek.max = String(end || 1);
      seek.step = '0.01';
      seek.disabled = !(duration() > 0);
      seek.value = String(Number.isFinite(current) ? current : start);
      seek.dataset.offscreen = String(!visible);
      seek.setAttribute('aria-valuetext', time(Number.isFinite(current) ? current : 0));
    }
    if (playbackLine) {
      playbackLine.hidden = !visible;
      playbackLine.style.left = `${((current - start) / (end - start)) * 100}%`;
    }
    playhead?.setAttribute('opacity', visible ? '1' : '0');
    playhead?.setAttribute('x', String(((current - start) / (end - start)) * 1000));
  }
  function seekTo(seconds) {
    if (!(duration() > 0) || !onSeek) return;
    const currentTime = Math.max(0, Math.min(duration(), seconds));
    previewUntil = 0;
    playback = { videoId: state?.videoId, currentTime, duration: duration() };
    renderPlayback(playback);
    previewUntil = Date.now() + 1000;
    onSeek(currentTime);
  }
  seek?.addEventListener('input', () => seekTo(Number(seek.value)));
  seek?.addEventListener('pointerdown', () => {
    scrub = true;
  });
  const releaseScrub = () => {
    scrub = false;
  };
  seek?.addEventListener('pointerup', releaseScrub);
  seek?.addEventListener('pointercancel', releaseScrub);
  seek?.addEventListener('blur', releaseScrub);
  doc.defaultView?.addEventListener('pointerup', releaseScrub);
  doc.defaultView?.addEventListener('blur', releaseScrub);
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
    if (status) {
      status.hidden = true;
      status.textContent = '';
    }
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
        if (status) status.hidden = true;
        draw();
      } catch (error) {
        if (token !== sequence || abort.signal.aborted) return;
        if (status) {
          status.hidden = false;
          status.textContent =
            error.status === 404
              ? '고해상도 파형 없음 · 자동 재분석 완료 후 사용할 수 있습니다.'
              : '상세 파형을 불러오지 못했습니다. 서버 연결 후 확대 버튼으로 다시 시도하세요.';
        }
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
  overview.addEventListener('click', (event) => {
    if (event.button !== 0 || event.target?.closest?.('input')) return;
    const rect = overview.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return;
    seekTo(
      start + Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * (end - start)
    );
  });
  overview.addEventListener('pointerdown', (event) => {
    if (event.button !== 1 || zoomIndex === 0) return;
    event.preventDefault();
    drag = { id: event.pointerId, x: event.clientX, start, width: end - start };
    overview.setPointerCapture?.(event.pointerId);
    overview.dataset.panning = 'true';
  });
  overview.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    start = Math.max(
      0,
      Math.min(
        duration() - drag.width,
        drag.start -
          ((event.clientX - drag.x) / overview.getBoundingClientRect().width) * drag.width
      )
    );
    end = start + drag.width;
    project();
    schedule();
  });
  const stopPan = () => {
    drag = null;
    overview.dataset.panning = 'false';
  };
  overview.addEventListener('pointerup', stopPan);
  overview.addEventListener('pointercancel', stopPan);
  overview.addEventListener('lostpointercapture', stopPan);
  overview.addEventListener('auxclick', (event) => {
    if (event.button === 1) event.preventDefault();
  });
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
    if (event.target?.closest?.('input')) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      changeZoom(zoomIndex + 1);
    }
    if (event.key === '-') {
      event.preventDefault();
      changeZoom(zoomIndex - 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      pan(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  return {
    renderPlayback,
    render(next) {
      const signature = `${next.videoId}:${next.detected?.durationSeconds || 0}:${next.detected?.waveformDetailVersion || ''}`;
      const changed = signature !== version;
      const newSong = state?.videoId !== next.videoId;
      state = next;
      if (newSong) {
        playback = null;
        previewUntil = 0;
        scrub = false;
        stopPan();
        start = 0;
        end = 0;
      }
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
      if (!(end > start)) renderPlayback(playback);
    }
  };
}
