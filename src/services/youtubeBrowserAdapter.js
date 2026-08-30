export function createYoutubeBrowserAdapter({ host = window } = {}) {
  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YouTube request failed: ${response.status}`);
    return response.text();
  }

  return {
    createPlayer: (elementId, options) => new host.YT.Player(elementId, options),
    ensureIframeApi() {
      if (host.YT?.Player) return Promise.resolve(host.YT);
      return new Promise((resolve) => {
        const previous = host.onYouTubeIframeAPIReady;
        host.onYouTubeIframeAPIReady = () => {
          previous?.();
          resolve(host.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(script);
        }
      });
    },
    fetchText,
    fetchResponse: (url, options = { cache: 'no-store' }) => fetch(url, options),
    player: {
      cue: (player, videoId) => player?.cueVideoById?.(videoId),
      destroy: (player) => player?.destroy?.(),
      duration: (player) => Number(player?.getDuration?.() || 0),
      pause: (player) => player?.pauseVideo?.(),
      play: (player) => player?.playVideo?.(),
      seek: (player, seconds) => player?.seekTo?.(seconds, true),
      setVolume: (player, volume) => player?.setVolume?.(volume),
      state: (player) => player?.getPlayerState?.(),
      time: (player) => Number(player?.getCurrentTime?.() || 0)
    }
  };
}
