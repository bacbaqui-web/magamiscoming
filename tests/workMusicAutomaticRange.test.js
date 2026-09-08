import test from 'node:test';
import assert from 'node:assert/strict';
import {
  automaticPlaybackRange,
  calculateDjTransitionPlan
} from '../src/features/workmusic/workMusicAnalysisHelper.js';

const base = { durationSeconds: 200, drumStart: 10, drumEnd: 190 };
test('short intro advances to the first section end with ten seconds of lead-in', () => {
  const sections = [
    { start: 0, end: 5, label: 'intro' },
    { start: 5, end: 25, label: 'verse' },
    { start: 25, end: 50, label: 'chorus' }
  ];
  assert.equal(automaticPlaybackRange({ ...base, sections }).drumStart, 25);
  assert.equal(
    automaticPlaybackRange({ ...base, sections: [...sections].reverse() }).drumStart,
    25
  );
  assert.equal(
    automaticPlaybackRange({ ...base, sections: [{ start: 0, end: 10, label: 'intro' }] })
      .drumStart,
    10
  );
});
test('missing or unusable boundaries preserve detected start instead of cutting at ten seconds', () => {
  assert.equal(automaticPlaybackRange({ ...base, drumStart: 1 }).drumStart, 1);
  assert.equal(
    automaticPlaybackRange({ ...base, sections: [{ start: 0, end: 2, label: 'intro' }] }).drumStart,
    2
  );
  assert.equal(
    automaticPlaybackRange({ durationSeconds: 8, drumStart: 1, drumEnd: 8 }).drumStart,
    1
  );
});
test('section boundaries take priority independently and malformed/crossed ranges fall back', () => {
  const intro = { start: 0, end: 25, label: 'intro' };
  const outro = { start: 170, end: 200, label: 'outro' };
  assert.deepEqual(automaticPlaybackRange({ ...base, sections: [intro, outro] }), {
    drumStart: 25,
    drumEnd: 170
  });
  assert.deepEqual(automaticPlaybackRange({ ...base, sections: [intro] }), {
    drumStart: 25,
    drumEnd: 190
  });
  assert.deepEqual(automaticPlaybackRange({ ...base, sections: [outro] }), {
    drumStart: 10,
    drumEnd: 170
  });
  assert.deepEqual(automaticPlaybackRange({ ...base, sections: [{ ...intro, end: 195 }, outro] }), {
    drumStart: 10,
    drumEnd: 190
  });
  assert.deepEqual(automaticPlaybackRange({ ...base, sections: [{ ...intro, end: NaN }] }), {
    drumStart: 10,
    drumEnd: 190
  });
});
test('DJ uses the same automatic green boundaries as the editor', () => {
  const result = {
    ...base,
    sections: [
      { start: 0, end: 25, label: 'intro' },
      { start: 170, end: 200, label: 'outro' }
    ]
  };
  const plan = calculateDjTransitionPlan({
    currentSong: { videoId: 'a' },
    nextSong: { videoId: 'b', durationSeconds: 200 },
    duration: 200,
    detectedByVideoId: new Map([
      ['a', result],
      ['b', result]
    ])
  });
  assert.equal(plan.nextGreenStart, 25);
  assert.equal(plan.triggerAtSeconds, 155);
});
