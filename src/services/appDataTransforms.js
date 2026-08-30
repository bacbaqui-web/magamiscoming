export function normalizeTabList(tabs, fallback) {
  const seen = new Set();
  const normalized = (Array.isArray(tabs) ? tabs : [])
    .filter((tab) => tab?.id && !seen.has(tab.id) && seen.add(tab.id))
    .map((tab, index) => ({
      ...tab,
      name: String(tab.name || fallback?.name || '탭').trim() || fallback?.name || '탭',
      order: Number.isFinite(Number(tab.order)) ? Number(tab.order) : index * 10
    }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return normalized.length ? normalized : [fallback];
}

export function driveTimestamp(ms) {
  return { toMillis: () => Number(ms || 0) };
}

export function getDefaultPomodoroState() {
  return {
    mode: 'focus',
    status: 'idle',
    startedAt: null,
    endAt: null,
    remainingMs: 25 * 60 * 1000,
    completedFocusCount: 0,
    completedToday: 0,
    completedDate: '',
    settings: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4
    }
  };
}

export function normalizePomodoroState(state) {
  const fallback = getDefaultPomodoroState();
  const src = state && typeof state === 'object' ? state : {};
  const settings = src.settings && typeof src.settings === 'object' ? src.settings : {};
  const focusMinutes = Math.max(1, Math.min(180, Number(settings.focusMinutes || 25)));
  const shortBreakMinutes = Math.max(1, Math.min(60, Number(settings.shortBreakMinutes || 5)));
  const longBreakMinutes = Math.max(1, Math.min(120, Number(settings.longBreakMinutes || 15)));
  const longBreakEvery = Math.max(1, Math.min(12, Number(settings.longBreakEvery || 4)));
  const mode = ['focus', 'shortBreak', 'longBreak'].includes(src.mode) ? src.mode : fallback.mode;
  const status = ['idle', 'running', 'paused'].includes(src.status) ? src.status : fallback.status;
  const durationMsByMode = {
    focus: focusMinutes * 60 * 1000,
    shortBreak: shortBreakMinutes * 60 * 1000,
    longBreak: longBreakMinutes * 60 * 1000
  };
  const remainingMs = Math.max(
    0,
    Math.min(
      durationMsByMode[mode],
      Number.isFinite(Number(src.remainingMs)) ? Number(src.remainingMs) : durationMsByMode[mode]
    )
  );

  return {
    mode,
    status,
    startedAt: Number.isFinite(Number(src.startedAt)) ? Number(src.startedAt) : null,
    endAt: Number.isFinite(Number(src.endAt)) ? Number(src.endAt) : null,
    remainingMs,
    completedFocusCount: Math.max(0, Number(src.completedFocusCount || 0)),
    completedToday: Math.max(0, Number(src.completedToday || 0)),
    completedDate: String(src.completedDate || ''),
    settings: {
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakEvery
    }
  };
}

export function getDefaultAppData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    customTasks: [],
    imageBookmarks: [],
    state: {
      taskStatus: {},
      calendarViewMode: 'week',
      hiddenMainTabs: [],
      mainCustomTabs: [],
      notesTabList: [{ id: 'memo', name: '메모', order: 0 }],
      notesTabs: {},
      notesActiveTabId: 'memo',
      bookmarkTabList: [{ id: 'default', name: '기본', order: 0 }],
      bookmarkActiveTabId: 'default',
      workMusicSongs: [],
      workMusicMode: 'sequential',
      workMusicCurrentIndex: 0,
      workMusicVolume: 80,
      workMusicLastVolume: 80,
      workMusicIsMuted: false,
      workMusicSeamlessEnabled: false,
      workMusicSeamlessOverlapSeconds: 0,
      workMusicTabList: [{ id: 'default', name: '기본', order: 0 }],
      workMusicActiveTabId: 'default',
      pomodoro: getDefaultPomodoroState(),
      clipPages: []
    }
  };
}

