import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSmartTransitionPlan,
  calculateDjTransitionPlan,
  normalizeAnalysisRange
} from '../src/features/workmusic/workMusicAnalysisHelper.js';

test('DJ fades only inside the non-green tail and head, including subsecond and late starts', () => {
  for (const outro of [0, 0.15, 1, 12, 30]) {
    for (const intro of [0, 0.25, 3, 15, 40]) {
      for (const late of [0, 0.5, 10]) {
        const plan = calculateDjTransitionPlan({
          currentSong: { mediaAnalysisManual: { drumStart: 5, drumEnd: 100 - outro } },
          nextSong: { mediaAnalysisManual: { drumStart: intro, drumEnd: 90 } },
          duration: 100,
          currentTime: 100 - outro + late,
          maximumFadeSeconds: 10
        });
        assert.equal(plan.triggerAtSeconds, 100 - outro);
        assert.ok(plan.crossfadeSeconds <= Math.max(0, outro - late) + 1e-9);
        assert.ok(plan.crossfadeSeconds <= intro);
        assert.ok(plan.crossfadeSeconds <= 10);
        assert.equal(plan.nextStartSeconds + plan.crossfadeSeconds, intro);
      }
    }
  }
});

test('DJ uses displayed cached range, but saved edits take priority; verse is not a playback cutoff', () => {
  const detectedByVideoId = new Map([
    ['a', { drumStart: 10, drumEnd: 80 }],
    ['b', { drumStart: 15, drumEnd: 90 }]
  ]);
  const input = {
    currentSong: { videoId: 'a' },
    nextSong: { videoId: 'b' },
    duration: 100,
    detectedByVideoId
  };
  assert.equal(calculateDjTransitionPlan(input).triggerAtSeconds, 80);
  input.currentSong.mediaAnalysisManual = { drumStart: 10, drumEnd: 85, verseEnd: 40 };
  assert.equal(calculateDjTransitionPlan(input).triggerAtSeconds, 85);
  assert.deepEqual(normalizeAnalysisRange({ drumStart: 10, drumEnd: 85, verseEnd: 200 }), {
    drumStart: 10,
    drumEnd: 85,
    verseEnd: 85
  });
  assert.deepEqual(normalizeAnalysisRange({ drumStart: 10, drumEnd: 85 }), {
    drumStart: 10,
    drumEnd: 85
  });
});

test('smart transition uses both songs manual drum boundaries first', () => {
  const plan = calculateSmartTransitionPlan({
    currentSong: { mediaAnalysisManual: { drumStart: 4, drumEnd: 190 } },
    nextSong: { mediaAnalysisManual: { drumStart: 12, drumEnd: 180 } },
    fixedOverlapSeconds: 8
  });
  assert.deepEqual(plan, { mode: 'smart', source: 'manual', startNextAtSeconds: 178 });
});

test('smart transition accepts only high-confidence automatic pairs', () => {
  const currentSong = { videoId: 'aaaaaaaaaaa' };
  const nextSong = { videoId: 'bbbbbbbbbbb' };
  const detectedByVideoId = new Map([
    ['aaaaaaaaaaa', { drumStart: 4, drumEnd: 190, durationSeconds: 200, confidence: 0.8 }],
    ['bbbbbbbbbbb', { drumStart: 12, drumEnd: 180, durationSeconds: 200, confidence: 0.7 }]
  ]);
  assert.equal(
    calculateSmartTransitionPlan({ currentSong, nextSong, detectedByVideoId }).source,
    'detected'
  );
  detectedByVideoId.get('bbbbbbbbbbb').confidence = 0.49;
  assert.deepEqual(
    calculateSmartTransitionPlan({
      currentSong,
      nextSong,
      detectedByVideoId,
      fixedOverlapSeconds: 8
    }),
    { mode: 'fixed', overlapSeconds: 8 }
  );
});
