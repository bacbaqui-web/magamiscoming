import { normalizeSeamlessSeconds } from './workMusicHelper.js';
import { calculateDjTransitionPlan } from './workMusicAnalysisHelper.js';

export function createWorkMusicSeamlessController({
  engine,
  playbackController,
  youtubePort,
  root = document,
  render = () => {},
  detectedByVideoId,
  interval = setInterval,
  clear = clearInterval,
  now = Date.now,
  monitorMs = 500,
  fadeMs = 50
}) {
  let slots = null;
  let monitorTimer = null;
  let fadeTimer = null;

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
    return order[(position + 1) % order.length];
  }
  function stopTimers() {
    clear(monitorTimer);
    clear(fadeTimer);
    monitorTimer = null;
    fadeTimer = null;
  }
  function destroy() {
    stopTimers();
    if (slots?.players)
      Object.values(slots.players).forEach((player) => {
        try {
          player?.destroy?.();
        } catch (_error) {
          /* 이미 제거된 Player */
        }
      });
    slots = null;
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
    if (!standby || !song?.videoId) return;
    standby.stopVideo?.();
    standby.cueVideoById?.(song.videoId);
    setVolume(standby, 0);
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
    clear(fadeTimer);
    const update = () => {
      if (!slots?.transitioning) return;
      const levels = volumesAt({
        elapsedSeconds: Math.max(
          0,
          Number(getStandbyPlayer()?.getCurrentTime?.() || 0) - slots.transition.nextStartSeconds
        ),
        overlapSeconds: slots.transition.crossfadeSeconds,
        targetVolume: volume()
      });
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
  function getTriggerTiming({ currentSong, nextSong, duration, overlapSeconds, currentTime }) {
    return calculateDjTransitionPlan({
      currentSong,
      nextSong,
      duration,
      currentTime,
      detectedByVideoId,
      maximumFadeSeconds: overlapSeconds
    });
  }
  function monitor() {
    if (!slots || !engine.getSnapshot().isPlaying) return false;
    if (slots.transitioning) {
      if (!slots.fadeStarted && now() - slots.requestedAt > 15000) {
        const failedIndex = slots.standbyIndex;
        cancelTransition();
        playbackController.handleFailure({
          code: 'timeout',
          failedIndex,
          order: engine.getSnapshot().playOrder,
          tabId: engine.getSnapshot().activeTabId
        });
      }
      return false;
    }
    const player = getActivePlayer();
    const state = engine.getSnapshot();
    const songs = engine.getActiveSongs();
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
    box.classList.add('seamless');
    box.innerHTML =
      '<div id="workMusicSeamlessSlotA" class="workmusic-youtube-slot active"><div id="workMusicSeamlessA"></div></div><div id="workMusicSeamlessSlotB" class="workmusic-youtube-slot standby"><div id="workMusicSeamlessB"></div></div>';
    await youtubePort.ensureIframeApi();
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
    const events = (slot) => ({
      onReady(event) {
        slots.players[slot] = event.target;
        setVolume(event.target, slot === 'a' ? volume() : 0);
        if (slot === 'a' && autoplay) {
          event.target.playVideo?.();
          startMonitor();
        }
        if (slot === 'b') event.target.cueVideoById?.(songs[standbyIndex]?.videoId);
      },
      onStateChange(event) {
        if (slot === slots?.standbySlot && slots?.transitioning && event?.data === 1)
          beginFade(slot);
        if (slot === slots?.activeSlot && event?.data === 0 && !slots.transitionStarted)
          transition();
      },
      onError(event) {
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
