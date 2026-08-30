import test from 'node:test';
import assert from 'node:assert/strict';
import { createYoutubePort } from '../src/ports/youtubePort.js';

test('YouTube Port가 실제 Player와 HTTP Adapter 호출만 전달한다', async () => {
  const calls = [];
  const port = createYoutubePort({
    adapter: {
      createPlayer: (id) => calls.push(['player', id]),
      ensureIframeApi: () => {},
      fetchResponse: (url) => calls.push(['response', url]),
      fetchText: () => '',
      player: {}
    }
  });
  port.createPlayer('target', {});
  port.fetchResponse('https://example.com');
  assert.deepEqual(calls, [
    ['player', 'target'],
    ['response', 'https://example.com']
  ]);
});
