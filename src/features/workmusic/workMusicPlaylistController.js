import { cleanYoutubeTitle } from './workMusicHelper.js';

export function createWorkMusicPlaylistController({
  cleanArtist = (value) => value,
  fetchProxyText,
  metadataController,
  parseFeed,
  parseHtml
}) {
  async function fetchPlaylist(playlistId) {
    const cleanId = String(playlistId || '').trim();
    if (!cleanId) return { title: '새 재생목록', items: [], playlistId: cleanId };
    try {
      let title = '새 재생목록';
      try {
        const playlist = await metadataController.apiGet('playlists', {
          part: 'snippet',
          id: cleanId,
          maxResults: 1
        });
        title = cleanYoutubeTitle(playlist?.items?.[0]?.snippet?.title || title);
      } catch (_error) {
        /* 항목 API를 계속 시도한다. */
      }
      const rawItems = [];
      let pageToken = '';
      do {
        const data = await metadataController.apiGet('playlistItems', {
          part: 'snippet,contentDetails',
          playlistId: cleanId,
          maxResults: 50,
          pageToken
        });
        (data.items || []).forEach((item) => {
          const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
          const itemTitle = cleanYoutubeTitle(item?.snippet?.title || '');
          if (!videoId || /^(Deleted|Private) video$/i.test(itemTitle)) return;
          rawItems.push({
            videoId,
            title: itemTitle || `YouTube ${videoId}`,
            artist: cleanArtist(
              item?.snippet?.videoOwnerChannelTitle || item?.snippet?.channelTitle || ''
            )
          });
        });
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      if (rawItems.length) {
        const metadata = await metadataController.fetchVideos(rawItems.map((item) => item.videoId));
        const seen = new Set();
        const items = rawItems
          .filter((item) => !seen.has(item.videoId) && seen.add(item.videoId))
          .map((item) => ({
            ...item,
            ...metadata[item.videoId],
            title: metadata[item.videoId]?.title || item.title,
            artist: metadata[item.videoId]?.artist || item.artist
          }));
        return { title, items, playlistId: cleanId };
      }
    } catch (_error) {
      /* 공식 API 실패 시 기존 fallback을 사용한다. */
    }
    const sources = [
      [
        `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(cleanId)}`,
        parseFeed
      ],
      [`https://www.youtube.com/playlist?list=${encodeURIComponent(cleanId)}`, parseHtml],
      [`https://music.youtube.com/playlist?list=${encodeURIComponent(cleanId)}`, parseHtml]
    ];
    for (const [url, parser] of sources) {
      const text = await fetchProxyText(url);
      if (!text) continue;
      const result = parser(text, cleanId);
      if (result.items.length) return result;
    }
    return { title: '새 재생목록', items: [], playlistId: cleanId };
  }
  return { fetchPlaylist };
}
