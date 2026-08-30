const IMAGE_URL_PATTERN = /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i;
const VIDEO_URL_PATTERN =
  /youtu\.be|youtube\.com|vimeo\.com|\.(mp4|webm|ogg|mov)(\?|$)|missav\.com/i;

export function extractBookmarkDomain(url) {
  if (!url) return 'Unknown';
  try {
    const parsed = new URL(String(url).includes('://') ? String(url) : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '') || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export function isBookmarkImageUrl(value) {
  try {
    new URL(String(value));
    return IMAGE_URL_PATTERN.test(String(value));
  } catch {
    return false;
  }
}

export function isBookmarkVideoUrl(value) {
  if (!value) return false;
  try {
    new URL(String(value));
    return VIDEO_URL_PATTERN.test(String(value));
  } catch {
    return false;
  }
}

export function isGenericBookmarkUrl(value) {
  try {
    const parsed = new URL(String(value));
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      parsed.hostname.includes('.') &&
      !isBookmarkImageUrl(value) &&
      !isBookmarkVideoUrl(value) &&
      !/instagram\.com/i.test(String(value))
    );
  } catch {
    return false;
  }
}

export function getOpenableBookmarkUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text);
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

export function getYoutubeThumbnail(url) {
  const match = String(url || '').match(
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  );
  return match?.[2]?.length === 11 ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg` : null;
}

export function sortBookmarkTabs(tabs) {
  return [...tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function sortBookmarksNewestFirst(bookmarks) {
  return [...bookmarks].sort(
    (a, b) =>
      (b.timestamp?.toMillis?.() || b.timestampMs || 0) -
      (a.timestamp?.toMillis?.() || a.timestampMs || 0)
  );
}
