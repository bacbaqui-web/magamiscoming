import { DEFAULT_NOTES_TAB, normalizeNotesTabs } from './notesHelper.js';

function cloneState(state) {
  return {
    tabs: state.tabs.map((tab) => ({ ...tab })),
    notes: { ...state.notes },
    activeId: state.activeId
  };
}

export function createNotesEngine({ initialState } = {}) {
  let state;

  function hydrate(nextState = {}) {
    const tabs = normalizeNotesTabs(nextState.tabs);
    const notes =
      nextState.notes && typeof nextState.notes === 'object' ? { ...nextState.notes } : {};
    const requestedActiveId = String(nextState.activeId || DEFAULT_NOTES_TAB.id);
    state = {
      tabs,
      notes,
      activeId: tabs.some((tab) => tab.id === requestedActiveId) ? requestedActiveId : tabs[0].id
    };
  }

  hydrate(initialState);

  return {
    addTab(tab) {
      if (!tab?.id || state.tabs.some((item) => item.id === tab.id)) return false;
      const maxOrder = state.tabs.reduce((max, item) => Math.max(max, Number(item.order || 0)), 0);
      state.tabs = normalizeNotesTabs([
        ...state.tabs,
        { id: tab.id, name: tab.name || '새 탭', order: tab.order ?? maxOrder + 10 }
      ]);
      state.notes[tab.id] = '';
      state.activeId = tab.id;
      return true;
    },
    deleteTab(tabId) {
      if (!state.tabs.some((tab) => tab.id === tabId)) return false;
      state.tabs = normalizeNotesTabs(state.tabs.filter((tab) => tab.id !== tabId));
      delete state.notes[tabId];
      if (state.activeId === tabId) state.activeId = state.tabs[0].id;
      return true;
    },
    getSnapshot() {
      return cloneState(state);
    },
    hydrate,
    renameTab(tabId, name) {
      if (!state.tabs.some((tab) => tab.id === tabId)) return false;
      state.tabs = state.tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab));
      return true;
    },
    reorderTabs(tabs) {
      state.tabs = normalizeNotesTabs(tabs);
      if (!state.tabs.some((tab) => tab.id === state.activeId)) state.activeId = state.tabs[0].id;
    },
    setActiveTab(tabId) {
      if (!state.tabs.some((tab) => tab.id === tabId)) return false;
      state.activeId = tabId;
      return true;
    },
    setNote(tabId, value) {
      if (!state.tabs.some((tab) => tab.id === tabId)) return false;
      state.notes[tabId] = String(value ?? '');
      return true;
    }
  };
}
