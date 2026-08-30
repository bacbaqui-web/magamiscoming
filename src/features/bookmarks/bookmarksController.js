export function createBookmarksController({ engine, host = window, render = () => {} }) {
  function publish() {
    const snapshot = engine.getSnapshot();
    host.__bookmarkTabList = snapshot.tabs;
    host.__bookmarkActiveTabId = snapshot.activeId;
    host.imageBookmarks = snapshot.bookmarks;
    return snapshot;
  }

  function change(mutator, { save = true } = {}) {
    const changed = mutator();
    if (changed === false) return false;
    publish();
    render();
    if (save) host.__bookmarksPersistence?.schedule?.();
    return true;
  }

  return {
    addBookmark(bookmark, options) {
      return change(() => engine.addBookmark(bookmark), options);
    },
    addTab(tab) {
      return change(() => engine.addTab(tab));
    },
    deleteBookmark(id, options) {
      return change(() => engine.deleteBookmark(id), options);
    },
    deleteTab(tabId) {
      return change(() => engine.deleteTab(tabId));
    },
    findBookmark: engine.findBookmark,
    getActiveBookmarks: engine.getActiveBookmarks,
    getSnapshot: engine.getSnapshot,
    hydrate(state) {
      engine.hydrate(state);
      publish();
      render();
    },
    moveBookmark(id, tabId) {
      return change(() => engine.moveBookmark(id, tabId));
    },
    publish,
    renameTab(tabId, name, { save = true } = {}) {
      return change(() => engine.renameTab(tabId, name), { save });
    },
    render() {
      publish();
      render();
    },
    reorderTabs(tabs, { save = true } = {}) {
      return change(() => engine.reorderTabs(tabs), { save });
    },
    setActiveTab(tabId) {
      return change(() => engine.setActiveTab(tabId));
    },
    updateBookmark(id, changes, options) {
      return change(() => engine.updateBookmark(id, changes), options);
    }
  };
}
