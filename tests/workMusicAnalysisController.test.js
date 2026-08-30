import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkMusicAnalysisController } from '../src/features/workmusic/workMusicAnalysisController.js';

const song = { id: 'song-1', videoId: 'dQw4w9WgXcQ' };
const result = {
  videoId: song.videoId,
  durationSeconds: 200,
  bpm: 120,
  beats: [0, 0.5, 1],
  bars: [0, 2],
  drumStart: 10,
  drumEnd: 190,
  confidence: 0.8
};

test('enabled controller publishes an empty phase for the initial empty song list', async () => {
  const states = [];
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: { enabled: true },
    onChange: (state) => states.push(state)
  });

  await controller.selectSong(null);

  assert.equal(controller.getState().phase, 'empty');
  assert.equal(states.length, 1);
  assert.equal(states[0].message, '현재 곡이 없습니다.');
});

test('controller runs POST, poll, result and keeps detected values runtime-only', async () => {
  const calls = [];
  const saved = [];
  const port = {
    enabled: true,
    createJob: async () => (calls.push('post'), { jobId: 'job-1', status: 'queued' }),
    getJob: async () => (calls.push('poll'), { jobId: 'job-1', status: 'succeeded' }),
    getResult: async () => (calls.push('result'), result)
  };
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: port,
    saveManual: async (value) => saved.push(value),
    wait: async () => {}
  });
  await controller.selectSong(song);
  calls.length = 0;
  assert.equal(await controller.analyzeCurrent(), true);
  assert.deepEqual(calls, ['post', 'poll', 'result']);
  assert.equal(controller.getState().detected.bpm, 120);
  assert.deepEqual(saved, []);

  controller.updateDraft('drumStart', 14);
  assert.deepEqual(saved, []);
  await controller.commitDraft();
  assert.deepEqual(saved[0].manual, { drumStart: 14, drumEnd: 190 });
  await controller.restoreDetected();
  assert.equal(saved[1].manual, null);
});

test('song switch blocks stale result from the previous song', async () => {
  let resolveFirst;
  const firstResult = new Promise((resolve) => {
    resolveFirst = resolve;
  });
  const port = {
    enabled: true,
    createJob: async () => ({}),
    getJob: async () => ({}),
    getResult: (videoId) =>
      videoId === 'aaaaaaaaaaa'
        ? firstResult
        : Promise.reject(Object.assign(new Error('not found'), { status: 404 }))
  };
  const controller = createWorkMusicAnalysisController({ mediaAnalysisPort: port });
  const selectingFirst = controller.selectSong({ id: 'a', videoId: 'aaaaaaaaaaa' });
  await controller.selectSong({ id: 'b', videoId: 'bbbbbbbbbbb' });
  resolveFirst({ ...result, videoId: 'aaaaaaaaaaa' });
  await selectingFirst;

  assert.equal(controller.getState().videoId, 'bbbbbbbbbbb');
  assert.equal(controller.getState().detected, null);
});

test('disabled controller never calls the analysis adapter', async () => {
  let calls = 0;
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: false,
      getResult: async () => {
        calls += 1;
      },
      createJob: async () => {
        calls += 1;
      }
    }
  });
  await controller.selectSong(song);
  assert.equal(await controller.analyzeCurrent(), false);
  assert.equal(calls, 0);
  assert.equal(controller.getState().phase, 'disabled');
});
