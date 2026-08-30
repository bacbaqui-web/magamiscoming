import { driveTimestamp } from './appDataTransforms.js';

export function installBookmarkDriveHandlers({
  beginDriveUpload,
  deleteDriveFile,
  ensureLogin,
  fileExtFromBlob,
  finishDriveUpload,
  formatDriveFileTime,
  genId,
  getBookmarkTabDriveFolder,
  renderBookmarks,
  revokeDriveImageUrl,
  saveNonNotesDataNow,
  scheduleSaveAppData,
  scheduleSaveNonNotesData,
  setDriveStatus,
  uploadDriveMultipart
}) {
  const getController = () => window.__bookmarksControllerCompatibility;

  function nowMs() {
    return Date.now();
  }

  async function uploadFileToDrive(file, folderId, namePrefix = 'file') {
    beginDriveUpload(
      namePrefix === 'bookmark_preview' ? '미리보기 Drive 업로드' : '이미지 Drive 업로드'
    );
    try {
      const ms = nowMs();
      let parentId = folderId;
      if (!parentId) {
        const tabId = window.__bookmarkActiveTabId || 'default';
        const tabFolder = await getBookmarkTabDriveFolder(tabId);
        parentId = tabFolder.id;
      }
      const ext = fileExtFromBlob(file);
      const name = `${formatDriveFileTime(ms)}${ext}`;
      const uploaded = await uploadDriveMultipart({
        name,
        blob: file,
        parentId,
        mimeType: file.type || 'image/png'
      });
      uploaded.createdName = name;
      uploaded.createdMs = ms;
      return uploaded;
    } finally {
      finishDriveUpload();
    }
  }

  function addBasicBookmark(type, values) {
    const row = {
      id: genId('bm'),
      url: null,
      title: null,
      bookmarkTabId: window.__bookmarkActiveTabId || 'default',
      timestamp: driveTimestamp(nowMs()),
      timestampMs: nowMs(),
      ...values,
      type
    };
    const controller = getController();
    if (controller) controller.addBookmark(row);
    else {
      window.imageBookmarks.push(row);
      renderBookmarks();
      scheduleSaveAppData();
    }
  }

  window.addVideoBookmark = async (url) => {
    if (!ensureLogin()) return;
    addBasicBookmark('video', {
      pageUrl: url,
      sourceDomain: window.extractDomain?.(url) || 'Unknown'
    });
  };

  window.addGenericBookmark = async (url) => {
    if (!ensureLogin()) return;
    addBasicBookmark('link', {
      pageUrl: url,
      sourceDomain: window.extractDomain?.(url) || 'Unknown'
    });
  };

  window.addInstagramBookmark = async (embedCode) => {
    if (!ensureLogin()) return;
    let pageUrl = '인스타그램 게시물';
    try {
      const doc = new DOMParser().parseFromString(embedCode, 'text/html');
      const blockquote = doc.querySelector('blockquote.instagram-media');
      if (blockquote?.cite) pageUrl = blockquote.cite;
    } catch (_) {}
    addBasicBookmark('instagram', {
      pageUrl,
      embedCode,
      sourceDomain: window.extractDomain?.(pageUrl) || 'Unknown'
    });
  };

  window.addRemoteImage = async (url, pageUrl) => {
    if (!ensureLogin()) return;
    const row = {
      id: genId('bm'),
      url,
      pageUrl: pageUrl || null,
      type: 'remote',
      sourceDomain: window.extractDomain?.(pageUrl || url) || 'Unknown',
      bookmarkTabId: window.__bookmarkActiveTabId || 'default',
      timestamp: driveTimestamp(nowMs()),
      timestampMs: nowMs()
    };
    const controller = getController();
    if (controller) controller.addBookmark(row);
    else {
      window.imageBookmarks.push(row);
      renderBookmarks();
      scheduleSaveAppData();
    }
  };

  window.addImage = async (file, pageUrl) => {
    if (!ensureLogin()) return;
    if (typeof file === 'string') return window.addRemoteImage(file, pageUrl || file);
    try {
      const url = URL.createObjectURL(file);
      const ms = nowMs();
      const row = {
        id: genId('bm'),
        url,
        pageUrl: pageUrl || null,
        type: 'local_pending_image',
        driveFileId: null,
        title: null,
        sourceDomain: pageUrl ? window.extractDomain?.(pageUrl) || 'Unknown' : 'Drive 업로드 대기',
        bookmarkTabId: window.__bookmarkActiveTabId || 'default',
        timestamp: driveTimestamp(ms),
        timestampMs: ms,
        uploadStatus: 'pending'
      };
      const controller = getController();
      if (controller) controller.addBookmark(row, { save: false });
      else {
        window.imageBookmarks.push(row);
        renderBookmarks();
      }
      setDriveStatus('이미지 Drive 업로드 중...');
      uploadFileToDrive(file, null, 'bookmark')
        .then((uploaded) => {
          const bookmark =
            getController()?.findBookmark(row.id) ||
            (window.imageBookmarks || []).find((item) => item.id === row.id);
          if (!bookmark) return;
          const changes = {
            driveFileId: uploaded.id,
            type: 'drive_image',
            sourceDomain: pageUrl ? window.extractDomain?.(pageUrl) || 'Unknown' : 'Google Drive',
            uploadStatus: 'done'
          };
          if (uploaded.createdMs) {
            changes.timestamp = driveTimestamp(uploaded.createdMs);
            changes.timestampMs = uploaded.createdMs;
          }
          if (controller) controller.updateBookmark(row.id, changes, { save: false });
          else {
            Object.assign(bookmark, changes);
            renderBookmarks();
          }
          return saveNonNotesDataNow();
        })
        .then(() => {
          setDriveStatus('이미지 Drive 저장 완료');
        })
        .catch((e) => {
          console.error(e);
          if (controller)
            controller.updateBookmark(row.id, { uploadStatus: 'error' }, { save: false });
          else {
            const bookmark = (window.imageBookmarks || []).find((item) => item.id === row.id);
            if (bookmark) bookmark.uploadStatus = 'error';
            renderBookmarks();
          }
          setDriveStatus('이미지 Drive 업로드 실패', true);
        });
    } catch (e) {
      window.showAlert('이미지 추가 실패: ' + (e.message || e));
    }
  };

  window.updateBookmarkTitle = async (id, newTitle) => {
    const controller = getController();
    if (controller) {
      controller.updateBookmark(id, { title: newTitle || null });
      return;
    }
    const bookmark = (window.imageBookmarks || []).find((item) => item.id === id);
    if (bookmark) {
      bookmark.title = newTitle || null;
      renderBookmarks();
      scheduleSaveNonNotesData();
    }
  };

  window.uploadBookmarkPreviewImage = async (bookmarkId, file) => {
    if (!ensureLogin()) return;
    const controller = getController();
    const bookmark =
      controller?.findBookmark(bookmarkId) ||
      (window.imageBookmarks || []).find((item) => item.id === bookmarkId);
    if (!bookmark) return;
    const previewImageUrl = URL.createObjectURL(file);
    if (controller)
      controller.updateBookmark(
        bookmarkId,
        { previewImageUrl, previewUploadStatus: 'pending' },
        { save: false }
      );
    else {
      bookmark.previewImageUrl = previewImageUrl;
      bookmark.previewUploadStatus = 'pending';
      renderBookmarks();
    }
    setDriveStatus('미리보기 Drive 업로드 중...');
    uploadFileToDrive(file, null, 'bookmark_preview')
      .then((uploaded) => {
        const row =
          controller?.findBookmark(bookmarkId) ||
          (window.imageBookmarks || []).find((item) => item.id === bookmarkId);
        if (!row) return;
        if (controller)
          controller.updateBookmark(
            bookmarkId,
            { previewDriveFileId: uploaded.id, previewUploadStatus: 'done' },
            { save: false }
          );
        else {
          row.previewDriveFileId = uploaded.id;
          row.previewUploadStatus = 'done';
          renderBookmarks();
        }
        return saveNonNotesDataNow();
      })
      .then(() => setDriveStatus('미리보기 Drive 저장 완료'))
      .catch((e) => {
        console.error(e);
        if (controller)
          controller.updateBookmark(bookmarkId, { previewUploadStatus: 'error' }, { save: false });
        else {
          const row = (window.imageBookmarks || []).find((item) => item.id === bookmarkId);
          if (row) row.previewUploadStatus = 'error';
          renderBookmarks();
        }
        setDriveStatus('미리보기 Drive 업로드 실패', true);
      });
  };

  window.deleteImage = async (id) => {
    if (!ensureLogin()) return;
    const controller = getController();
    const row =
      controller?.findBookmark(id) ||
      (window.imageBookmarks || []).find((bookmark) => bookmark.id === id);
    if (row) {
      await deleteDriveFile(row.driveFileId);
      await deleteDriveFile(row.previewDriveFileId);
      revokeDriveImageUrl(row.driveFileId);
      revokeDriveImageUrl(row.previewDriveFileId);
    }
    if (controller) controller.deleteBookmark(id);
    else {
      window.imageBookmarks = (window.imageBookmarks || []).filter(
        (bookmark) => bookmark.id !== id
      );
      renderBookmarks();
      scheduleSaveNonNotesData();
    }
    window.showFeedbackMessage('북마크가 삭제되었습니다.');
  };
}
