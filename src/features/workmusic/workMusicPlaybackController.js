const FAILURE_LABELS = {
  2: '잘못된 링크',
  5: '재생 오류',
  100: '삭제/비공개',
  101: '임베드 불가',
  150: '임베드 불가',
  invalid: '잘못된 링크',
  timeout: '응답 없음'
};

export function createWorkMusicPlaybackController({
  engine,
  youtubePort,
  root = document,
  actions = {},
  failureDelayMs = 1200,
  notify = () => {},
  render = () => {},
  save = () => {},
  setTimer = setTimeout,
  clearTimer = clearTimeout
}) {
  let player = null;
  let playerElement = null;
  let failureTimer = null;
  let failureSession = null;
  let seamlessController = null;
  const activeSongs = () => engine.getActiveSongs();
  const songKey = (song, index) => String(song?.id || song?.videoId || `index:${index}`);
  const volume = () => {
    const state = engine.getSnapshot();
    return state.isMuted ? 0 : state.volume;
  };

  function setSeamlessController(controller) {
    seamlessController = controller;
  }
  function destroy() {
    clearTimer(failureTimer);
    failureTimer = null;
    seamlessController?.destroy?.();
    try {
      player?.destroy?.();
    } catch (_error) {
      /* 이미 제거된 Player */
    }
    player = null;
    playerElement = null;
  }
  function setPlayerVolume(target = player, value = volume()) {
    target?.setVolume?.(value);
    if (value <= 0) target?.mute?.();
    else target?.unMute?.();
  }
  function seek(seconds) {
    const duration = getDuration();
    const target = Math.max(0, Math.min(duration || Number(seconds), Number(seconds) || 0));
    (seamlessController?.getActivePlayer?.() || player)?.seekTo?.(target, true);
    return target;
  }
  function getCurrentTime() {
    return Number((seamlessController?.getActivePlayer?.() || player)?.getCurrentTime?.() || 0);
  }
  function getDuration() {
    return Number((seamlessController?.getActivePlayer?.() || player)?.getDuration?.() || 0);
  }
  function getPlayerState() {
    return (seamlessController?.getActivePlayer?.() || player)?.getPlayerState?.();
  }
  function getAdjacentIndex(step) {
    const state = engine.getSnapshot();
    const songs = activeSongs();
    if (!songs.length) return -1;
    const order =
      state.playOrder.length === songs.length ? state.playOrder : songs.map((_song, i) => i);
    const position = Math.max(0, order.indexOf(state.currentIndex));
    return order[(position + step + order.length) % order.length];
  }
  async function createRegularPlayer(index, autoplay) {
    const songs = activeSongs();
    const song = songs[index];
    const box = root.getElementById('workMusicPlayerBox');
    if (!box || !song?.videoId) return null;
    seamlessController?.destroy?.();
    try {
      player?.destroy?.();
    } catch (_error) {
      /* 이미 제거된 Player */
    }
    box.classList.remove('seamless');
    box.innerHTML = '<div id="workMusicYoutubeIframe" style="width:100%;height:100%"></div>';
    await youtubePort.ensureIframeApi();
    const state = engine.getSnapshot();
    const order =
      state.playOrder.length === songs.length ? state.playOrder : songs.map((_item, i) => i);
    const playlist = order.map((itemIndex) => songs[itemIndex]?.videoId).filter(Boolean);
    player = youtubePort.createPlayer('workMusicYoutubeIframe', {
      width: '100%',
      height: '100%',
      videoId: song.videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        playlist: playlist.join(',')
      },
      events: {
        onReady(event) {
          player = event.target;
          playerElement = root.getElementById('workMusicYoutubeIframe');
          setPlayerVolume(event.target);
          if (autoplay) event.target.playVideo?.();
          actions.onReady?.(event.target, index, autoplay);
        },
        onStateChange(event) {
          actions.onStateChange?.(event, index);
        },
        onError(event) {
          handleFailure({
            code: event?.data || '',
            failedIndex: index,
            order: engine.getSnapshot().playOrder,
            tabId: engine.getSnapshot().activeTabId
          });
        }
      }
    });
    return player;
  }
  async function loadAt(index, autoplay = false, { resetSkipSession = true } = {}) {
    const songs = activeSongs();
    if (!songs.length) {
      notify('먼저 유튜브 링크를 추가해주세요.');
      return false;
    }
    const nextIndex = index >= 0 && index < songs.length ? index : 0;
    if (resetSkipSession) failureSession = null;
    engine.setState('currentIndex', nextIndex);
    engine.setState('isPlaying', autoplay);
    render();
    const state = engine.getSnapshot();
    if (state.seamlessEnabled && state.seamlessOverlapSeconds > 0 && songs.length > 1) {
      await seamlessController?.create?.(nextIndex, autoplay);
    } else {
      await createRegularPlayer(nextIndex, autoplay);
    }
    return true;
  }
  const playAt = (index, options) => loadAt(index, true, options);
  function pause() {
    seamlessController?.pause?.();
    player?.pauseVideo?.();
    engine.setState('isPlaying', false);
    render();
  }
  function resume() {
    const state = engine.getSnapshot();
    if (!player && !seamlessController?.getActivePlayer?.()) return playAt(state.currentIndex);
    (seamlessController?.getActivePlayer?.() || player)?.playVideo?.();
    engine.setState('isPlaying', true);
    seamlessController?.startMonitor?.();
    render();
    return true;
  }
  function toggle() {
    return engine.getSnapshot().isPlaying ? pause() : resume();
  }
  function previous() {
    return playAt(getAdjacentIndex(-1));
  }
  function next() {
    const index = getAdjacentIndex(1);
    if (seamlessController?.canManualTransition?.(index)) return seamlessController.transition();
    return playAt(index);
  }
  async function setVolume(value, { save: shouldSave = true } = {}) {
    const normalized = Math.max(0, Math.min(100, Math.round(Number(value || 0) / 5) * 5));
    engine.setState('volume', normalized);
    engine.setState('isMuted', normalized === 0);
    if (normalized > 0) engine.setState('lastVolume', normalized);
    setPlayerVolume();
    seamlessController?.applyVolume?.();
    render();
    if (shouldSave) await save();
  }
  async function toggleMute() {
    const state = engine.getSnapshot();
    if (state.isMuted || state.volume === 0) return setVolume(Math.max(5, state.lastVolume || 80));
    engine.setState('lastVolume', Math.max(5, state.volume || 80));
    return setVolume(0);
  }
  async function setSeamlessSeconds(value, { save: shouldSave = true, refreshPlayer = true } = {}) {
    const before = engine.getSnapshot().seamlessEnabled;
    engine.setSeamlessSeconds(value);
    if (shouldSave) await save();
    render();
    const state = engine.getSnapshot();
    if (refreshPlayer && before !== state.seamlessEnabled && activeSongs().length) {
      if (state.isPlaying) await playAt(state.currentIndex, { resetSkipSession: false });
      else await createRegularPlayer(state.currentIndex, false);
    }
  }

  function handleFailure({ code = '', failedIndex, order, tabId }) {
    const snapshot = engine.getSnapshot();
    const songs = activeSongs();
    if (!songs.length || failedIndex < 0 || failedIndex >= songs.length) return { nextIndex: -1 };
    if (!failureSession || failureSession.tabId !== tabId)
      failureSession = { tabId, triedKeys: new Set() };
    const failedSong = songs[failedIndex];
    failureSession.triedKeys.add(songKey(failedSong, failedIndex));
    engine.setSongs(
      snapshot.songs.map((song) =>
        song.id === failedSong.id
          ? {
              ...song,
              playbackStatus: 'error',
              playbackErrorReason: FAILURE_LABELS[code] || `재생 오류 ${code}`,
              playbackErrorCode: String(code || ''),
              playbackErrorAt: new Date().toISOString()
            }
          : song
      )
    );
    engine.setState('currentIndex', failedIndex);
    engine.setState('isPlaying', false);
    const validOrder = (order || []).filter(
      (item) => Number.isInteger(item) && item >= 0 && item < songs.length
    );
    const playbackOrder = validOrder.length ? validOrder : songs.map((_song, i) => i);
    const start = Math.max(0, playbackOrder.indexOf(failedIndex));
    let nextIndex = -1;
    for (let offset = 1; offset <= playbackOrder.length; offset += 1) {
      const candidate = playbackOrder[(start + offset) % playbackOrder.length];
      const song = songs[candidate];
      if (
        song &&
        song.playbackStatus !== 'error' &&
        !failureSession.triedKeys.has(songKey(song, candidate))
      ) {
        nextIndex = candidate;
        break;
      }
    }
    render();
    if (nextIndex < 0) {
      failureSession = null;
      notify('재생 가능한 다음 곡을 찾지 못했습니다.');
      return { nextIndex };
    }
    notify(
      `${failedSong.title || `YouTube ${failedSong.videoId || ''}`} 재생 실패, 다음 곡으로 넘어갑니다.`
    );
    clearTimer(failureTimer);
    const expectedKey = songKey(failedSong, failedIndex);
    failureTimer = setTimer(() => {
      const current = engine.getSnapshot();
      const currentSongs = engine.getActiveSongs();
      if (
        current.activeTabId === tabId &&
        current.currentIndex === failedIndex &&
        songKey(currentSongs[failedIndex], failedIndex) === expectedKey
      )
        return playAt(nextIndex, { resetSkipSession: false });
      return false;
    }, failureDelayMs);
    return { nextIndex };
  }

  return {
    createRegularPlayer,
    destroy,
    getAdjacentIndex,
    getCurrentTime,
    getDuration,
    loadAt,
    getPlayer: () => seamlessController?.getActivePlayer?.() || player,
    getPlayerElement: () => playerElement,
    getPlayerState,
    handleFailure,
    next,
    pause,
    playAt,
    previous,
    resume,
    seek,
    setPlayerVolume,
    setSeamlessController,
    setSeamlessSeconds,
    setVolume,
    toggle,
    toggleMute
  };
}
