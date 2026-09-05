import { downloadTextFile, openTabSettings, renderManagedTab } from '../tabSettings.js';
import { createWorkMusicEngine } from './workMusicEngine.js';
import { createWorkMusicAnalysisController } from './workMusicAnalysisController.js';
import { createWorkMusicAnalysisView } from './workMusicAnalysisView.js';
import { createWorkMusicAutoAnalysisController } from './workMusicAutoAnalysisController.js';
import { getWorkMusicPlaybackVideoId } from './workMusicPlaybackIdentity.js';
import { createWorkMusicListController } from './workMusicListController.js';
import { createWorkMusicMetadataController } from './workMusicMetadataController.js';
import { createWorkMusicPlaybackController } from './workMusicPlaybackController.js';
import { createWorkMusicPlaylistController } from './workMusicPlaylistController.js';
import { createWorkMusicSeamlessController } from './workMusicSeamlessController.js';
import { createWorkMusicTabsController } from './workMusicTabsController.js';
import { cleanYoutubeTitle } from './workMusicHelper.js';

export function createWorkMusicComposer({
  host = window,
  root = document,
  showTab = (tabId) => host.showTab?.(tabId),
  mediaAnalysisPort,
  youtubePort
} = {}) {
  const APP_CONFIG = window.APP_CONFIG || {};
  const YOUTUBE_API_KEY = APP_CONFIG.youtubeApiKey || '';
  const engine = createWorkMusicEngine({
    initialState: {
      songs: host.workMusicSongs,
      tabs: host.__workMusicTabList,
      activeTabId: host.__workMusicActiveTabId,
      mode: 'sequential',
      currentIndex: host.workMusicCurrentIndex,
      volume: host.workMusicVolume,
      lastVolume: host.workMusicLastVolume,
      isMuted: host.workMusicIsMuted || Number(host.workMusicVolume) === 0,
      seamlessOverlapSeconds:
        host.workMusicSeamlessOverlapSeconds ?? (host.workMusicSeamlessEnabled ? 10 : 0),
      isPlaying: host.workMusicIsPlaying
    }
  });
  engine.bindCompatibility(host);
  // 셔플은 현재 접속 중인 목록에만 적용하고, 새로 접속하면 항상 원래 순서로 시작합니다.
  window.workMusicMode = 'sequential';
  window.__workMusicDisplayShuffle = {};
  window.workMusicCurrentIndex = window.workMusicCurrentIndex || 0;
  window.workMusicVolume = window.workMusicVolume ?? 80;
  window.workMusicLastVolume =
    window.workMusicLastVolume ??
    (Number(window.workMusicVolume) > 0 ? Number(window.workMusicVolume) : 80);
  window.workMusicIsMuted = window.workMusicIsMuted || Number(window.workMusicVolume) === 0;
  window.workMusicSeamlessOverlapSeconds = normalizeWorkMusicSeamlessSeconds(
    window.workMusicSeamlessOverlapSeconds ?? (window.workMusicSeamlessEnabled ? 10 : 0)
  );
  window.workMusicSeamlessEnabled = window.workMusicSeamlessOverlapSeconds > 0;
  window.workMusicIsPlaying = window.workMusicIsPlaying || false;
  window.currentWorkMusicSettingIndex = null;

  const workMusicTabsContainer = root.getElementById('workmusicTabsContainer');
  const workMusicDragArea = document.getElementById('workmusic-drag-area');
  const workMusicPrevBtn = document.getElementById('workMusicPrevBtn');
  const workMusicPlayBtn = document.getElementById('workMusicPlayBtn');
  const workMusicNextBtn = document.getElementById('workMusicNextBtn');
  const workMusicPrevPreviewThumb = document.getElementById('workMusicPrevPreviewThumb');
  const workMusicPrevPreviewTitle = document.getElementById('workMusicPrevPreviewTitle');
  const workMusicPrevPreviewArtist = document.getElementById('workMusicPrevPreviewArtist');
  const workMusicNextPreviewThumb = document.getElementById('workMusicNextPreviewThumb');
  const workMusicNextPreviewTitle = document.getElementById('workMusicNextPreviewTitle');
  const workMusicNextPreviewArtist = document.getElementById('workMusicNextPreviewArtist');
  const workMusicCoverFlow = document.querySelector('.workmusic-cover-flow');
  const workMusicFlowPrevTwo = document.getElementById('workMusicFlowPrevTwo');
  const workMusicFlowPrev = document.getElementById('workMusicFlowPrev');
  const workMusicFlowCurrent = document.getElementById('workMusicFlowCurrent');
  const workMusicFlowNext = document.getElementById('workMusicFlowNext');
  const workMusicFlowNextTwo = document.getElementById('workMusicFlowNextTwo');
  const workMusicNowTitle = document.getElementById('workMusicNowTitle');
  const workMusicNowArtist = document.getElementById('workMusicNowArtist');
  const workMusicElapsedTime = document.getElementById('workMusicElapsedTime');
  const workMusicDurationTime = document.getElementById('workMusicDurationTime');
  const workMusicSeekRange = document.getElementById('workMusicSeekRange');
  const workMusicSeekHover = document.getElementById('workMusicSeekHover');
  const workMusicSeekHoverTime = document.getElementById('workMusicSeekHoverTime');
  const workMusicModeBtn = document.getElementById('workMusicModeBtn');
  const workMusicSeamlessBtn = document.getElementById('workMusicSeamlessBtn');
  const workMusicMuteBtn = document.getElementById('workMusicMuteBtn');
  const workMusicVolumeControl = workMusicMuteBtn?.closest('.slider-control');
  const workMusicVolumeRange = document.getElementById('workMusicVolumeRange');
  const workMusicVolumePercent = document.getElementById('workMusicVolumePercent');
  const workMusicVolumeBadge = document.getElementById('workMusicVolumeBadge');
  const workMusicList = document.getElementById('workMusicList');
  const workMusicSettingsModal = document.getElementById('workMusicSettingsModal');
  const workMusicTitleInput = document.getElementById('workMusicTitleInput');
  const workMusicSaveTitleBtn = document.getElementById('workMusicSaveTitleBtn');
  const workMusicOpenYoutubeBtn = document.getElementById('workMusicOpenYoutubeBtn');
  const workMusicDeleteBtn = document.getElementById('workMusicDeleteBtn');
  const workMusicCloseSettingsBtn = document.getElementById('workMusicCloseSettingsBtn');
  const workMusicRemote = document.getElementById('workMusicRemote');
  const workMusicRemoteInfo = document.getElementById('workMusicRemoteInfo');
  const workMusicRemoteThumb = document.getElementById('workMusicRemoteThumb');
  const workMusicRemoteTitle = document.getElementById('workMusicRemoteTitle');
  const workMusicRemoteArtist = document.getElementById('workMusicRemoteArtist');
  const workMusicRemotePrevBtn = document.getElementById('workMusicRemotePrevBtn');
  const workMusicRemotePlayBtn = document.getElementById('workMusicRemotePlayBtn');
  const workMusicRemoteNextBtn = document.getElementById('workMusicRemoteNextBtn');
  const workMusicRemotePrevPreviewThumb = document.getElementById(
    'workMusicRemotePrevPreviewThumb'
  );
  const workMusicRemotePrevPreviewTitle = document.getElementById(
    'workMusicRemotePrevPreviewTitle'
  );
  const workMusicRemotePrevPreviewArtist = document.getElementById(
    'workMusicRemotePrevPreviewArtist'
  );
  const workMusicRemoteNextPreviewThumb = document.getElementById(
    'workMusicRemoteNextPreviewThumb'
  );
  const workMusicRemoteNextPreviewTitle = document.getElementById(
    'workMusicRemoteNextPreviewTitle'
  );
  const workMusicRemoteNextPreviewArtist = document.getElementById(
    'workMusicRemoteNextPreviewArtist'
  );
  const workMusicRemoteModeBtn = document.getElementById('workMusicRemoteModeBtn');
  const workMusicRemoteSeamlessBtn = document.getElementById('workMusicRemoteSeamlessBtn');
  const workMusicRemoteMuteBtn = document.getElementById('workMusicRemoteMuteBtn');
  const workMusicRemoteVolumeControl = workMusicRemoteMuteBtn?.closest('.slider-control');
  const workMusicRemoteVolumeRange = document.getElementById('workMusicRemoteVolumeRange');
  const workMusicRemoteVolumePercent = document.getElementById('workMusicRemoteVolumePercent');
  const workMusicRemoteVolumeBadge = document.getElementById('workMusicRemoteVolumeBadge');
  let workMusicSyncTimer = null;
  let workMusicProgressDisplayTimer = null;
  let workMusicFlowAnimationTimer = null;
  let workMusicFlowRenderedKeys = [];
  let workMusicFlowPendingSongs = null;
  let workMusicFlowDirectionHint = '';
  let workMusicPlaybackWatchTimer = null;
  let workMusicAutoSkipSession = null;
  let workMusicPendingStartSeconds = null;
  window.workMusicCurrentPlayOrder = [];
  const tabsController = createWorkMusicTabsController({
    engine,
    render: () => window.renderWorkMusicAll?.(),
    save: () => window.cloudSaveWorkMusic?.()
  });
  host.__workMusicTabsControllerCompatibility = tabsController;

  const showFeedbackMessage = (message) => window.showFeedbackMessage?.(message);
  const showAlert = (message) => window.showAlert?.(message);
  const WORK_MUSIC_FAILURE_SKIP_DELAY_MS = 1200;
  const WORK_MUSIC_EMPTY_THUMB_SRC =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const fetchYoutubeResponse = (url, options = { cache: 'no-store' }) =>
    youtubePort?.fetchResponse(url, options) || fetch(url, options);
  const metadataController = createWorkMusicMetadataController({
    apiKey: YOUTUBE_API_KEY,
    root,
    youtubePort
  });
  const playlistController = createWorkMusicPlaylistController({
    cleanArtist: cleanYoutubeArtistName,
    fetchProxyText: fetchTextThroughProxies,
    metadataController,
    parseFeed: parsePlaylistFeedXml,
    parseHtml: parsePlaylistFromHtml
  });
  let playbackController = null;
  const getWorkMusicRuntimePlayer = () => playbackController?.getPlayer?.() || null;
  let seamlessController = null;
  let listController = null;
  let analysisController = null;
  let analysisView = null;
  let autoAnalysis = null;

  // ===== 노동요(YouTube) =====
  // 일반 embed iframe + YouTube postMessage 제어. 재생/일시정지는 iframe을 다시 만들지 않고 명령만 보냅니다.
  function normalizeWorkMusicSeamlessSeconds(value) {
    return Math.max(0, Math.min(20, Math.round(Number(value || 0))));
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  function bindSliderControlHoverState(control) {
    if (!control) return;
    const popover = control.querySelector('.slider-popover');
    if (!popover) return;

    let closeTimer = null;
    const open = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      control.classList.add('is-open');
    };
    const close = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (
          !control.matches(':hover') &&
          !control.matches(':focus-within') &&
          !popover.matches(':hover')
        ) {
          control.classList.remove('is-open');
        }
      }, 50);
    };

    control.addEventListener('mouseenter', open);
    control.addEventListener('mouseleave', close);
    control.addEventListener('focusin', open);
    control.addEventListener('focusout', close);
    popover.addEventListener('mouseenter', open);
    popover.addEventListener('mouseleave', close);
  }

  const workMusicPlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
  const workMusicPauseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`;
  const workMusicPlaylistMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h12"/><path d="M3 12h10"/><path d="M3 18h8"/><path d="M17 10v8"/><path d="M13 14h8"/></svg>`;
  const workMusicSettingsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h8"/><path d="M16 7h4"/><circle cx="14" cy="7" r="2"/><path d="M4 17h4"/><path d="M12 17h8"/><circle cx="10" cy="17" r="2"/></svg>`;
  const workMusicVolumeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
  const workMusicMutedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>`;

  function ensureWorkMusicDefaultTabs() {
    const fallback = [{ id: 'default', name: '기본', order: 0 }];
    if (!Array.isArray(window.__workMusicTabList) || window.__workMusicTabList.length === 0) {
      window.__workMusicTabList = fallback;
    }
    if (
      !window.__workMusicTabList.some((t) => t.id === (window.__workMusicActiveTabId || 'default'))
    ) {
      window.__workMusicActiveTabId = window.__workMusicTabList[0]?.id || 'default';
    }
    return window.__workMusicTabList;
  }

  async function persistWorkMusicDefaultTabsIfNeeded() {
    ensureWorkMusicDefaultTabs();
    if (!window.ensureLogin || !window.ensureLogin()) return;
    try {
      await window.cloudEnsureWorkMusicDefaultTab?.();
    } catch (err) {
      console.warn('work music default tab init failed', err);
    }
  }

  function getWorkMusicTabs() {
    const tabs = ensureWorkMusicDefaultTabs();
    return [...tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  function getActiveWorkMusicTabId() {
    const tabs = getWorkMusicTabs();
    if (!tabs.some((t) => t.id === window.__workMusicActiveTabId))
      window.__workMusicActiveTabId = tabs[0]?.id || 'default';
    return window.__workMusicActiveTabId || 'default';
  }
  function getActiveWorkMusicSongs() {
    const activeTabId = getActiveWorkMusicTabId();
    return (window.workMusicSongs || []).filter(
      (s) => (s.workMusicTabId || 'default') === activeTabId
    );
  }
  function getWorkMusicTabPlaylistId(tabId) {
    const tab = getWorkMusicTabs().find((t) => t.id === tabId);
    if (tab?.sourcePlaylistId) return tab.sourcePlaylistId;
    const found = (window.workMusicSongs || []).find(
      (s) => (s.workMusicTabId || 'default') === tabId && s.sourcePlaylistId
    );
    return found?.sourcePlaylistId || '';
  }
  function normalizeWorkMusicCurrentIndex(songs = getActiveWorkMusicSongs()) {
    if (!songs.length) {
      window.workMusicCurrentIndex = 0;
      return 0;
    }
    let idx = Number(window.workMusicCurrentIndex || 0);
    if (idx < 0 || idx >= songs.length) idx = 0;
    window.workMusicCurrentIndex = idx;
    return idx;
  }

  function renderWorkMusicPlayButton() {
    if (workMusicPlayBtn) {
      workMusicPlayBtn.innerHTML = window.workMusicIsPlaying ? workMusicPauseSvg : workMusicPlaySvg;
      workMusicPlayBtn.title = window.workMusicIsPlaying ? '일시정지' : '재생';
      workMusicPlayBtn.setAttribute('aria-label', window.workMusicIsPlaying ? '일시정지' : '재생');
    }
    if (workMusicRemotePlayBtn) {
      workMusicRemotePlayBtn.innerHTML = window.workMusicIsPlaying
        ? workMusicPauseSvg
        : workMusicPlaySvg;
      workMusicRemotePlayBtn.title = window.workMusicIsPlaying ? '일시정지' : '재생';
      workMusicRemotePlayBtn.setAttribute(
        'aria-label',
        window.workMusicIsPlaying ? '일시정지' : '재생'
      );
    }
  }

  function renderWorkMusicListPlaybackState() {
    if (!workMusicList) return;
    const currentIndex = Number(window.workMusicCurrentIndex || 0);
    workMusicList.querySelectorAll('.workmusic-item[data-index]').forEach((row) => {
      const isActive = Number(row.dataset.index) === currentIndex;
      row.classList.toggle('active', isActive);
      const overlay = row.querySelector('.workmusic-play-overlay');
      if (overlay) {
        overlay.innerHTML =
          isActive && window.workMusicIsPlaying ? workMusicPauseSvg : workMusicPlaySvg;
      }
    });
  }

  function renderWorkMusicPlaybackState() {
    renderWorkMusicPlayButton();
    updateWorkMusicRemoteUI();
    renderWorkMusicPlayerView();
    renderWorkMusicListPlaybackState();
  }

  function renderWorkMusicSeamlessButton() {
    const state = engine.getSnapshot();
    const label = state.seamlessEnabled ? (state.djVerseMode ? 'DJ 1절' : 'DJ') : 'DJ 꺼짐';
    for (const button of [workMusicSeamlessBtn, workMusicRemoteSeamlessBtn]) {
      if (!button) continue;
      button.classList.toggle('enabled', state.seamlessEnabled);
      button.setAttribute('aria-pressed', String(state.seamlessEnabled));
      button.setAttribute('aria-label', label);
      button.title = label;
      const text = button.querySelector('.workmusic-dj-button-label');
      if (text) text.textContent = state.djVerseMode && state.seamlessEnabled ? 'DJ 1절' : 'DJ';
    }
  }

  function updateWorkMusicRemoteUI() {
    if (!workMusicRemote) return;
    workMusicRemote.classList.add('show');
    renderWorkMusicTrackPreviews();
    const songs = getActiveWorkMusicSongs();
    if (!songs.length) {
      if (workMusicRemoteThumb) {
        workMusicRemoteThumb.src = WORK_MUSIC_EMPTY_THUMB_SRC;
        workMusicRemoteThumb.classList.add('is-missing');
      }
      if (workMusicRemoteTitle) workMusicRemoteTitle.textContent = '재생 중인 노동요 없음';
      if (workMusicRemoteArtist) workMusicRemoteArtist.textContent = '';
      renderWorkMusicPlayButton();
      renderWorkMusicVolumeUI();
      return;
    }
    normalizeWorkMusicCurrentIndex(songs);
    const song = songs[Number(window.workMusicCurrentIndex || 0)] || songs[0];
    if (!song) {
      if (workMusicRemoteThumb) {
        workMusicRemoteThumb.src = WORK_MUSIC_EMPTY_THUMB_SRC;
        workMusicRemoteThumb.classList.add('is-missing');
      }
      if (workMusicRemoteTitle) workMusicRemoteTitle.textContent = '재생 중인 노동요 없음';
      if (workMusicRemoteArtist) workMusicRemoteArtist.textContent = '';
      renderWorkMusicPlayButton();
      renderWorkMusicVolumeUI();
      return;
    }
    const title = song.title || `YouTube ${song.videoId || ''}`;
    const artist = getSongArtist(song) || song.channelTitle || '';
    const thumb =
      song.thumbnail ||
      (song.videoId ? `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg` : '');
    workMusicRemote.classList.add('show');
    if (workMusicRemoteTitle) workMusicRemoteTitle.textContent = title;
    if (workMusicRemoteArtist)
      workMusicRemoteArtist.textContent =
        artist || (window.workMusicIsPlaying ? '재생 중' : '일시정지');
    if (workMusicRemoteThumb) {
      if (thumb) {
        if (workMusicRemoteThumb.classList) workMusicRemoteThumb.classList.remove('is-missing');
        if (workMusicRemoteThumb.src !== thumb) workMusicRemoteThumb.src = thumb;
      } else {
        workMusicRemoteThumb.src = WORK_MUSIC_EMPTY_THUMB_SRC;
        workMusicRemoteThumb.classList.add('is-missing');
      }
    }
    renderWorkMusicPlayButton();
    renderWorkMusicVolumeUI();
  }

  function extractYoutubeVideoId(url) {
    if (!url) return null;
    const text = String(url).trim();
    try {
      const u = new URL(text.includes('://') ? text : 'https://' + text);
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'youtu.be') return (u.pathname.split('/').filter(Boolean)[0] || '').slice(0, 11);
      if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
        const parts = u.pathname.split('/').filter(Boolean);
        const keys = ['embed', 'shorts', 'live'];
        if (keys.includes(parts[0]) && parts[1]) return parts[1].slice(0, 11);
      }
    } catch (_) {
      /* 정규식 fallback */
    }
    const m = text.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function normalizeYoutubeUrl(url) {
    const id = extractYoutubeVideoId(url);
    return id ? `https://www.youtube.com/watch?v=${id}` : String(url || '').trim();
  }

  function looksAutoTitle(song) {
    const t = String(song?.title || '').trim();
    return (
      !!song?.autoTitle ||
      !t ||
      t === `YouTube ${song?.videoId}` ||
      t === '제목 불러오기 실패' ||
      /^YouTube [A-Za-z0-9_-]{11}$/.test(t)
    );
  }

  async function fetchYoutubeVideosMeta(videoIds) {
    return metadataController.fetchVideos(videoIds);
  }

  function formatWorkMusicDuration(seconds) {
    const n = Math.floor(Number(seconds || 0));
    if (!Number.isFinite(n) || n <= 0) return '';
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const sec = n % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function parseDurationTextToSeconds(text) {
    const parts = String(text || '')
      .trim()
      .split(':')
      .map((v) => Number(v));
    if (!parts.length || parts.some((v) => !Number.isFinite(v))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  async function fetchYoutubeDuration(videoIdOrUrl) {
    return metadataController.fetchDuration(videoIdOrUrl);
  }

  async function fetchYoutubeTitle(url) {
    return metadataController.fetchTitle(url);
  }

  async function fillMissingWorkMusicTitles() {
    const songs = window.workMusicSongs || [];
    const targets = songs.filter(looksAutoTitle);
    if (!targets.length) return;
    let changed = false;
    for (const song of targets) {
      const title = await fetchYoutubeTitle(
        song.url || `https://www.youtube.com/watch?v=${song.videoId}`
      );
      if (title) {
        await listController.update(song.id, { title, autoTitle: false });
        changed = true;
      }
    }
    if (changed) renderWorkMusic();
  }

  async function fillMissingWorkMusicDurations() {
    const songs = window.workMusicSongs || [];
    const targets = songs.filter((s) => s?.videoId && !s.durationSeconds);
    if (!targets.length) return;
    let changed = false;
    for (const song of targets.slice(0, 25)) {
      const seconds = await fetchYoutubeDuration(song.videoId);
      if (seconds) {
        await listController.update(song.id, { durationSeconds: seconds });
        changed = true;
      }
    }
    if (changed) renderWorkMusic();
  }

  function rememberWorkMusicDuration(index, seconds) {
    const songs = getActiveWorkMusicSongs();
    const song = songs[index];
    const n = Math.floor(Number(seconds || 0));
    if (!song || !n || song.durationSeconds) return;
    listController.update(song.id, { durationSeconds: n });
  }

  function getWorkMusicAdjacentIndex(step = 1, songs = getActiveWorkMusicSongs()) {
    if (!songs.length) return -1;
    const cur = Math.max(0, Number(window.workMusicCurrentIndex || 0));
    const order = getWorkMusicDisplayOrder(songs);
    const currentPosition = Math.max(0, order.indexOf(cur));
    return order[(currentPosition + step + order.length) % order.length];
  }

  function getWorkMusicPreviewIndex(step = 1, songs = getActiveWorkMusicSongs()) {
    return getWorkMusicAdjacentIndex(step, songs);
  }

  function renderWorkMusicTrackPreview(step, { thumbEl, titleEl, artistEl, fallbackTitle }) {
    if (!titleEl) return;
    const songs = getActiveWorkMusicSongs();
    const index = getWorkMusicPreviewIndex(step, songs);
    const song = songs[index];
    if (!song) {
      if (thumbEl) {
        thumbEl.src = WORK_MUSIC_EMPTY_THUMB_SRC;
        thumbEl.classList.add('is-missing');
      }
      titleEl.textContent = fallbackTitle;
      if (artistEl) artistEl.textContent = '';
      return;
    }
    const thumb =
      song.thumbnail ||
      (song.videoId ? `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg` : '');
    if (thumbEl) {
      if (thumb) {
        thumbEl.classList.remove('is-missing');
        if (thumbEl.src !== thumb) thumbEl.src = thumb;
      } else {
        thumbEl.src = WORK_MUSIC_EMPTY_THUMB_SRC;
        thumbEl.classList.add('is-missing');
      }
    }
    titleEl.textContent = song.title || `YouTube ${song.videoId || ''}`;
    if (artistEl) artistEl.textContent = getSongArtist(song) || song.channelTitle || '';
  }

  function renderWorkMusicTrackPreviews() {
    renderWorkMusicTrackPreview(-1, {
      thumbEl: workMusicPrevPreviewThumb,
      titleEl: workMusicPrevPreviewTitle,
      artistEl: workMusicPrevPreviewArtist,
      fallbackTitle: '이전 곡 없음'
    });
    renderWorkMusicTrackPreview(-1, {
      thumbEl: workMusicRemotePrevPreviewThumb,
      titleEl: workMusicRemotePrevPreviewTitle,
      artistEl: workMusicRemotePrevPreviewArtist,
      fallbackTitle: '이전 곡 없음'
    });
    renderWorkMusicTrackPreview(1, {
      thumbEl: workMusicNextPreviewThumb,
      titleEl: workMusicNextPreviewTitle,
      artistEl: workMusicNextPreviewArtist,
      fallbackTitle: '다음 곡 없음'
    });
    renderWorkMusicTrackPreview(1, {
      thumbEl: workMusicRemoteNextPreviewThumb,
      titleEl: workMusicRemoteNextPreviewTitle,
      artistEl: workMusicRemoteNextPreviewArtist,
      fallbackTitle: '다음 곡 없음'
    });
  }

  function getWorkMusicFlowCover(song) {
    return (
      song?.thumbnail ||
      (song?.videoId ? `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg` : '')
    );
  }

  function renderWorkMusicFlowCover(image, song) {
    if (!image) return;
    const source = getWorkMusicFlowCover(song);
    const cover = image.closest('.workmusic-flow-cover');
    cover?.classList.toggle('is-empty', !source);
    if (source) {
      if (image.src !== source) image.src = source;
    } else {
      image.removeAttribute('src');
    }
  }

  function getWorkMusicFlowSongKey(song) {
    return String(song?.id || song?.videoId || '');
  }

  function getWorkMusicFlowSongs(songs) {
    if (!songs.length) return [null, null, null, null, null];
    const atOffset = (offset) => {
      if (offset === 0) return songs[Number(window.workMusicCurrentIndex || 0)] || null;
      return songs.length > Math.abs(offset)
        ? songs[getWorkMusicPreviewIndex(offset, songs)] || null
        : null;
    };
    return [-2, -1, 0, 1, 2].map(atOffset);
  }

  function applyWorkMusicFlowSongs(flowSongs) {
    [
      workMusicFlowPrevTwo,
      workMusicFlowPrev,
      workMusicFlowCurrent,
      workMusicFlowNext,
      workMusicFlowNextTwo
    ].forEach((image, index) => renderWorkMusicFlowCover(image, flowSongs[index]));
  }

  function finishWorkMusicFlowAnimation() {
    if (!workMusicCoverFlow || !workMusicFlowPendingSongs) return;
    clearTimeout(workMusicFlowAnimationTimer);
    workMusicFlowAnimationTimer = null;
    workMusicCoverFlow.classList.add('is-resetting');
    applyWorkMusicFlowSongs(workMusicFlowPendingSongs);
    workMusicFlowPendingSongs = null;
    workMusicCoverFlow.classList.remove('is-sliding-next', 'is-sliding-previous');
    void workMusicCoverFlow.offsetWidth;
    workMusicCoverFlow.classList.remove('is-resetting');
  }

  function renderWorkMusicFlow(flowSongs) {
    const nextKeys = flowSongs.map(getWorkMusicFlowSongKey);
    if (!workMusicFlowRenderedKeys.length || !workMusicCoverFlow) {
      applyWorkMusicFlowSongs(flowSongs);
      workMusicFlowRenderedKeys = nextKeys;
      return;
    }
    if (nextKeys.every((key, index) => key === workMusicFlowRenderedKeys[index])) return;
    if (nextKeys[2] === workMusicFlowRenderedKeys[2]) {
      applyWorkMusicFlowSongs(flowSongs);
      workMusicFlowRenderedKeys = nextKeys;
      return;
    }
    if (workMusicFlowAnimationTimer) finishWorkMusicFlowAnimation();
    const direction =
      workMusicFlowDirectionHint ||
      (nextKeys[2] && nextKeys[2] === workMusicFlowRenderedKeys[3]
        ? 'next'
        : nextKeys[2] && nextKeys[2] === workMusicFlowRenderedKeys[1]
          ? 'previous'
          : '');
    workMusicFlowDirectionHint = '';
    workMusicFlowRenderedKeys = nextKeys;
    if (!direction) {
      applyWorkMusicFlowSongs(flowSongs);
      return;
    }
    workMusicFlowPendingSongs = flowSongs;
    workMusicCoverFlow.classList.remove('is-sliding-next', 'is-sliding-previous');
    void workMusicCoverFlow.offsetWidth;
    workMusicCoverFlow.classList.add(
      direction === 'next' ? 'is-sliding-next' : 'is-sliding-previous'
    );
    workMusicFlowAnimationTimer = setTimeout(finishWorkMusicFlowAnimation, 440);
  }

  function renderWorkMusicProgress() {
    const songs = getActiveWorkMusicSongs();
    const song = songs[Number(window.workMusicCurrentIndex || 0)];
    let elapsed = 0;
    let playerDuration = 0;
    let playerVideoId = '';
    try {
      elapsed = Number(getWorkMusicRuntimePlayer()?.getCurrentTime?.() || 0);
      playerDuration = Number(getWorkMusicRuntimePlayer()?.getDuration?.() || 0);
      playerVideoId = getWorkMusicPlaybackVideoId(getWorkMusicRuntimePlayer());
    } catch (_) {
      elapsed = 0;
      playerDuration = 0;
    }
    if (playerVideoId && song?.videoId && playerVideoId !== song.videoId) {
      elapsed = 0;
      playerDuration = 0;
    }
    const duration = Math.max(0, playerDuration || Number(song?.durationSeconds || 0));
    const current = Math.max(0, Math.min(elapsed, duration || elapsed));
    analysisView?.renderPlayback({ videoId: playerVideoId, currentTime: current, duration });
    if (workMusicElapsedTime)
      workMusicElapsedTime.textContent = formatWorkMusicDuration(current) || '0:00';
    if (workMusicDurationTime)
      workMusicDurationTime.textContent = formatWorkMusicDuration(duration) || '0:00';
    if (workMusicSeekRange) {
      workMusicSeekRange.disabled = !getWorkMusicRuntimePlayer() || duration <= 0;
    }
    if ((!getWorkMusicRuntimePlayer() || duration <= 0) && workMusicSeekHover) {
      workMusicSeekHover.hidden = true;
    }
  }

  function updateWorkMusicSeekHover(event) {
    if (!workMusicSeekRange || !workMusicSeekHover || !workMusicSeekHoverTime) return;
    if (workMusicSeekRange.disabled) {
      workMusicSeekHover.hidden = true;
      return;
    }
    const rect = workMusicSeekRange.getBoundingClientRect();
    if (!rect.width) return;
    const percent = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const songs = getActiveWorkMusicSongs();
    const song = songs[Number(window.workMusicCurrentIndex || 0)];
    let duration = 0;
    try {
      duration = Number(getWorkMusicRuntimePlayer()?.getDuration?.() || song?.durationSeconds || 0);
    } catch (_) {
      duration = Number(song?.durationSeconds || 0);
    }
    if (duration <= 0) {
      workMusicSeekHover.hidden = true;
      return;
    }
    workMusicSeekHover.style.setProperty('--seek-hover', `${percent}%`);
    workMusicSeekHoverTime.textContent =
      formatWorkMusicDuration((duration * percent) / 100) || '0:00';
    workMusicSeekHover.hidden = false;
  }

  function hideWorkMusicSeekHover() {
    if (workMusicSeekHover) workMusicSeekHover.hidden = true;
  }

  function renderWorkMusicPlayerView() {
    const songs = getActiveWorkMusicSongs();
    const currentIndex = normalizeWorkMusicCurrentIndex(songs);
    const song = songs[currentIndex];
    void analysisController?.selectSong(song);
    autoAnalysis?.sync(songs);
    renderWorkMusicFlow(getWorkMusicFlowSongs(songs));
    if (workMusicNowTitle) {
      workMusicNowTitle.textContent = song
        ? song.title || `YouTube ${song.videoId || ''}`
        : '재생할 곡 없음';
    }
    const artist = song ? getSongArtist(song) || song.channelTitle || '' : '';
    if (workMusicNowArtist) {
      workMusicNowArtist.textContent = artist;
      workMusicNowArtist.hidden = !artist;
    }
    renderWorkMusicProgress();
  }

  function getWorkMusicPlayOrder(startIndex) {
    const songs = getActiveWorkMusicSongs();
    if (!songs.length) return [];
    const baseOrder = getWorkMusicDisplayOrder(songs);
    const startPosition = baseOrder.indexOf(startIndex);
    if (startPosition < 0) return baseOrder;
    return [...baseOrder.slice(startPosition), ...baseOrder.slice(0, startPosition)];
  }

  function applyWorkMusicPendingStartSeconds(player) {
    const seconds = Number(workMusicPendingStartSeconds);
    workMusicPendingStartSeconds = null;
    if (!player || !Number.isFinite(seconds) || seconds <= 0) return;
    try {
      player.seekTo(seconds, true);
    } catch (err) {
      console.warn('work music shuffle seek restore failed', err);
    }
  }

  function getWorkMusicSongKey(song, index) {
    const activeTabId = song?.workMusicTabId || getActiveWorkMusicTabId();
    return String(song?.id || `${activeTabId}:${song?.videoId || index}`);
  }

  function clearWorkMusicPlaybackWatch() {
    clearTimeout(workMusicPlaybackWatchTimer);
    workMusicPlaybackWatchTimer = null;
  }

  function resetWorkMusicAutoSkipSession() {
    workMusicAutoSkipSession = null;
  }

  function _getNextWorkMusicIndexAfterFailure(failedIndex) {
    const songs = getActiveWorkMusicSongs();
    if (songs.length <= 1) return -1;
    const activeTabId = getActiveWorkMusicTabId();
    if (!workMusicAutoSkipSession || workMusicAutoSkipSession.tabId !== activeTabId) {
      workMusicAutoSkipSession = { tabId: activeTabId, triedKeys: new Set() };
    }
    const failedSong = songs[failedIndex];
    if (failedSong) {
      workMusicAutoSkipSession.triedKeys.add(getWorkMusicSongKey(failedSong, failedIndex));
    }

    const rawOrder = window.workMusicCurrentPlayOrder?.length
      ? window.workMusicCurrentPlayOrder
      : getWorkMusicPlayOrder(failedIndex);
    const order = rawOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < songs.length);
    const start = Math.max(0, order.indexOf(failedIndex));
    for (let offset = 1; offset <= order.length; offset += 1) {
      const idx = order[(start + offset) % order.length];
      const song = songs[idx];
      if (!song) continue;
      const songKey = getWorkMusicSongKey(song, idx);
      if (workMusicAutoSkipSession.triedKeys.has(songKey)) continue;
      if (song.playbackStatus === 'error') continue;
      return idx;
    }
    return -1;
  }

  function getWorkMusicDisplayOrder(songs) {
    const count = songs.length;
    if (!count) return [];
    if (window.workMusicMode !== 'random') return songs.map((_, i) => i);
    const activeTabId = getActiveWorkMusicTabId();
    const idsKey = songs.map((s) => s.id || s.videoId || '').join('|');
    const cache = window.__workMusicDisplayShuffle || {};
    const cached = cache[activeTabId];
    if (
      cached &&
      cached.idsKey === idsKey &&
      Array.isArray(cached.order) &&
      cached.order.length === count
    ) {
      return cached.order.filter((i) => i >= 0 && i < count);
    }
    const pinnedIndex = window.workMusicIsPlaying ? Number(window.workMusicCurrentIndex || 0) : -1;
    return createWorkMusicDisplayShuffle(songs, pinnedIndex);
  }

  function createWorkMusicDisplayShuffle(songs, pinnedIndex = -1) {
    const indexes = songs.map((_, index) => index);
    const hasPinnedIndex = Number.isInteger(pinnedIndex) && indexes.includes(pinnedIndex);
    const shuffled = hasPinnedIndex ? indexes.filter((index) => index !== pinnedIndex) : indexes;
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const order = hasPinnedIndex ? [pinnedIndex, ...shuffled] : shuffled;
    const activeTabId = getActiveWorkMusicTabId();
    const idsKey = songs.map((song) => song.id || song.videoId || '').join('|');
    const cache = window.__workMusicDisplayShuffle || {};
    window.__workMusicDisplayShuffle = { ...cache, [activeTabId]: { idsKey, order } };
    return order;
  }

  function getWorkMusicInitialIndex(songs = getActiveWorkMusicSongs()) {
    if (!songs.length) return 0;
    return normalizeWorkMusicCurrentIndex(songs);
  }

  function resetWorkMusicDisplayShuffle(tabId = getActiveWorkMusicTabId()) {
    window.__workMusicDisplayShuffle = window.__workMusicDisplayShuffle || {};
    delete window.__workMusicDisplayShuffle[tabId];
  }

  function renderWorkMusicVolumeUI() {
    const raw = Math.max(0, Math.min(100, Number(window.workMusicVolume ?? 80)));
    const muted = !!window.workMusicIsMuted || raw === 0;
    const display = muted ? 0 : raw;
    if (workMusicVolumeRange) workMusicVolumeRange.value = String(display);
    if (workMusicVolumePercent) workMusicVolumePercent.textContent = String(display);
    if (workMusicVolumeBadge) workMusicVolumeBadge.textContent = String(display);
    if (workMusicRemoteVolumeRange) workMusicRemoteVolumeRange.value = String(display);
    if (workMusicRemoteVolumePercent) workMusicRemoteVolumePercent.textContent = String(display);
    if (workMusicRemoteVolumeBadge) workMusicRemoteVolumeBadge.textContent = String(display);
    if (workMusicMuteBtn) {
      workMusicMuteBtn.innerHTML = muted ? workMusicMutedSvg : workMusicVolumeSvg;
      workMusicMuteBtn.title = muted ? '음소거 해제' : '음소거';
      workMusicMuteBtn.setAttribute('aria-label', muted ? '음소거 해제' : '음소거');
    }
    if (workMusicRemoteMuteBtn) {
      workMusicRemoteMuteBtn.innerHTML = muted ? workMusicMutedSvg : workMusicVolumeSvg;
      workMusicRemoteMuteBtn.title = muted ? '음소거 해제' : '음소거';
      workMusicRemoteMuteBtn.setAttribute('aria-label', muted ? '음소거 해제' : '음소거');
    }
  }

  function syncWorkMusicFromPlayer() {
    try {
      if (
        !getWorkMusicRuntimePlayer() ||
        typeof getWorkMusicRuntimePlayer().getPlaylistIndex !== 'function'
      )
        return;
      const ytIndex = Number(getWorkMusicRuntimePlayer().getPlaylistIndex());
      const order = window.workMusicCurrentPlayOrder || [];
      const mapped = Number.isFinite(ytIndex) ? order[ytIndex] : undefined;
      const songs = getActiveWorkMusicSongs();
      if (
        Number.isInteger(mapped) &&
        mapped >= 0 &&
        mapped < songs.length &&
        mapped !== Number(window.workMusicCurrentIndex || 0)
      ) {
        window.workMusicCurrentIndex = mapped;
        renderWorkMusic();
      }
      if (
        Number.isInteger(Number(window.workMusicCurrentIndex)) &&
        typeof getWorkMusicRuntimePlayer().getDuration === 'function'
      ) {
        const seconds = getWorkMusicRuntimePlayer().getDuration();
        rememberWorkMusicDuration(Number(window.workMusicCurrentIndex || 0), seconds);
      }
    } catch (err) {
      console.warn('work music sync failed', err);
    }
  }

  function startWorkMusicSyncTimer() {
    clearInterval(workMusicSyncTimer);
    workMusicSyncTimer = setInterval(syncWorkMusicFromPlayer, 900);
  }

  function stopWorkMusicSyncTimer() {
    clearInterval(workMusicSyncTimer);
    workMusicSyncTimer = null;
  }

  function onWorkMusicPlayerStateChange(event) {
    const state = event?.data;
    if (window.YT && state === window.YT.PlayerState.PLAYING) {
      clearWorkMusicPlaybackWatch();
      resetWorkMusicAutoSkipSession();
      window.workMusicIsPlaying = true;
      syncWorkMusicFromPlayer();
      renderWorkMusicPlaybackState();
      startWorkMusicSyncTimer();
    } else if (
      window.YT &&
      (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED)
    ) {
      clearWorkMusicPlaybackWatch();
      window.workMusicIsPlaying = false;
      renderWorkMusicPlaybackState();
      if (state === window.YT.PlayerState.PAUSED) stopWorkMusicSyncTimer();
    }
  }

  function renderWorkMusic() {
    const songs = getActiveWorkMusicSongs();
    normalizeWorkMusicCurrentIndex(songs);
    if (workMusicModeBtn) {
      workMusicModeBtn.classList.toggle('random', window.workMusicMode === 'random');
      workMusicModeBtn.title =
        window.workMusicMode === 'random' ? '목록 셔플 켜짐' : '기본 순서로 표시 중';
    }
    if (workMusicRemoteModeBtn) {
      workMusicRemoteModeBtn.classList.toggle('random', window.workMusicMode === 'random');
      workMusicRemoteModeBtn.title =
        window.workMusicMode === 'random' ? '목록 셔플 켜짐' : '기본 순서로 표시 중';
      workMusicRemoteModeBtn.setAttribute(
        'aria-label',
        window.workMusicMode === 'random' ? '목록 셔플 켜짐' : '기본 순서로 표시 중'
      );
    }
    renderWorkMusicPlayButton();
    renderWorkMusicSeamlessButton();
    renderWorkMusicVolumeUI();
    updateWorkMusicRemoteUI();
    if (!songs.length) {
      renderWorkMusicPlayerView();
    }
    if (!workMusicList) {
      renderWorkMusicPlayerView();
      return;
    }
    workMusicList.innerHTML = '';
    const activeTabForList = getWorkMusicTabs().find((t) => t.id === getActiveWorkMusicTabId());
    function isWorkMusicAudioCard(song) {
      const typeText = String(song?.sourceType || activeTabForList?.sourceType || '').toLowerCase();
      const rawArtist = String(song?.artist || song?.channelTitle || song?.ownerChannelTitle || '');
      const rawTitle = String(song?.title || '');
      // 예전 버전에서 가져온 유튜브뮤직 곡은 sourceType이 저장되지 않았을 수 있어서
      // "OOO - Topic" 채널명도 음악 카드로 판정합니다.
      return (
        typeText.includes('music') ||
        /-\s*topic$/i.test(rawArtist) ||
        /provided to youtube by/i.test(rawTitle)
      );
    }
    const allAudioCards = songs.length > 0 && songs.every(isWorkMusicAudioCard);
    workMusicList.classList.toggle('music-compact-list', allAudioCards);
    const displayOrder = getWorkMusicDisplayOrder(songs);
    renderWorkMusicPlayerView();
    renderWorkMusicTrackPreviews();
    displayOrder.forEach((idx) => {
      const song = songs[idx];
      if (!song) return;
      const row = document.createElement('div');
      const isActive = idx === (window.workMusicCurrentIndex || 0);
      const isMusicTrack = isWorkMusicAudioCard(song);
      const hasPlaybackError = song.playbackStatus === 'error';
      row.className = [
        'workmusic-item',
        isMusicTrack ? 'music-track' : '',
        isActive ? 'active' : '',
        hasPlaybackError ? 'playback-error' : ''
      ]
        .filter(Boolean)
        .join(' ');
      row.dataset.index = String(idx);
      const title = song.title || `YouTube ${song.videoId}`;
      const artist = getSongArtist(song);
      const durationText = song.durationText || formatWorkMusicDuration(song.durationSeconds);
      const thumbSrc =
        song.thumbnail || `https://img.youtube.com/vi/${escapeHtml(song.videoId)}/mqdefault.jpg`;
      const playbackErrorReason = song.playbackErrorReason || '재생 실패';
      const rowTitle = artist ? `${title} - ${artist}` : title;
      row.setAttribute(
        'title',
        hasPlaybackError ? `${rowTitle} (${playbackErrorReason})` : rowTitle
      );
      const playbackErrorBadge = hasPlaybackError
        ? `<div class="workmusic-error-badge" title="${escapeHtml(playbackErrorReason)}">재생 실패</div>`
        : '';
      if (isMusicTrack) {
        row.innerHTML = `
            <img class="workmusic-thumb" src="${escapeHtml(thumbSrc)}" alt="앨범커버" onerror="this.onerror=null;this.src='https://placehold.co/100x100/333/fff?text=♪'">
            <div class="workmusic-play-overlay">
              ${isActive && window.workMusicIsPlaying ? workMusicPauseSvg : workMusicPlaySvg}
            </div>
            <div class="workmusic-music-info">
              <div class="workmusic-music-title">${escapeHtml(title)}</div>
              <div class="workmusic-music-artist">${escapeHtml(artist || 'YouTube Music')}</div>
            </div>
            ${playbackErrorBadge}
            ${durationText ? `<div class="workmusic-duration-badge">${escapeHtml(durationText)}</div>` : ''}
            <div class="workmusic-actions">
              <button class="workmusic-small-btn" data-action="settings" data-index="${idx}" title="설정" aria-label="설정">
                ${workMusicSettingsSvg}
              </button>
            </div>`;
      } else {
        row.innerHTML = `
            <img class="workmusic-thumb" src="${escapeHtml(thumbSrc)}" alt="썸네일" onerror="this.onerror=null;this.src='https://placehold.co/320x180/333/fff?text=YouTube'">
            <div class="workmusic-play-overlay">
              ${isActive && window.workMusicIsPlaying ? workMusicPauseSvg : workMusicPlaySvg}
            </div>
            <div class="workmusic-title-overlay">${escapeHtml(title)}</div>
            ${playbackErrorBadge}
            ${durationText ? `<div class="workmusic-duration-badge">${escapeHtml(durationText)}</div>` : ''}
            <div class="workmusic-actions">
              <button class="workmusic-small-btn" data-action="settings" data-index="${idx}" title="설정" aria-label="설정">
                ${workMusicSettingsSvg}
              </button>
            </div>`;
      }
      row.addEventListener('click', () => {
        if (isActive) playbackController.toggle();
        else playbackController.playAt(idx);
      });
      workMusicList.appendChild(row);
    });
    workMusicList.querySelectorAll('button[data-action="settings"]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openWorkMusicSettings(Number(e.currentTarget.dataset.index));
      };
    });
  }

  function openWorkMusicSettings(index) {
    const songs = getActiveWorkMusicSongs();
    const song = songs[index];
    if (!song) return;
    window.currentWorkMusicSettingIndex = index;
    if (workMusicTitleInput) workMusicTitleInput.value = song.title || '';
    if (workMusicSettingsModal) workMusicSettingsModal.style.display = 'flex';
    setTimeout(() => {
      workMusicTitleInput?.focus();
      workMusicTitleInput?.select();
    }, 50);
  }

  function closeWorkMusicSettings() {
    window.currentWorkMusicSettingIndex = null;
    if (workMusicSettingsModal) workMusicSettingsModal.style.display = 'none';
  }

  async function saveWorkMusicTitle() {
    if (!window.ensureLogin || !window.ensureLogin()) return;
    const idx = Number(window.currentWorkMusicSettingIndex);
    const songs = getActiveWorkMusicSongs();
    if (!songs[idx]) return;
    const nextTitle = (workMusicTitleInput?.value || '').trim() || `YouTube ${songs[idx].videoId}`;
    if (songs[idx].title === nextTitle && songs[idx].autoTitle === false) return;
    await listController.update(songs[idx].id, { title: nextTitle, autoTitle: false });
  }

  async function deleteCurrentWorkMusic() {
    if (confirm('이 영상을 삭제할까요?') !== true) return;
    if (!window.ensureLogin || !window.ensureLogin()) return;
    const idx = Number(window.currentWorkMusicSettingIndex);
    const songs = getActiveWorkMusicSongs();
    if (!songs[idx]) return;
    const deletingCurrent = idx === Number(window.workMusicCurrentIndex || 0);
    const deleteId = songs[idx].id;
    await listController.remove(deleteId);
    resetWorkMusicDisplayShuffle(getActiveWorkMusicTabId());
    const nextSongs = getActiveWorkMusicSongs();
    if (window.workMusicCurrentIndex >= nextSongs.length)
      window.workMusicCurrentIndex = Math.max(0, nextSongs.length - 1);
    if (deletingCurrent) window.workMusicIsPlaying = false;
    await window.cloudSaveWorkMusic?.();
    closeWorkMusicSettings();
    renderWorkMusic();
    playbackController.loadAt(window.workMusicCurrentIndex || 0, false);
    showFeedbackMessage('삭제했습니다.');
  }

  async function openCurrentWorkMusicOnYoutube() {
    await saveWorkMusicTitle();
    const idx = Number(window.currentWorkMusicSettingIndex);
    const song = getActiveWorkMusicSongs()[idx];
    const videoId = song?.videoId || extractYoutubeVideoId(song?.url);
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
    if (url) window.open(url, '_blank', 'noopener');
  }

  function extractYoutubePlaylistId(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    try {
      const u = new URL(text.includes('://') ? text : 'https://' + text);
      const list = u.searchParams.get('list');
      if (list && list.length >= 10) return list;
    } catch (_) {
      /* regex fallback */
    }
    const m =
      text.match(/[?&]list=([A-Za-z0-9_-]+)/) || text.match(/(?:playlist\?list=)([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function isYoutubeMusicUrl(raw) {
    try {
      const u = new URL(
        String(raw || '').includes('://') ? String(raw || '') : 'https://' + String(raw || '')
      );
      return u.hostname
        .replace(/^www\./, '')
        .toLowerCase()
        .includes('music.youtube.com');
    } catch (_) {
      return /music\.youtube\.com/i.test(String(raw || ''));
    }
  }

  function cleanYoutubeArtistName(name) {
    return String(name || '')
      .trim()
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*-\s*Official$/i, '')
      .replace(/\s*VEVO$/i, '')
      .trim();
  }

  function getSongArtist(song) {
    const explicit = cleanYoutubeArtistName(
      song?.artist || song?.channelTitle || song?.ownerChannelTitle || ''
    );
    if (explicit) return explicit;
    const title = String(song?.title || '');
    const parts = title.split(/\s[-–—]\s/);
    if (parts.length >= 2) return cleanYoutubeArtistName(parts[0]);
    return '';
  }

  function decodeHtmlEntities(str) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(str || '');
    return textarea.value;
  }

  function extractYtInitialData(html) {
    const text = String(html || '');
    const key = 'ytInitialData';
    let pos = text.indexOf(key);
    if (pos < 0) return null;
    pos = text.indexOf('{', pos);
    if (pos < 0) return null;
    let depth = 0,
      inString = false,
      esc = false;
    for (let i = pos; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(pos, i + 1));
          } catch (_) {
            return null;
          }
        }
      }
    }
    return null;
  }

  function ytText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.simpleText) return String(node.simpleText);
    if (Array.isArray(node.runs))
      return node.runs
        .map((r) => r.text || '')
        .join('')
        .trim();
    return '';
  }

  function parsePlaylistFeedXml(xmlText, playlistId) {
    const items = [];
    const seen = new Set();
    let playlistTitle = '';
    try {
      const xml = new DOMParser().parseFromString(String(xmlText || ''), 'text/xml');
      const feedTitle = xml.querySelector('feed > title');
      playlistTitle = cleanYoutubeTitle(feedTitle?.textContent || '새 재생목록');
      xml.querySelectorAll('entry').forEach((entry) => {
        const videoId = entry.querySelector('videoId, yt\\:videoId')?.textContent?.trim();
        const title = cleanYoutubeTitle(entry.querySelector('title')?.textContent || '');
        const thumb =
          entry.querySelector('thumbnail, media\\:thumbnail')?.getAttribute('url') || '';
        if (videoId && !seen.has(videoId)) {
          seen.add(videoId);
          items.push({
            videoId,
            title: title || `YouTube ${videoId}`,
            thumbnail: thumb,
            durationText: '',
            durationSeconds: 0
          });
        }
      });
    } catch (err) {
      console.warn('playlist feed parse failed', err);
    }
    return { title: playlistTitle || '새 재생목록', items, playlistId };
  }

  function parsePlaylistFromHtml(html, playlistId) {
    const items = [];
    const seen = new Set();
    let playlistTitle = '';
    const data = extractYtInitialData(html);
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.playlistVideoRenderer) {
        const r = node.playlistVideoRenderer;
        const videoId = r.videoId;
        const title = cleanYoutubeTitle(ytText(r.title));
        const durationText =
          ytText(r.lengthText) ||
          ytText(
            r.thumbnailOverlays?.find?.((o) => o.thumbnailOverlayTimeStatusRenderer)
              ?.thumbnailOverlayTimeStatusRenderer?.text
          );
        const durationSeconds = parseDurationTextToSeconds(durationText);
        const thumb = r.thumbnail?.thumbnails?.slice?.(-1)?.[0]?.url || '';
        if (videoId && !seen.has(videoId)) {
          seen.add(videoId);
          items.push({
            videoId,
            title: title || `YouTube ${videoId}`,
            thumbnail: thumb,
            durationText: durationText || '',
            durationSeconds: durationSeconds || 0
          });
        }
      }
      if (node.videoId && node.title && !node.playlistVideoRenderer) {
        const videoId = node.videoId;
        const title = cleanYoutubeTitle(ytText(node.title));
        if (/^[A-Za-z0-9_-]{11}$/.test(videoId) && !seen.has(videoId)) {
          seen.add(videoId);
          items.push({
            videoId,
            title: title || `YouTube ${videoId}`,
            durationText: '',
            durationSeconds: 0
          });
        }
      }
      if (node.playlistMetadataRenderer?.title && !playlistTitle) {
        playlistTitle = cleanYoutubeTitle(node.playlistMetadataRenderer.title);
      }
      if (node.playlistHeaderRenderer?.title && !playlistTitle) {
        playlistTitle = cleanYoutubeTitle(ytText(node.playlistHeaderRenderer.title));
      }
      if (node.microformatDataRenderer?.title && !playlistTitle) {
        playlistTitle = cleanYoutubeTitle(node.microformatDataRenderer.title);
      }
      for (const v of Object.values(node)) {
        if (v && typeof v === 'object') {
          if (Array.isArray(v)) v.forEach(visit);
          else visit(v);
        }
      }
    };
    if (data) visit(data);

    if (!items.length) {
      const htmlText = String(html || '');
      const re =
        /"playlistVideoRenderer"\s*:\s*\{[\s\S]*?"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"[\s\S]*?"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([\s\S]*?)"/g;
      let m;
      while ((m = re.exec(htmlText))) {
        const videoId = m[1];
        if (seen.has(videoId)) continue;
        seen.add(videoId);
        items.push({
          videoId,
          title:
            cleanYoutubeTitle(decodeHtmlEntities(m[2].replace(/\\u0026/g, '&'))) ||
            `YouTube ${videoId}`,
          durationText: '',
          durationSeconds: 0
        });
      }
    }
    if (!items.length) {
      const htmlText = String(html || '');
      const re = /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;
      let m;
      while ((m = re.exec(htmlText))) {
        const videoId = m[1];
        if (seen.has(videoId)) continue;
        seen.add(videoId);
        items.push({ videoId, title: `YouTube ${videoId}`, durationText: '', durationSeconds: 0 });
      }
    }
    if (!playlistTitle) {
      const og =
        String(html || '').match(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
        ) || String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
      if (og)
        playlistTitle = cleanYoutubeTitle(
          decodeHtmlEntities(og[1]).replace(/\s*-\s*YouTube\s*$/i, '')
        );
    }
    return { title: playlistTitle || '새 재생목록', items, playlistId };
  }

  async function fetchTextThroughProxies(targetUrl) {
    const endpoints = [
      { type: 'text', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` },
      { type: 'json', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` },
      {
        type: 'text',
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
      },
      { type: 'text', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` }
    ];
    let lastError = '';
    for (const endpoint of endpoints) {
      try {
        const res = await fetchYoutubeResponse(endpoint.url, { cache: 'no-store' });
        if (!res.ok) {
          lastError = `${res.status} ${res.statusText}`;
          continue;
        }
        if (endpoint.type === 'json') {
          const data = await res.json();
          const text = data.contents || data.data || '';
          if (text) return text;
        } else {
          const text = await res.text();
          if (text) return text;
        }
      } catch (err) {
        lastError = err?.message || String(err);
        console.warn('playlist proxy failed', endpoint.url, err);
      }
    }
    console.warn('playlist all proxies failed', targetUrl, lastError);
    return '';
  }

  function fetchYoutubePlaylistData(playlistId) {
    return playlistController.fetchPlaylist(playlistId);
  }

  async function importWorkMusicPlaylistFromLink(raw) {
    if (!window.ensureLogin || !window.ensureLogin()) return;
    const playlistId = extractYoutubePlaylistId(raw);
    if (!playlistId) {
      showAlert('유튜브/유튜브뮤직 재생목록 링크를 넣어주세요.');
      return;
    }
    showFeedbackMessage('재생목록을 불러오는 중입니다...');
    const data = await fetchYoutubePlaylistData(playlistId);
    const playlistSourceType = isYoutubeMusicUrl(raw)
      ? 'youtube-music-playlist'
      : 'youtube-playlist';
    if (!data.items.length) {
      showAlert('재생목록을 읽지 못했습니다. 공개 재생목록인지 확인해주세요.');
      return;
    }
    ensureWorkMusicDefaultTabs();
    const tabs = getWorkMusicTabs();
    const id = 'wtab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const order = tabs.length ? Math.max(...tabs.map((t) => Number(t.order || 0))) + 10 : 0;
    const tabName = (data.title || '새 재생목록').trim().slice(0, 20) || '새 재생목록';
    window.__workMusicTabList = [
      ...tabs,
      {
        id,
        name: tabName,
        order,
        sourcePlaylistId: data.playlistId,
        sourceType: playlistSourceType
      }
    ];
    window.__workMusicActiveTabId = id;
    resetWorkMusicDisplayShuffle(id);
    const existingIds = new Set(
      (window.workMusicSongs || []).map((s) => `${s.workMusicTabId || 'default'}:${s.videoId}`)
    );
    const now = Date.now();
    const newSongs = data.items
      .filter((item) => item.videoId && !existingIds.has(`${id}:${item.videoId}`))
      .map((item, idx) => ({
        id: now + idx,
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        videoId: item.videoId,
        title: item.title || `YouTube ${item.videoId}`,
        artist: item.artist || item.channelTitle || '',
        channelTitle: item.channelTitle || item.artist || '',
        thumbnail: item.thumbnail || '',
        autoTitle: false,
        durationText: item.durationText || formatWorkMusicDuration(item.durationSeconds),
        durationSeconds: item.durationSeconds || 0,
        addedAt: now + idx,
        workMusicTabId: id,
        sourcePlaylistId: data.playlistId,
        sourceType: playlistSourceType
      }));
    window.workMusicSongs = [...(window.workMusicSongs || []), ...newSongs];
    window.workMusicCurrentIndex = 0;
    window.workMusicIsPlaying = false;
    renderWorkMusicAll();
    playbackController.loadAt(getWorkMusicInitialIndex(), false);
    await window.cloudSaveWorkMusic?.();
    showFeedbackMessage(`${tabName} 탭에 ${newSongs.length}개를 추가했습니다.`);
  }

  async function addWorkMusicFromText(raw) {
    if (!window.ensureLogin || !window.ensureLogin()) return false;
    if (extractYoutubePlaylistId(raw)) {
      await importWorkMusicPlaylistFromLink(raw);
      return true;
    }
    const videoId = extractYoutubeVideoId(raw);
    if (!videoId) {
      showAlert('유튜브 링크만 추가할 수 있습니다.');
      return false;
    }
    window.workMusicSongs = window.workMusicSongs || [];
    const url = normalizeYoutubeUrl(raw);
    const activeTabId = getActiveWorkMusicTabId();
    if (getActiveWorkMusicSongs().some((s) => s.videoId === videoId)) {
      showFeedbackMessage('현재 탭에 이미 추가된 영상입니다.');
      return false;
    }
    let meta = {};
    try {
      meta = await fetchYoutubeVideosMeta([videoId]);
    } catch (_) {
      meta = {};
    }
    const fetchedTitle = meta[videoId]?.title || (await fetchYoutubeTitle(url));
    const durationSeconds = meta[videoId]?.durationSeconds || (await fetchYoutubeDuration(videoId));
    const activeTab = getWorkMusicTabs().find((t) => t.id === activeTabId);
    const sourceType =
      isYoutubeMusicUrl(raw) || String(activeTab?.sourceType || '').includes('music')
        ? 'youtube-music'
        : 'youtube';
    await listController.add([
      {
        id: Date.now(),
        url,
        videoId,
        title: fetchedTitle || `제목 불러오기 실패`,
        artist: meta[videoId]?.artist || '',
        channelTitle: meta[videoId]?.channelTitle || '',
        thumbnail: meta[videoId]?.thumbnail || '',
        autoTitle: !fetchedTitle,
        durationSeconds: durationSeconds || 0,
        durationText: formatWorkMusicDuration(durationSeconds),
        addedAt: Date.now(),
        workMusicTabId: activeTabId,
        sourceType
      }
    ]);
    resetWorkMusicDisplayShuffle(activeTabId);
    return true;
  }

  async function addWorkMusicFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) {
        showAlert('클립보드에 유튜브 링크가 없습니다.');
        return;
      }
      await addWorkMusicFromText(t);
    } catch (err) {
      console.error(err);
      showAlert('클립보드 권한을 허용하거나, + 영역을 선택한 뒤 Ctrl/Cmd+V로 붙여넣어주세요.');
    }
  }

  function renderWorkMusicTabsUI() {
    if (!workMusicTabsContainer) return;
    const tabs = getWorkMusicTabs();
    if (!tabs.some((t) => t.id === window.__workMusicActiveTabId))
      window.__workMusicActiveTabId = tabs[0]?.id || 'default';
    workMusicTabsContainer.innerHTML =
      tabs
        .map((t) => {
          const playlistId = getWorkMusicTabPlaylistId(t.id);
          const mark = playlistId
            ? `<span class="playlist-mark" title="재생목록 탭">${workMusicPlaylistMarkSvg}</span>`
            : '';
          return renderManagedTab({
            className: 'workmusic-tab',
            id: t.id,
            label: t.name || '탭',
            active: t.id === window.__workMusicActiveTabId,
            prefix: mark
          });
        })
        .join('') + renderManagedTab({ className: 'workmusic-tab', newTab: true });
  }

  function renderWorkMusicAll() {
    renderWorkMusicTabsUI();
    renderWorkMusic();
  }
  window.renderWorkMusicAll = renderWorkMusicAll;

  async function switchWorkMusicTab(tabId) {
    window.__workMusicActiveTabId = tabId || 'default';
    window.workMusicCurrentIndex = 0;
    window.workMusicIsPlaying = false;
    await window.cloudSetActiveWorkMusicTab?.(window.__workMusicActiveTabId);
    renderWorkMusicAll();
    playbackController.loadAt(getWorkMusicInitialIndex(), false);
  }

  function backupWorkMusicTab(tabId) {
    const tab = getWorkMusicTabs().find((t) => t.id === tabId);
    if (!tab) return;
    const songs = (window.workMusicSongs || []).filter(
      (s) => (s.workMusicTabId || 'default') === tabId
    );
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const safeName =
      String(tab.name || 'workmusic')
        .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
        .trim() || 'workmusic';
    downloadTextFile(
      `${safeName}_workmusic_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`,
      JSON.stringify({ tab, songs, exportedAt: now.toISOString() }, null, 2),
      'application/json;charset=utf-8'
    );
    showFeedbackMessage('노동요 탭을 백업했습니다.');
  }

  function openWorkMusicTabSettings(tabId) {
    const tab = getWorkMusicTabs().find((t) => t.id === tabId);
    if (!tab) return;
    const playlistId = getWorkMusicTabPlaylistId(tabId);
    openTabSettings({
      title: '노동요 탭 설정',
      tab,
      getTabs: getWorkMusicTabs,
      onSave: async (id, name) => {
        await window.cloudRenameWorkMusicTab?.(id, name);
      },
      onDelete: async (id) => {
        await window.cloudDeleteWorkMusicTab?.(id);
      },
      onBackup: async (id) => backupWorkMusicTab(id),
      onRefresh: playlistId ? async (id) => refreshWorkMusicPlaylistTab(id) : null,
      onReorder: async (next) => {
        await window.cloudReorderWorkMusicTabs?.(next);
      }
    });
  }

  function openWorkMusicTabCreate() {
    openTabSettings({
      title: '노동요 새 탭',
      create: true,
      defaultName: '새 탭',
      getTabs: getWorkMusicTabs,
      onCreate: async (name) => {
        if (!window.ensureLogin || !window.ensureLogin()) return;
        ensureWorkMusicDefaultTabs();
        const id = 'wtab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        const tabs = getWorkMusicTabs();
        const order = tabs.length ? Math.max(...tabs.map((t) => Number(t.order || 0))) + 10 : 0;
        window.__workMusicTabList = [...tabs, { id, name, order }];
        window.__workMusicActiveTabId = id;
        window.workMusicCurrentIndex = 0;
        window.workMusicIsPlaying = false;
        renderWorkMusicAll();
        await window.cloudAddWorkMusicTab?.({ id, name, order });
      }
    });
  }

  async function refreshWorkMusicPlaylistTab(tabId) {
    if (!window.ensureLogin || !window.ensureLogin()) return;
    const playlistId = getWorkMusicTabPlaylistId(tabId);
    if (!playlistId) {
      showFeedbackMessage('재생목록으로 만든 탭만 새로고침할 수 있습니다.');
      return;
    }
    const tab = getWorkMusicTabs().find((t) => t.id === tabId);
    const playlistSourceType = tab?.sourceType || 'youtube-playlist';
    showFeedbackMessage('재생목록을 새로고침 중입니다...');
    const data = await fetchYoutubePlaylistData(playlistId);
    if (!data.items.length) {
      showAlert('재생목록을 다시 읽지 못했습니다.');
      return;
    }
    const oldSongs = (window.workMusicSongs || []).filter(
      (s) => (s.workMusicTabId || 'default') === tabId
    );
    const oldMap = new Map(oldSongs.map((s) => [s.videoId, s]));
    const now = Date.now();
    const nextSongsForTab = data.items.map((item, idx) => {
      const old = oldMap.get(item.videoId);
      const keepManualTitle =
        old && old.autoTitle === false && old.title && old.title !== `YouTube ${old.videoId}`;
      return {
        ...(old || {}),
        id: old?.id || now + idx,
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        videoId: item.videoId,
        title: keepManualTitle ? old.title : item.title || old?.title || `YouTube ${item.videoId}`,
        artist: item.artist || item.channelTitle || old?.artist || old?.channelTitle || '',
        channelTitle: item.channelTitle || item.artist || old?.channelTitle || old?.artist || '',
        thumbnail: item.thumbnail || old?.thumbnail || '',
        autoTitle: keepManualTitle ? false : false,
        durationText:
          item.durationText ||
          formatWorkMusicDuration(item.durationSeconds) ||
          old?.durationText ||
          '',
        durationSeconds: item.durationSeconds || old?.durationSeconds || 0,
        addedAt: old?.addedAt || now + idx,
        workMusicTabId: tabId,
        sourcePlaylistId: data.playlistId || playlistId,
        sourceType: playlistSourceType
      };
    });
    window.workMusicSongs = [
      ...(window.workMusicSongs || []).filter((s) => (s.workMusicTabId || 'default') !== tabId),
      ...nextSongsForTab
    ];
    resetWorkMusicDisplayShuffle(tabId);
    window.__workMusicTabList = getWorkMusicTabs().map((t) =>
      t.id === tabId
        ? { ...t, sourcePlaylistId: data.playlistId || playlistId, sourceType: playlistSourceType }
        : t
    );
    if (window.__workMusicActiveTabId !== tabId) window.__workMusicActiveTabId = tabId;
    window.workMusicCurrentIndex = 0;
    window.workMusicIsPlaying = false;
    renderWorkMusicAll();
    playbackController.loadAt(getWorkMusicInitialIndex(), false);
    await window.cloudSaveWorkMusic?.();
    showFeedbackMessage(
      `${tab?.name || data.title || '재생목록'} 새로고침 완료: ${nextSongsForTab.length}개`
    );
  }

  function initializeWorkMusic() {
    ensureWorkMusicDefaultTabs();
    renderWorkMusicAll();
    clearInterval(workMusicProgressDisplayTimer);
    workMusicProgressDisplayTimer = setInterval(renderWorkMusicProgress, 500);
    setTimeout(persistWorkMusicDefaultTabsIfNeeded, 300);
    setTimeout(fillMissingWorkMusicTitles, 600);
    setTimeout(fillMissingWorkMusicDurations, 1200);
    workMusicTabsContainer?.addEventListener('click', async (e) => {
      const settingsBtn = e.target.closest('[data-action="tab-settings"]');
      if (settingsBtn) {
        e.preventDefault();
        e.stopPropagation();
        const tabBtn = settingsBtn.closest('.workmusic-tab');
        if (tabBtn?.dataset.tabId) openWorkMusicTabSettings(tabBtn.dataset.tabId);
        return;
      }
      if (e.target.closest('[data-action="new-tab"]')) {
        openWorkMusicTabCreate();
        return;
      }
      const tabBtn = e.target.closest('.workmusic-tab');
      if (!tabBtn) return;
      const tabId = tabBtn.dataset.tabId;
      await switchWorkMusicTab(tabId);
    });
    let workMusicDraggingEl = null,
      workMusicPlaceholderEl = null;
    function ensureWorkMusicPlaceholder(width) {
      if (workMusicPlaceholderEl) return;
      workMusicPlaceholderEl = document.createElement('div');
      workMusicPlaceholderEl.className = 'workmusic-tab placeholder';
      workMusicPlaceholderEl.style.width = (width || 80) + 'px';
      workMusicPlaceholderEl.style.height = '32px';
      workMusicPlaceholderEl.style.border = '1px dashed rgba(255,255,255,.25)';
      workMusicPlaceholderEl.style.background = 'transparent';
    }
    function getWorkMusicDragAfterElement(container, x) {
      const els = [
        ...container.querySelectorAll('.workmusic-tab:not(.dragging):not(.placeholder)')
      ];
      let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
      for (const child of els) {
        const box = child.getBoundingClientRect();
        const offset = x - (box.left + box.width / 2);
        if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
      }
      return closest.element;
    }
    workMusicTabsContainer?.addEventListener('dragstart', (e) => {
      if (!window.__workMusicEditMode) return;
      const tabBtn = e.target.closest('.workmusic-tab');
      if (!tabBtn) return;
      workMusicDraggingEl = tabBtn;
      workMusicDraggingEl.classList.add('dragging');
      ensureWorkMusicPlaceholder(tabBtn.getBoundingClientRect().width);
      workMusicPlaceholderEl.style.width = tabBtn.getBoundingClientRect().width + 'px';
      tabBtn.after(workMusicPlaceholderEl);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    workMusicTabsContainer?.addEventListener('dragover', (e) => {
      if (!window.__workMusicEditMode || !workMusicDraggingEl) return;
      e.preventDefault();
      const afterEl = getWorkMusicDragAfterElement(workMusicTabsContainer, e.clientX);
      if (!afterEl) workMusicTabsContainer.appendChild(workMusicPlaceholderEl);
      else workMusicTabsContainer.insertBefore(workMusicPlaceholderEl, afterEl);
    });
    async function finalizeWorkMusicTabReorder() {
      if (!workMusicDraggingEl || !workMusicPlaceholderEl) return;
      workMusicPlaceholderEl.replaceWith(workMusicDraggingEl);
      workMusicDraggingEl.classList.remove('dragging');
      const ids = [...workMusicTabsContainer.querySelectorAll('.workmusic-tab')]
        .filter((el) => !el.classList.contains('placeholder'))
        .map((el) => el.dataset.tabId)
        .filter(Boolean);
      const map = new Map(getWorkMusicTabs().map((t) => [t.id, t]));
      const next = ids.map((id, i) => ({ ...map.get(id), order: i * 10 })).filter(Boolean);
      await window.cloudReorderWorkMusicTabs?.(next);
      workMusicDraggingEl = null;
      workMusicPlaceholderEl = null;
    }
    workMusicTabsContainer?.addEventListener('drop', async (e) => {
      if (!window.__workMusicEditMode) return;
      e.preventDefault();
      await finalizeWorkMusicTabReorder();
    });
    workMusicTabsContainer?.addEventListener('dragend', async () => {
      if (window.__workMusicEditMode && workMusicPlaceholderEl && workMusicDraggingEl)
        await finalizeWorkMusicTabReorder();
    });

    workMusicDragArea?.addEventListener('click', addWorkMusicFromClipboard);
    workMusicDragArea?.addEventListener('paste', async (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      await addWorkMusicFromText(text);
    });
    workMusicDragArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      workMusicDragArea.classList.add('active');
    });
    workMusicDragArea?.addEventListener('dragleave', () =>
      workMusicDragArea.classList.remove('active')
    );
    workMusicDragArea?.addEventListener('drop', async (e) => {
      e.preventDefault();
      workMusicDragArea.classList.remove('active');
      const text =
        e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text/uri-list') || '';
      await addWorkMusicFromText(text);
    });
    workMusicSeekRange?.addEventListener('pointerenter', updateWorkMusicSeekHover);
    workMusicSeekRange?.addEventListener('pointermove', updateWorkMusicSeekHover);
    workMusicSeekRange?.addEventListener('pointerleave', hideWorkMusicSeekHover);
    workMusicPlayBtn?.addEventListener('click', playbackController.toggle);
    workMusicPrevBtn?.addEventListener('click', playbackController.previous);
    workMusicNextBtn?.addEventListener('click', playbackController.next);
    workMusicRemotePlayBtn?.addEventListener('click', playbackController.toggle);
    workMusicRemotePrevBtn?.addEventListener('click', playbackController.previous);
    workMusicRemoteNextBtn?.addEventListener('click', playbackController.next);
    bindSliderControlHoverState(workMusicVolumeControl);
    bindSliderControlHoverState(workMusicRemoteVolumeControl);
    workMusicRemoteInfo?.addEventListener('click', () => showTab('workmusic'));
    const toggleWorkMusicMode = async () => {
      const songs = getActiveWorkMusicSongs();
      const isEnablingShuffle = window.workMusicMode !== 'random';
      const wasPlaying = !!window.workMusicIsPlaying;
      try {
        workMusicPendingStartSeconds = Number(getWorkMusicRuntimePlayer()?.getCurrentTime?.() || 0);
      } catch (_) {
        workMusicPendingStartSeconds = null;
      }
      if (isEnablingShuffle) {
        window.workMusicMode = 'random';
        const pinnedIndex = wasPlaying ? Number(window.workMusicCurrentIndex || 0) : -1;
        const order = createWorkMusicDisplayShuffle(songs, pinnedIndex);
        if (!wasPlaying && order.length) window.workMusicCurrentIndex = order[0];
      } else {
        window.workMusicMode = 'sequential';
        resetWorkMusicDisplayShuffle();
      }
      renderWorkMusic();
      if (songs.length) playbackController.loadAt(window.workMusicCurrentIndex || 0, wasPlaying);
      else workMusicPendingStartSeconds = null;
      await window.cloudSaveWorkMusic?.();
    };
    workMusicModeBtn?.addEventListener('click', toggleWorkMusicMode);
    workMusicRemoteModeBtn?.addEventListener('click', toggleWorkMusicMode);
    workMusicSeamlessBtn?.addEventListener('click', playbackController.cycleDjMode);
    workMusicRemoteSeamlessBtn?.addEventListener('click', playbackController.cycleDjMode);
    workMusicMuteBtn?.addEventListener('click', playbackController.toggleMute);
    workMusicRemoteMuteBtn?.addEventListener('click', playbackController.toggleMute);
    workMusicVolumeRange?.addEventListener('input', async (e) => {
      await playbackController.setVolume(Number(e.target.value || 0));
    });
    workMusicRemoteVolumeRange?.addEventListener('input', async (e) => {
      await playbackController.setVolume(Number(e.target.value || 0));
    });
    const handleWorkMusicVolumeWheel = async (e) => {
      if (!workMusicVolumeRange) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      const base = Number(workMusicVolumeRange.value || 0);
      await playbackController.setVolume(base + delta);
    };
    workMusicVolumeControl?.addEventListener('wheel', handleWorkMusicVolumeWheel, {
      passive: false
    });
    workMusicRemoteVolumeControl?.addEventListener('wheel', handleWorkMusicVolumeWheel, {
      passive: false
    });
    const handleWorkMusicVolumeKey = async (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 5 : -5;
      const base = window.workMusicIsMuted ? 0 : Number(window.workMusicVolume || 0);
      await playbackController.setVolume(base + delta);
    };
    workMusicVolumeRange?.addEventListener('keydown', handleWorkMusicVolumeKey);
    workMusicRemoteVolumeRange?.addEventListener('keydown', handleWorkMusicVolumeKey);
    workMusicSaveTitleBtn?.addEventListener('click', saveWorkMusicTitle);
    workMusicDeleteBtn?.addEventListener('click', deleteCurrentWorkMusic);
    workMusicOpenYoutubeBtn?.addEventListener('click', openCurrentWorkMusicOnYoutube);
    workMusicCloseSettingsBtn?.addEventListener('click', closeWorkMusicSettings);
    workMusicSettingsModal?.addEventListener('click', async (e) => {
      if (e.target === workMusicSettingsModal) {
        await saveWorkMusicTitle();
        closeWorkMusicSettings();
      }
    });
    workMusicTitleInput?.addEventListener('blur', saveWorkMusicTitle);
    workMusicTitleInput?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await saveWorkMusicTitle();
        closeWorkMusicSettings();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWorkMusicSettings();
      }
    });
  }

  document.addEventListener('paste', async (e) => {
    const section = document.getElementById('workmusic-section');
    if (!section || !section.classList.contains('active')) return;
    const previewUploadModal = document.getElementById('previewUploadModal');
    if (previewUploadModal && previewUploadModal.style.display === 'flex') return;
    const text = e.clipboardData?.getData('text/plain') || '';
    if (extractYoutubeVideoId(text)) {
      e.preventDefault();
      await addWorkMusicFromText(text);
    }
  });

  playbackController = createWorkMusicPlaybackController({
    engine,
    youtubePort,
    root,
    failureDelayMs: WORK_MUSIC_FAILURE_SKIP_DELAY_MS,
    notify: showFeedbackMessage,
    save: () => window.cloudSaveWorkMusic?.(),
    render: () => {
      renderWorkMusicPlayButton();
      updateWorkMusicRemoteUI();
      renderWorkMusic();
    },
    actions: {
      onStateChange: onWorkMusicPlayerStateChange,
      onReady: applyWorkMusicPendingStartSeconds
    }
  });
  listController = createWorkMusicListController({
    engine,
    render: renderWorkMusicAll,
    save: () => window.cloudSaveWorkMusic?.()
  });
  analysisController = createWorkMusicAnalysisController({
    mediaAnalysisPort,
    onChange: (state) => analysisView?.render(state),
    async saveManual({ songId, videoId, manual }) {
      const nextSongs = engine.getSnapshot().songs.map((song) => {
        const matches = songId != null ? song.id === songId : song.videoId === videoId;
        if (!matches) return song;
        const next = { ...song };
        if (manual) next.mediaAnalysisManual = { ...manual };
        else delete next.mediaAnalysisManual;
        return next;
      });
      await listController.replace(nextSongs);
    }
  });
  analysisView = createWorkMusicAnalysisView({
    root,
    controller: analysisController,
    onSeek: (seconds) => playbackController.seek(seconds)
  });
  autoAnalysis = createWorkMusicAutoAnalysisController({
    mediaAnalysisPort,
    onResult: (result) => analysisController.acceptResult(result),
    onChange: (state) => {
      const label = root.getElementById('workMusicAutoAnalysisStatus');
      if (label) label.textContent = `${state.message} · ${state.done}/${state.total}`;
      const button = root.getElementById('workMusicAutoAnalysisToggle');
      if (button) {
        button.textContent = state.paused ? '▶' : '⏸';
        button.title = state.paused ? '자동 분석 재개' : '자동 분석 일시정지';
        button.setAttribute('aria-label', button.title);
      }
    }
  });
  root
    .getElementById('workMusicAutoAnalysisToggle')
    ?.addEventListener('click', () => autoAnalysis.toggle());
  host.addEventListener?.('pagehide', () => autoAnalysis.destroy(), { once: true });
  autoAnalysis.sync(engine.getActiveSongs());
  seamlessController = createWorkMusicSeamlessController({
    prepareSong: analysisController.prefetchExisting,
    onStatus: (text) => {
      const label = root.getElementById('workMusicDjStatus');
      if (label) label.textContent = text;
    },
    detectedByVideoId: analysisController.detectedByVideoId,
    engine,
    playbackController,
    youtubePort,
    root,
    render: renderWorkMusic
  });
  playbackController.setSeamlessController(seamlessController);
  host.__workMusicControllerCompatibility = {
    analysisController,
    listController,
    metadataController,
    playbackController,
    playlistController,
    seamlessController,
    tabsController
  };
  initializeWorkMusic();
  return { engine, ...host.__workMusicControllerCompatibility, mediaAnalysisPort, youtubePort };
}
