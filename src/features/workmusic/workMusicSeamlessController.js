import { normalizeSeamlessSeconds } from './workMusicHelper.js';
import { calculateDjTransitionPlan } from './workMusicAnalysisHelper.js';

export function createWorkMusicSeamlessController({
  engine,
  playbackController,
  youtubePort,
  root = document,
  render = () => {},
  detectedByVideoId,
  prepareSong = async () => {},
  onStatus = () => {},
  interval = setInterval,
  clear = clearInterval,
  now = Date.now,
  monitorMs = 500,
  fadeMs = 50
}) {
  let slots = null;
  let monitorTimer = null;
  let fadeTimer = null;
  let generation = 0;
  let statusText = '';
  function report(text) {
    if (statusText === text) return;
    statusText = text;
    onStatus(text);
  }

  const volume = () => {
    const state = engine.getSnapshot();
    return state.isMuted ? 0 : state.volume;
  };
  function setVolume(player, value) {
    player?.setVolume?.(Math.max(0, Math.min(100, value)));
    if (value <= 0) player?.mute?.();
    else player?.unMute?.();
  }
  function getActivePlayer() {
    return slots?.players?.[slots.activeSlot] || null;
  }
  function getStandbyPlayer() {
    return slots?.players?.[slots.standbySlot] || null;
  }
  function nextIndex(fromIndex) {
    const state = engine.getSnapshot();
    const songs = engine.getActiveSongs();
    const order =
      state.playOrder.length === songs.length ? state.playOrder : songs.map((_song, i) => i);
    const position = Math.max(0, order.indexOf(fromIndex));
    for (let offset = 1; offset < order.length; offset += 1) {
      const candidate = order[(position + offset) % order.length];
      if (songs[candidate]?.videoId && songs[candidate]?.playbackStatus !== 'error')
        return candidate;
    }
    return -1;
  }
  function stopTimers() {
    clear(monitorTimer);
    clear(fadeTimer);
    monitorTimer = null;
    fadeTimer = null;
  }
  function destroy() {
    generation += 1;
    stopTimers();
    const previous = slots;
    slots = null;
    if (previous?.players)
      Object.values(previous.players).forEach((player) => {
        try {
          player?.destroy?.();
        } catch (_error) {
          /* 이미 제거된 Player */
        }
      });
    report('');
  }
  function pause() {
    stopTimers();
    if (slots?.players) Object.values(slots.players).forEach((player) => player?.pauseVideo?.());
  }
  function resume() {
    if (!slots) return false;
    getActivePlayer()?.playVideo?.();
    if (slots.transitioning) {
      slots.fadeStarted = false;
      slots.requestedAt = now();
      getStandbyPlayer()?.playVideo?.();
    }
    startMonitor();
    return true;
  }
  function cancelTransition() {
    if (!slots?.transitioning) return;
    clear(fadeTimer);
    fadeTimer = null;
    cueStandby(engine.getSnapshot().currentIndex);
    applyVolume();
  }
  function applyVolume() {
    if (!slots) return;
    if (!slots.transitioning) {
      setVolume(getActivePlayer(), volume());
      setVolume(getStandbyPlayer(), 0);
    }
  }
  function cueStandby(fromIndex) {
    if (!slots) return;
    const songs = engine.getActiveSongs();
    slots.standbyIndex = nextIndex(fromIndex);
    slots.transitionStarted = false;
    slots.transitioning = false;
    slots.fadeStarted = false;
    slots.transition = null;
    const song = songs[slots.standbyIndex];
    const standby = getStandbyPlayer();
    if (!standby) return;
    standby.stopVideo?.();
    setVolume(standby, 0);
    if (!song?.videoId) {
      report('디제잉: 재생 가능한 다음 곡이 없습니다.');
      return;
    }
    prepareRanges(fromIndex, slots.standbyIndex);
    standby.cueVideoById?.(song.videoId);
  }
  function prepareRanges(fromIndex, target) {
    const session = slots;
    const songs = engine.getActiveSongs();
    report('디제잉: 곡 구간 정보를 확인 중입니다.');
    void Promise.all([prepareSong(songs[fromIndex]), prepareSong(songs[target])])
      .then(() => {
        if (session === slots && slots?.standbyIndex === target) monitor();
      })
      .catch(() => {
        if (session === slots) report('디제잉: 구간 조회 실패 — 곡 끝에서 순차 전환합니다.');
      });
  }
  function failStandby(code) {
    if (!slots) return;
    const failedIndex = slots.standbyIndex;
    clear(fadeTimer);
    fadeTimer = null;
    slots.transitioning = false;
    slots.transitionStarted = false;
    slots.fadeStarted = false;
    slots.transition = null;
    playbackController.handleFailure({
      code,
      failedIndex,
      standby: true,
      order: engine.getSnapshot().playOrder,
      tabId: engine.getSnapshot().activeTabId
    });
    cueStandby(engine.getSnapshot().currentIndex);
    applyVolume();
  }
  function finishTransition() {
    if (!slots?.transition) return;
    const { previousSlot, nextSlot, nextIndex: target } = slots.transition;
    const previous = slots.players[previousSlot];
    slots.activeSlot = nextSlot;
    slots.standbySlot = previousSlot;
    slots.transitionStarted = false;
    slots.transitioning = false;
    slots.fadeStarted = false;
    slots.transition = null;
    previous?.stopVideo?.();
    engine.setState('currentIndex', target);
    applyVolume();
    render();
    cueStandby(target);
  }
  function volumesAt({ elapsedSeconds, overlapSeconds, targetVolume }) {
    const duration = Math.max(0.001, Number(overlapSeconds) || 0);
    const progress = Math.min(1, Math.max(0, elapsedSeconds / duration));
    const eased = progress * progress;
    return {
      previous: targetVolume * (1 - eased),
      next: targetVolume * eased,
      complete: progress >= 1
    };
  }
  function beginFade(slot) {
    if (!slots?.transitioning || slots.fadeStarted || slot !== slots.transition?.nextSlot)
      return false;
    slots.fadeStarted = true;
    const timing = slots.transition;
    if (timing.boundarySeconds != null && !timing.aligned) {
      const aligned =
        timing.nextGreenStart +
        Number(getActivePlayer()?.getCurrentTime?.() || 0) -
        timing.boundarySeconds;
      getStandbyPlayer()?.seekTo?.(Math.max(0, aligned), true);
      timing.aligned = true;
    }
    report('디제잉: 다음 초록 시작까지 진입 · 초록 시작 후 2초 퇴장');
    clear(fadeTimer);
    const update = () => {
      if (!slots?.transitioning) return;
      let levels = volumesAt({
        elapsedSeconds: Math.max(
          0,
          Number(getStandbyPlayer()?.getCurrentTime?.() || 0) - slots.transition.nextStartSeconds
        ),
        overlapSeconds: slots.transition.crossfadeSeconds,
        targetVolume: volume()
      });
      if (slots.transition.boundarySeconds != null) {
        const t =
          Number(getStandbyPlayer()?.getCurrentTime?.() || 0) - slots.transition.nextGreenStart;
        const { introSeconds, outroSeconds } = slots.transition;
        const incoming = introSeconds > 0 ? Math.min(1, Math.max(0, 1 + t / introSeconds)) : 1;
        const outgoing =
          outroSeconds > 0 ? Math.min(1, Math.max(0, 1 - t / outroSeconds)) : Number(t < 0);
        levels = {
          previous: volume() * outgoing,
          next: volume() * incoming,
          complete: t >= outroSeconds
        };
      }
      setVolume(slots.players[slots.transition.previousSlot], levels.previous);
      setVolume(slots.players[slots.transition.nextSlot], levels.next);
      if (levels.complete || slots.transition.crossfadeSeconds <= 0) {
        clear(fadeTimer);
        fadeTimer = null;
        finishTransition();
      }
    };
    update();
    if (slots?.transitioning) fadeTimer = interval(update, fadeMs);
    return true;
  }
  function createTransition(timing) {
    if (!slots || slots.transitionStarted) return null;
    const target = Number(slots.standbyIndex);
    if (!engine.getActiveSongs()[target]?.videoId) return null;
    const transition = {
      previousSlot: slots.activeSlot,
      nextSlot: slots.standbySlot,
      nextIndex: target,
      boundarySeconds: timing?.boundarySeconds,
      nextGreenStart: timing?.nextGreenStart,
      introSeconds: timing?.introSeconds,
      outroSeconds: timing?.outroSeconds,
      // Explicit Next skips without overlapping any unplayed green section.
      crossfadeSeconds: timing?.crossfadeSeconds || 0,
      nextStartSeconds: timing?.nextStartSeconds || 0
    };
    if (!slots.players[transition.previousSlot] || !slots.players[transition.nextSlot]) return null;
    return transition;
  }
  function transition(timing) {
    const context = createTransition(timing);
    if (!context) return false;
    slots.transition = context;
    slots.transitionStarted = true;
    slots.transitioning = true;
    slots.fadeStarted = false;
    slots.requestedAt = now();
    report('디제잉: 다음 곡 재생 시작을 기다리는 중');
    const nextPlayer = slots.players[context.nextSlot];
    setVolume(nextPlayer, 0);
    try {
      if (context.crossfadeSeconds <= 0) slots.players[context.previousSlot]?.pauseVideo?.();
      nextPlayer.seekTo?.(context.nextStartSeconds, true);
      engine.setState('isPlaying', true);
      nextPlayer.playVideo?.();
      startMonitor();
      return true;
    } catch (_error) {
      slots.transition = null;
      slots.transitionStarted = false;
      slots.transitioning = false;
      return false;
    }
  }
  function shouldStart({ currentTime, duration, overlapSeconds, transitionStarted }) {
    const overlap = normalizeSeamlessSeconds(overlapSeconds);
    return (
      !transitionStarted &&
      overlap > 0 &&
      duration > overlap + 1 &&
      currentTime > 0 &&
      duration - currentTime <= overlap
    );
  }
  function getTriggerTiming({ currentSong, nextSong, duration, currentTime }) {
    return calculateDjTransitionPlan({
      currentSong,
      nextSong,
      duration,
      currentTime,
      detectedByVideoId,
      verseMode: engine.getSnapshot().djVerseMode
    });
  }
  function monitor() {
    if (!slots || !engine.getSnapshot().isPlaying) return false;
    if (slots.transitioning) {
      if (!slots.fadeStarted && now() - slots.requestedAt > 15000) {
        failStandby('timeout');
      }
      return false;
    }
    const player = getActivePlayer();
    const state = engine.getSnapshot();
    const songs = engine.getActiveSongs();
    if (slots.standbyIndex < 0) {
      report('디제잉: 재생 가능한 다음 곡이 없습니다.');
      return false;
    }
    const currentTime = Number(player?.getCurrentTime?.() || 0);
    const duration = Number(player?.getDuration?.() || 0);
    const timing = getTriggerTiming({
      currentSong: songs[state.currentIndex],
      nextSong: {
        ...songs[slots.standbyIndex],
        durationSeconds:
          Number(getStandbyPlayer()?.getDuration?.()) || songs[slots.standbyIndex]?.durationSeconds
      },
      duration,
      currentTime,
      overlapSeconds: state.seamlessOverlapSeconds
    });
    report(
      timing.mode === 'dj'
        ? `디제잉${state.djVerseMode ? ' 1절' : ''}: 다음 초록 전 최대 15초 진입 · 초록 시작 후 최대 2초 퇴장`
        : '디제잉: 구간 정보가 없는 곡이 있어 곡 끝에서 순차 전환합니다.'
    );
    return (
      !slots.transitionStarted &&
      duration > 0 &&
      currentTime >= timing.triggerAtSeconds &&
      transition(timing)
    );
  }
  function startMonitor() {
    clear(monitorTimer);
    monitorTimer = interval(monitor, monitorMs);
  }
  function canManualTransition(index) {
    return !!slots && !slots.transitionStarted && slots.standbyIndex === index;
  }

  async function create(index, autoplay = true) {
    const songs = engine.getActiveSongs();
    const box = root.getElementById('workMusicPlayerBox');
    if (!box || songs.length <= 1 || !songs[index]?.videoId) return null;
    destroy();
    const creating = generation;
    box.classList.add('seamless');
    box.innerHTML =
      '<div id="workMusicSeamlessSlotA" class="workmusic-youtube-slot active"><div id="workMusicSeamlessA"></div></div><div id="workMusicSeamlessSlotB" class="workmusic-youtube-slot standby"><div id="workMusicSeamlessB"></div></div>';
    await youtubePort.ensureIframeApi();
    if (creating !== generation) return null;
    const standbyIndex = nextIndex(index);
    slots = {
      players: { a: null, b: null },
      activeSlot: 'a',
      standbySlot: 'b',
      standbyIndex,
      transitionStarted: false,
      transitioning: false,
      fadeStarted: false,
      transition: null
    };
    const session = slots;
    const events = (slot) => ({
      onReady(event) {
        if (slots !== session) return;
        slots.players[slot] = event.target;
        setVolume(event.target, slot === 'a' ? volume() : 0);
        if (slot === 'a' && autoplay) {
          event.target.playVideo?.();
          startMonitor();
        }
        if (slot === 'b') cueStandby(index);
      },
      onStateChange(event) {
        if (slots !== session) return;
        if (slot === slots?.standbySlot && slots?.transitioning && event?.data === 1)
          beginFade(slot);
        if (slot === slots?.activeSlot && event?.data === 0 && !slots.transitionStarted) {
          if (!transition()) {
            engine.setState('isPlaying', false);
            render();
          }
        }
      },
      onError(event) {
        if (slots !== session) return;
        if (slot === slots.standbySlot) {
          failStandby(event?.data || '');
          return;
        }
        const failed =
          slot === slots?.activeSlot ? engine.getSnapshot().currentIndex : slots?.standbyIndex;
        playbackController.handleFailure({
          code: event?.data || '',
          failedIndex: failed,
          order: engine.getSnapshot().playOrder,
          tabId: engine.getSnapshot().activeTabId
        });
      }
    });
    slots.players.a = youtubePort.createPlayer('workMusicSeamlessA', {
      width: '100%',
      height: '100%',
      videoId: songs[index].videoId,
      playerVars: { autoplay: autoplay ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1 },
      events: events('a')
    });
    slots.players.b = youtubePort.createPlayer('workMusicSeamlessB', {
      width: '100%',
      height: '100%',
      videoId: songs[standbyIndex]?.videoId || songs[index].videoId,
      playerVars: { autoplay: 0, playsinline: 1, rel: 0, modestbranding: 1 },
      events: events('b')
    });
    return slots;
  }

  return {
    applyVolume,
    beginFade,
    canManualTransition,
    cancelTransition,
    create,
    createTransition,
    destroy,
    getActivePlayer,
    getTriggerTiming,
    getState: () => slots,
    monitor,
    pause,
    resume,
    shouldStart,
    startMonitor,
    transition,
    volumesAt
  };
}
