import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlayOrder,
  extractYoutubePlaylistId,
  extractYoutubeVideoId,
  formatWorkMusicDuration,
  getAdjacentIndex,
  normalizeSeamlessSeconds,
  putFailedSongsLast,
  parseYoutubeIsoDuration
} from '../src/features/workmusic/workMusicHelper.js';

test('실패 곡은 표시 순서 끝에 모으고 복구 시 원래 순서로 돌아간다', () => {
  const songs = [{}, { playbackStatus: 'error' }, {}, { playbackStatus: 'error' }];
  const order = [3, 2, 1, 0];
  assert.deepEqual(putFailedSongsLast(order, songs), [2, 0, 3, 1]);
  assert.deepEqual(order, [3, 2, 1, 0]);
  songs[3].playbackStatus = '';
  assert.deepEqual(putFailedSongsLast(order, songs), [3, 2, 0, 1]);
  songs[1].playbackStatus = '';
  assert.deepEqual(putFailedSongsLast(order, songs), order);
  assert.deepEqual(putFailedSongsLast([], []), []);
});

test('YouTube 영상과 재생목록 ID를 지원 URL에서 추출한다', () => {
  assert.equal(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=1'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeVideoId('not a youtube url'), '');
  assert.equal(
    extractYoutubePlaylistId('https://www.youtube.com/playlist?list=PL_example'),
    'PL_example'
  );
});

test('재생 시간과 이어듣기 범위를 정규화한다', () => {
  assert.equal(parseYoutubeIsoDuration('PT1H2M3S'), 3723);
  assert.equal(formatWorkMusicDuration(3723), '1:02:03');
  assert.equal(normalizeSeamlessSeconds(-3), 0);
  assert.equal(normalizeSeamlessSeconds(99), 20);
});

test('순차·셔플 재생 순서와 인접 곡을 계산한다', () => {
  assert.deepEqual(createPlayOrder(4, 'sequential'), [0, 1, 2, 3]);
  assert.deepEqual(
    createPlayOrder(3, 'random', () => 0),
    [1, 2, 0]
  );
  assert.equal(getAdjacentIndex(2, 1, 3, [0, 1, 2]), 0);
  assert.equal(getAdjacentIndex(0, -1, 3, [0, 1, 2]), 2);
});
