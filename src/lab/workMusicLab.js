import { createWorkMusicAnalysisController } from '../features/workmusic/workMusicAnalysisController.js';
import { createWorkMusicAnalysisView } from '../features/workmusic/workMusicAnalysisView.js';
import { createWorkMusicAutoAnalysisController } from '../features/workmusic/workMusicAutoAnalysisController.js';
import { getWorkMusicPlaybackVideoId } from '../features/workmusic/workMusicPlaybackIdentity.js';
import { createWorkMusicBatchAnalysisController } from '../features/workmusic/workMusicBatchAnalysisController.js';
import { createWorkMusicEngine } from '../features/workmusic/workMusicEngine.js';
import {
  extractYoutubePlaylistId,
  extractYoutubeVideoId,
  formatWorkMusicDuration
} from '../features/workmusic/workMusicHelper.js';
import { createWorkMusicMetadataController } from '../features/workmusic/workMusicMetadataController.js';
import { createWorkMusicPlaybackController } from '../features/workmusic/workMusicPlaybackController.js';
import { createWorkMusicPlaylistController } from '../features/workmusic/workMusicPlaylistController.js';
import { createWorkMusicSeamlessController } from '../features/workmusic/workMusicSeamlessController.js';
import { createMediaAnalysisPort } from '../ports/mediaAnalysisPort.js';
import { createYoutubePort } from '../ports/youtubePort.js';
import {
  loadLocalWorkMusicState,
  saveLocalWorkMusicState
} from '../services/localWorkMusicStore.js';
import { createMediaAnalysisBrowserAdapter } from '../services/mediaAnalysisBrowserAdapter.js';
import { createYoutubeBrowserAdapter } from '../services/youtubeBrowserAdapter.js';

const root = document;
const DEFAULT_TEST_PLAYLIST_URL =
  'https://youtube.com/playlist?list=PL63xrS6vfdgO3Yz6hIVRgn2SfYcYx-siI';
const initialState = loadLocalWorkMusicState();
const engine = createWorkMusicEngine({ initialState });
const youtubePort = createYoutubePort({ adapter: createYoutubeBrowserAdapter() });
const metadataController = createWorkMusicMetadataController({
  apiKey: window.APP_CONFIG?.youtubeApiKey || '',
  root,
  youtubePort
});
const playlistController = createWorkMusicPlaylistController({
  fetchProxyText: async () => '',
  metadataController,
  parseFeed: () => ({ items: [] }),
  parseHtml: () => ({ items: [] })
});
const mediaAnalysisPort = createMediaAnalysisPort({
  adapter: createMediaAnalysisBrowserAdapter({ apiBaseUrl: 'http://127.0.0.1:8000' })
});

const elements = {
  form: root.getElementById('workMusicLabAddForm'),
  url: root.getElementById('workMusicLabUrl'),
  feedback: root.getElementById('workMusicLabFeedback'),
  list: root.getElementById('workMusicLabList'),
  count: root.getElementById('workMusicLabCount'),
  title: root.getElementById('workMusicLabTitle'),
  artist: root.getElementById('workMusicLabArtist'),
  thumbnail: root.getElementById('workMusicLabThumbnail'),
  saveState: root.getElementById('workMusicLabSaveState'),
  play: root.getElementById('workMusicPlayBtn'),
  previous: root.getElementById('workMusicPrevBtn'),
  next: root.getElementById('workMusicNextBtn'),
  seek: root.getElementById('workMusicSeekRange'),
  elapsed: root.getElementById('workMusicElapsedTime'),
  duration: root.getElementById('workMusicDurationTime'),
  volume: root.getElementById('workMusicVolumeRange'),
  volumeLabel: root.getElementById('workMusicVolumePercent'),
  batchPanel: root.getElementById('workMusicBatchAnalysisPanel'),
  batchStatus: root.getElementById('workMusicBatchAnalysisStatus'),
  batchMessage: root.getElementById('workMusicBatchAnalysisMessage'),
  batchProgress: root.getElementById('workMusicBatchAnalysisProgress'),
  batchCounts: root.getElementById('workMusicBatchAnalysisCounts'),
  batchTest: root.getElementById('workMusicBatchAnalyzeTestBtn'),
  batchAll: root.getElementById('workMusicBatchAnalyzeAllBtn'),
  batchStop: root.getElementById('workMusicBatchStopBtn'),
  batchResume: root.getElementById('workMusicBatchResumeBtn')
};

let analysisView = null;
let autoAnalysis = null;
let playbackController = null;
let seamlessController = null;
let batchAnalysisController = null;

