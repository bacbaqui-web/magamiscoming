export function initializeAppState(target = window) {
  target.customTasks = target.customTasks || [];
  target.taskStatus = target.taskStatus || {};
  target.__calendarViewMode = target.__calendarViewMode === 'month' ? 'month' : 'week';
  target.__notesTabs = target.__notesTabs || {};
  target.imageBookmarks = target.imageBookmarks || [];
  target.__bookmarkTabList = target.__bookmarkTabList || [
    { id: 'default', name: '기본', order: 0 }
  ];
  target.__bookmarkActiveTabId = target.__bookmarkActiveTabId || 'default';
  target.__hiddenMainTabs = Array.isArray(target.__hiddenMainTabs) ? target.__hiddenMainTabs : [];
  target.__mainCustomTabs = Array.isArray(target.__mainCustomTabs) ? target.__mainCustomTabs : [];
  target.currentTask = null;
  target.currentEditingBookmark = null;
  target.isAuthReady = false;
  return target;
}
