import test from 'node:test';
import assert from 'node:assert/strict';
import { findWaveformRepetitions } from '../src/features/workmusic/workMusicRepetitionHelper.js';
import { suggestVerseEnd } from '../src/features/workmusic/workMusicAnalysisHelper.js';

function fixture(starts) {
  const waveform = Array.from({ length: 200 }, (_, i) => 0.2 + Math.sin(i * 1.618) * 0.01);
  const pattern = Array.from(
    { length: 20 },
    (_, i) => 0.65 + Math.sin(i * 1.7) * 0.15 + Math.cos(i * 0.43) * 0.1
  );
  for (const start of starts) waveform.splice(start, 20, ...pattern);
  return { durationSeconds: 200, drumStart: 0, waveform, sections: [] };
}
test('recurring waveform locates chorus endings instead of the midpoint', () => {
  const result = fixture([40, 120]);
  const sections = findWaveformRepetitions(result);
  assert.ok(sections.length >= 2);
  const suggestion = suggestVerseEnd(result, { drumStart: 0, drumEnd: 190 });
  assert.ok(suggestion.value >= 57 && suggestion.value <= 66, String(suggestion.value));
  assert.match(suggestion.reason, /음파 반복/);
});
test('opening recurrence is skipped, uniform loops are not labelled chorus', () => {
  const suggestion = suggestVerseEnd(fixture([0, 60, 140]), { drumStart: 0, drumEnd: 190 });
  assert.ok(suggestion.value >= 77 && suggestion.value <= 86, String(suggestion.value));
  assert.deepEqual(
    findWaveformRepetitions({ durationSeconds: 200, waveform: Array(200).fill(0.6) }),
    []
  );
});
