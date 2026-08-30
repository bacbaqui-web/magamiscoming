import test from 'node:test';
import assert from 'node:assert/strict';

import { createFilePort } from '../src/ports/filePort.js';

test('File Port forwards the existing Drive compatibility contract without owning UI lifecycle', async () => {
  const calls = [];
  const adapter = {
    cleanupLegacyJsonFiles: async () => calls.push(['cleanup']),
    deleteFile: async (...args) => calls.push(['delete', ...args]),
    downloadBlob: async (...args) => {
      calls.push(['download', ...args]);
      return 'blob-result';
    },
    ensureFolders: async () => ({ app: { id: 'app-folder' } }),
    fileExtFromBlob: (...args) => calls.push(['extension', ...args]),
    findFile: async (...args) => calls.push(['find', ...args]),
    formatDriveFileTime: (...args) => calls.push(['time', ...args]),
    getBookmarkTabFolder: async (...args) => calls.push(['bookmark-folder', ...args]),
    getLegacyFolder: async (...args) => calls.push(['legacy-folder', ...args]),
    loadJson: async (...args) => calls.push(['load-json', ...args]),
    loadNotes: async (...args) => calls.push(['load-notes', ...args]),
    renameBookmarkTabFolder: async (...args) => calls.push(['rename-folder', ...args]),
    resetFolders: () => calls.push(['reset']),
    saveJson: async (...args) => calls.push(['save-json', ...args]),
    saveNotes: async (...args) => calls.push(['save-notes', ...args]),
    uploadMultipart: async (...args) => calls.push(['upload', ...args])
  };
  const port = createFilePort({ adapter });
  const uploadOptions = { name: 'preview.png', blob: {}, parentId: 'folder' };

  assert.equal(await port.downloadBlob('file-1'), 'blob-result');
  await port.findFile('preview.png', 'folder', 'image/png');
  await port.uploadMultipart(uploadOptions);
  await port.deleteFile('file-1');

  assert.deepEqual(calls, [
    ['download', 'file-1'],
    ['find', 'preview.png', 'folder', 'image/png'],
    ['upload', uploadOptions],
    ['delete', 'file-1']
  ]);
  assert.equal('beginDriveUpload' in port, false);
  assert.equal('createObjectURL' in port, false);
  assert.equal('revokeObjectURL' in port, false);
});
