import {
  loadLocalWorkMusicBatch,
  saveLocalWorkMusicBatch
} from '../../services/localWorkMusicBatchStore.js';

const ACTIVE_STATUSES = new Set(['queued', 'running']);
const CHUNK_SIZE = 100;
const waitDefault = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function chunks(values) {
  const result = [];
  for (let index = 0; index < values.length; index += CHUNK_SIZE) {
    result.push(values.slice(index, index + CHUNK_SIZE));
  }
  return result;
}

export function createWorkMusicBatchAnalysisController({
  mediaAnalysisPort,
  storage = localStorage,
  onChange = () => {},
  wait = waitDefault,
  pollIntervalMs = 1500
} = {}) {
  let session = loadLocalWorkMusicBatch(storage);
  let runVersion = 0;
  let state = {
    phase: mediaAnalysisPort?.enabled ? 'idle' : 'disabled',
    message: mediaAnalysisPort?.enabled
      ? '먼저 5곡 시험 분석을 실행해주세요.'
      : '로컬 분석 서버가 비활성화되어 있습니다.',
    counts: {},
    jobs: [],
    total: session.videoIds.length
  };

  const publish = () => onChange({ ...state, counts: { ...state.counts }, jobs: [...state.jobs] });
  const persist = (next) => {
    session = saveLocalWorkMusicBatch(next, storage);
  };

  async function poll(version) {
    while (version === runVersion && session.batchIds.length) {
      try {
        const batches = await Promise.all(
          session.batchIds.map((batchId) => mediaAnalysisPort.getBatch(batchId))
        );
        if (version !== runVersion) return false;
        const jobs = batches.flatMap((batch) => batch.jobs || []);
        const counts = jobs.reduce((result, job) => {
          result[job.status] = (result[job.status] || 0) + 1;
          return result;
        }, {});
        const active = jobs.some((job) => ACTIVE_STATUSES.has(job.status));
        state = {
          phase: active ? 'running' : counts.failed ? 'completed_with_errors' : 'succeeded',
          message: active
            ? `${(counts.succeeded || 0) + (counts.failed || 0) + (counts.cancelled || 0)}/${jobs.length}곡 처리됨`
            : counts.failed
              ? `완료 ${counts.succeeded || 0}곡, 실패 ${counts.failed}곡`
              : `${counts.succeeded || 0}곡 분석 완료`,
          counts,
          jobs,
          total: jobs.length
        };
        persist({ ...session, active });
        publish();
        if (!active) return true;
        await wait(pollIntervalMs);
      } catch (error) {
        if (version !== runVersion) return false;
        state = {
          ...state,
          phase: 'unavailable',
          message: String(error?.message || 'batch 상태를 확인할 수 없습니다.').slice(0, 240)
        };
        publish();
        return false;
      }
    }
    return false;
  }

  async function start(videoIds) {
    if (!mediaAnalysisPort?.enabled) return false;
    const values = [...new Set((videoIds || []).filter(Boolean))];
    if (!values.length) return false;
    runVersion += 1;
    const version = runVersion;
    state = {
      phase: 'submitting',
      message: `${values.length}곡 분석 요청을 등록하는 중입니다...`,
      counts: {},
      jobs: [],
      total: values.length
    };
    publish();
    try {
      const batchIds = [];
      for (const group of chunks(values)) {
        const batch = await mediaAnalysisPort.createBatch(group);
        batchIds.push(batch.batchId);
        persist({ batchIds, videoIds: values, active: true });
      }
      if (version !== runVersion) return false;
      return poll(version);
    } catch (error) {
      if (version !== runVersion) return false;
      state = {
        ...state,
        phase: 'unavailable',
        message: String(error?.message || 'batch 분석 요청에 실패했습니다.').slice(0, 240)
      };
      publish();
      return false;
    }
  }

  async function stop() {
    runVersion += 1;
    const batchIds = [...session.batchIds];
    await Promise.allSettled(batchIds.map((batchId) => mediaAnalysisPort.cancelBatch(batchId)));
    persist({ ...session, active: false });
    state = { ...state, phase: 'stopped', message: '대기 작업을 중단했습니다.' };
    publish();
  }

  function resume() {
    return session.videoIds.length ? start(session.videoIds) : false;
  }

  function restore() {
    if (!mediaAnalysisPort?.enabled || !session.active || !session.batchIds.length) {
      publish();
      return false;
    }
    runVersion += 1;
    return poll(runVersion);
  }

  return { getState: () => ({ ...state }), restore, resume, start, stop };
}
