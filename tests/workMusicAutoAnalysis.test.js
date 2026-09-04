import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicAutoAnalysisController } from '../src/features/workmusic/workMusicAutoAnalysisController.js';
import {
  isCurrentAnalysis,
  suggestVerseEnd
} from '../src/features/workmusic/workMusicAnalysisHelper.js';
import { createWorkMusicAnalysisController } from '../src/features/workmusic/workMusicAnalysisController.js';
const current = (videoId) => ({
  videoId,
  analyzerVersion: '0.3.0',
  structureVersion: '1.0',
  waveformDetailVersion: '1.0',
  structureAttemptVersion: '1.0',
  durationSeconds: 200,
  waveform: [0, 0.5, 1],
  sections: [],
  drumStart: 10,
  drumEnd: 190
});

test('model verse labels override early-chorus heuristic and fallback attempt is current', () => {
  const result = {
    ...current('model'),
    structureModel: 'all-in-one-mlx-1.0.6',
    sections: [
      { start: 0, end: 5, label: 'verse' },
      { start: 5, end: 15, label: 'chorus_candidate' },
      { start: 30, end: 45, label: 'chorus_candidate' }
    ]
  };
  assert.equal(suggestVerseEnd(result, { drumStart: 0, drumEnd: 190 }).value, 15);
  result.sections[0].label = 'intro';
  assert.equal(suggestVerseEnd(result, { drumStart: 0, drumEnd: 190 }).value, 45);
  assert.equal(isCurrentAnalysis({ ...result, structureAttemptVersion: undefined }), false);
  assert.equal(isCurrentAnalysis({ ...result, structureModel: null }), true);
});
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('auto analysis checks in playlist order, reuses fresh results and serially upgrades old/missing results', async () => {
  const results = new Map([
    ['fresh', current('fresh')],
    ['old', { ...current('old'), analyzerVersion: '0.2.0' }]
  ]);
  const posts = [];
  const accepted = [];
  let active = 0;
  let maximum = 0;
  const auto = createWorkMusicAutoAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: async (id) => {
        if (!results.has(id)) throw Object.assign(new Error(), { status: 404 });
        return results.get(id);
      },
      createJob: async (id) => {
        posts.push(id);
        active++;
        maximum = Math.max(maximum, active);
        return { jobId: id, status: 'queued' };
      },
      getJob: async (id) => {
        active--;
        results.set(id, current(id));
        return { status: 'succeeded' };
      }
    },
    wait: async () => {},
    onResult: (r) => accepted.push(r.videoId)
  });
  auto.sync(['fresh', 'old', 'new', 'new'].map((videoId) => ({ videoId })));
  await flush();
  assert.deepEqual(posts, ['old', 'new']);
  assert.equal(maximum, 1);
  assert.deepEqual(accepted, ['fresh', 'old', 'new']);
  auto.sync([{ videoId: 'new' }]);
  await flush();
  assert.equal(posts.length, 2);
  auto.destroy();
});

test('offline pauses with retry; failed jobs are not retried in a loop and >10min songs are skipped', async () => {
  let retry;
  let online = false;
  let posts = 0;
  const auto = createWorkMusicAutoAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: async () => {
        throw Object.assign(new Error(), { status: online ? 404 : 503 });
      },
      createJob: async () => {
        posts++;
        return { status: 'failed' };
      }
    },
    timers: {
      setTimeout: (fn) => {
        retry = fn;
        return 1;
      },
      clearTimeout() {}
    },
    wait: async () => {}
  });
  auto.sync([{ videoId: 'a' }, { videoId: 'long', durationSeconds: 601 }]);
  await flush();
  assert.equal(posts, 0);
  online = true;
  retry();
  await flush();
  assert.equal(posts, 1);
  auto.sync([{ videoId: 'a' }]);
  await flush();
  assert.equal(posts, 1);
  auto.destroy();
});

test('verse suggestion chooses second chorus for chorus opening, first after a verse, merges adjacent candidates', () => {
  const range = { drumStart: 10, drumEnd: 190 };
  const s = (start, end, label = 'chorus_candidate') => ({ start, end, label });
  assert.equal(
    suggestVerseEnd({ sections: [s(0, 10, 'intro'), s(10, 25), s(25, 40), s(80, 110)] }, range)
      .value,
    110
  );
  assert.equal(
    suggestVerseEnd({ sections: [s(10, 35, 'section'), s(35, 65), s(100, 130)] }, range).value,
    65
  );
  assert.match(suggestVerseEnd({ sections: [] }, range).reason, /불확실/);
  assert.equal(isCurrentAnalysis({ ...current('a'), waveform: [] }), false);
  assert.equal(isCurrentAnalysis(current('a')), true);
});

test('background upgrades preserve dirty edits; edge saves pin the existing verse independently', async () => {
  let saved;
  const result = { ...current('a'), sections: [{ start: 40, end: 65, label: 'chorus_candidate' }] };
  const analysis = createWorkMusicAnalysisController({
    mediaAnalysisPort: { enabled: true, getResult: async () => result },
    saveManual: async (v) => {
      saved = v.manual;
    }
  });
  await analysis.selectSong({ id: 'a', videoId: 'a' });
  assert.equal(analysis.getState().draft.verseEnd, 65);
  analysis.updateDraft('drumStart', 15);
  analysis.acceptResult({ ...result, drumStart: 20 });
  assert.equal(analysis.getState().draft.drumStart, 15);
  assert.equal(analysis.getState().dirty, true);
  await analysis.commitDraft();
  assert.equal(saved.verseEnd, 65);
  analysis.updateDraft('drumStart', 80);
  assert.equal(analysis.getState().draft.verseEnd, 65);
  await analysis.commitDraft();
  assert.equal(analysis.getState().draft.verseEnd, 65);
  analysis.updateDraft('verseEnd', 70);
  await analysis.commitDraft();
  analysis.acceptResult({
    ...result,
    sections: [{ start: 50, end: 85, label: 'chorus_candidate' }]
  });
  assert.equal(analysis.getState().draft.verseEnd, 70);
  analysis.destroy();
});
