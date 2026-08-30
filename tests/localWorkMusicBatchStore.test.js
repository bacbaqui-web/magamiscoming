import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LOCAL_WORK_MUSIC_BATCH_STORAGE_KEY,
  loadLocalWorkMusicBatch,
  saveLocalWorkMusicBatch
} from '../src/services/localWorkMusicBatchStore.js';

function createStorage(initial = null) {
  const values = new Map(initial ? [[LOCAL_WORK_MUSIC_BATCH_STORAGE_KEY, initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('batch 저장은 재개에 필요한 ID와 활성 상태만 보존한다', () => {
  const storage = createStorage();
  const saved = saveLocalWorkMusicBatch(
    {
      batchIds: ['batch-1', ''],
      videoIds: ['dQw4w9WgXcQ', 'invalid', 'dQw4w9WgXcQ'],
      active: true,
      results: [{ beats: [1, 2, 3] }]
    },
    storage
  );

  assert.deepEqual(saved, {
    batchIds: ['batch-1'],
    videoIds: ['dQw4w9WgXcQ'],
    active: true
  });
  assert.deepEqual(loadLocalWorkMusicBatch(storage), saved);
});

test('손상된 batch 저장값은 빈 상태로 복구한다', () => {
  assert.deepEqual(loadLocalWorkMusicBatch(createStorage('{broken')), {
    batchIds: [],
    videoIds: [],
    active: false
  });
});
