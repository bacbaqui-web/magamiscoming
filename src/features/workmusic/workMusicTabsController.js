export function createWorkMusicTabsController({ engine, render, save }) {
  const persist = async () => {
    render?.();
    await save?.();
  };
  return {
    ensureDefault() {
      const snapshot = engine.getSnapshot();
      if (!snapshot.tabs.length) engine.setTabs([]);
      return persist();
    },
    setActive(tabId) {
      engine.setActiveTab(tabId || 'default');
      return persist();
    },
    add(tab) {
      const tabs = engine.getSnapshot().tabs;
      const max = tabs.reduce((value, item) => Math.max(value, Number(item.order || 0)), 0);
      engine.setTabs([...tabs, { ...tab, order: tab.order ?? max + 10 }]);
      engine.setActiveTab(tab.id);
      return persist();
    },
    rename(tabId, name) {
      engine.setTabs(
        engine.getSnapshot().tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab))
      );
      return persist();
    },
    reorder(tabs) {
      engine.setTabs(tabs);
      return persist();
    },
    delete(tabId) {
      const snapshot = engine.getSnapshot();
      engine.setTabs(snapshot.tabs.filter((tab) => tab.id !== tabId));
      engine.setSongs(
        snapshot.songs.filter((song) => (song.workMusicTabId || 'default') !== tabId)
      );
      if (snapshot.activeTabId === tabId) engine.setActiveTab(engine.getSnapshot().tabs[0]?.id);
      return persist();
    }
  };
}
