import test from 'node:test';
import assert from 'node:assert/strict';

import { createDriveFilesStore } from '../src/services/driveFiles.js';

function jsonResponse(value) {
  return {
    async blob() {
      return value;
    },
    async json() {
      return value;
    }
  };
}

test('Drive File Adapter preserves folder names and caches the existing folder tree', async () => {
  const calls = [];
  const ids = new Map();
  const adapter = createDriveFilesStore({
    driveFetch: async (url, options = {}) => {
      calls.push([url, options]);
      if (!options.method) return jsonResponse({ files: [] });
      const metadata = JSON.parse(options.body);
      const id = ids.get(metadata.name) || `id-${ids.size + 1}`;
      ids.set(metadata.name, id);
      return jsonResponse({ id, name: metadata.name });
    },
    firebaseEnabled: false
  });

  const first = await adapter.ensureFolders();
  const second = await adapter.ensureFolders();

  assert.equal(first, second);
  assert.deepEqual(
    [...ids.keys()],
    ['magamiscoming', '북마크', '클립뷰어', 'system', '메모', 'current']
  );
  assert.equal(calls.filter(([, options]) => options.method === 'POST').length, 6);
});

test('Drive File Adapter preserves upload, download, and delete request contracts', async () => {
  const calls = [];
  const downloaded = new Blob(['preview'], { type: 'image/png' });
  const adapter = createDriveFilesStore({
    driveFetch: async (url, options = {}) => {
      calls.push([url, options]);
      if (url.includes('alt=media')) return jsonResponse(downloaded);
      return jsonResponse({ id: 'file-1', name: 'preview.png', mimeType: 'image/png' });
    },
    firebaseEnabled: true
  });

  const uploaded = await adapter.uploadMultipart({
    name: 'preview.png',
    blob: downloaded,
    parentId: 'folder-1',
    mimeType: 'image/png'
  });
  assert.equal(uploaded.id, 'file-1');
  assert.match(calls[0][0], /upload\/drive\/v3\/files\?uploadType=multipart/);
  assert.equal(calls[0][1].method, 'POST');

  assert.equal(await adapter.downloadBlob('file-1'), downloaded);
  assert.equal(calls[1][0], 'https://www.googleapis.com/drive/v3/files/file-1?alt=media');

  await adapter.deleteFile('file-1');
  assert.equal(calls[2][0], 'https://www.googleapis.com/drive/v3/files/file-1');
  assert.equal(calls[2][1].method, 'DELETE');
});