const BATCH_STATUS_LABELS = {
  disabled: '서버 꺼짐',
  idle: '준비',
  submitting: '등록 중',
  running: '분석 중',
  stopped: '중단됨',
  succeeded: '완료',
  completed_with_errors: '일부 실패',
  unavailable: '연결 실패'
};

function renderBatchAnalysis(state) {
  if (!elements.batchPanel) return;
  const songs = engine.getActiveSongs();
  const counts = state.counts || {};
  const completed =
    Number(counts.succeeded || 0) + Number(counts.failed || 0) + Number(counts.cancelled || 0);
  const active = ['submitting', 'running'].includes(state.phase);
  elements.batchPanel.dataset.phase = state.phase;
  elements.batchStatus.textContent = BATCH_STATUS_LABELS[state.phase] || state.phase;
  elements.batchMessage.textContent = state.message || '';
  elements.batchProgress.max = String(Math.max(1, state.total || songs.length));
  elements.batchProgress.value = String(completed);
  elements.batchCounts.textContent = [
    `완료 ${counts.succeeded || 0}`,
    `대기 ${counts.queued || 0}`,
    `진행 ${counts.running || 0}`,
    `실패 ${counts.failed || 0}`
  ].join(' · ');
  elements.batchTest.disabled = active || !mediaAnalysisPort.enabled || !songs.length;
  elements.batchAll.disabled = active || !mediaAnalysisPort.enabled || !songs.length;
  elements.batchStop.disabled = !active;
  elements.batchResume.disabled = active || !mediaAnalysisPort.enabled || state.total <= 0;
}

function persist() {
  const state = engine.getSnapshot();
  saveLocalWorkMusicState({
    songs: state.songs,
    currentIndex: state.currentIndex,
    volume: state.volume,
    seamlessOverlapSeconds: state.seamlessOverlapSeconds
  });
  elements.saveState.textContent = '이 브라우저에 저장됨';
}

function setFeedback(message = '') {
  elements.feedback.textContent = message;
}

function renderList(songs, currentIndex) {
  const batchJobs = new Map(
    (batchAnalysisController?.getState().jobs || []).map((job) => [job.videoId, job.status])
  );
  elements.count.textContent = `${songs.length}곡`;
  elements.list.replaceChildren();
  if (!songs.length) {
    const empty = document.createElement('p');
    empty.className = 'workmusic-lab-empty';
    empty.textContent = 'YouTube 링크를 추가하면 여기에 저장됩니다.';
    elements.list.appendChild(empty);
    return;
  }
  songs.forEach((song, index) => {
    const row = document.createElement('div');
    row.className = `workmusic-lab-song${index === currentIndex ? ' active' : ''}`;
    const thumbnail = document.createElement('img');
    thumbnail.alt = '';
    thumbnail.src = song.thumbnail;
    const select = document.createElement('button');
    select.type = 'button';
    select.dataset.select = String(index);
    const title = document.createElement('strong');
    title.textContent = song.title;
    const detail = document.createElement('span');
    const batchStatus = batchJobs.get(song.videoId);
    detail.textContent = song.mediaAnalysisManual
      ? '수동 구간 저장됨'
      : batchStatus === 'succeeded'
        ? '자동 분석 완료'
        : batchStatus === 'running'
          ? '분석 중'
          : batchStatus === 'queued'
            ? '분석 대기 중'
            : batchStatus === 'failed'
              ? '분석 실패'
              : song.videoId;
    select.append(title, detail);
    const remove = document.createElement('button');
    remove.className = 'workmusic-lab-song-remove';
    remove.type = 'button';
    remove.dataset.remove = String(index);
    remove.setAttribute('aria-label', '목록에서 삭제');
    remove.textContent = '삭제';
    row.append(thumbnail, select, remove);
    elements.list.appendChild(row);
  });
}

function render() {
  const state = engine.getSnapshot();
  const songs = engine.getActiveSongs();
  const song = songs[state.currentIndex] || null;
  renderList(songs, state.currentIndex);
  elements.title.textContent = song?.title || '곡을 추가해주세요';
  elements.artist.textContent = song?.artist || '';
  elements.thumbnail.src = song?.thumbnail || '';
  elements.thumbnail.hidden = !song;
  elements.play.classList.toggle('is-playing', state.isPlaying);
  elements.play.setAttribute('aria-label', state.isPlaying ? '일시정지' : '재생');
  elements.play.title = state.isPlaying ? '일시정지' : '재생';
  elements.play.disabled = !song;
  elements.previous.disabled = songs.length < 2;
  elements.next.disabled = songs.length < 2;
  elements.volume.value = String(state.volume);
  elements.volumeLabel.textContent = `${state.volume}%`;
  const djButton = root.getElementById('workMusicSeamlessBtn');
  if (djButton) {
    djButton.setAttribute('aria-pressed', String(state.seamlessOverlapSeconds > 0));
    djButton.textContent = state.seamlessEnabled
      ? state.djVerseMode
        ? 'DJ 1절'
        : 'DJ'
      : 'DJ 꺼짐';
  }
  analysisController.selectSong(song);
  autoAnalysis?.sync(songs);
  if (batchAnalysisController) renderBatchAnalysis(batchAnalysisController.getState());
}

