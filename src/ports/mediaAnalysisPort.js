const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function createMediaAnalysisPort({ adapter } = {}) {
  const enabled = !!adapter?.enabled;
  const requireVideoId = (videoId) => {
    const value = String(videoId || '');
    if (!VIDEO_ID_PATTERN.test(value)) throw new TypeError('유효한 YouTube videoId가 필요합니다.');
    return value;
  };

  return {
    enabled,
    createJob(videoId, options) {
      return adapter.createJob(requireVideoId(videoId), options);
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
