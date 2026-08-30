const STORAGE_KEY = 'magamiscoming.workmusicLab.analysisBatch.v1';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function normalizeLocalWorkMusicBatch(value) {
  return {
    batchIds: (Array.isArray(value?.batchIds) ? value.batchIds : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean),
    videoIds: (Array.isArray(value?.videoIds) ? value.videoIds : [])
      .map((item) => String(item || '').trim())
      .filter(
        (item, index, values) => VIDEO_ID_PATTERN.test(item) && values.indexOf(item) === index
      ),
    active: value?.active === true
  };
}

export function loadLocalWorkMusicBatch(storage = localStorage) {
  try {
    return normalizeLocalWorkMusicBatch(JSON.parse(storage.getItem(STORAGE_KEY) || '{}'));
  } catch (_error) {
    return normalizeLocalWorkMusicBatch({});
  }
}

export function saveLocalWorkMusicBatch(value, storage = localStorage) {
  const normalized = normalizeLocalWorkMusicBatch(value);
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export { STORAGE_KEY as LOCAL_WORK_MUSIC_BATCH_STORAGE_KEY };