function updateStoredDuration(player, index) {
  const durationSeconds = Number(player?.getDuration?.() || 0);
  if (durationSeconds <= 0) return;
  const state = engine.getSnapshot();
  const active = engine.getActiveSongs()[index];
  engine.setSongs(
    state.songs.map((song) =>
      song.id === active?.id ? { ...song, durationSeconds: Math.round(durationSeconds) } : song
    )
  );
  persist();
  render();
}

const analysisController = createWorkMusicAnalysisController({
  mediaAnalysisPort,
  onChange: (state) => analysisView?.render(state),
  async saveManual({ songId, videoId, manual }) {
    const state = engine.getSnapshot();
    engine.setSongs(
      state.songs.map((song) => {
        const matches = songId != null ? song.id === songId : song.videoId === videoId;
        if (!matches) return song;
        const next = { ...song };
        if (manual) next.mediaAnalysisManual = { ...manual };
        else delete next.mediaAnalysisManual;
        return next;
      })
    );
    persist();
    render();
  }
});
analysisView = createWorkMusicAnalysisView({ root, controller: analysisController });
autoAnalysis = createWorkMusicAutoAnalysisController({
  mediaAnalysisPort,
  onResult: (result) => analysisController.acceptResult(result),
  onChange: (state) => {
    root.getElementById('workMusicAutoAnalysisStatus').textContent =
      `${state.message} · ${state.done}/${state.total}`;
    root.getElementById('workMusicAutoAnalysisToggle').textContent = state.paused
      ? '자동 분석 재개'
      : '자동 분석 일시정지';
  }
});
root
  .getElementById('workMusicAutoAnalysisToggle')
  .addEventListener('click', () => autoAnalysis.toggle());
window.addEventListener('pagehide', () => autoAnalysis.destroy(), { once: true });
batchAnalysisController = createWorkMusicBatchAnalysisController({
  mediaAnalysisPort,
  onChange: (state) => {
    renderBatchAnalysis(state);
    render();
  }
});

playbackController = createWorkMusicPlaybackController({
  engine,
  youtubePort,
  root,
  notify: setFeedback,
  render,
  save: persist,
  actions: {
    onReady: updateStoredDuration,
    onStateChange(event) {
      if (event?.data === 0) playbackController.next();
      else if (event?.data === 1 || event?.data === 2) {
        engine.setState('isPlaying', event.data === 1);
        render();
      }
    }
  }
});
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
  render
});
playbackController.setSeamlessController(seamlessController);

