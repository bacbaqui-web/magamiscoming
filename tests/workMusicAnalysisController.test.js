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

const notFound = () => Promise.reject(Object.assign(new Error('not found'), { status: 404 }));
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('automatic green handles follow structure edges while manual positions and raw drums remain intact', async () => {
  const detected = {
    ...result,
    sections: [
      { start: 0, end: 25, label: 'intro' },
      { start: 170, end: 200, label: 'outro' }
    ]
  };
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: { enabled: true, getResult: async () => detected }
  });
  await controller.selectSong(song);
  assert.equal(controller.getState().draft.drumStart, 25);
  assert.equal(controller.getState().draft.drumEnd, 170);
  assert.equal(controller.getState().detected.drumStart, 10);
  await controller.selectSong({
    ...song,
    mediaAnalysisManual: { drumStart: 12, drumEnd: 180, verseEnd: 70 }
  });
  assert.deepEqual(controller.getState().draft, { drumStart: 12, drumEnd: 180, verseEnd: 70 });
  controller.destroy();
});

test('verse marker persists independently of green edits and restores without altering detected results', async () => {
  let saved;
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: { enabled: true, getResult: async () => result },
    saveManual: async (value) => {
      saved = value.manual;
    }
  });
  await controller.selectSong(song);
  assert.equal(controller.getState().draft.verseEnd, 100);
  controller.updateDraft('verseEnd', 70);
  await controller.commitDraft();
  assert.equal(saved.verseEnd, 70);
  await controller.selectSong({ id: 'other', videoId: 'bbbbbbbbbbb' });
  await controller.selectSong({ ...song, mediaAnalysisManual: saved });
  assert.equal(controller.getState().draft.verseEnd, 70);
  controller.updateDraft('drumStart', 80);
  assert.equal(controller.getState().draft.verseEnd, 70);
  controller.updateDraft('verseEnd', 999);
  assert.equal(controller.getState().draft.verseEnd, 200);
  assert.equal(controller.getState().detected.drumStart, 10);
  await controller.restoreDetected();
  assert.equal(controller.getState().draft.verseEnd, 100);
  assert.equal(saved, null);
  controller.destroy();
});

test('submitted jobs survive song switches, prevent duplicates and cache background results', async () => {
  let releasePost;
  let releaseWait;
  let postedSignal;
  let posts = 0;
  const other = { id: 'other', videoId: 'bbbbbbbbbbb' };
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getQueue: async () => ({ queuedCount: 1, runningCount: 1 }),
      createJob: async (videoId, { signal }) => {
        posts += 1;
        if (videoId === other.videoId) return { status: 'succeeded' };
        postedSignal = signal;
        return new Promise((resolve) => {
          releasePost = resolve;
        });
      },
      getJob: async () => ({ status: 'succeeded' }),
      getResult: async (videoId) => ({ ...result, videoId })
    },
    wait: () =>
      new Promise((resolve) => {
        releaseWait = resolve;
      })
  });
  try {
    await controller.selectSong(song);
    const first = controller.analyzeCurrent();
    await controller.selectSong(other);
    assert.equal(postedSignal.aborted, false);
    assert.equal(await controller.analyzeCurrent(), true);
    releasePost({ jobId: 'first', status: 'queued' });
    await flush();
    await controller.selectSong(song);
    assert.equal(controller.getState().phase, 'queued');
    assert.equal(await controller.analyzeCurrent(), false);
    assert.equal(posts, 2);
    assert.deepEqual(controller.getState().queue, { queuedCount: 1, runningCount: 1 });
    await controller.selectSong(other);
    releaseWait();
    assert.equal(await first, true);
    assert.equal(controller.getState().detected.videoId, other.videoId);
    await controller.selectSong(song);
    assert.equal(controller.getState().phase, 'succeeded');
    assert.equal(controller.getState().detected.videoId, song.videoId);
  } finally {
    controller.destroy();
  }
});

test('selecting a song resumes an existing server job without another POST', async () => {
  let releaseWait;
  let finished = false;
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getQueue: async () => ({
        queuedCount: 0,
        runningCount: finished ? 0 : 1,
        activeJob: finished ? null : { jobId: 'existing', status: 'running' }
      }),
      createJob: async () => {
        assert.fail('must not submit recovered job');
      },
      getJob: async () => {
        finished = true;
        return { status: 'succeeded' };
      },
      getResult: () => (finished ? Promise.resolve(result) : notFound())
    },
    wait: () =>
      new Promise((resolve) => {
        releaseWait = resolve;
      })
  });
  try {
    await controller.selectSong(song);
    await flush();
    assert.equal(controller.getState().phase, 'running');
    releaseWait();
    await flush();
    assert.equal(controller.getState().phase, 'succeeded');
    assert.equal(controller.getState().queue.runningCount, 0);
  } finally {
    controller.destroy();
  }
});

test('queue lookup failure is not reported as an empty queue', async () => {
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: notFound,
      getQueue: async () => {
        throw new Error('offline');
      }
    }
  });
  try {
    await controller.selectSong(song);
    await flush();
    assert.equal(controller.getState().queue, null);
    assert.equal(controller.getState().queueUnavailable, true);
  } finally {
    controller.destroy();
  }
});

test('late initial result lookup cannot overwrite a recovered job completion', async () => {
  let rejectInitial;
  let calls = 0;
  let finished = false;
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getQueue: async () => ({
        queuedCount: 0,
        runningCount: finished ? 0 : 1,
        activeJob: finished ? null : { jobId: 'existing', status: 'running' }
      }),
      getJob: async () => {
        finished = true;
        return { status: 'succeeded' };
      },
      getResult: async () => {
        calls += 1;
        if (calls > 1) return result;
        return new Promise((_resolve, reject) => {
          rejectInitial = reject;
        });
      }
    },
    wait: async () => {}
  });
  try {
    const selecting = controller.selectSong(song);
    await flush();
    assert.equal(controller.getState().phase, 'succeeded');
    rejectInitial(Object.assign(new Error('not found'), { status: 404 }));
    await selecting;
    assert.equal(controller.getState().phase, 'succeeded');
    assert.equal(controller.getState().detected.videoId, song.videoId);
  } finally {
    controller.destroy();
  }
});

test('analysis rejects over ten minutes but accepts exactly ten minutes', async () => {
  let calls = 0;
  const controller = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: async () => result,
      createJob: async () => {
        calls += 1;
        return { status: 'succeeded' };
      }
    }
  });
  await controller.selectSong({ ...song, durationSeconds: 600.01 });
  assert.equal(await controller.analyzeCurrent(), false);
  assert.equal(calls, 0);
  assert.match(controller.getState().message, /10분/);
  await controller.selectSong({ ...song, durationSeconds: 600 });
  assert.equal(await controller.analyzeCurrent(), true);
  assert.equal(calls, 1);
});

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
  assert.deepEqual(saved[0].manual, { drumStart: 14, drumEnd: 190, verseEnd: 100 });
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
