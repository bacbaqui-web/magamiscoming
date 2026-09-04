import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LOCAL_WORK_MUSIC_STORAGE_KEY,
  loadLocalWorkMusicState,
  saveLocalWorkMusicState
} from '../src/services/localWorkMusicStore.js';

function createStorage(initial = null) {
  const values = new Map(initial ? [[LOCAL_WORK_MUSIC_STORAGE_KEY, initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: () => values.get(LOCAL_WORK_MUSIC_STORAGE_KEY)
  };
}

test('local workmusic store preserves songs and manual boundaries only', () => {
  const storage = createStorage();
  const saved = saveLocalWorkMusicState(
    {
      songs: [
        {
          id: 'song-1',
          videoId: 'dQw4w9WgXcQ',
          title: '테스트 곡',
          durationSeconds: 200,
          mediaAnalysisManual: { drumStart: 12, drumEnd: 188, verseEnd: 96 },
          detected: { confidence: 0.9 }
        }
      ],
      currentIndex: 0,
      volume: 75,
      seamlessOverlapSeconds: 8
    },
    storage
  );

  assert.deepEqual(saved.songs[0].mediaAnalysisManual, {
    drumStart: 12,
    drumEnd: 188,
    verseEnd: 96
  });
  assert.equal('detected' in saved.songs[0], false);
  assert.deepEqual(loadLocalWorkMusicState(storage), saved);
});

test('local workmusic store recovers from invalid JSON and song values', () => {
  assert.deepEqual(loadLocalWorkMusicState(createStorage('{broken')), {
    songs: [],
    currentIndex: 0,
    volume: 80,
    seamlessOverlapSeconds: 0
  });
  const storage = createStorage(JSON.stringify({ songs: [{ videoId: 'bad' }] }));
  assert.deepEqual(loadLocalWorkMusicState(storage).songs, []);
});
