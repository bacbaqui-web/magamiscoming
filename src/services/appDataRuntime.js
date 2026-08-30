import {
  driveTimestamp,
  getDefaultAppData,
  normalizePomodoroState,
  normalizeTabList
} from './appDataTransforms.js';

export function collectRuntimeState(currentAppData = getDefaultAppData(), host = window) {
  return {
    taskStatus: host.taskStatus || {},
    calendarViewMode: host.__calendarViewMode === 'month' ? 'month' : 'week',
    hiddenMainTabs: Array.isArray(host.__hiddenMainTabs) ? host.__hiddenMainTabs : [],
    mainCustomTabs: Array.isArray(host.__mainCustomTabs) ? host.__mainCustomTabs : [],
    notesTabList: normalizeTabList(host.__notesTabList, { id: 'memo', name: '메모', order: 0 }),
    notesTabs: host.__notesTabs || {},
    notesActiveTabId: host.__notesActiveTabId || 'memo',
    bookmarkTabList: host.__bookmarkTabList || [{ id: 'default', name: '기본', order: 0 }],
    bookmarkActiveTabId: host.__bookmarkActiveTabId || 'default',
    workMusicSongs: host.workMusicSongs || [],
    workMusicMode: host.workMusicMode || 'sequential',
    workMusicCurrentIndex: Number(host.workMusicCurrentIndex || 0),
    workMusicVolume: Number(host.workMusicVolume ?? 80),
    workMusicLastVolume: Number(host.workMusicLastVolume ?? 80),
    workMusicIsMuted: !!host.workMusicIsMuted,
    workMusicSeamlessEnabled: !!host.workMusicSeamlessEnabled,
    workMusicSeamlessOverlapSeconds: Number(host.workMusicSeamlessOverlapSeconds ?? 0),
    workMusicTabList: host.__workMusicTabList || [{ id: 'default', name: '기본', order: 0 }],
    workMusicActiveTabId: host.__workMusicActiveTabId || 'default',
    pomodoro: normalizePomodoroState(host.__pomodoroState),
    clipPages: currentAppData.state?.clipPages || []
  };
}

export function serializableBookmarks(bookmarks = []) {
  return bookmarks
    .filter((bookmark) => bookmark.driveFileId || bookmark.type !== 'local_pending_image')
    .map((bookmark) => {
      const copy = { ...bookmark };
      if (copy.driveFileId || String(copy.url || '').startsWith('blob:')) copy.url = null;
      if (copy.previewDriveFileId || String(copy.previewImageUrl || '').startsWith('blob:')) {
        copy.previewImageUrl = null;
      }
      if (copy.timestamp?.toMillis) {
        copy.timestampMs = copy.timestamp.toMillis();
        delete copy.timestamp;
      }
      return copy;
    });
}

export function buildAppData(currentAppData = getDefaultAppData(), host = window) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    customTasks: host.customTasks || [],
    imageBookmarks: serializableBookmarks(host.imageBookmarks || []),
    state: collectRuntimeState(currentAppData, host)
  };
}

export function applyStoredAppData(
  data,
  { host = window, revokeAllDriveImageUrls = () => {} } = {}
) {
  const currentAppData = data && typeof data === 'object' ? data : getDefaultAppData();
  const state = currentAppData.state || {};
  host.customTasks = Array.isArray(currentAppData.customTasks) ? currentAppData.customTasks : [];
  host.taskStatus = state.taskStatus || {};
  host.__calendarViewMode = state.calendarViewMode === 'month' ? 'month' : 'week';
  host.__hiddenMainTabs = Array.isArray(state.hiddenMainTabs) ? state.hiddenMainTabs : [];
  host.__mainCustomTabs = Array.isArray(state.mainCustomTabs) ? state.mainCustomTabs : [];
  host.__notesTabList = normalizeTabList(state.notesTabList, {
    id: 'memo',
    name: '메모',
    order: 0
  });
  host.__notesTabs = state.notesTabs || {};
  host.__notesActiveTabId = state.notesActiveTabId || 'memo';
  host.__bookmarkTabList = state.bookmarkTabList || [{ id: 'default', name: '기본', order: 0 }];
  host.__bookmarkActiveTabId = state.bookmarkActiveTabId || 'default';
  host.workMusicSongs = Array.isArray(state.workMusicSongs) ? state.workMusicSongs : [];
  host.__workMusicTabList = state.workMusicTabList || [{ id: 'default', name: '기본', order: 0 }];
  host.__workMusicActiveTabId = state.workMusicActiveTabId || 'default';
  host.workMusicMode = 'sequential';
  host.__workMusicDisplayShuffle = {};
  host.workMusicCurrentPlayOrder = [];
  host.workMusicCurrentIndex = Number(state.workMusicCurrentIndex || 0);
  host.workMusicVolume = Number(state.workMusicVolume ?? 80);
  host.workMusicLastVolume = Number(state.workMusicLastVolume ?? 80);
  host.workMusicIsMuted = !!state.workMusicIsMuted;
  host.workMusicSeamlessEnabled = !!state.workMusicSeamlessEnabled;
  host.workMusicSeamlessOverlapSeconds = Number(
    state.workMusicSeamlessOverlapSeconds ?? (state.workMusicSeamlessEnabled ? 10 : 0)
  );
  host.__pomodoroState = normalizePomodoroState(state.pomodoro);
  revokeAllDriveImageUrls();
  host.imageBookmarks = (currentAppData.imageBookmarks || []).map((bookmark) => ({
    ...bookmark,
    timestamp: driveTimestamp(bookmark.timestampMs || Date.parse(bookmark.timestamp || '') || 0)
  }));
  return currentAppData;
}
