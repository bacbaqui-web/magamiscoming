import { createClipFileOrder } from './clipViewerHelper.js';

const DESKTOP_EMPTY = `
  <div class="clip-empty-title">CMC 프로젝트를 열어주세요</div>
  <div class="clip-empty-body">CMC와 CLIP 파일이 함께 있는 관리 폴더를 선택하면 작품 순서대로 미리보기를 표시합니다.</div>
`;
const MOBILE_EMPTY = `
  <div class="clip-empty-title">PC에서 올린 CLIP 미리보기를 확인하세요</div>
  <div class="clip-empty-body">PC에서 CLIP 폴더를 열면 미리보기가 Drive에 저장되고, 모바일에서는 로그인만 하면 같은 화면을 볼 수 있습니다.</div>
`;

export function createClipViewerController({
  browser,
  composer,
  drive,
  engine,
  host = window,
  refreshFeatures = () => {}
}) {
  let autoSyncRunning = false;

  function setSync(phase, message) {
    engine.setSync(phase, message);
    composer.setStatus(message);
  }

  function clearLocalPages() {
    for (const page of engine.clearLocalPages()) {
      if (page.url) browser.revokeObjectUrl(page.url);
    }
    composer.clearPages();
  }

  async function resolveOrder(files) {
    const cmcFiles = files
      .filter((file) => file.name.toLowerCase().endsWith('.cmc'))
      .sort((a, b) =>
        (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name)
      );
    const candidates = [];
    for (const file of cmcFiles) {
      try {
        candidates.push({
          name: file.name,
          relativePath: file.webkitRelativePath || file.name,
          pagePaths: await browser.readCmcPagePaths(file)
        });
      } catch (error) {
        console.warn('CMC 읽기 실패', file.name, error);
        candidates.push({ name: file.name, error });
      }
    }
    return createClipFileOrder(files, candidates);
  }

  async function uploadToDrive({ auto = false } = {}) {
    if (!drive.ensureLogin()) return;
    const pages = engine.getSnapshot().localPages;
    if (!pages.length) return setSync('idle', '먼저 CLIP 폴더를 열어주세요.');
    const clipCurrent = await drive.ensureCurrentFolder();
    const manifest = [];
    const finishBatch = drive.beginUploadBatch(pages.length, 'CLIP Drive 업로드');
    engine.setSync('uploading', '');
    try {
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        setSync('uploading', `${index + 1} / ${pages.length} Drive 업로드 중\n${page.name}`);
        const existing = await drive.findFile(page.name, clipCurrent.id);
        const uploaded = await drive.upload({
          name: page.name,
          blob: page.blob,
          parentId: clipCurrent.id,
          fileId: existing?.id || null,
          mimeType: page.type || 'image/png'
        });
        manifest.push({
          index,
          name: page.name,
          fileId: uploaded.id,
          mimeType: uploaded.mimeType || page.type || 'image/png'
        });
      }
    } finally {
      finishBatch();
    }
    engine.replaceManifest(manifest);
    await drive.saveManifest(engine.getManifest());
    setSync('complete', `Drive 업로드 완료\n페이지: ${manifest.length}개`);
    if (!auto) host.showFeedbackMessage?.('CLIP 미리보기가 Drive에 저장되었습니다.');
  }

  async function syncIfReady() {
    if (autoSyncRunning || !engine.getSnapshot().localPages.length) return;
    if (!drive.isLoggedIn()) {
      return setSync('idle', '로그인 후 CLIP 폴더를 다시 열면 Drive에 자동 저장됩니다.');
    }
    autoSyncRunning = true;
    try {
      await uploadToDrive({ auto: true });
      host.showFeedbackMessage?.('다른 기기에서도 볼 수 있게 CLIP 미리보기를 저장했습니다.');
    } catch (error) {
      console.error(error);
      setSync('error', 'CLIP Drive 자동 저장 실패');
    } finally {
      autoSyncRunning = false;
    }
  }

  async function openFiles(files) {
    clearLocalPages();
    engine.replaceSourceFiles(files);
    composer.showMessage('CMC 프로젝트 불러오는 중...');
    setSync('loading', 'CMC와 CLIP 파일 확인 중...');
    const clipCount = files.filter((file) => file.name.toLowerCase().endsWith('.clip')).length;
    if (!clipCount) {
      composer.showMessage('.clip 파일을 찾지 못했습니다.');
      return setSync('error', '실패: .clip 없음');
    }
    const order = await resolveOrder(files);
    engine.setOrder(order);
    if (!order.list.length) {
      composer.showMessage('CMC에 연결된 CLIP 파일을 찾지 못했습니다.');
      return setSync('error', '실패: CMC 연결 파일 없음');
    }

    let success = 0;
    let failed = 0;
    for (let index = 0; index < order.list.length; index++) {
      const file = order.list[index];
      setSync('extracting', `${index + 1} / ${order.list.length} 추출 중\n${file.name}`);
      try {
        const blob = await browser.extractPreview(file);
        if (!blob) failed++;
        else {
          const page = {
            name: file.name.replace(/\.clip$/i, '.png'),
            blob,
            url: browser.createObjectUrl(blob),
            type: blob.type
          };
          engine.addLocalPage(page);
          composer.appendPage(page);
          success++;
          if (success === 1) composer.hideMessage();
        }
      } catch (error) {
        console.error(error);
        failed++;
      }
      await browser.yieldToBrowser();
    }
    if (!success) {
      composer.showMessage('미리보기 이미지를 찾지 못했습니다.');
      return setSync('error', `실패: ${failed}개`);
    }
    composer.hideMessage();
    const orderStatus = order.cmcName
      ? `CMC 순서: ${order.cmcName}`
      : order.cmcCount
        ? 'CMC 분석 실패 · 파일명 순서 사용'
        : 'CMC 없음 · 파일명 순서 사용';
    const missing = order.missing ? ` / 연결 파일 누락: ${order.missing}개` : '';
    setSync('ready', `${orderStatus}\n표시: ${success}개 / 추출 실패: ${failed}개${missing}`);
    await syncIfReady();
  }

  async function loadFromDrive(render = true) {
    clearLocalPages();
    const manifest = drive.getManifest();
    engine.replaceManifest(manifest);
    if (!manifest.length) {
      if (render) showEmpty();
      return;
    }
    if (render) composer.showMessage('Google Drive에서 CLIP 미리보기를 다운로드 중...');
    for (let index = 0; index < manifest.length; index++) {
      const page = manifest[index];
      if (render)
        setSync(
          'downloading',
          `${index + 1} / ${manifest.length} Google Drive 다운로드 중\n${page.name}`
        );
      try {
        const blob = await drive.download(page.fileId);
        const localPage = {
          name: page.name,
          blob,
          url: browser.createObjectUrl(blob),
          type: blob.type || page.mimeType
        };
        engine.addLocalPage(localPage);
        composer.appendPage(localPage);
        if (index === 0) composer.hideMessage();
      } catch (error) {
        console.warn(error);
      }
    }
    if (render) {
      composer.hideMessage();
      setSync('complete', `Drive 불러오기 완료\n표시: ${engine.getSnapshot().localPages.length}개`);
    }
  }

  function showEmpty() {
    if (!engine.getSnapshot().localPages.length) {
      composer.showMessage(composer.isMobile() ? MOBILE_EMPTY : DESKTOP_EMPTY);
    }
  }

  return {
    clear() {
      engine.replaceSourceFiles([]);
      composer.clearFolderInput();
      clearLocalPages();
      showEmpty();
      setSync('idle', '');
    },
    clearLocalPages,
    loadFromDrive,
    openFiles,
    async openDroppedFiles(dataTransfer) {
      try {
        const files = await browser.getDroppedFiles(dataTransfer);
        if (!files.some((file) => file.name?.toLowerCase().endsWith('.clip'))) {
          composer.showMessage('드롭한 폴더에서 .clip 파일을 찾지 못했습니다.');
          return setSync('error', '실패: .clip 없음');
        }
        composer.clearFolderInput();
        await openFiles(files);
      } catch (error) {
        console.error(error);
        composer.showMessage(
          '이 브라우저에서는 폴더 드롭을 읽지 못했습니다. 위의 폴더 아이콘으로 열어주세요.'
        );
        setSync('error', '폴더 드롭 실패');
      }
    },
    async refresh() {
      if (composer.isMobile()) {
        if (!drive.ensureLogin()) return;
        setSync('loading', 'Drive 최신 미리보기 확인 중...');
        await drive.loadAppData();
        refreshFeatures();
        await loadFromDrive(true);
        return;
      }
      const files = engine.getSnapshot().sourceFiles;
      if (!files.length) return setSync('idle', '먼저 CLIP 폴더를 열어주세요.');
      await openFiles(files);
    },
    setStatus: (text) => setSync('idle', text),
    showEmpty,
    showMessage: composer.showMessage
  };
}
