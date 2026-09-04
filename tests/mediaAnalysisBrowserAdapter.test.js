import test from 'node:test';
import assert from 'node:assert/strict';

import { createMediaAnalysisBrowserAdapter } from '../src/services/mediaAnalysisBrowserAdapter.js';

test('queue snapshot uses the authenticated queue route and optional video ID', async () => {
  const calls = [];
  const adapter = createMediaAnalysisBrowserAdapter({
    apiBaseUrl: 'https://example.com/media-analysis',
    getAccessToken: async () => 'token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ queuedCount: 2, runningCount: 1 }) };
    }
  });
  assert.equal((await adapter.getQueue('dQw4w9WgXcQ')).queuedCount, 2);
  await adapter.getQueue();
  assert.equal(
    calls[0].url,
    'https://example.com/media-analysis/v1/jobs/queue?videoId=dQw4w9WgXcQ'
  );
  assert.equal(calls[1].url, 'https://example.com/media-analysis/v1/jobs/queue');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token');
});

test('remote analysis sends a fresh login token and rejects signed-out requests', async () => {
  let token = 'first';
  const headers = [];
  const adapter = createMediaAnalysisBrowserAdapter({
    apiBaseUrl: 'https://example.com/media-analysis',
    getAccessToken: async () => token,
    fetchImpl: async (_url, options) => {
      headers.push(options.headers.Authorization);
      return { ok: true, json: async () => ({}) };
    }
  });
  await adapter.getResult('dQw4w9WgXcQ');
  token = 'renewed';
  await adapter.createJob('dQw4w9WgXcQ');
  token = '';
  await assert.rejects(adapter.createJob('dQw4w9WgXcQ'), { code: 'unauthenticated' });
  assert.deepEqual(headers, ['Bearer first', 'Bearer renewed']);
});

test('browser adapter uses the configured origin and JSON request contract', async () => {
  const calls = [];
  const adapter = createMediaAnalysisBrowserAdapter({
    apiBaseUrl: 'http://127.0.0.1:8000/',
    async fetchImpl(url, options) {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ jobId: 'job-1', status: 'queued' }) };
    }
  });

  const job = await adapter.createJob('dQw4w9WgXcQ');

  assert.equal(adapter.enabled, true);
  assert.equal(job.jobId, 'job-1');
  assert.equal(calls[0].url, 'http://127.0.0.1:8000/v1/jobs');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, JSON.stringify({ videoId: 'dQw4w9WgXcQ' }));
});

test('browser adapter remains disabled for missing or unsafe base URLs', async () => {
  for (const apiBaseUrl of ['', 'file:///tmp/service', 'https://user:secret@example.com']) {
    const adapter = createMediaAnalysisBrowserAdapter({ apiBaseUrl });
    assert.equal(adapter.enabled, false);
    await assert.rejects(adapter.getResult('dQw4w9WgXcQ'), { code: 'disabled' });
  }
});

test('browser adapter converts fetch failure into a bounded unavailable error', async () => {
  const adapter = createMediaAnalysisBrowserAdapter({
    apiBaseUrl: 'https://analysis.example.com',
    fetchImpl: async () => {
      throw new Error('private network details');
    }
  });

  await assert.rejects(adapter.getResult('dQw4w9WgXcQ'), {
    code: 'unavailable',
    message: '분석 서버에 연결할 수 없습니다.'
  });
});

test('browser adapter exposes batch create, status and cancel requests', async () => {
  const calls = [];
  const adapter = createMediaAnalysisBrowserAdapter({
    apiBaseUrl: 'http://127.0.0.1:8000',
    async fetchImpl(url, options) {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ batchId: 'batch-1', jobs: [] }) };
    }
  });

  await adapter.createBatch(['dQw4w9WgXcQ']);
  await adapter.getBatch('batch-1');
  await adapter.cancelBatch('batch-1');

  assert.equal(calls[0].options.body, JSON.stringify({ videoIds: ['dQw4w9WgXcQ'] }));
  assert.equal(calls[1].url, 'http://127.0.0.1:8000/v1/jobs/batches/batch-1');
  assert.equal(calls[2].options.method, 'DELETE');
});
