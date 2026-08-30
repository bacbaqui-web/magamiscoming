export function installWorkMusicCloudHandlers() {
  const getController = () => window.__workMusicTabsControllerCompatibility;

  window.cloudEnsureWorkMusicDefaultTab = () => getController()?.ensureDefault();
  window.cloudSetActiveWorkMusicTab = (tabId) => getController()?.setActive(tabId || 'default');
  window.cloudAddWorkMusicTab = (tab) => getController()?.add(tab);
  window.cloudRenameWorkMusicTab = (tabId, name) => getController()?.rename(tabId, name);
  window.cloudReorderWorkMusicTabs = (tabs) => getController()?.reorder(tabs);
  window.cloudDeleteWorkMusicTab = (tabId) => getController()?.delete(tabId);
}
