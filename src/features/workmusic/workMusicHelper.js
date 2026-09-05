const DEFAULT_TAB = Object.freeze({ id: 'default', name: '기본', order: 0 });

export function putFailedSongsLast(order, songs) {
  return [...order].sort(
    (a, b) =>
      Number(songs[a]?.playbackStatus === 'error') - Number(songs[b]?.playbackStatus === 'error')
  );
}

export function normalizeSeamlessSeconds(value) {
  return Math.max(0, Math.min(20, Math.round(Number(value || 0))));
}

export function normalizeVolume(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

export function normalizeWorkMusicTabs(tabs) {
  const list = Array.isArray(tabs) && tabs.length ? tabs : [DEFAULT_TAB];
  return list.map((tab, index) => ({ ...tab, order: Number(tab.order ?? index * 10) }));
}

export function extractYoutubeVideoId(value) {
  const raw = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      return match?.[1] || '';
    }
  } catch (_error) {
    return '';
  }
  return '';
}

export function normalizeYoutubeUrl(value) {
  const videoId = extractYoutubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
}

export function extractYoutubePlaylistId(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.searchParams.get('list') || '';
  } catch (_error) {
    return '';
  }
}

export function cleanYoutubeTitle(value) {
  return String(value || '')
    .replace(/\s*[-|]\s*YouTube\s*$/i, '')
    .replace(/\s*\((?:official\s*)?(?:music\s*)?video\)\s*$/i, '')
    .trim();
}

export function parseYoutubeIsoDuration(value) {
  const match = String(value || '').match(
    /^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/
  );
  if (!match) return 0;
  return Math.round(
    Number(match[1] || 0) * 86400 +
      Number(match[2] || 0) * 3600 +
      Number(match[3] || 0) * 60 +
      Number(match[4] || 0)
  );
}

export function formatWorkMusicDuration(value) {
  const seconds = Math.max(0, Math.floor(Number(value || 0)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function createPlayOrder(length, mode, random = Math.random) {
  const order = Array.from({ length: Math.max(0, Number(length) || 0) }, (_, index) => index);
  if (mode !== 'random') return order;
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order;
}

export function getAdjacentIndex(currentIndex, step, length, order = []) {
  if (!length) return -1;
  const playOrder = order.length === length ? order : createPlayOrder(length, 'sequential');
  const position = Math.max(0, playOrder.indexOf(Number(currentIndex || 0)));
  return playOrder[(position + step + playOrder.length) % playOrder.length];
}
