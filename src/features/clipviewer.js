import { createClipViewerBrowserAdapter } from './clipviewer/clipViewerBrowserAdapter.js';
import { createClipViewerComposer } from './clipviewer/clipViewerComposer.js';
import { createClipViewerController } from './clipviewer/clipViewerController.js';
import { createClipViewerEngine } from './clipviewer/clipViewerEngine.js';

export function initClipViewer({
  beginDriveUploadBatch = () => () => {},
  createBrowserAdapter = createClipViewerBrowserAdapter,
  downloadDriveBlob = async () => new Blob(),
  ensureClipCurrentFolder = async () => ({ id: null }),
  ensureLogin = () => window.ensureLogin?.(),
  findDriveFile = async () => null,
  getClipPages = () => [],
  host = window,
  isDriveLoggedIn = () => false,
  loadAppDataFromDrive = async () => {},
  renderEverything = () => {},
  root = document,
  saveClipManifest = async () => {},
  uploadDriveMultipart = async () => ({})
} = {}) {
  const composer = createClipViewerComposer({ host, root });
  if (!composer) return null;
  const engine = createClipViewerEngine();
  const browser = createBrowserAdapter({ host });
  const controller = createClipViewerController({
    browser,
    composer,
    drive: {
      beginUploadBatch: beginDriveUploadBatch,
      download: downloadDriveBlob,
      ensureCurrentFolder: ensureClipCurrentFolder,
      ensureLogin,
      findFile: findDriveFile,
      getManifest: getClipPages,
      isLoggedIn: isDriveLoggedIn,
      loadAppData: loadAppDataFromDrive,
      saveManifest: saveClipManifest,
      upload: uploadDriveMultipart
    },
    engine,
    host,
    refreshFeatures: renderEverything
  });
  composer.bind(controller);
  controller.showEmpty();

  // Cloud Sync가 순차 전환되는 동안 유지하는 공개 Compatibility 경계이다.
  host.clearClipLocal = controller.clearLocalPages;
  host.setClipStatus = controller.setStatus;
  host.showClipMessage = controller.showMessage;
  host.loadClipPagesFromDrive = controller.loadFromDrive;

  return { controller, engine };
}
