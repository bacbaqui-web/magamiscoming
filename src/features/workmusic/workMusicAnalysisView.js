const STATUS_LABELS = {
  disabled: '분석 꺼짐',
  empty: '곡 없음',
  idle: '분석 전',
  submitting: '요청 중',
  queued: '대기 중',
  running: '분석 중',
  succeeded: '분석 완료',
  failed: '분석 실패',
  cancelled: '분석 취소',
  unavailable: '서버 연결 안 됨'
};

export function createWorkMusicAnalysisView({ root = document, controller }) {
  const documentFactory = typeof root.createElement === 'function' ? root : root.ownerDocument;
  const panel = root.getElementById('workMusicAnalysisPanel');
  const status = root.getElementById('workMusicAnalysisStatus');
  const message = root.getElementById('workMusicAnalysisMessage');
  const queue = root.getElementById('workMusicAnalysisQueue');
  const analyzeButton = root.getElementById('workMusicAnalyzeBtn');
  const bpm = root.getElementById('workMusicAnalysisBpm');
  const confidence = root.getElementById('workMusicAnalysisConfidence');
  const source = root.getElementById('workMusicAnalysisSource');
  const markerLane = root.getElementById('workMusicAnalysisMarkers');
  const playbackLabel = root.getElementById('workMusicAnalysisPlayback');
  const structureLabel = root.getElementById('workMusicAnalysisStructure');
  let playhead = null;
  let renderedResult;
  let selectedVideoId = '';
  let analysisDuration = 0;
  let playback = null;
  const drumLane = root.getElementById('workMusicDrumLane');
  const drumStart = root.getElementById('workMusicDrumStart');
  const drumEnd = root.getElementById('workMusicDrumEnd');
  const drumLabel = root.getElementById('workMusicDrumLabel');
  const saveButton = root.getElementById('workMusicAnalysisSaveBtn');
  const restoreButton = root.getElementById('workMusicAnalysisRestoreBtn');

  const formatSeconds = (value) => {
    const seconds = Math.max(0, Number(value || 0));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  function renderMarkers(result) {
    if (!markerLane) return;
    if (
      playhead &&
      renderedResult?.waveform === result?.waveform &&
      renderedResult?.sections === result?.sections &&
      renderedResult?.durationSeconds === result?.durationSeconds &&
      !!renderedResult === !!result
    )
      return;
    renderedResult = result;
    markerLane.replaceChildren();
    const duration = Number(result?.durationSeconds || 0);
    const fragment = documentFactory?.createDocumentFragment();
    if (!fragment) return;
    const waveform = Array.isArray(result?.waveform) ? result.waveform.slice(0, 1000) : [];
    const sections = duration > 0 && Array.isArray(result?.sections) ? result.sections : [];
    const labels = { intro: '인트로 후보', outro: '아웃트로 후보', chorus_candidate: '후렴 후보' };
    sections.forEach((section, index) => {
      const start = Math.max(0, Number(section.start));
      const end = Math.min(duration, Number(section.end));
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
      const region = documentFactory.createElement('span');
      const kind = Object.hasOwn(labels, section.label) ? section.label : 'section';
      region.className = `workmusic-analysis-section ${kind}`;
      region.style.left = `${(start / duration) * 100}%`;
      region.style.width = `${((end - start) / duration) * 100}%`;
      region.textContent = labels[kind] || `구간 ${index + 1}`;
      region.title = `${region.textContent} ${formatSeconds(start)}–${formatSeconds(end)} · 추정 신뢰도 ${Math.round(Number(section.confidence || 0) * 100)}%`;
      fragment.appendChild(region);
    });
    waveform.forEach((value, index) => {
      const sample = documentFactory.createElement('span');
      sample.className = 'workmusic-waveform-sample';
      sample.style.left = `${(index / waveform.length) * 100}%`;
      sample.style.width = `${100 / waveform.length}%`;
      sample.style.height = `${Math.max(1, Math.min(1, Number(value) || 0) * 70)}%`;
      fragment.appendChild(sample);
    });
    if (!waveform.length) {
      const empty = documentFactory.createElement('span');
      empty.className = 'workmusic-waveform-empty';
      empty.textContent = result
        ? '전체 음파를 보려면 다시 분석해 주세요.'
        : '분석하면 전체 음파와 구간이 표시됩니다.';
      fragment.appendChild(empty);
    }
    if (structureLabel)
      structureLabel.textContent = waveform.length
        ? '구간은 자동 추정입니다. 인트로·아웃트로는 드럼 앞뒤 후보이며 후렴은 직접 들어 확인해 주세요.'
        : '';
    playhead = documentFactory.createElement('span');
    playhead.className = 'workmusic-analysis-playhead';
    playhead.hidden = true;
    fragment.appendChild(playhead);
    markerLane.appendChild(fragment);
  }

  function renderPlayback(next) {
    playback = next;
    if (!markerLane) return;
    const duration = analysisDuration || Number(next?.duration || 0);
    const time = Number(next?.currentTime);
    const valid =
      !!selectedVideoId &&
      next?.videoId === selectedVideoId &&
      Number.isFinite(duration) &&
      duration > 0 &&
      Number.isFinite(time);
    markerLane.dataset.playback = String(valid);
    if (playhead) playhead.hidden = !valid;
    const current = valid ? Math.max(0, Math.min(duration, time)) : 0;
    markerLane.style.setProperty(
      '--playback-position',
      `${valid ? (current / duration) * 100 : 0}%`
    );
    if (playbackLabel)
      playbackLabel.textContent = valid
        ? `재생 위치 ${formatSeconds(current)} / ${formatSeconds(duration)}`
        : '재생 위치 —';
  }

  function render(state) {
    if (!panel) return;
    const result = state.detected;
    selectedVideoId = state.videoId || '';
    analysisDuration = Math.max(0, Number(result?.durationSeconds || 0));
    const duration = Math.max(0, Number(result?.durationSeconds || 0));
    const draft = state.draft;
    panel.dataset.phase = state.phase;
    if (status) status.textContent = STATUS_LABELS[state.phase] || state.phase;
    if (message) message.textContent = state.message || '';
    if (queue) {
      queue.hidden = !state.enabled;
      queue.textContent = state.queueUnavailable
        ? '서버 큐 현황을 확인할 수 없습니다. 다시 확인 중...'
        : state.queue
          ? `서버 전체: 분석 중 ${state.queue.runningCount}곡 · 대기 ${state.queue.queuedCount}곡`
          : '서버 큐 확인 중...';
    }
    if (analyzeButton) {
      analyzeButton.disabled =
        !state.enabled ||
        !state.videoId ||
        ['submitting', 'queued', 'running'].includes(state.phase);
    }
    if (bpm) bpm.textContent = result?.bpm ? Number(result.bpm).toFixed(1) : '—';
    if (confidence) {
      confidence.textContent = result
        ? `${Math.round(Number(result.confidence || 0) * 100)}%`
        : '—';
    }
    if (source)
      source.textContent = state.manual ? '수동 구간 사용' : result ? '자동 분석값' : '구간 없음';
    renderMarkers(result);
    renderPlayback(playback);

    const hasDraft = !!draft && duration > 0;
    if (drumLane) drumLane.dataset.editable = String(hasDraft);
    [drumStart, drumEnd].forEach((input) => {
      if (!input) return;
      input.disabled = !hasDraft;
      input.max = String(duration || 1);
    });
    if (hasDraft) {
      drumStart.value = String(draft.drumStart);
      drumEnd.value = String(draft.drumEnd);
      drumStart.setAttribute('aria-valuetext', formatSeconds(draft.drumStart));
      drumEnd.setAttribute('aria-valuetext', formatSeconds(draft.drumEnd));
      drumLane?.style.setProperty('--drum-start', `${(draft.drumStart / duration) * 100}%`);
      drumLane?.style.setProperty('--drum-end', `${(draft.drumEnd / duration) * 100}%`);
      if (drumLabel) {
        drumLabel.textContent = `${formatSeconds(draft.drumStart)}–${formatSeconds(draft.drumEnd)}`;
      }
    } else if (drumLabel) drumLabel.textContent = '드럼 구간 —';
    if (saveButton) saveButton.disabled = !hasDraft || !state.dirty;
    if (restoreButton) restoreButton.disabled = !state.manual;
  }

  analyzeButton?.addEventListener('click', () => controller.analyzeCurrent());
  drumStart?.addEventListener('input', (event) =>
    controller.updateDraft('drumStart', event.target.value)
  );
  drumEnd?.addEventListener('input', (event) =>
    controller.updateDraft('drumEnd', event.target.value)
  );
  drumStart?.addEventListener('change', () => controller.commitDraft());
  drumEnd?.addEventListener('change', () => controller.commitDraft());
  saveButton?.addEventListener('click', () => controller.commitDraft());
  restoreButton?.addEventListener('click', () => controller.restoreDetected());

  return { render, renderPlayback };
}
