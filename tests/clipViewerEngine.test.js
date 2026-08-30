import test from 'node:test';
import assert from 'node:assert/strict';

import { createClipViewerEngine } from '../src/features/clipviewer/clipViewerEngine.js';

test('ClipViewerEngine이 런타임 File/Blob과 저장 manifest를 분리해 소유한다', () => {
  const engine = createClipViewerEngine();
  const file = { name: '001.clip' };
  const blob = { type: 'image/png' };
  engine.replaceSourceFiles([file]);
  engine.addLocalPage({ name: '001.png', blob, url: 'blob:runtime', type: 'image/png' });
  engine.replaceManifest([{ index: 0, name: '001.png', fileId: 'drive-1', mimeType: 'image/png' }]);

  assert.deepEqual(engine.getManifest(), [
    { index: 0, name: '001.png', fileId: 'drive-1', mimeType: 'image/png' }
  ]);
  assert.equal(engine.getSnapshot().sourceFiles[0], file);
  assert.equal(engine.getSnapshot().localPages[0].blob, blob);
  assert.equal('blob' in engine.getManifest()[0], false);
  assert.equal('url' in engine.getManifest()[0], false);
});

test('외부에서 Snapshot 배열을 바꿔도 Engine 상태는 바뀌지 않는다', () => {
  const engine = createClipViewerEngine();
  engine.replaceManifest([{ name: '001.png', fileId: 'drive-1' }]);
  const snapshot = engine.getSnapshot();
  snapshot.manifest[0].name = 'changed.png';
  snapshot.manifest.push({ name: '002.png' });

  assert.deepEqual(engine.getManifest(), [{ name: '001.png', fileId: 'drive-1' }]);
});
