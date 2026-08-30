import { sortBookmarkTabs, sortBookmarksNewestFirst } from './bookmarksHelper.js';

const DEFAULT_TAB = { id: 'default', name: '기본', order: 0 };

function cloneTabs(tabs) {
  const source = Array.isArray(tabs) && tabs.length ? tabs : [DEFAULT_TAB];
  return sortBookmarkTabs(source.map((tab) => ({ ...tab })));
}

function cloneBookmarks(bookmarks) {
  return (Array.isArray(bookmarks) ? bookmarks : []).map((bookmark) => ({ ...bookmark }));
}

export function createBookmarksEngine({ initialState = {} } = {}) {
  let state = { tabs: [], bookmarks: [], activeId: 'default' };

  function hydrate(next = {}) {
    const tabs = cloneTabs(next.tabs);
    const requestedActiveId = next.activeId || 'default';
    state = {
      tabs,
      bookmarks: cloneBookmarks(next.bookmarks),
      activeId: tabs.some((tab) => tab.id === requestedActiveId) ? requestedActiveId : tabs[0].id
    };
  }

  function getSnapshot() {
    return {
      tabs: cloneTabs(state.tabs),
      bookmarks: cloneBookmarks(state.bookmarks),
      activeId: state.activeId
    };
  }

  hydrate(initialState);

  return {
    addBookmark(bookmark) {
      if (!bookmark?.id) return false;
      state.bookmarks = [
        ...state.bookmarks,
        { ...bookmark, bookmarkTabId: bookmark.bookmarkTabId || state.activeId }
      ];
      return true;
    },
    addTab(tab) {
      if (!tab?.id || state.tabs.some((item) => item.id === tab.id)) return false;
      const maxOrder = state.tabs.reduce((max, item) => Math.max(max, Number(item.order || 0)), 0);
      state.tabs = cloneTabs([...state.tabs, { ...tab, order: tab.order ?? maxOrder + 10 }]);
      state.activeId = tab.id;
      return true;
    },
    deleteBookmark(id) {
      const previousLength = state.bookmarks.length;
      state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id);
      return previousLength !== state.bookmarks.length;
    },
    deleteTab(tabId) {
      state.bookmarks = state.bookmarks.filter(
        (bookmark) => (bookmark.bookmarkTabId || 'default') !== tabId
      );
      state.tabs = cloneTabs(state.tabs.filter((tab) => tab.id !== tabId));
      if (!state.tabs.some((tab) => tab.id === state.activeId)) state.activeId = state.tabs[0].id;
      return true;
    },
    findBookmark(id) {
      const bookmark = state.bookmarks.find((item) => item.id === id);
      return bookmark ? { ...bookmark } : null;
    },
    getActiveBookmarks() {
      return sortBookmarksNewestFirst(
        state.bookmarks.filter(
          (bookmark) => (bookmark.bookmarkTabId || 'default') === state.activeId
        )
      ).map((bookmark) => ({ ...bookmark }));
    },
    getSnapshot,
    hydrate,
    moveBookmark(id, tabId) {
      const bookmark = state.bookmarks.find((item) => item.id === id);
      if (!bookmark) return false;
      bookmark.bookmarkTabId = tabId || 'default';
      return true;
    },
    renameTab(tabId, name) {
      const tab = state.tabs.find((item) => item.id === tabId);
      if (!tab) return false;
      tab.name = name;
      return true;
    },
    reorderTabs(tabs) {
      state.tabs = cloneTabs(tabs);
      if (!state.tabs.some((tab) => tab.id === state.activeId)) state.activeId = state.tabs[0].id;
    },
    setActiveTab(tabId) {
      if (!state.tabs.some((tab) => tab.id === tabId)) return false;
      state.activeId = tabId;
      return true;
    },
    updateBookmark(id, changes) {
      const bookmark = state.bookmarks.find((item) => item.id === id);
      if (!bookmark) return false;
      Object.assign(bookmark, changes);
      return true;
    }
  };
}
