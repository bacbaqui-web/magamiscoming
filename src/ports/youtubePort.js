export function createYoutubePort({ adapter }) {
  return {
    createPlayer: (elementId, options) => adapter.createPlayer(elementId, options),
    ensureIframeApi: () => adapter.ensureIframeApi(),
    fetchResponse: (url, options) => adapter.fetchResponse(url, options),
    fetchText: (url) => adapter.fetchText(url),
    player: adapter.player
  };
}
