// getVideoData is not provided by every YouTube player. The public URL API
// identifies the actual loaded video without guessing from the selected song.
export function getWorkMusicPlaybackVideoId(player) {
  try {
    const id = player?.getVideoData?.()?.video_id;
    if (id) return String(id);
  } catch (_) {
    // Some player wrappers do not implement getVideoData.
  }
  try {
    return new URL(player?.getVideoUrl?.() || '').searchParams.get('v') || '';
  } catch (_) {
    return '';
  }
}
