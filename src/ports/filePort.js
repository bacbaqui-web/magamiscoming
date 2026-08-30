export function createFilePort({ adapter }) {
  return {
    cleanupLegacyJsonFiles: () => adapter.cleanupLegacyJsonFiles(),
    deleteFile: (fileId) => adapter.deleteFile(fileId),
    downloadBlob: (fileId) => adapter.downloadBlob(fileId),
    ensureFolders: () => adapter.ensureFolders(),
    fileExtFromBlob: (file) => adapter.fileExtFromBlob(file),
    findFile: (name, parentId, mimeType) => adapter.findFile(name, parentId, mimeType),
    formatDriveFileTime: (ms) => adapter.formatDriveFileTime(ms),
    getBookmarkTabFolder: (tabId) => adapter.getBookmarkTabFolder(tabId),
    getLegacyFolder: (name) => adapter.getLegacyFolder(name),
    loadJson: (folderId, fileName) => adapter.loadJson(folderId, fileName),
    loadNotes: (folderId, systemFolderId) => adapter.loadNotes(folderId, systemFolderId),
    renameBookmarkTabFolder: (tabId, prevList, nextList) =>
      adapter.renameBookmarkTabFolder(tabId, prevList, nextList),
    resetFolders: () => adapter.resetFolders(),
    saveJson: (folderId, fileName, value) => adapter.saveJson(folderId, fileName, value),
    saveNotes: (folderId, systemFolderId, notes) =>
      adapter.saveNotes(folderId, systemFolderId, notes),
    uploadMultipart: (options) => adapter.uploadMultipart(options)
  };
}
