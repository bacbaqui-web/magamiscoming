export class MediaAnalysisRequestError extends Error {
  constructor(message, { status = 0, code = 'request_failed' } = {}) {
    super(message);
    this.name = 'MediaAnalysisRequestError';
    this.status = status;
    this.code = code;
  }
}

function normalizeBaseUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href.replace(/\/$/, '');
  } catch (_error) {
    return '';
  }
}

export function createMediaAnalysisBrowserAdapter({
  apiBaseUrl = '',
  getAccessToken,
  fetchImpl = globalThis.fetch?.bind(globalThis)
} = {}) {
  const baseUrl = normalizeBaseUrl(apiBaseUrl);

  async function request(path, { method = 'GET', body, signal } = {}) {
    if (!baseUrl || typeof fetchImpl !== 'function') {
      throw new MediaAnalysisRequestError('분석 서버가 비활성화되어 있습니다.', {
        code: 'disabled'
      });
    }
    let response;
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (getAccessToken) {
      const token = await getAccessToken();
      if (!token) {
        throw new MediaAnalysisRequestError('로그인 후 다시 분석해 주세요.', {
          status: 401,
          code: 'unauthenticated'
        });
      }
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new MediaAnalysisRequestError('분석 서버에 연결할 수 없습니다.', {
        code: 'unavailable'
      });
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      /* 상태 코드로 처리 */
    }
    if (!response.ok) {
      throw new MediaAnalysisRequestError(
        String(payload?.detail || '분석 서버 요청에 실패했습니다.').slice(0, 240),
        { status: response.status, code: payload?.errorCode || 'request_failed' }
      );
    }
    return payload;
  }

  return {
    enabled: !!baseUrl,
    createJob: (videoId, { signal } = {}) =>
      request('/v1/jobs', { method: 'POST', body: { videoId }, signal }),
    createBatch: (videoIds, { signal } = {}) =>
      request('/v1/jobs/batches', { method: 'POST', body: { videoIds }, signal }),
    getBatch: (batchId, { signal } = {}) =>
      request(`/v1/jobs/batches/${encodeURIComponent(batchId)}`, { signal }),
    cancelBatch: (batchId, { signal } = {}) =>
      request(`/v1/jobs/batches/${encodeURIComponent(batchId)}`, {
        method: 'DELETE',
        signal
      }),
    getJob: (jobId, { signal } = {}) =>
      request(`/v1/jobs/${encodeURIComponent(jobId)}`, { signal }),
    getResult: (videoId, { signal } = {}) =>
      request(`/v1/results/${encodeURIComponent(videoId)}`, { signal })
  };
}
