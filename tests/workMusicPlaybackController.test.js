import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicEngine } from '../src/features/workmusic/workMusicEngine.js';
import { createWorkMusicPlaybackController } from '../src/features/workmusic/workMusicPlaybackController.js';
import { createWorkMusicSeamlessController } from '../src/features/workmusic/workMusicSeamlessController.js';

test('PlaybackController 빈 목록 load는 안내만 하고 render를 다시 호출하지 않는다', async () => {
  let renderCount = 0;
  const notices = [];
  const controller = createWorkMusicPlaybackController({
    engine: createWorkMusicEngine(),
    notify: (message) => notices.push(message),
    render: () => {
      renderCount += 1;
    },
    root: {},
    youtubePort: {}
  });

  assert.equal(await controller.loadAt(0, false), false);
  assert.equal(renderCount, 0);
  assert.deepEqual(notices, ['먼저 유튜브 링크를 추가해주세요.']);
});

test('재생 실패를 기록하고 다음 정상 곡을 같은 재생 순서에서 실행한다', () => {
  const timers = [];
  const created = [];
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        { id: 'a', title: 'A', videoId: 'video-a' },
        { id: 'b', title: 'B', videoId: 'video-b' }
      ]
    }
  });
  const controller = createWorkMusicPlaybackController({
    engine,
    root: { getElementById: () => ({ classList: { remove() {} }, innerHTML: '' }) },
    youtubePort: {
      ensureIframeApi: async () => {},
      createPlayer: (_id, options) => {
        created.push(options.videoId);
        return {};
      }
    },
    setTimer: (callback) => timers.push(callback)
  });
  const result = controller.handleFailure({
    code: 100,
    failedIndex: 0,
    order: [0, 1],
    tabId: 'default'
  });
  assert.equal(result.nextIndex, 1);
  assert.equal(engine.getSnapshot().songs[0].playbackErrorReason, '삭제/비공개');
  return timers[0]().then(() => {
    assert.equal(engine.getSnapshot().currentIndex, 1);
    assert.deepEqual(created, ['video-b']);
  });
});

test('이어듣기 Controller가 전환 시점과 두 Player 전환 정보를 결정한다', () => {
  const seamless = createWorkMusicSeamlessController({
    engine: createWorkMusicEngine(),
    playbackController: {},
    root: {},
    youtubePort: {}
  });
  assert.equal(seamless.shouldStart({ currentTime: 91, duration: 100, overlapSeconds: 10 }), true);
  assert.deepEqual(
    seamless.volumesAt({ elapsedSeconds: 5, overlapSeconds: 10, targetVolume: 80 }),
    {
      previous: 60,
      next: 20,
      complete: false
    }
  );
});

test('SeamlessController는 두 곡 수동 구간으로 실제 전환 시작 시각을 계산한다', () => {
  const seamless = createWorkMusicSeamlessController({
    engine: createWorkMusicEngine(),
    playbackController: {},
    root: {},
    youtubePort: {}
  });

  assert.deepEqual(
    seamless.getTriggerTiming({
      currentSong: { mediaAnalysisManual: { drumStart: 5, drumEnd: 80 } },
      nextSong: { mediaAnalysisManual: { drumStart: 10, drumEnd: 90 } },
      duration: 100,
      overlapSeconds: 10
    }),
    {
      mode: 'dj',
      triggerAtSeconds: 70,
      boundarySeconds: 80,
      introSeconds: 10,
      outroSeconds: 10,
      nextStartSeconds: 0,
      nextGreenStart: 10,
      crossfadeSeconds: 10
    }
  );
});

