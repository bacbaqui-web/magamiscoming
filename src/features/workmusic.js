import { createWorkMusicComposer } from './workmusic/workMusicComposer.js';

export function initWorkMusic(options = {}) {
  return createWorkMusicComposer(options);
}
