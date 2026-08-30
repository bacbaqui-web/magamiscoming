import {
  createPlayOrder,
  getAdjacentIndex,
  normalizeSeamlessSeconds,
  normalizeVolume,
  normalizeWorkMusicTabs
} from './workMusicHelper.js';

const HOST_STATE_KEYS = {
  workMusicSongs: 'songs',
  __workMusicTabList: 'tabs',
  __workMusicActiveTabId: 'activeTabId',
  workMusicMode: 'mode',
  workMusicCurrentIndex: 'currentIndex',
  workMusicVolume: 'volume',
  workMusicLastVolume: 'lastVolume',
  workMusicIsMuted: 'isMuted',
  workMusicSeamlessEnabled: 'seamlessEnabled',
  workMusicSeamlessOverlapSeconds: 'seamlessOverlapSeconds',
  workMusicIsPlaying: 'isPlaying',
  workMusicCurrentPlayOrder: 'playOrder'
};

const cloneItems = (items) => items.map((item) => ({ ...item }));
const cloneCompatibilityValue = (stateKey, value) => {
  if (stateKey === 'songs' || stateKey === 'tabs') return cloneItems(value);
  if (stateKey === 'playOrder') return [...value];
  return value;
};

export function createWorkMusicEngine({ initialState = {} } = {}) {
  const state = {
    songs: Array.isArray(initialState.songs) ? cloneItems(initialState.songs) : [],
    tabs: normalizeWorkMusicTabs(initialState.tabs),
    activeTabId: initialState.activeTabId || 'default',
    mode: initialState.mode === 'random' ? 'random' : 'sequential',
    currentIndex: Math.max(0, Number(initialState.currentIndex || 0)),
    volume: normalizeVolume(initialState.volume ?? 80),
    lastVolume: normalizeVolume(initialState.lastVolume ?? initialState.volume ?? 80),
    isMuted: !!initialState.isMuted,
    seamlessOverlapSeconds: normalizeSeamlessSeconds(initialState.seamlessOverlapSeconds),
    seamlessEnabled: false,
    isPlaying: !!initialState.isPlaying,
    playOrder: Array.isArray(initialState.playOrder) ? [...initialState.playOrder] : []
  };
  if (!state.tabs.some((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || 'default';
  }
  state.seamlessEnabled = state.seamlessOverlapSeconds > 0;

  const activeSongRefs = () =>
    state.songs.filter((song) => (song.workMusicTabId || 'default') === state.activeTabId);

  const activeSongs = () => cloneItems(activeSongRefs());

  function normalizeCurrentIndex() {
    const length = activeSongRefs().length;
    state.currentIndex = length
      ? Math.min(Math.max(0, Number(state.currentIndex || 0)), length - 1)
      : 0;
    return state.currentIndex;
  }

  function setState(key, value) {
    if (key === 'songs') state.songs = Array.isArray(value) ? cloneItems(value) : [];
    else if (key === 'tabs') {
      state.tabs = normalizeWorkMusicTabs(value);
      if (!state.tabs.some((tab) => tab.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0]?.id || 'default';
      }
    } else if (key === 'activeTabId') {
      state.activeTabId = state.tabs.some((tab) => tab.id === value)
        ? value
        : state.tabs[0]?.id || 'default';
    } else if (key === 'mode') state.mode = value === 'random' ? 'random' : 'sequential';
    else if (key === 'currentIndex') state.currentIndex = Math.max(0, Number(value || 0));
    else if (key === 'volume' || key === 'lastVolume') state[key] = normalizeVolume(value);
    else if (key === 'seamlessOverlapSeconds') {
      state.seamlessOverlapSeconds = normalizeSeamlessSeconds(value);
      state.seamlessEnabled = state.seamlessOverlapSeconds > 0;
    } else if (key === 'seamlessEnabled') state.seamlessEnabled = !!value;
    else if (key === 'playOrder') {
      const length = activeSongRefs().length;
      const unique = [...new Set(Array.isArray(value) ? value.map(Number) : [])];
      state.playOrder =
        unique.length === length && unique.every((index) => index >= 0 && index < length)
          ? unique
          : createPlayOrder(length, state.mode);
    } else state[key] = !!value;
    normalizeCurrentIndex();
    return value;
  }

  normalizeCurrentIndex();
  setState('playOrder', state.playOrder);

  return {
    getSnapshot: () => ({
      ...state,
      songs: cloneItems(state.songs),
      tabs: cloneItems(state.tabs),
      playOrder: [...state.playOrder]
    }),
    getActiveSongs: activeSongs,
    setState,
    setSongs: (songs) => setState('songs', songs),
    setTabs: (tabs) => setState('tabs', tabs),
    setActiveTab: (tabId) => {
      setState('activeTabId', tabId);
      state.currentIndex = 0;
    },
    setVolume: (volume) => setState('volume', volume),
    setSeamlessSeconds: (seconds) => setState('seamlessOverlapSeconds', seconds),
    rebuildPlayOrder(random = Math.random) {
      state.playOrder = createPlayOrder(activeSongRefs().length, state.mode, random);
      return [...state.playOrder];
    },
    getAdjacentIndex: (step) =>
      getAdjacentIndex(state.currentIndex, step, activeSongRefs().length, state.playOrder),
    bindCompatibility(host) {
      Object.entries(HOST_STATE_KEYS).forEach(([hostKey, stateKey]) => {
        Object.defineProperty(host, hostKey, {
          configurable: true,
          enumerable: true,
          get: () => cloneCompatibilityValue(stateKey, state[stateKey]),
          set: (value) => {
            setState(stateKey, value);
          }
        });
      });
    }
  };
}