test('DJ uses sequential playback when either range is missing or invalid', () => {
  const seamless = createWorkMusicSeamlessController({
    engine: createWorkMusicEngine(),
    playbackController: {},
    root: {},
    youtubePort: {}
  });
  const fixed = {
    mode: 'sequential',
    triggerAtSeconds: 100,
    nextStartSeconds: 0,
    crossfadeSeconds: 0
  };
  const cases = [
    [{}, {}],
    [{ mediaAnalysisManual: { drumStart: 5, drumEnd: 80 } }, {}],
    [
      { mediaAnalysisManual: { drumStart: 5, drumEnd: 150 } },
      { mediaAnalysisManual: { drumStart: 10, drumEnd: 90 } }
    ]
  ];
  cases.forEach(([currentSong, nextSong]) => {
    assert.deepEqual(
      seamless.getTriggerTiming({
        currentSong,
        nextSong,
        duration: 100,
        overlapSeconds: 10
      }),
      fixed
    );
  });
});

test('SeamlessController monitor는 고정 겹침 전보다 수동 시작 시각에 standby를 재생한다', async () => {
  const players = [];
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        {
          id: 'a',
          videoId: 'video-a',
          mediaAnalysisManual: { drumStart: 5, drumEnd: 80 }
        },
        {
          id: 'b',
          videoId: 'video-b',
          mediaAnalysisManual: { drumStart: 10, drumEnd: 90 }
        }
      ],
      seamlessOverlapSeconds: 10,
      isPlaying: true,
      playOrder: [0, 1]
    }
  });
  const seamless = createWorkMusicSeamlessController({
    engine,
    playbackController: { handleFailure() {} },
    youtubePort: {
      ensureIframeApi: async () => {},
      createPlayer(_id, options) {
        const player = {
          current: options.videoId === 'video-a' ? 69 : 0,
          getCurrentTime() {
            return this.current;
          },
          getDuration: () => 100,
          playVideo() {
            this.played = true;
          },
          cueVideoById() {},
          setVolume() {},
          mute() {},
          unMute() {},
          stopVideo() {},
          destroy() {}
        };
        players.push(player);
        options.events.onReady({ target: player });
        return player;
      }
    },
    root: { getElementById: () => ({ classList: { add() {} }, innerHTML: '' }) },
    interval: () => 1,
    clear() {}
  });

  await seamless.create(0, true);
  assert.equal(seamless.monitor(), false);
  players[0].current = 80;
  assert.equal(seamless.monitor(), true);
  assert.equal(players[1].played, true);
});

test('PlaybackController가 Player 생성, seek, pause, resume, 이전·다음을 실행한다', async () => {
  const created = [];
  const players = [];
  const makePlayer = () => ({
    duration: 120,
    current: 0,
    paused: 0,
    played: 0,
    getDuration() {
      return this.duration;
    },
    getCurrentTime() {
      return this.current;
    },
    pauseVideo() {
      this.paused += 1;
    },
    playVideo() {
      this.played += 1;
    },
    seekTo(value) {
      this.current = value;
    },
    setVolume() {}
  });
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        { id: 'a', videoId: 'video-a' },
        { id: 'b', videoId: 'video-b' }
      ]
    }
  });
  const controller = createWorkMusicPlaybackController({
    engine,
    root: { getElementById: () => ({ classList: { remove() {} }, innerHTML: '' }) },
    youtubePort: {
      ensureIframeApi: async () => {},
      createPlayer(_id, options) {
        const player = makePlayer();
        players.push(player);
        created.push(options.videoId);
        options.events.onReady({ target: player });
        return player;
      }
    }
  });
  await controller.loadAt(0, false);
  assert.equal(controller.seek(30), 30);
  controller.resume();
  controller.pause();
  await controller.next();
  await controller.previous();
  assert.deepEqual(created, ['video-a', 'video-b', 'video-a']);
  assert.equal(players[0].played, 1);
  assert.equal(players[0].paused, 1);
});

