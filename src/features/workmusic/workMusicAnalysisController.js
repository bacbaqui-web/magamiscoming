import { calculateSmartTransitionPlan, normalizeAnalysisRange } from './workMusicAnalysisHelper.js';

const clone = (value) => (value ? { ...value } : null);
const waitDefault = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createWorkMusicAnalysisController({
  mediaAnalysisPort,
  onChange = () => {},
  saveManual = async () => {},
  pollIntervalMs = 1000,
  maxPolls = 1800,
  wait = waitDefault
} = {}) {
  const detectedByVideoId = new Map();
  const operations = new Map();
  const lifetime = new AbortController();
  let queue = null;
  let queueUnavailable = false;
  let queueTimer = null;
  let queueRequest = null;
  let selectionVersion = 0;
  let selectionKey = null;
  let currentSong = null;
  let abortController = null;
  let state = {
    phase: mediaAnalysisPort?.enabled ? 'idle' : 'disabled',
    message: mediaAnalysisPort?.enabled
      ? '현재 곡을 분석할 수 있습니다.'
      : '분석 서버가 비활성화되어 있습니다.',
    detected: null,
    manual: null,
    draft: null,
    dirty: false
  };

  const snapshot = () => ({
    ...state,
    ...operations.get(currentSong?.videoId)?.state,
    queue: clone(queue),
    queueUnavailable,
    enabled: !!mediaAnalysisPort?.enabled,
    videoId: currentSong?.videoId || '',
    songId: currentSong?.id ?? null,
    detected: clone(state.detected),
    manual: clone(state.manual),
    draft: clone(state.draft)
  });
  const publish = () => {
    if (!lifetime.signal.aborted) onChange(snapshot());
  };
  const isCurrent = (version, videoId) =>
    version === selectionVersion && videoId === currentSong?.videoId;
  const manualForSong = (song) =>
    normalizeAnalysisRange(song?.mediaAnalysisManual, song?.durationSeconds);
  const draftFrom = (manual, detected) =>
    clone(manual || normalizeAnalysisRange(detected, detected?.durationSeconds));

  async function refreshQueue() {
    if (!mediaAnalysisPort?.getQueue || lifetime.signal.aborted) return;
    if (queueRequest) {
      await queueRequest.catch(() => {});
      return;
    }
    const videoId = currentSong?.videoId || '';
    const request = mediaAnalysisPort.getQueue(videoId, { signal: lifetime.signal });
    queueRequest = request;
    try {
      const next = await request;
      if (lifetime.signal.aborted) return;
      queue = { queuedCount: next.queuedCount, runningCount: next.runningCount };
      queueUnavailable = false;
      if (next.activeJob && !operations.has(videoId)) {
        void followJob(videoId, next.activeJob);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') queueUnavailable = true;
    } finally {
      if (queueRequest === request) queueRequest = null;
      publish();
      clearTimeout(queueTimer);
      if (
        !lifetime.signal.aborted &&
        (videoId !== (currentSong?.videoId || '') ||
          operations.size ||
          queueUnavailable ||
          queue?.queuedCount ||
          queue?.runningCount)
      ) {
        queueTimer = setTimeout(
          () => void refreshQueue(),
          queueUnavailable ? Math.max(5000, pollIntervalMs) : pollIntervalMs
        );
        queueTimer.unref?.();
      }
    }
  }

  function applyDetected(result) {
    detectedByVideoId.set(result.videoId, { ...result });
    state = {
      ...state,
      phase: 'succeeded',
      message: '분석 완료',
      detected: { ...result },
      draft: draftFrom(state.manual, result),
      dirty: false
    };
    publish();
  }

  async function loadExisting(version, videoId, signal) {
    try {
      const result = await mediaAnalysisPort.getResult(videoId, { signal });
      if (isCurrent(version, videoId)) applyDetected(result);
    } catch (error) {
      if (error?.name === 'AbortError' || !isCurrent(version, videoId)) return;
      if (error?.status === 404) {
        state = { ...state, phase: 'idle', message: '분석 결과가 없습니다.' };
      } else {
        state = { ...state, phase: 'unavailable', message: error?.message || '분석 서버 오류' };
      }
      publish();
    }
  }

  async function selectSong(song) {
    const nextSong = song?.videoId ? { ...song } : null;
    const nextKey = nextSong ? String(nextSong.id ?? nextSong.videoId) : '';
    if (nextKey === selectionKey && nextSong?.videoId === currentSong?.videoId) {
      const externalManual = manualForSong(nextSong);
      currentSong = nextSong;
      if (!state.dirty && JSON.stringify(externalManual) !== JSON.stringify(state.manual)) {
        state = {
          ...state,
          manual: externalManual,
          draft: draftFrom(externalManual, state.detected)
        };
        publish();
      }
      return;
    }

    selectionVersion += 1;
    selectionKey = nextKey;
    currentSong = nextSong;
    abortController?.abort();
    abortController = null;
    const detected = nextSong ? detectedByVideoId.get(nextSong.videoId) || null : null;
    const manual = manualForSong(nextSong);
    state = {
      phase: !mediaAnalysisPort?.enabled
        ? 'disabled'
        : nextSong
          ? detected
            ? 'succeeded'
            : 'idle'
          : 'empty',
      message: !mediaAnalysisPort?.enabled
        ? '분석 서버가 비활성화되어 있습니다.'
        : nextSong
          ? detected
            ? '분석 완료'
            : '분석 결과를 확인하는 중입니다.'
          : '현재 곡이 없습니다.',
      detected: clone(detected),
      manual,
      draft: draftFrom(manual, detected),
      dirty: false
    };
    publish();
    if (mediaAnalysisPort?.enabled) void refreshQueue();
    if (!mediaAnalysisPort?.enabled || !nextSong || detected) return;
    abortController = new AbortController();
    await loadExisting(selectionVersion, nextSong.videoId, abortController.signal);
  }

  async function analyzeCurrent() {
    if (!mediaAnalysisPort?.enabled || !currentSong?.videoId) return false;
    if (Number(currentSong.durationSeconds) > 600) {
      state = { ...state, phase: 'failed', message: '10분을 초과하는 곡은 분석할 수 없습니다.' };
      publish();
      return false;
    }
    const videoId = currentSong.videoId;
    if (operations.has(videoId)) return false;
    abortController?.abort();
    return followJob(videoId);
  }

  async function followJob(videoId, existingJob) {
    const operation = {
      state: { phase: existingJob?.status || 'submitting', message: '분석 큐에 등록 중...' }
    };
    operations.set(videoId, operation);
    const { signal } = lifetime;
    const update = (patch) => {
      operation.state = patch;
      if (currentSong?.videoId === videoId) state = { ...state, ...patch };
      publish();
    };
    publish();
    try {
      let job = existingJob || (await mediaAnalysisPort.createJob(videoId, { signal }));
      void refreshQueue();
      for (let count = 0; ['queued', 'running'].includes(job.status); count += 1) {
        if (signal.aborted) return false;
        if (count >= maxPolls) throw new Error('분석 대기 시간이 초과되었습니다.');
        update({
          phase: job.status,
          message:
            job.status === 'queued'
              ? '큐에 등록되었습니다. 차례를 기다리는 중입니다.'
              : '분석 중...'
        });
        // Background songs must not multiply requests beyond the shared API rate limit.
        const delay = currentSong?.videoId === videoId ? 1 : Math.max(5, operations.size);
        await wait(pollIntervalMs * delay);
        if (signal.aborted) return false;
        job = await mediaAnalysisPort.getJob(job.jobId, { signal });
      }
      if (signal.aborted) return false;
      if (job.status !== 'succeeded') {
        update({
          phase: job.status || 'failed',
          message:
            job.errorCode === 'download_failed'
              ? 'YouTube에서 음원을 가져오지 못했습니다. 접근 제한 또는 다운로드 오류일 수 있습니다.'
              : job.errorMessage || '분석에 실패했습니다.'
        });
        return false;
      }
      const result = await mediaAnalysisPort.getResult(videoId, { signal });
      if (signal.aborted) return false;
      detectedByVideoId.set(videoId, { ...result });
      operations.delete(videoId);
      if (currentSong?.videoId === videoId) applyDetected(result);
      return true;
    } catch (error) {
      if (error?.name === 'AbortError' || signal.aborted) return false;
      update({
        phase: 'unavailable',
        message: String(error?.message || '분석 서버에 연결할 수 없습니다.').slice(0, 240)
      });
      return false;
    } finally {
      operations.delete(videoId);
      publish();
      void refreshQueue();
    }
  }

  function updateDraft(boundary, value) {
    const duration = Number(state.detected?.durationSeconds || currentSong?.durationSeconds || 0);
    const current = state.draft || {
      drumStart: 0,
      drumEnd: duration > 0 ? duration : 0.1
    };
    const numeric = Math.max(0, Math.min(duration || Number(value), Number(value) || 0));
    const next = { ...current, [boundary]: numeric };
    if (boundary === 'drumStart' && next.drumStart >= next.drumEnd) {
      next.drumStart = Math.max(0, next.drumEnd - 0.1);
    }
    if (boundary === 'drumEnd' && next.drumEnd <= next.drumStart) {
      next.drumEnd = Math.min(duration || next.drumStart + 0.1, next.drumStart + 0.1);
    }
    state = { ...state, draft: next, dirty: true };
    publish();
  }

  async function commitDraft() {
    const version = selectionVersion;
    const song = currentSong;
    const duration = Number(state.detected?.durationSeconds || song?.durationSeconds || 0);
    const manual = normalizeAnalysisRange(state.draft, duration);
    if (!song || !manual) return false;
    await saveManual({ songId: song.id, videoId: song.videoId, manual });
    if (!isCurrent(version, song.videoId)) return false;
    currentSong = { ...currentSong, mediaAnalysisManual: manual };
    state = { ...state, manual, draft: clone(manual), dirty: false };
    publish();
    return true;
  }

  async function restoreDetected() {
    const version = selectionVersion;
    const song = currentSong;
    if (!song) return false;
    await saveManual({ songId: song.id, videoId: song.videoId, manual: null });
    if (!isCurrent(version, song.videoId)) return false;
    const nextSong = { ...currentSong };
    delete nextSong.mediaAnalysisManual;
    currentSong = nextSong;
    state = {
      ...state,
      manual: null,
      draft: draftFrom(null, state.detected),
      dirty: false
    };
    publish();
    return true;
  }

  return {
    analyzeCurrent,
    commitDraft,
    destroy() {
      selectionVersion += 1;
      abortController?.abort();
      lifetime.abort();
      clearTimeout(queueTimer);
    },
    detectedByVideoId,
    getTransitionPlan(current, next, fixedOverlapSeconds) {
      return calculateSmartTransitionPlan({
        currentSong: current,
        nextSong: next,
        detectedByVideoId,
        fixedOverlapSeconds
      });
    },
    getState: snapshot,
    restoreDetected,
    selectSong,
    updateDraft
  };
}