async function fetchMetadata(videoId) {
  const fallback = {
    title: `YouTube ${videoId}`,
    artist: '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
  try {
    const url = new URL('https://www.youtube.com/oembed');
    url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set('format', 'json');
    const response = await youtubePort.fetchResponse(url.href, { cache: 'no-store' });
    if (!response.ok) return fallback;
    const data = await response.json();
    return {
      title: String(data.title || fallback.title),
      artist: String(data.author_name || ''),
      thumbnail: String(data.thumbnail_url || fallback.thumbnail)
    };
  } catch (_error) {
    return fallback;
  }
}

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const playlistId = extractYoutubePlaylistId(elements.url.value);
  if (playlistId) {
    setFeedback('재생목록 전체를 불러오는 중입니다...');
    const playlist = await playlistController.fetchPlaylist(playlistId);
    if (!playlist.items.length) {
      return setFeedback('재생목록을 불러오지 못했습니다. 공개 재생목록인지 확인해주세요.');
    }
    const state = engine.getSnapshot();
    const existingVideoIds = new Set(state.songs.map((song) => song.videoId));
    const importedAt = Date.now();
    const additions = playlist.items
      .filter((item) => !existingVideoIds.has(item.videoId))
      .map((item, index) => ({
        id: `${item.videoId}-${importedAt}-${index}`,
        videoId: item.videoId,
        title: item.title,
        artist: item.artist || '',
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        durationSeconds: Number(item.durationSeconds || 0),
        workMusicTabId: 'default'
      }));
    if (!additions.length) {
      return setFeedback(`재생목록 ${playlist.items.length}곡이 이미 모두 저장되어 있습니다.`);
    }
    const songs = [...state.songs, ...additions];
    const firstAddedIndex = state.songs.length;
    engine.setSongs(songs);
    engine.setState('currentIndex', firstAddedIndex);
    engine.rebuildPlayOrder();
    elements.url.value = '';
    persist();
    render();
    await playbackController.loadAt(firstAddedIndex, false);
    const skippedCount = playlist.items.length - additions.length;
    return setFeedback(
      skippedCount
        ? `${additions.length}곡을 저장했습니다. 중복 ${skippedCount}곡은 건너뛰었습니다.`
        : `${additions.length}곡을 한 번에 저장했습니다.`
    );
  }
  const videoId = extractYoutubeVideoId(elements.url.value);
  if (!videoId) return setFeedback('올바른 YouTube URL 또는 11자리 videoId를 입력해주세요.');
  const state = engine.getSnapshot();
  const duplicateIndex = state.songs.findIndex((song) => song.videoId === videoId);
  if (duplicateIndex >= 0) {
    engine.setState('currentIndex', duplicateIndex);
    persist();
    render();
    await playbackController.loadAt(duplicateIndex, false);
    return setFeedback('이미 저장된 곡으로 이동했습니다.');
  }
  setFeedback('YouTube 정보를 확인하는 중입니다...');
  const metadata = await fetchMetadata(videoId);
  const songs = [
    ...state.songs,
    {
      id: `${videoId}-${Date.now()}`,
      videoId,
      ...metadata,
      durationSeconds: 0,
      workMusicTabId: 'default'
    }
  ];
  engine.setSongs(songs);
  engine.setState('currentIndex', songs.length - 1);
  engine.rebuildPlayOrder();
  elements.url.value = '';
  persist();
  render();
  await playbackController.loadAt(songs.length - 1, false);
  setFeedback('로컬 목록에 저장했습니다.');
});

elements.list.addEventListener('click', async (event) => {
  const select = event.target.closest('[data-select]');
  const remove = event.target.closest('[data-remove]');
  if (select) {
    const index = Number(select.dataset.select);
    engine.setState('currentIndex', index);
    persist();
    render();
    await playbackController.loadAt(index, false);
  } else if (remove) {
    const index = Number(remove.dataset.remove);
    const state = engine.getSnapshot();
    const songs = state.songs.filter((_song, songIndex) => songIndex !== index);
    playbackController.destroy();
    engine.setSongs(songs);
    engine.setState('currentIndex', Math.min(index, Math.max(0, songs.length - 1)));
    engine.rebuildPlayOrder();
    persist();
    render();
    if (songs.length) await playbackController.loadAt(engine.getSnapshot().currentIndex, false);
  }
});

elements.play.addEventListener('click', () => playbackController.toggle());
elements.previous.addEventListener('click', () => playbackController.previous());
elements.next.addEventListener('click', () => playbackController.next());
elements.seek.addEventListener('input', () => playbackController.seek(elements.seek.value));
elements.volume.addEventListener('input', () =>
  playbackController.setVolume(elements.volume.value)
);
root
  .getElementById('workMusicSeamlessBtn')
  ?.addEventListener('click', playbackController.cycleDjMode);
elements.batchTest.addEventListener('click', () =>
  batchAnalysisController.start(
    engine
      .getActiveSongs()
      .slice(0, 5)
      .map((song) => song.videoId)
  )
);
elements.batchAll.addEventListener('click', () =>
  batchAnalysisController.start(engine.getActiveSongs().map((song) => song.videoId))
);
elements.batchStop.addEventListener('click', () => batchAnalysisController.stop());
elements.batchResume.addEventListener('click', () => batchAnalysisController.resume());

setInterval(() => {
  const currentTime = playbackController.getCurrentTime();
  const duration = playbackController.getDuration();
  const videoId = getWorkMusicPlaybackVideoId(playbackController.getPlayer());
  analysisView?.renderPlayback({ videoId, currentTime, duration });
  elements.seek.max = String(Math.max(1, duration));
  elements.seek.value = String(Math.min(duration || 0, currentTime));
  elements.elapsed.textContent = formatWorkMusicDuration(currentTime);
  elements.duration.textContent = formatWorkMusicDuration(duration);
}, 500);

render();
batchAnalysisController.restore();
if (initialState.songs.length) {
  playbackController.loadAt(initialState.currentIndex, false);
} else {
  elements.url.value = DEFAULT_TEST_PLAYLIST_URL;
  elements.form.requestSubmit();
}
