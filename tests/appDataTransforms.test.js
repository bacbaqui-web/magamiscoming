import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeDriveParts, splitAppDataForDrive } from '../src/services/appDataTransforms.js';
import { applyStoredAppData, buildAppData } from '../src/services/appDataRuntime.js';

function installFixtureWindow() {
  globalThis.window = {
    customTasks: [{ id: 'task-1', title: '마감' }],
    taskStatus: { 'task-1': 'done' },
    __calendarViewMode: 'month',
    __hiddenMainTabs: ['notes', 'bookmarks'],
    __mainCustomTabs: [{ id: 'custom-1', name: '자료실', url: 'https://example.com', order: 10 }],
    __notesTabList: [
      { id: 'later', name: '나중', order: 20 },
      { id: 'memo', name: ' 메모 ', order: 0 }
    ],
    __notesTabs: { memo: '본문', later: '두 번째 메모' },
    __notesActiveTabId: 'later',
    imageBookmarks: [
      {
        id: 'bookmark-drive',
        type: 'image',
        driveFileId: 'drive-1',
        url: 'blob:runtime-image',
        timestamp: { toMillis: () => 1234 }
      },
      { id: 'bookmark-local', type: 'local_pending_image', url: 'blob:pending' }
    ],
    __bookmarkTabList: [{ id: 'default', name: '기본', order: 0 }],
    __bookmarkActiveTabId: 'default',
    workMusicSongs: [
      {
        id: 'song-1',
        videoId: 'video-1',
        workMusicTabId: 'default',
        mediaAnalysisManual: { drumStart: 12.5, drumEnd: 184.2 }
      }
    ],
    workMusicMode: 'random',
    workMusicCurrentIndex: 1,
    workMusicVolume: 45,
    workMusicLastVolume: 70,
    workMusicIsMuted: true,
    workMusicSeamlessEnabled: true,
    workMusicSeamlessOverlapSeconds: 8,
    __workMusicTabList: [{ id: 'default', name: '기본', order: 0 }],
    __workMusicActiveTabId: 'default',
    __pomodoroState: {
      mode: 'focus',
      status: 'paused',
      remainingMs: 60_000,
      completedFocusCount: 2,
      completedToday: 1,
      completedDate: '2026-08-30',
      settings: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4
      }
    }
  };

  return {
    state: {
      clipPages: [{ id: 'clip-1', name: '001.png', driveFileId: 'clip-drive-1' }]
    }
  };
}

function persistedMeaning(data) {
  const copy = structuredClone(data);
  delete copy.updatedAt;
  copy.state.pomodoro.startedAt = copy.state.pomodoro.startedAt || null;
  copy.state.pomodoro.endAt = copy.state.pomodoro.endAt || null;
  return copy;
}

test('buildAppData serializes persisted values and excludes bookmark runtime values', () => {
  const currentAppData = installFixtureWindow();

  const built = buildAppData(currentAppData);

  assert.deepEqual(built.state.hiddenMainTabs, ['notes', 'bookmarks']);
  assert.deepEqual(built.state.mainCustomTabs, [
    { id: 'custom-1', name: '자료실', url: 'https://example.com', order: 10 }
  ]);
  assert.deepEqual(
    built.state.notesTabList.map(({ id, name, order }) => ({ id, name, order })),
    [
      { id: 'memo', name: '메모', order: 0 },
      { id: 'later', name: '나중', order: 20 }
    ]
  );
  assert.deepEqual(built.imageBookmarks, [
    {
      id: 'bookmark-drive',
      type: 'image',
      driveFileId: 'drive-1',
      url: null,
      timestampMs: 1234
    }
  ]);
  assert.deepEqual(built.state.clipPages, currentAppData.state.clipPages);
  assert.deepEqual(built.state.workMusicSongs[0].mediaAnalysisManual, {
    drumStart: 12.5,
    drumEnd: 184.2
  });
});

test('Firebase source data and split/merged Drive fixtures have the same persisted meaning', () => {
  const currentAppData = installFixtureWindow();
  const firebaseSource = buildAppData(currentAppData);

  const driveMerged = mergeDriveParts(splitAppDataForDrive(firebaseSource));

  assert.deepEqual(persistedMeaning(driveMerged), persistedMeaning(firebaseSource));
});

test('build, split, merge and apply preserve stored fields while resetting session-only playback state', () => {
  const currentAppData = installFixtureWindow();
  const built = buildAppData(currentAppData);
  const merged = mergeDriveParts(splitAppDataForDrive(built));
  let revokeCount = 0;

  const applied = applyStoredAppData(merged, {
    revokeAllDriveImageUrls: () => {
      revokeCount += 1;
    }
  });
  const rebuilt = buildAppData(applied);
  const expected = persistedMeaning(built);
  expected.state.workMusicMode = 'sequential';

  assert.deepEqual(persistedMeaning(rebuilt), expected);
  assert.deepEqual(window.__hiddenMainTabs, ['notes', 'bookmarks']);
  assert.deepEqual(window.__mainCustomTabs, [
    { id: 'custom-1', name: '자료실', url: 'https://example.com', order: 10 }
  ]);
  assert.equal(window.workMusicMode, 'sequential');
  assert.deepEqual(window.workMusicCurrentPlayOrder, []);
  assert.deepEqual(window.__workMusicDisplayShuffle, {});
  assert.equal(revokeCount, 1);
});
