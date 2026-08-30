import test from 'node:test';
import assert from 'node:assert/strict';

import { initializeAppState } from '../src/app/appState.js';

test('initializeAppState creates the existing default state contract', () => {
  const target = {};

  initializeAppState(target);

  assert.deepEqual(target.customTasks, []);
  assert.deepEqual(target.taskStatus, {});
  assert.equal(target.__calendarViewMode, 'week');
  assert.deepEqual(target.__notesTabs, {});
  assert.deepEqual(target.imageBookmarks, []);
  assert.deepEqual(target.__bookmarkTabList, [{ id: 'default', name: '기본', order: 0 }]);
  assert.equal(target.__bookmarkActiveTabId, 'default');
  assert.deepEqual(target.__hiddenMainTabs, []);
  assert.deepEqual(target.__mainCustomTabs, []);
  assert.equal(target.currentTask, null);
  assert.equal(target.currentEditingBookmark, null);
  assert.equal(target.isAuthReady, false);
});

test('initializeAppState preserves persisted collections and normalizes session fields', () => {
  const customTasks = [{ id: 'task-1' }];
  const hiddenTabs = ['notes'];
  const target = {
    customTasks,
    taskStatus: { 'task-1': 'done' },
    __calendarViewMode: 'month',
    __notesTabs: { memo: '내용' },
    imageBookmarks: [{ id: 'bookmark-1' }],
    __bookmarkTabList: [{ id: 'custom', name: '자료', order: 10 }],
    __bookmarkActiveTabId: 'custom',
    __hiddenMainTabs: hiddenTabs,
    __mainCustomTabs: [{ id: 'custom-tab' }],
    currentTask: { id: 'old-task' },
    currentEditingBookmark: { id: 'old-bookmark' },
    isAuthReady: true
  };

  initializeAppState(target);

  assert.equal(target.customTasks, customTasks);
  assert.equal(target.__hiddenMainTabs, hiddenTabs);
  assert.equal(target.__calendarViewMode, 'month');
  assert.equal(target.currentTask, null);
  assert.equal(target.currentEditingBookmark, null);
  assert.equal(target.isAuthReady, false);
});

test('initializeAppState rejects unsupported view and tab collection shapes', () => {
  const target = {
    __calendarViewMode: 'year',
    __hiddenMainTabs: 'notes',
    __mainCustomTabs: null
  };

  initializeAppState(target);

  assert.equal(target.__calendarViewMode, 'week');
  assert.deepEqual(target.__hiddenMainTabs, []);
  assert.deepEqual(target.__mainCustomTabs, []);
});
