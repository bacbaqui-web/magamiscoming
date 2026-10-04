import { createMediaAnalysisCache } from './mediaAnalysisCache.js';

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
  cache = createMediaAnalysisCache(),
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
      const local = ['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname);
      throw new MediaAnalysisRequestError(
        local
          ? '이 컴퓨터의 로컬 분석 서버에 연결할 수 없습니다. 서버를 실행하고 브라우저의 로컬 네트워크 접근을 허용해 주세요.'
          : '분석 서버에 연결할 수 없습니다.',
        {
          code: 'unavailable'
        }
      );
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

  async function cachedRequest(path, options = {}, fallbackPath = path) {
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(4000)])
      : AbortSignal.timeout(4000);
    try {
      const value = await request(path, { ...options, signal });
      await cache.put(`${baseUrl}${path}`, value);
      return value;
    } catch (error) {
      if (options.signal?.aborted || (error.status && error.status < 500)) throw error;
      const value =
        (await cache.get(`${baseUrl}${path}`)) || (await cache.get(`${baseUrl}${fallbackPath}`));
      if (value) return { ...value, fromCache: true };
      throw error;
    }
  }

  return {
    enabled: !!baseUrl,
    getQueue: (videoId = '', { signal } = {}) =>
      request(`/v1/jobs/queue${videoId ? `?videoId=${encodeURIComponent(videoId)}` : ''}`, {
        signal
      }),
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
    getResult: async (videoId, { signal } = {}) => {
      const path = `/v1/results/${encodeURIComponent(videoId)}`;
      const previous = await cache.get(`${baseUrl}${path}`);
      const result = await cachedRequest(path, { signal });
      if (!result.fromCache && result.durationSeconds > 0) {
        if (JSON.stringify(previous) !== JSON.stringify(result)) {
          await cache.clearPrefix?.(`${baseUrl}${path}/waveform`);
        }
        const overview = `${path}/waveform?${new URLSearchParams({ start: 0, end: result.durationSeconds, pixels: 2048 })}`;
        try {
          const waveform =
            JSON.stringify(previous) === JSON.stringify(result)
              ? (await cache.get(`${baseUrl}${path}/waveform/offline`)) ||
                (await cachedRequest(overview, { signal }))
              : await cachedRequest(overview, { signal });
          if (!waveform.fromCache) await cache.put(`${baseUrl}${path}/waveform/offline`, waveform);
        } catch {
          /* Result remains useful even when detail is unavailable. */
        }
      }
      return result;
    },
    getWaveform: (videoId, { start, end, pixels = 1000, signal } = {}) =>
      cachedRequest(
        `/v1/results/${encodeURIComponent(videoId)}/waveform?${new URLSearchParams({ start, end, pixels })}`,
        { signal },
        `/v1/results/${encodeURIComponent(videoId)}/waveform/offline`
      )
  };
}
