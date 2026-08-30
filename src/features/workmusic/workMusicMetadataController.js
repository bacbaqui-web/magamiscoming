import {
  cleanYoutubeTitle,
  extractYoutubeVideoId,
  formatWorkMusicDuration,
  normalizeYoutubeUrl,
  parseYoutubeIsoDuration
} from './workMusicHelper.js';

function parseDurationFromHtml(html) {
  const text = String(html || '');
  const length = text.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/i);
  if (length) return Number(length[1]) || 0;
  const duration = text.match(/"duration"\s*:\s*"(PT[^"]+)"/i);
  return duration ? parseYoutubeIsoDuration(duration[1]) : 0;
}

function parseTitleFromHtml(html, root) {
  const text = String(html || '');
  const match =
    text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    text.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match) return '';
  const textarea = root.createElement('textarea');
  textarea.innerHTML = match[1];
  return cleanYoutubeTitle(textarea.value);
}

export function createWorkMusicMetadataController({ apiKey = '', root = document, youtubePort }) {
  async function apiGet(path, params) {
    if (!apiKey) throw new Error('YouTube API 키가 없습니다.');
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    url.searchParams.set('key', apiKey);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await youtubePort.fetchResponse(url.toString(), { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `${response.status}`);
    return data;
  }

  async function fetchVideos(videoIds) {
    const ids = [...new Set((videoIds || []).filter(Boolean))];
    const metadata = {};
    for (let index = 0; index < ids.length; index += 50) {
      const data = await apiGet('videos', {
        part: 'snippet,contentDetails',
        id: ids.slice(index, index + 50).join(','),
        maxResults: 50
      });
      (data.items || []).forEach((item) => {
        const seconds = parseYoutubeIsoDuration(item?.contentDetails?.duration);
        metadata[item.id] = {
          videoId: item.id,
          title: cleanYoutubeTitle(item?.snippet?.title || `YouTube ${item.id}`),
          durationSeconds: seconds,
          durationText: formatWorkMusicDuration(seconds),
          thumbnail:
            item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || '',
          channelTitle: item?.snippet?.channelTitle || '',
          artist: item?.snippet?.channelTitle || ''
        };
      });
    }
    return metadata;
  }

  async function fetchThroughFallbacks(url, parse) {
    const endpoints = [
      { type: 'json', url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` },
      { type: 'text', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` }
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await youtubePort.fetchResponse(endpoint.url, { cache: 'no-store' });
        if (!response.ok) continue;
        const body = endpoint.type === 'json' ? await response.json() : await response.text();
        const parsed = parse(endpoint.type === 'json' ? body.contents || body.data || '' : body);
        if (parsed) return parsed;
      } catch (_error) {
        // 다음 proxy를 시도한다.
      }
    }
    return null;
  }

  async function fetchDuration(value) {
    const videoId = extractYoutubeVideoId(value) || String(value || '').trim();
    if (!videoId) return 0;
    try {
      const metadata = await fetchVideos([videoId]);
      if (metadata[videoId]?.durationSeconds) return metadata[videoId].durationSeconds;
    } catch (_error) {
      // API 키가 없거나 실패하면 기존 proxy fallback을 사용한다.
    }
    return (
      (await fetchThroughFallbacks(
        `https://www.youtube.com/watch?v=${videoId}`,
        parseDurationFromHtml
      )) || 0
    );
  }

  async function fetchTitle(value) {
    const url = normalizeYoutubeUrl(value);
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) return '';
    try {
      const metadata = await fetchVideos([videoId]);
      if (metadata[videoId]?.title) return metadata[videoId].title;
    } catch (_error) {
      // API 키가 없거나 실패하면 oEmbed/proxy를 사용한다.
    }
    try {
      const response = await youtubePort.fetchResponse(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        { cache: 'no-store' }
      );
      if (response.ok) return cleanYoutubeTitle((await response.json()).title || '');
    } catch (_error) {
      // HTML fallback을 사용한다.
    }
    return (
      (await fetchThroughFallbacks(url, (html) => parseTitleFromHtml(html, root))) ||
      `YouTube ${videoId}`
    );
  }

  return { apiGet, fetchDuration, fetchTitle, fetchVideos };
}
