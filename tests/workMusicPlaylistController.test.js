import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkMusicPlaylistController } from '../src/features/workmusic/workMusicPlaylistController.js';

test('재생목록 API의 모든 페이지를 읽고 비공개·중복 영상을 제외한다', async () => {
  const requests = [];
  const metadataController = {
    async apiGet(path, params) {
      requests.push({ path, params });
      if (path === 'playlists') return { items: [{ snippet: { title: '집중 음악' } }] };
      if (!params.pageToken) {
        return {
          nextPageToken: 'second-page',
          items: [
            {
              contentDetails: { videoId: 'aaaaaaaaaaa' },
              snippet: { title: '첫 곡', videoOwnerChannelTitle: '첫 채널' }
            },
            {
              contentDetails: { videoId: 'bbbbbbbbbbb' },
              snippet: { title: 'Private video' }
            }
          ]
        };
      }
      return {
        items: [
          {
            contentDetails: { videoId: 'aaaaaaaaaaa' },
            snippet: { title: '첫 곡 중복' }
          },
          {
            contentDetails: { videoId: 'ccccccccccc' },
            snippet: { title: '둘째 곡', videoOwnerChannelTitle: '둘째 채널' }
          }
        ]
      };
    },
    async fetchVideos() {
      return {
        aaaaaaaaaaa: { durationSeconds: 120, thumbnail: 'first.jpg' },
        ccccccccccc: { durationSeconds: 180, thumbnail: 'second.jpg' }
      };
    }
  };
  const controller = createWorkMusicPlaylistController({
    fetchProxyText: async () => '',
    metadataController,
    parseFeed: () => ({ items: [] }),
    parseHtml: () => ({ items: [] })
  });

  const result = await controller.fetchPlaylist('PL_test');

  assert.equal(result.title, '집중 음악');
  assert.deepEqual(
    result.items.map((item) => item.videoId),
    ['aaaaaaaaaaa', 'ccccccccccc']
  );
  assert.equal(result.items[0].durationSeconds, 120);
  assert.deepEqual(
    requests
      .filter((request) => request.path === 'playlistItems')
      .map((request) => request.params.pageToken),
    ['', 'second-page']
  );
});