test('SeamlessController가 monitor, standby 재생과 fade 완료를 실행한다', async () => {
  const intervalCallbacks = [];
  const players = [];
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        { id: 'a', videoId: 'video-a', mediaAnalysisManual: { drumStart: 5, drumEnd: 90 } },
        { id: 'b', videoId: 'video-b', mediaAnalysisManual: { drumStart: 10, drumEnd: 90 } }
      ],
      seamlessOverlapSeconds: 10,
      isPlaying: true,
      playOrder: [0, 1],
      volume: 80
    }
  });
  const youtubePort = {
    ensureIframeApi: async () => {},
    createPlayer(_id, options) {
      const player = {
        current: options.videoId === 'video-a' ? 80 : 0,
        duration: 100,
        volume: 0,
        getCurrentTime() {
          return this.current;
        },
        seekTo(value) {
          this.current = value;
        },
        getDuration() {
          return this.duration;
        },
        playVideo() {
          this.played = true;
        },
        stopVideo() {
          this.stopped = true;
        },
        cueVideoById(id) {
          this.cued = id;
        },
        setVolume(value) {
          this.volume = value;
        },
        mute() {},
        unMute() {},
        destroy() {},
        pauseVideo() {}
      };
      players.push({ player, options });
      options.events.onReady({ target: player });
      return player;
    }
  };
  const playback = { handleFailure() {} };
  const seamless = createWorkMusicSeamlessController({
    engine,
    playbackController: playback,
    youtubePort,
    root: { getElementById: () => ({ classList: { add() {} }, innerHTML: '' }) },
    interval: (callback) => {
      intervalCallbacks.push(callback);
      return intervalCallbacks.length;
    },
    clear() {}
  });
  await seamless.create(0, true);
  assert.equal(seamless.monitor(), true);
  players[1].options.events.onStateChange({ data: 1 });
  players[1].player.current = 5;
  intervalCallbacks.at(-1)();
  const fadingVolume = players[1].player.volume;
  assert.ok(fadingVolume > 0 && fadingVolume < 80);
  // Buffering (unchanged media time) must not advance the fade.
  intervalCallbacks.at(-1)();
  assert.equal(players[1].player.volume, fadingVolume);
  seamless.pause();
  seamless.resume();
  players[1].options.events.onStateChange({ data: 1 });
  assert.equal(players[1].player.volume, fadingVolume);
  players[1].player.current = 20;
  intervalCallbacks.at(-1)();
  assert.equal(engine.getSnapshot().currentIndex, 1);
  assert.equal(players[0].player.stopped, true);
  assert.equal(players[1].player.volume, 80);
});

test('zero-head DJ switches immediately because no pre-green crossfade is available', async () => {
  const players = [];
  const engine = createWorkMusicEngine({
    initialState: {
      songs: [
        { id: 'a', videoId: 'a', mediaAnalysisManual: { drumStart: 5, drumEnd: 80 } },
        { id: 'b', videoId: 'b', mediaAnalysisManual: { drumStart: 0, drumEnd: 90 } }
      ],
      isPlaying: true,
      seamlessOverlapSeconds: 10,
      volume: 80
    }
  });
  const controller = createWorkMusicSeamlessController({
    engine,
    playbackController: {},
    root: { getElementById: () => ({ classList: { add() {} } }) },
    interval: () => 1,
    clear() {},
    youtubePort: {
      ensureIframeApi: async () => {},
      createPlayer(_id, options) {
        const p = {
          current: 80,
          getCurrentTime() {
            return this.current;
          },
          getDuration: () => 100,
          setVolume(v) {
            this.volume = v;
          },
          mute() {},
          unMute() {},
          stopVideo() {},
          cueVideoById() {},
          seekTo(v) {
            this.current = v;
          },
          pauseVideo() {
            this.paused = true;
          },
          playVideo() {
            if (players.length === 2) options.events.onStateChange({ data: 1 });
          }
        };
        players.push(p);
        options.events.onReady({ target: p });
        return p;
      }
    }
  });
  await controller.create(0, true);
  assert.equal(controller.monitor(), true);
  assert.equal(players[0].paused, true);
  assert.equal(engine.getSnapshot().currentIndex, 1);
  assert.equal(players[1].volume, 80);
  assert.equal(controller.getState().transitioning, false);
  controller.cancelTransition();
  assert.equal(controller.getState().transitioning, false);
});
