export function createCompatibilityFeatures({ host = window, initializers }) {
  let pomodoroFeature = null;
  let calendarFeature = null;
  let notesFeature = null;
  let bookmarksFeature = null;
  let profileFeature = null;
  let clipViewerFeature = null;
  let workMusicFeature = null;

  function initialize({
    appAuthController,
    clipViewerBrowserAdapter,
    clipViewerOptions,
    mainTabsEngine,
    mediaAnalysisPort,
    root,
    youtubePort
  } = {}) {
    calendarFeature = initializers.initCalendar({ host, root });
    notesFeature = initializers.initNotes();
    bookmarksFeature = initializers.initBookmarks();
    workMusicFeature = initializers.initWorkMusic({
      host,
      root,
      showTab: host.showTab,
      mediaAnalysisPort,
      youtubePort
    });
    pomodoroFeature = initializers.initPomodoro();
    clipViewerFeature = initializers.initClipViewer({
      ...clipViewerOptions,
      createBrowserAdapter: clipViewerBrowserAdapter
    });
    initializers.initMainTabs({ engine: mainTabsEngine, host, root });
    profileFeature = initializers.initProfile({
      appAuthController,
      host,
      mainTabsEngine,
      root
    });
  }

  function renderCalendar() {
    if (typeof calendarFeature?.renderFromCompatibility === 'function') {
      calendarFeature.renderFromCompatibility();
    } else host.renderCalendar?.();
  }

  function renderNotes() {
    if (typeof notesFeature?.renderFromCompatibility === 'function') {
      notesFeature.renderFromCompatibility();
    } else host.renderNotesUI?.();
  }

  function renderBookmarks() {
    if (typeof bookmarksFeature?.renderFromCompatibility === 'function') {
      bookmarksFeature.renderFromCompatibility({
        tabs: host.__bookmarkTabList,
        bookmarks: host.imageBookmarks,
        activeId: host.__bookmarkActiveTabId
      });
    } else {
      host.renderImageBookmarks?.();
      host.renderBookmarkTabsUI?.();
    }
  }

  function renderWorkMusic() {
    host.renderWorkMusicAll?.();
  }

  function renderPomodoro() {
    if (typeof pomodoroFeature?.renderFromCompatibility === 'function') {
      pomodoroFeature.renderFromCompatibility();
    } else host.renderPomodoroUI?.();
  }

  function renderMainTabs() {
    host.renderMainTabVisibility?.();
    host.renderMainCustomTabs?.();
  }

  function renderAll() {
    renderMainTabs();
    renderCalendar();
    renderBookmarks();
    renderWorkMusic();
    renderPomodoro();
    renderNotes();
  }

  return {
    getTabEngines() {
      return {
        bookmarks: bookmarksFeature?.engine || null,
        calendar: calendarFeature?.engine || null,
        clipviewer: clipViewerFeature?.engine || null,
        notes: notesFeature?.engine || null,
        pomodoro: pomodoroFeature?.engine || null,
        profile: profileFeature?.engine || null,
        workmusic: workMusicFeature?.engine || null
      };
    },
    hydrateCalendar(state) {
      const current = calendarFeature?.engine?.getSnapshot();
      calendarFeature?.controller?.hydrate({
        weekStartDay: current?.weekStartDay,
        weekAnchor: current?.weekStart,
        monthAnchor: current?.monthDate,
        ...state
      });
    },
    initialize,
    renderAll,
    renderBookmarks,
    renderCalendar,
    renderMainTabs,
    renderNotes,
    renderPomodoro,
    renderWorkMusic,
    refreshProfile() {
      profileFeature?.engine.refresh();
    }
  };
}
