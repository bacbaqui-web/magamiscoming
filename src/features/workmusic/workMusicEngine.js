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
    djVerseMode: false,
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
  const songKey = (song) => String(song?.id || song?.videoId || '');
  let historyTab = state.activeTabId;
  let history = [];
  let historyCursor = -1;
  let pendingHistoryCursor = null;
  let nextOverride = null;

  function checkHistoryTab() {
    if (historyTab === state.activeTabId) return;
    historyTab = state.activeTabId;
    history = [];
    historyCursor = -1;
    pendingHistoryCursor = null;
    nextOverride = null;
  }
  function recordPlayed(index) {
    checkHistoryTab();
    const key = songKey(activeSongRefs()[index]);
    if (!key) return false;
    if (pendingHistoryCursor != null && history[pendingHistoryCursor] === key) {
      historyCursor = pendingHistoryCursor;
      pendingHistoryCursor = null;
      return true;
    }
    pendingHistoryCursor = null;
    if (history[historyCursor] === key) return false;
    history = history.slice(0, historyCursor + 1);
    history.push(key);
    historyCursor = history.length - 1;
    return true;
  }
  function previousEntry(distance = 1) {
    checkHistoryTab();
    const songs = activeSongRefs();
    const currentKey = songKey(songs[state.currentIndex]);
    let cursor = pendingHistoryCursor ?? historyCursor;
    if (history[cursor] === currentKey || pendingHistoryCursor != null) cursor--;
    for (; cursor >= 0; cursor--) {
      const index = songs.findIndex((song) => songKey(song) === history[cursor]);
      if (index >= 0 && --distance === 0) return { index, cursor };
    }
    return { index: -1, cursor: null };
  }
  function requestPrevious() {
    const previous = previousEntry();
    pendingHistoryCursor = previous.cursor;
    return previous.index;
  }
  function getUpcomingIndices(fromIndex = state.currentIndex) {
    checkHistoryTab();
    const songs = activeSongRefs();
    if (!songs.length) return [];
    if (state.playOrder.length !== songs.length) {
      state.playOrder = createPlayOrder(songs.length, state.mode);
    }
    const order = state.mode === 'random' ? state.playOrder : songs.map((_, i) => i);
    const override = songs.findIndex((song) => songKey(song) === nextOverride);
    const start =
      state.mode === 'sequential' && fromIndex === state.currentIndex && override >= 0
        ? order.indexOf(override)
        : order.indexOf(fromIndex) + 1;
    return Array.from(
      { length: Math.max(0, songs.length - 1) },
      (_, i) => order[(start + i + order.length) % order.length]
    );
  }
  function replaceNext(random = Math.random, excludedIndex = getUpcomingIndices()[0]) {
    const songs = activeSongRefs();
    const candidates = songs
      .map((_, i) => i)
      .filter(
        (index) => index !== state.currentIndex && index !== excludedIndex && songs[index].videoId
      );
    if (!candidates.length) return -1;
    const chosen =
      candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    if (state.mode === 'random') {
      const order = [...state.playOrder];
      const nextPosition = (order.indexOf(state.currentIndex) + 1) % order.length;
      const chosenPosition = order.indexOf(chosen);
      [order[nextPosition], order[chosenPosition]] = [order[chosenPosition], order[nextPosition]];
      state.playOrder = order;
    } else nextOverride = songKey(songs[chosen]);
    return chosen;
  }

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
    } else if (key === 'mode') {
      state.mode = value === 'random' ? 'random' : 'sequential';
      nextOverride = null;
    } else if (key === 'currentIndex') {
      const next = Math.max(0, Number(value || 0));
      if (next !== state.currentIndex) nextOverride = null;
      state.currentIndex = next;
    } else if (key === 'volume' || key === 'lastVolume') state[key] = normalizeVolume(value);
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
    recordPlayed,
    getPreviousIndex: (distance = 1) => previousEntry(distance).index,
    requestPrevious,
    getUpcomingIndices,
    replaceNext,
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
