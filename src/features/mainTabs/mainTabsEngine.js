import { normalizeCustomTabs, normalizeHiddenMainTabs } from './mainTabsHelper.js';

export function createMainTabsEngine({ host = window, onChange = () => {} } = {}) {
  let hiddenMainTabs = normalizeHiddenMainTabs(host.__hiddenMainTabs);
  let mainCustomTabs = normalizeCustomTabs(host.__mainCustomTabs);

  function syncCompatibility() {
    host.__hiddenMainTabs = hiddenMainTabs;
    host.__mainCustomTabs = mainCustomTabs;
  }

  function commit(next, reason) {
    hiddenMainTabs = normalizeHiddenMainTabs(next.hiddenMainTabs);
    mainCustomTabs = normalizeCustomTabs(next.mainCustomTabs);
    syncCompatibility();
    onChange(getState(), reason);
    return getState();
  }

  function getState() {
    return {
      hiddenMainTabs: [...hiddenMainTabs],
      mainCustomTabs: mainCustomTabs.map((tab) => ({ ...tab }))
    };
  }

  function replaceState(state = {}) {
    return commit(
      {
        hiddenMainTabs: state.hiddenMainTabs ?? hiddenMainTabs,
        mainCustomTabs: state.mainCustomTabs ?? mainCustomTabs
      },
      'replace'
    );
  }

  function setTabVisible(tabId, visible) {
    const next = new Set(hiddenMainTabs);
    if (visible || tabId === 'profile') next.delete(tabId);
    else next.add(tabId);
    return commit({ hiddenMainTabs: [...next], mainCustomTabs }, 'visibility');
  }

  function saveCustomTab(tab) {
    const exists = mainCustomTabs.some((item) => item.id === tab.id);
    const nextTabs = exists
      ? mainCustomTabs.map((item) => (item.id === tab.id ? tab : item))
      : [...mainCustomTabs, tab];
    return commit({ hiddenMainTabs, mainCustomTabs: nextTabs }, exists ? 'update' : 'add');
  }

  function deleteCustomTab(tabId) {
    return commit(
      { hiddenMainTabs, mainCustomTabs: mainCustomTabs.filter((tab) => tab.id !== tabId) },
      'delete'
    );
  }

  syncCompatibility();
  return { deleteCustomTab, getState, replaceState, saveCustomTab, setTabVisible };
}
