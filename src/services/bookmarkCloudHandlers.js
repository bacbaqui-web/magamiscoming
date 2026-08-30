export function installBookmarkCloudHandlers({
  renameBookmarkTabDriveFolder,
  scheduleSave,
  setDriveStatus
}) {
  const getController = () => window.__bookmarksControllerCompatibility;

  window.cloudSetActiveBookmarkTab = (tabId) => getController()?.setActiveTab(tabId || 'default');
  window.cloudAddBookmarkTab = (tab) => getController()?.addTab(tab);
  window.cloudRenameBookmarkTab = async (tabId, name) => {
    const controller = getController();
    if (!controller) return;
    const prevList = controller.getSnapshot().tabs;
    const nextList = prevList.map((tab) => (tab.id === tabId ? { ...tab, name } : tab));
    controller.renameTab(tabId, name, { save: false });
    try {
      await renameBookmarkTabDriveFolder(tabId, prevList, nextList);
    } catch (error) {
      console.warn('bookmark tab folder rename skipped', error);
      setDriveStatus('폴더 이름 변경 실패 · 탭 이름은 저장 예약됨', true);
    }
    scheduleSave();
  };
  window.cloudReorderBookmarkTabs = async (list) => {
    const controller = getController();
    if (!controller) return;
    const prevList = controller.getSnapshot().tabs;
    controller.reorderTabs(list, { save: false });
    for (const tab of list) {
      try {
        await renameBookmarkTabDriveFolder(tab.id, prevList, list);
      } catch (error) {
        console.warn('bookmark tab folder reorder rename skipped', tab?.name, error);
      }
    }
    scheduleSave();
  };
  window.cloudDeleteBookmarkTab = (tabId) => getController()?.deleteTab(tabId);
  window.moveBookmarkToTab = (id, tabId) => getController()?.moveBookmark(id, tabId || 'default');
}
