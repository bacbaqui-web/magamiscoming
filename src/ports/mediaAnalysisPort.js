const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function createMediaAnalysisPort({ adapter } = {}) {
  const enabled = !!adapter?.enabled;
  const requireVideoId = (videoId) => {
    const value = String(videoId || '');
    if (!VIDEO_ID_PATTERN.test(value)) throw new TypeError('유효한 YouTube videoId가 필요합니다.');
    return value;
  };
  const requireBatchId = (batchId) => {
    const value = String(batchId || '').trim();
    if (!value) throw new TypeError('batchId가 필요합니다.');
    return value;
  };

  return {
    enabled,
    getQueue(videoId, options) {
      return adapter.getQueue(videoId ? requireVideoId(videoId) : '', options);
    },
    createJob(videoId, options) {
      return adapter.createJob(requireVideoId(videoId), options);
    },
    createBatch(videoIds, options) {
      const values = [...new Set((Array.isArray(videoIds) ? videoIds : []).map(requireVideoId))];
      if (!values.length || values.length > 100) {
        throw new TypeError('batch에는 1~100개의 videoId가 필요합니다.');
      }
      return adapter.createBatch(values, options);
    },
    getBatch(batchId, options) {
      return adapter.getBatch(requireBatchId(batchId), options);
    },
    cancelBatch(batchId, options) {
      return adapter.cancelBatch(requireBatchId(batchId), options);
    },
    getJob(jobId, options) {
      const value = String(jobId || '').trim();
      if (!value) throw new TypeError('jobId가 필요합니다.');
      return adapter.getJob(value, options);
    },
    getResult(videoId, options) {
      return adapter.getResult(requireVideoId(videoId), options);
    }
  };
}
