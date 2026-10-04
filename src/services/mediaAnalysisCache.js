// Cache Storage persists per origin across reloads without putting large waveforms in Firestore.
export function createMediaAnalysisCache(storage = globalThis.caches) {
  return {
    async clearPrefix(prefix) {
      try {
        const cache = await storage?.open('workmusic-analysis-v1');
        for (const key of (await cache?.keys()) || []) {
          if (key.url.startsWith(prefix)) await cache.delete(key);
        }
      } catch {
        /* Optional cleanup must not interrupt playback. */
      }
    },
    async get(key) {
      try {
        const cache = await storage?.open('workmusic-analysis-v1');
        const response = await cache?.match(key);
        return response ? await response.json() : null;
      } catch {
        return null;
      }
    },
    async put(key, value) {
      try {
        const cache = await storage?.open('workmusic-analysis-v1');
        await cache?.put(
          key,
          new Response(JSON.stringify(value), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      } catch {
        /* Storage denial or quota must not break online analysis. */
      }
    }
  };
}
