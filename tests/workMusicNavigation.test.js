import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicEngine } from '../src/features/workmusic/workMusicEngine.js';

const songs = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, videoId: id }));
const make = (extra = {}) => createWorkMusicEngine({ initialState: { songs, ...extra } });

test('history starts empty, follows actual playback and supports stepping back without wrapping', () => {
  const e = make();
  assert.equal(e.getPreviousIndex(), -1);
  e.recordPlayed(0);
  assert.equal(e.getPreviousIndex(), -1);
  e.setState('currentIndex', 3);
  e.recordPlayed(3);
  e.setState('currentIndex', 1);
  e.recordPlayed(1);
  assert.equal(e.getPreviousIndex(), 3);
  assert.equal(e.getPreviousIndex(2), 0);
  e.setState('mode', 'random');
  e.rebuildPlayOrder(() => 0.5);
  assert.equal(e.getPreviousIndex(), 3);
  const previous = e.requestPrevious();
  e.setState('currentIndex', previous);
  e.recordPlayed(previous);
  assert.equal(e.getPreviousIndex(), 0);
  e.setState('currentIndex', e.requestPrevious());
  e.recordPlayed(0);
  assert.equal(e.getPreviousIndex(), -1);
});

test('deleted history entries are ignored and switching tabs starts without previous songs', () => {
  const e = make({ tabs: [{ id: 'default' }, { id: 'other' }] });
  e.recordPlayed(0);
  e.setState('currentIndex', 2);
  e.recordPlayed(2);
  e.setSongs(songs.slice(1));
  e.setState('currentIndex', 1);
  assert.equal(e.getPreviousIndex(), -1);
  e.setActiveTab('other');
  assert.equal(e.getPreviousIndex(), -1);
});

test('sequential replacement affects the next song then continues from its original position', () => {
  const e = make();
  const chosen = e.replaceNext(() => 0.5);
  assert.equal(chosen, 3);
  assert.deepEqual(e.getUpcomingIndices().slice(0, 2), [3, 4]);
  assert.equal(e.getSnapshot().currentIndex, 0);
  e.setState('currentIndex', chosen);
  assert.equal(e.getUpcomingIndices()[0], 4);
  e.setState('currentIndex', 4);
  assert.equal(e.getUpcomingIndices()[0], 0);
});

test('random replacement swaps the upcoming candidate without reshuffling the remaining order', () => {
  const e = make({ mode: 'random', playOrder: [0, 3, 1, 4, 2] });
  assert.equal(e.getUpcomingIndices()[0], 3);
  const chosen = e.replaceNext(() => 0.99);
  assert.equal(chosen, 4);
  assert.deepEqual(e.getSnapshot().playOrder, [0, 4, 1, 3, 2]);
  assert.equal(e.getUpcomingIndices()[0], chosen);
  assert.equal(e.getSnapshot().currentIndex, 0);
  e.setState('currentIndex', chosen);
  assert.deepEqual(e.getUpcomingIndices(), [1, 3, 2, 0]);
});

test('replacement needs a third song and does not appear in saved snapshots', () => {
  const e = make({ songs: songs.slice(0, 2) });
  assert.equal(e.replaceNext(), -1);
  const full = make();
  full.recordPlayed(0);
  full.replaceNext(() => 0);
  const restored = createWorkMusicEngine({ initialState: full.getSnapshot() });
  assert.equal(restored.getPreviousIndex(), -1);
  assert.equal(restored.getUpcomingIndices()[0], 1);
});
