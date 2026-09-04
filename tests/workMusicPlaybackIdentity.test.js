import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkMusicPlaybackVideoId } from '../src/features/workmusic/workMusicPlaybackIdentity.js';

test('playback identity uses actual player data or public video URL, never selected-song guesses', () => {
  assert.equal(
    getWorkMusicPlaybackVideoId({ getVideoData: () => ({ video_id: 'actual' }) }),
    'actual'
  );
  assert.equal(
    getWorkMusicPlaybackVideoId({ getVideoUrl: () => 'https://www.youtube.com/watch?v=actual' }),
    'actual'
  );
  assert.equal(
    getWorkMusicPlaybackVideoId({
      getVideoData() {
        throw Error('unsupported');
      },
      getVideoUrl: () => 'https://www.youtube.com/watch?v=actual'
    }),
    'actual'
  );
  assert.equal(getWorkMusicPlaybackVideoId({}), '');
  assert.equal(getWorkMusicPlaybackVideoId({ getVideoUrl: () => 'invalid' }), '');
});
