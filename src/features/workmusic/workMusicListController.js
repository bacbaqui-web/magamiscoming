export function createWorkMusicListController({ engine, render, save }) {
  const commit = async (songs) => {
    engine.setSongs(songs);
    render?.();
    await save?.();
  };
  return {
    add: (songs) => commit([...engine.getSnapshot().songs, ...songs]),
    update(id, patch) {
      return commit(
        engine.getSnapshot().songs.map((song) => (song.id === id ? { ...song, ...patch } : song))
      );
    },
    remove(id) {
      return commit(engine.getSnapshot().songs.filter((song) => song.id !== id));
    },
    replace: commit
  };
}
