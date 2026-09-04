import { isCurrentAnalysis } from './workMusicAnalysisHelper.js';

export function createWorkMusicAutoAnalysisController({
  mediaAnalysisPort,
  onResult = () => {},
  onChange = () => {},
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timers = globalThis
} = {}) {
  const lifetime = new AbortController();
  const completed = new Map();
  let songs = [];
  let running = false;
  let paused = false;
  let retryTimer = null;
  const publish = (message) =>
    onChange({
      message,
      paused,
      total: songs.length,
      done: songs.filter((s) => completed.has(s.videoId)).length
    });
  async function run() {
    if (running || paused || retryTimer || !mediaAnalysisPort?.enabled || lifetime.signal.aborted)
      return;
    running = true;
    const { signal } = lifetime;
    try {
      for (;;) {
        const song = songs.find((s) => !completed.has(s.videoId));
        if (!song || paused || signal.aborted) break;
        if (Number(song.durationSeconds) > 600) {
          completed.set(song.videoId, 'too_long');
          continue;
        }
        publish(`자동 분석: ${song.title || song.videoId} 확인 중`);
        let result;
        try {
          result = await mediaAnalysisPort.getResult(song.videoId, { signal });
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        if (signal.aborted) break;
        if (!isCurrentAnalysis(result)) {
          if (paused || !songs.some((s) => s.videoId === song.videoId)) break;
          let job = await mediaAnalysisPort.createJob(song.videoId, { signal });
          let polls = 0;
          while (['queued', 'running'].includes(job.status) && !signal.aborted) {
            publish(
              `자동 분석: ${song.title || song.videoId} ${job.status === 'queued' ? '대기 중' : '분석 중'}`
            );
            if (++polls > 1800) throw new Error('분석 응답 대기 초과');
            await wait(1500);
            if (signal.aborted) break;
            job = await mediaAnalysisPort.getJob(job.jobId, { signal });
          }
          if (signal.aborted) break;
          if (job.status !== 'succeeded') {
            completed.set(song.videoId, 'failed');
            continue;
          }
          result = await mediaAnalysisPort.getResult(song.videoId, { signal });
        }
        if (signal.aborted) break;
        completed.set(song.videoId, isCurrentAnalysis(result) ? 'succeeded' : 'outdated');
        if (isCurrentAnalysis(result)) onResult(result);
        publish('자동 분석: 다음 곡 확인 중');
        await wait(500);
      }
      if (!signal.aborted) {
        const failed = songs.filter((s) =>
          ['failed', 'outdated', 'too_long'].includes(completed.get(s.videoId))
        ).length;
        publish(
          paused
            ? '자동 분석 일시정지'
            : `자동 분석 확인 완료 ${songs.length}곡${failed ? ` · 실패/제외 ${failed}곡` : ''}`
        );
      }
    } catch (_error) {
      if (!signal.aborted) {
        publish('자동 분석: 서버 연결/응답 대기 · 30초 후 재시도');
        retryTimer = timers.setTimeout(() => {
          retryTimer = null;
          void run();
        }, 30000);
        retryTimer?.unref?.();
      }
    } finally {
      running = false;
      if (!paused && !retryTimer && !signal.aborted && songs.some((s) => !completed.has(s.videoId)))
        void run();
    }
  }
  return {
    sync(next) {
      songs = [
        ...new Map((next || []).filter((s) => s.videoId).map((s) => [s.videoId, s])).values()
      ];
      void run();
    },
    toggle() {
      paused = !paused;
      publish(paused ? '자동 분석 일시정지 · 진행 중인 곡은 완료합니다.' : '자동 분석 재개');
      if (!paused) void run();
    },
    destroy() {
      lifetime.abort();
      timers.clearTimeout(retryTimer);
    },
    getState: () => ({ running, paused, completed: new Map(completed) })
  };
}
