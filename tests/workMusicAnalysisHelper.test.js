import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateSmartTransitionPlan } from '../src/features/workmusic/workMusicAnalysisHelper.js';

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
