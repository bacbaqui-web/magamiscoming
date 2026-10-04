import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaAnalysisCache } from '../src/services/mediaAnalysisCache.js';
import { createMediaAnalysisBrowserAdapter } from '../src/services/mediaAnalysisBrowserAdapter.js';

test('new adapter restores per-song results and overview after server disconnect', async () => {
  const entries = new Map();
  const storage = {
    open: async () => ({
      match: async (key) => entries.get(key)?.clone(),
      put: async (key, response) => entries.set(key, response.clone()),
      keys: async () => [...entries.keys()].map((url) => ({ url })),
      delete: async (key) => entries.delete(key.url)
    })
  };
  const options = { apiBaseUrl: 'http://127.0.0.1:8000', cache: createMediaAnalysisCache(storage) };
  const result = {
    videoId: 'abcdefghijk',
    durationSeconds: 120,
    sections: [{ start: 0, end: 20, label: 'intro' }]
  };
  const waveform = {
    videoId: result.videoId,
    startSeconds: 0,
    endSeconds: 120,
    resolutionSeconds: 60,
    min: [-0.2, -0.5],
    max: [0.2, 0.5]
  };
  const online = createMediaAnalysisBrowserAdapter({
    ...options,
    fetchImpl: async (url) => ({
      ok: true,
      json: async () => (url.includes('/waveform') ? waveform : result)
    })
  });
  assert.deepEqual(await online.getResult(result.videoId), result);
  const offline = createMediaAnalysisBrowserAdapter({
    ...options,
    cache: createMediaAnalysisCache(storage),
    fetchImpl: async () => {
      throw new TypeError('offline');
    }
  });
  assert.deepEqual(await offline.getResult(result.videoId), { ...result, fromCache: true });
  assert.deepEqual(await offline.getWaveform(result.videoId, { start: 0, end: 120, pixels: 900 }), {
    ...waveform,
    fromCache: true
  });
  await assert.rejects(offline.getResult('anotherSong'), /로컬 분석 서버/);
  await assert.rejects(offline.createJob(result.videoId), /로컬 분석 서버/);
  const denied = createMediaAnalysisBrowserAdapter({
    ...options,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) })
  });
  await assert.rejects(denied.getResult(result.videoId), (error) => error.status === 403);
});

test('cache failures do not break online results', async () => {
  const cache = createMediaAnalysisCache({
    open: async () => {
      throw new Error('quota');
    }
  });
  await cache.put('https://example.com/a', {});
  assert.equal(await cache.get('https://example.com/a'), null);
});
