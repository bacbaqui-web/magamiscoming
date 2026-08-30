import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkMusicBatchAnalysisController } from '../src/features/workmusic/workMusicBatchAnalysisController.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('100곡 단위로 batch를 만들고 완료 상태를 집계한다', async () => {
  const created = [];
  const states = [];
  const port = {
    enabled: true,
    async createBatch(videoIds) {
      created.push(videoIds);
      return { batchId: `batch-${created.length}` };
    },
    async getBatch(batchId) {
      const index = Number(batchId.split('-')[1]) - 1;
      return {
        jobs: created[index].map((videoId) => ({ videoId, status: 'succeeded' }))
      };
    }
  };
  const controller = createWorkMusicBatchAnalysisController({
    mediaAnalysisPort: port,
    storage: createStorage(),
    onChange: (state) => states.push(state),
    wait: async () => {}
  });
  const videoIds = Array.from({ length: 205 }, (_, index) => String(index).padStart(11, '0'));

  assert.equal(await controller.start(videoIds), true);
  assert.deepEqual(
    created.map((items) => items.length),
    [100, 100, 5]
  );
  assert.equal(controller.getState().phase, 'succeeded');
  assert.equal(controller.getState().counts.succeeded, 205);
  assert.equal(states.at(-1).message, '205곡 분석 완료');
});

test('저장된 활성 batch를 새 컨트롤러가 다시 조회한다', async () => {
  const storage = createStorage();
  storage.setItem(
    'magamiscoming.workmusicLab.analysisBatch.v1',
    JSON.stringify({
      batchIds: ['batch-1'],
      videoIds: ['dQw4w9WgXcQ'],
      active: true
    })
  );
  const controller = createWorkMusicBatchAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      async getBatch() {
        return { jobs: [{ videoId: 'dQw4w9WgXcQ', status: 'succeeded' }] };
      }
    },
    storage,
    wait: async () => {}
  });

  assert.equal(await controller.restore(), true);
  assert.equal(controller.getState().counts.succeeded, 1);
});
