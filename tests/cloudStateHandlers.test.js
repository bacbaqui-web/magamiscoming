import test from 'node:test';
import assert from 'node:assert/strict';

import { installCloudStateHandlers } from '../src/services/cloudStateHandlers.js';

test('Cloud state 공개 계약은 기능 Controller에 변경을 위임한다', async () => {
  const calls = [];
  global.window = {
    __bookmarksControllerCompatibility: {
      addTab: (tab) => calls.push(['bookmark-add', tab]),
      deleteTab: (id) => calls.push(['bookmark-delete', id]),
      getSnapshot: () => ({ tabs: [{ id: 'default', name: '기본', order: 0 }] }),
      moveBookmark: (id, tabId) => calls.push(['bookmark-move', id, tabId]),
      renameTab: (id, name) => calls.push(['bookmark-rename', id, name]),
      reorderTabs: (tabs) => calls.push(['bookmark-reorder', tabs]),
      setActiveTab: (id) => calls.push(['bookmark-active', id])
    },
    __workMusicTabsControllerCompatibility: {
      add: (tab) => calls.push(['music-add', tab]),
      delete: (id) => calls.push(['music-delete', id]),
      ensureDefault: () => calls.push(['music-default']),
      rename: (id, name) => calls.push(['music-rename', id, name]),
      reorder: (tabs) => calls.push(['music-reorder', tabs]),
      setActive: (id) => calls.push(['music-active', id])
    }
  };

  installCloudStateHandlers({
    clearScheduledNotesSave() {},
    ensureLogin: () => true,
    queueNotesSave: async () => {},
    renameBookmarkTabDriveFolder: async () => {},
    saveNonNotesDataNow: async () => {},
    scheduleSaveNonNotesData() {},
    scheduleSaveNotesData() {},
    setDriveStatus() {}
  });

  await window.cloudAddBookmarkTab({ id: 'bookmark-2', name: '두 번째' });
  await window.moveBookmarkToTab('bookmark-1', 'bookmark-2');
  await window.cloudAddWorkMusicTab({ id: 'music-2', name: '두 번째' });
  await window.cloudSetActiveWorkMusicTab('music-2');

  assert.deepEqual(calls, [
    ['bookmark-add', { id: 'bookmark-2', name: '두 번째' }],
    ['bookmark-move', 'bookmark-1', 'bookmark-2'],
    ['music-add', { id: 'music-2', name: '두 번째' }],
    ['music-active', 'music-2']
  ]);
  assert.equal(window.cloudSaveNotesDebounced, undefined);
  assert.equal(window.cloudSaveStateOnly, undefined);
  assert.equal(window.deleteTask, undefined);
});
