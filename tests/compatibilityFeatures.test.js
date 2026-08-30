import test from 'node:test';
import assert from 'node:assert/strict';

import { createCompatibilityFeatures } from '../src/app/compatibilityFeatures.js';

test('Compatibility features initialize and render legacy features in the preserved order', () => {
  const calls = [];
  const host = {
    showTab() {},
    renderCalendar: () => calls.push('render-calendar'),
    renderBookmarkTabsUI: () => calls.push('render-bookmark-tabs'),
    renderImageBookmarks: () => calls.push('render-bookmarks'),
    renderWorkMusicAll: () => calls.push('render-workmusic'),
    renderPomodoroUI: () => calls.push('render-pomodoro'),
    renderNotesUI: () => calls.push('render-notes'),
    renderMainTabVisibility: () => calls.push('render-main-visibility'),
    renderMainCustomTabs: () => calls.push('render-main-custom')
  };
  const initializers = Object.fromEntries(
    ['Calendar', 'Notes', 'Bookmarks', 'Pomodoro', 'MainTabs'].map((name) => [
      `init${name}`,
      () => calls.push(`init-${name.toLowerCase()}`)
    ])
  );
  const pomodoroEngine = { id: 'pomodoro-engine' };
  const notesEngine = { id: 'notes-engine' };
  const bookmarksEngine = { id: 'bookmarks-engine' };
  const profileEngine = { id: 'profile-engine', refresh: () => calls.push('refresh-profile') };
  initializers.initNotes = () => {
    calls.push('init-notes');
    return {
      engine: notesEngine,
      renderFromCompatibility: () => calls.push('render-notes')
    };
  };
  initializers.initPomodoro = () => {
    calls.push('init-pomodoro');
    return {
      engine: pomodoroEngine,
      renderFromCompatibility: () => calls.push('render-pomodoro')
    };
  };
  initializers.initBookmarks = () => {
    calls.push('init-bookmarks');
    return {
      engine: bookmarksEngine,
      renderFromCompatibility: () => calls.push('render-bookmarks')
    };
  };
  initializers.initWorkMusic = ({ showTab }) => {
    assert.equal(showTab, host.showTab);
    calls.push('init-workmusic');
  };
  const clipViewerOptions = { id: 'clip-options' };
  const clipViewerEngine = { id: 'clipviewer-engine' };
  const clipViewerBrowserAdapter = () => ({ id: 'browser-adapter' });
  initializers.initClipViewer = (options) => {
    assert.equal(options.id, clipViewerOptions.id);
    assert.equal(options.createBrowserAdapter, clipViewerBrowserAdapter);
    calls.push('init-clipviewer');
    return { engine: clipViewerEngine };
  };
  initializers.initProfile = () => {
    calls.push('init-profile');
    return { engine: profileEngine };
  };

  const features = createCompatibilityFeatures({ host, initializers });
  features.initialize({
    appAuthController: {},
    clipViewerBrowserAdapter,
    clipViewerOptions,
    mainTabsEngine: {},
    root: {}
  });
  features.renderAll();

  assert.equal(features.getTabEngines().pomodoro, pomodoroEngine);
  assert.equal(features.getTabEngines().notes, notesEngine);
  assert.equal(features.getTabEngines().bookmarks, bookmarksEngine);
  assert.equal(features.getTabEngines().profile, profileEngine);
  assert.equal(features.getTabEngines().clipviewer, clipViewerEngine);

  assert.deepEqual(calls, [
    'init-calendar',
    'init-notes',
    'init-bookmarks',
    'init-workmusic',
    'init-pomodoro',
    'init-clipviewer',
    'init-maintabs',
    'init-profile',
    'render-main-visibility',
    'render-main-custom',
    'render-calendar',
    'render-bookmarks',
    'render-workmusic',
    'render-pomodoro',
    'render-notes'
  ]);
});

test('달력 선로드 hydrate가 Engine의 현재 기준 주와 월 설정을 보존한다', () => {
  const hydrated = [];
  const current = {
    weekStartDay: 1,
    weekStart: new Date('2026-08-24T00:00:00+09:00'),
    monthDate: new Date('2026-08-01T00:00:00+09:00')
  };
  const emptyFeature = () => null;
  const initializers = {
    initBookmarks: emptyFeature,
    initCalendar: () => ({
      controller: { hydrate: (state) => hydrated.push(state) },
      engine: { getSnapshot: () => current }
    }),
    initClipViewer: emptyFeature,
    initMainTabs: emptyFeature,
    initNotes: emptyFeature,
    initPomodoro: emptyFeature,
    initProfile: emptyFeature,
    initWorkMusic: emptyFeature
  };
  const features = createCompatibilityFeatures({ host: {}, initializers });
  features.initialize({ root: {} });
  features.hydrateCalendar({ tasks: [{ id: 1 }], taskStatus: {}, viewMode: 'month' });

  assert.deepEqual(hydrated, [
    {
      weekStartDay: 1,
      weekAnchor: current.weekStart,
      monthAnchor: current.monthDate,
      tasks: [{ id: 1 }],
      taskStatus: {},
      viewMode: 'month'
    }
  ]);
});
