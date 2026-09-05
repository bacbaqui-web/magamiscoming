import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicEngine } from '../src/features/workmusic/workMusicEngine.js';
import { createWorkMusicSeamlessController } from '../src/features/workmusic/workMusicSeamlessController.js';
import { createWorkMusicPlaybackController } from '../src/features/workmusic/workMusicPlaybackController.js';
import { createWorkMusicAnalysisController } from '../src/features/workmusic/workMusicAnalysisController.js';

const song = (id, extra = {}) => ({ id, videoId: id, durationSeconds: 100, ...extra });
const manual = { mediaAnalysisManual: { drumStart: 10, drumEnd: 80 } };
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('both songs crossfade before green and hand off completely at green', async () => {
  const callbacks = [];
  const f = await setup([song('a', manual), song('b', manual)], {
    interval: (fn) => {
      callbacks.push(fn);
      return callbacks.length;
    }
  });
  f.players[0].current = 70;
  f.controller.monitor();
  f.players[1].options.events.onStateChange({ data: 1 });
  const tick = callbacks.at(-1);
  const level = f.engine.getSnapshot().volume;
  f.players[1].current = 5;
  tick();
  assert.equal(f.players[0].volume, level * 0.75);
  assert.equal(f.players[1].volume, level * 0.25);
  f.players[1].current = 10;
  tick();
  assert.equal(f.players[0].volume, 0);
  assert.equal(f.players[1].volume, level);
  assert.equal(f.engine.getSnapshot().currentIndex, 1);
  f.controller.destroy();
});

test('failed standby is muted, verified for five seconds, then rewound and offered for DJ', async () => {
  let time = 0;
  let id = 0;
  let saves = 0;
  const timers = new Map();
  const f = await setup([song('a', manual), song('b', { ...manual, playbackStatus: 'error' })], {
    now: () => time,
    playbackOptions: {
      now: () => time,
      setTimer: (fn) => {
        timers.set(++id, fn);
        return id;
      },
      clearTimer: (key) => timers.delete(key),
      save: () => {
        saves++;
      }
    }
  });
  const next = f.players[1];
  next.options.events.onStateChange({ data: 5 });
  assert.equal(next.played, true);
  assert.equal(next.volume, 0);
  assert.equal(f.controller.canManualTransition(1), false);
  next.state = 1;
  next.options.events.onStateChange({ data: 1 });
  for (let tick = 0; tick < 20; tick++) {
    time += 250;
    next.current += 0.25;
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach((fn) => fn());
    if (tick < 19) assert.equal(f.engine.getSnapshot().songs[1].playbackStatus, 'error');
  }
  f.controller.monitor();
  assert.equal(f.engine.getSnapshot().songs[1].playbackStatus, undefined);
  assert.equal(saves, 1);
  assert.equal(f.controller.getState().probe, null);
  assert.equal(next.current, 0);
  assert.equal(next.volume, 0);
  assert.equal(f.controller.canManualTransition(1), true);
  assert.equal(f.engine.getSnapshot().currentIndex, 0);
  f.controller.destroy();
  f.playback.destroy();
});

test('probe timeout and current-track end skip unverified candidates without looping', async () => {
  let time = 0;
  const f = await setup(
    [
      song('a', manual),
      song('bad', { ...manual, playbackStatus: 'error' }),
      song('also-bad', { ...manual, playbackStatus: 'error' }),
      song('healthy', manual)
    ],
    { now: () => time }
  );
  time = 16000;
  f.controller.monitor();
  assert.equal(f.controller.getState().standbyIndex, 2);
  f.players[0].state = 0;
  f.controller.monitor();
  assert.equal(f.controller.getState().standbyIndex, 3);
  assert.equal(f.controller.getState().probe, null);
  assert.equal(f.engine.getSnapshot().currentIndex, 0);
  f.controller.destroy();
  f.playback.destroy();
});

test('DJ button cycles off, full, verse, off', async () => {
  const engine = createWorkMusicEngine();
  const controller = createWorkMusicPlaybackController({ engine, root: {}, youtubePort: {} });
  await controller.cycleDjMode();
  assert.equal(engine.getSnapshot().seamlessEnabled, true);
  assert.equal(engine.getSnapshot().djVerseMode, false);
  await controller.cycleDjMode();
  assert.equal(engine.getSnapshot().djVerseMode, true);
  await controller.cycleDjMode();
  assert.equal(engine.getSnapshot().seamlessEnabled, false);
  assert.equal(engine.getSnapshot().djVerseMode, false);
});

