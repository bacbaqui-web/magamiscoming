import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicEngine } from '../src/features/workmusic/workMusicEngine.js';
import { createWorkMusicPlaybackController } from '../src/features/workmusic/workMusicPlaybackController.js';

test('failure clears after five seconds of playback, excluding pauses, buffering and seeking', () => {
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        { id: 'a', videoId: 'a', playbackStatus: 'error', playbackErrorCode: '150' },
        { id: 'b', videoId: 'b', playbackStatus: 'error' }
      ]
    }
  });
  let time = 0;
  let saves = 0;
  const timers = new Map();
  let timerId = 0;
  const controller = createWorkMusicPlaybackController({
    engine,
    youtubePort: {},
    root: {},
    now: () => time,
    save: () => {
      saves++;
    },
    setTimer: (fn) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimer: (id) => timers.delete(id)
  });
  const player = {
    position: 90,
    state: 1,
    getCurrentTime() {
      return this.position;
    },
    getPlayerState() {
      return this.state;
    },
    getVideoData: () => ({ video_id: 'a' })
  };
  const advance = (seconds, playing = true) => {
    for (let i = 0; i < seconds * 4; i++) {
      time += 250;
      if (playing) player.position += 0.25;
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((fn) => fn());
    }
  };
  controller.observePlayback(player, 1, 1); // actual video identity wins over selected index
  advance(4);
  player.state = 2;
  controller.observePlayback(player, 2, 0);
  advance(20, false);
  player.state = 3;
  controller.observePlayback(player, 3, 0);
  advance(20, false);
  player.state = 1;
  controller.observePlayback(player, 1, 0);
  player.position += 60;
  advance(0.25);
  advance(0.75);
  assert.equal(engine.getSnapshot().songs[0].playbackStatus, 'error');
  advance(0.25);
  assert.equal(engine.getSnapshot().songs[0].playbackStatus, undefined);
  assert.equal(engine.getSnapshot().songs[0].playbackErrorCode, undefined);
  assert.equal(engine.getSnapshot().songs[1].playbackStatus, 'error');
  assert.equal(saves, 1);
  controller.destroy();
  assert.equal(timers.size, 0);
});