export function splitAppDataForDrive(data) {
  data = data || getDefaultAppData();
  const st = data.state || {};
  return {
    calendar: {
      customTasks: data.customTasks || [],
      taskStatus: st.taskStatus || {},
      calendarViewMode: st.calendarViewMode === 'month' ? 'month' : 'week',
      hiddenMainTabs: st.hiddenMainTabs || [],
      mainCustomTabs: st.mainCustomTabs || [],
      updatedAt: data.updatedAt || new Date().toISOString()
    },
    notes: {
      notesTabList: st.notesTabList || [{ id: 'memo', name: '메모', order: 0 }],
      notesTabs: st.notesTabs || {},
      notesActiveTabId: st.notesActiveTabId || 'memo',
      updatedAt: data.updatedAt || new Date().toISOString()
    },
    bookmarks: {
      imageBookmarks: data.imageBookmarks || [],
      bookmarkTabList: st.bookmarkTabList || [{ id: 'default', name: '기본', order: 0 }],
      bookmarkActiveTabId: st.bookmarkActiveTabId || 'default',
      updatedAt: data.updatedAt || new Date().toISOString()
    },
    workmusic: {
      workMusicSongs: st.workMusicSongs || [],
      workMusicMode: st.workMusicMode || 'sequential',
      workMusicCurrentIndex: Number(st.workMusicCurrentIndex || 0),
      workMusicVolume: Number(st.workMusicVolume ?? 80),
      workMusicLastVolume: Number(st.workMusicLastVolume ?? 80),
      workMusicIsMuted: !!st.workMusicIsMuted,
      workMusicSeamlessEnabled: !!st.workMusicSeamlessEnabled,
      workMusicSeamlessOverlapSeconds: Number(st.workMusicSeamlessOverlapSeconds ?? 0),
      workMusicTabList: st.workMusicTabList || [{ id: 'default', name: '기본', order: 0 }],
      workMusicActiveTabId: st.workMusicActiveTabId || 'default',
      updatedAt: data.updatedAt || new Date().toISOString()
    },
    pomodoro: {
      ...normalizePomodoroState(st.pomodoro),
      updatedAt: data.updatedAt || new Date().toISOString()
    },
    clipviewer: {
      clipPages: st.clipPages || [],
      updatedAt: data.updatedAt || new Date().toISOString()
    }
  };
}

export function mergeDriveParts(parts) {
  const base = getDefaultAppData();
  if (parts.calendar) {
    base.customTasks = parts.calendar.customTasks || [];
    base.state.taskStatus = parts.calendar.taskStatus || {};
    base.state.calendarViewMode = parts.calendar.calendarViewMode === 'month' ? 'month' : 'week';
    base.state.hiddenMainTabs = Array.isArray(parts.calendar.hiddenMainTabs)
      ? parts.calendar.hiddenMainTabs
      : [];
    base.state.mainCustomTabs = Array.isArray(parts.calendar.mainCustomTabs)
      ? parts.calendar.mainCustomTabs
      : [];
  }
  if (parts.notes) {
    base.state.notesTabList = parts.notes.notesTabList || base.state.notesTabList;
    base.state.notesTabs = parts.notes.notesTabs || {};
    base.state.notesActiveTabId = parts.notes.notesActiveTabId || 'memo';
  }
  if (parts.bookmarks) {
    base.imageBookmarks = parts.bookmarks.imageBookmarks || [];
    base.state.bookmarkTabList = parts.bookmarks.bookmarkTabList || base.state.bookmarkTabList;
    base.state.bookmarkActiveTabId = parts.bookmarks.bookmarkActiveTabId || 'default';
  }
  if (parts.workmusic) {
    base.state.workMusicSongs = parts.workmusic.workMusicSongs || [];
    base.state.workMusicMode = parts.workmusic.workMusicMode || 'sequential';
    base.state.workMusicCurrentIndex = Number(parts.workmusic.workMusicCurrentIndex || 0);
    base.state.workMusicVolume = Number(parts.workmusic.workMusicVolume ?? 80);
    base.state.workMusicLastVolume = Number(parts.workmusic.workMusicLastVolume ?? 80);
    base.state.workMusicIsMuted = !!parts.workmusic.workMusicIsMuted;
    base.state.workMusicSeamlessEnabled = !!parts.workmusic.workMusicSeamlessEnabled;
    base.state.workMusicSeamlessOverlapSeconds = Number(
      parts.workmusic.workMusicSeamlessOverlapSeconds ??
        (parts.workmusic.workMusicSeamlessEnabled ? 10 : 0)
    );
    base.state.workMusicTabList = parts.workmusic.workMusicTabList || base.state.workMusicTabList;
    base.state.workMusicActiveTabId = parts.workmusic.workMusicActiveTabId || 'default';
  }
  if (parts.pomodoro) {
    base.state.pomodoro = normalizePomodoroState(parts.pomodoro);
  }
  if (parts.clipviewer) {
    base.state.clipPages = parts.clipviewer.clipPages || [];
  }
  base.updatedAt = new Date().toISOString();
  return base;
}