async function setup(songs, { playbackOptions = {}, ...extra } = {}) {
  const engine = createWorkMusicEngine({
    initialState: { songs, isPlaying: true, seamlessOverlapSeconds: 10 }
  });
  const players = [];
  const statuses = [];
  const playback = createWorkMusicPlaybackController({
    engine,
    root: {},
    youtubePort: {},
    ...playbackOptions
  });
  const controller = createWorkMusicSeamlessController({
    engine,
    playbackController: playback,
    root: { getElementById: () => ({ classList: { add() {} } }) },
    interval: () => 1,
    clear() {},
    onStatus: (text) => statuses.push(text),
    youtubePort: {
      ensureIframeApi: async () => {},
      createPlayer(_id, options) {
        const player = {
          options,
          current: 0,
          state: -1,
          getPlayerState() {
            return this.state;
          },
          volume: 0,
          getCurrentTime() {
            return this.current;
          },
          getDuration: () => 100,
          setVolume(v) {
            this.volume = v;
          },
          mute() {},
          unMute() {},
          playVideo() {
            this.played = true;
          },
          pauseVideo() {},
          stopVideo() {},
          destroy() {},
          seekTo(v) {
            this.current = v;
          },
          cueVideoById(id) {
            this.cued = id;
            this.current = 0;
          }
        };
        players.push(player);
        return player;
      }
    },
    ...extra
  });
  await controller.create(0, true);
  players.forEach((p) => p.options.events.onReady({ target: p }));
  return { engine, players, controller, statuses, playback };
}

test('DJ retries known failed songs once; another failure preserves current playback and moves on', async () => {
  const f = await setup([
    song('a', manual),
    song('bad', { playbackStatus: 'error' }),
    song('b', manual),
    song('c', manual)
  ]);
  assert.equal(f.controller.getState().standbyIndex, 1);
  assert.equal(f.players[1].cued, 'bad');
  assert.ok(f.controller.getState().probe);
  f.players[1].options.events.onError({ data: 150 });
  assert.equal(f.engine.getSnapshot().currentIndex, 0);
  assert.equal(f.engine.getSnapshot().isPlaying, true);
  assert.equal(f.controller.getState().standbyIndex, 2);
  assert.equal(f.players[1].cued, 'b');
  assert.equal(f.engine.getSnapshot().songs[1].playbackStatus, 'error');
  f.controller.destroy();
});

test('DJ preloads server results without selecting next song or posting a new analysis', async () => {
  const calls = [];
  const analysis = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: async (videoId) => {
        calls.push(videoId);
        return { videoId, durationSeconds: 100, drumStart: 10, drumEnd: 80 };
      },
      createJob() {
        assert.fail('must not enqueue');
      }
    }
  });
  await analysis.selectSong(song('a'));
  const f = await setup([song('a'), song('b')], {
    detectedByVideoId: analysis.detectedByVideoId,
    prepareSong: analysis.prefetchExisting
  });
  await flush();
  assert.equal(analysis.getState().videoId, 'a');
  assert.equal(analysis.detectedByVideoId.has('b'), true);
  assert.deepEqual(calls, ['a', 'b']);
  f.players[0].current = 80;
  assert.equal(f.controller.monitor(), true);
  assert.equal(f.controller.getState().transition.crossfadeSeconds, 10);
  f.controller.destroy();
  analysis.destroy();
});

test('destroyed player events cannot change current playback; exhausted next candidates are reported', async () => {
  const f = await setup([song('a'), song('bad', { playbackStatus: 'error' })]);
  f.players[1].options.events.onError({ data: 150 });
  assert.equal(f.controller.getState().standbyIndex, -1);
  assert.match(f.statuses.at(-1), /다음 곡이 없습니다/);
  f.controller.destroy();
  f.players[0].options.events.onError({ data: 150 });
  f.players[1].options.events.onReady({ target: f.players[1] });
  assert.equal(f.controller.getState(), null);
  assert.equal(f.engine.getSnapshot().songs[0].playbackStatus, undefined);
});

test('prefetch deduplicates in-flight lookups, tolerates 404 and ignores results after destruction', async () => {
  let resolve;
  let calls = 0;
  const analysis = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: () => {
        calls++;
        return new Promise((r) => {
          resolve = r;
        });
      }
    }
  });
  const first = analysis.prefetchExisting(song('a'));
  const second = analysis.prefetchExisting(song('a'));
  await flush();
  assert.equal(calls, 1);
  analysis.destroy();
  resolve({ videoId: 'a', drumStart: 10, drumEnd: 80 });
  await Promise.all([first, second]);
  assert.equal(analysis.detectedByVideoId.size, 0);
  const missing = createWorkMusicAnalysisController({
    mediaAnalysisPort: {
      enabled: true,
      getResult: async () => {
        throw Object.assign(new Error('missing'), { status: 404 });
      }
    }
  });
  assert.equal(await missing.prefetchExisting(song('a')), null);
  assert.equal(missing.getState().phase, 'idle');
  missing.destroy();
});
