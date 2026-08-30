import test from 'node:test';
import assert from 'node:assert/strict';

import { createMediaAnalysisPort } from '../src/ports/mediaAnalysisPort.js';

test('media analysis port accepts only a strict YouTube videoId', async () => {
  const received = [];
  const port = createMediaAnalysisPort({
    adapter: {
      enabled: true,
      createJob: async (value) => received.push(value),
      getJob: async () => ({}),
      getResult: async () => ({})
    }
  });

  await port.createJob('dQw4w9WgXcQ');
  assert.deepEqual(received, ['dQw4w9WgXcQ']);
  for (const invalid of ['', 'https://youtu.be/dQw4w9WgXcQ', '../private', 'too-short']) {
    await assert.rejects(
      Promise.resolve().then(() => port.createJob(invalid)),
      TypeError
    );
  }
});
