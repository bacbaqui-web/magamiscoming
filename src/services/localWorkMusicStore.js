const STORAGE_KEY = 'magamiscoming.workmusicLab.v1';

function normalizeManual(value) {
  const drumStart = Number(value?.drumStart);
  const drumEnd = Number(value?.drumEnd);
  return Number.isFinite(drumStart) &&
    Number.isFinite(drumEnd) &&
    drumStart >= 0 &&
    drumEnd > drumStart
    ? { drumStart, drumEnd }
    : null;
}

function normalizeSong(value) {
  const videoId = String(value?.videoId || '');
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const song = {
    id: String(value?.id || videoId),
    videoId,
    title: String(value?.title || `YouTube ${videoId}`).slice(0, 200),
    artist: String(value?.artist || '').slice(0, 200),
    thumbnail: String(value?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`),
    durationSeconds: Math.max(0, Number(value?.durationSeconds || 0)),
    workMusicTabId: 'default'
  };
  const manual = normalizeManual(value?.mediaAnalysisManual);
  if (manual) song.mediaAnalysisManual = manual;
  return song;
}

export function normalizeLocalWorkMusicState(value) {
  const songs = (Array.isArray(value?.songs) ? value.songs : []).map(normalizeSong).filter(Boolean);
  return {
    songs,
    currentIndex: songs.length
      ? Math.min(Math.max(0, Number(value?.currentIndex || 0)), songs.length - 1)
      : 0,
    volume: Math.max(0, Math.min(100, Number(value?.volume ?? 80))),
    seamlessOverlapSeconds: Math.max(0, Math.min(20, Number(value?.seamlessOverlapSeconds || 0)))
  };
}

export function loadLocalWorkMusicState(storage = localStorage) {
  try {
    return normalizeLocalWorkMusicState(JSON.parse(storage.getItem(STORAGE_KEY) || '{}'));
  } catch (_error) {
    return normalizeLocalWorkMusicState({});
  }
}

export function saveLocalWorkMusicState(state, storage = localStorage) {
  const normalized = normalizeLocalWorkMusicState(state);
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export { STORAGE_KEY as LOCAL_WORK_MUSIC_STORAGE_KEY };
