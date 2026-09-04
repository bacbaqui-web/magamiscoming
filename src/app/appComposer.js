import { createAppAuthController } from './appAuthController.js';
import { createCompatibilityFeatures } from './compatibilityFeatures.js';
import { initializeAppShell } from './appShell.js';
import { createFilePort } from '../ports/filePort.js';
import { createMetadataPort } from '../ports/metadataPort.js';
import { createMediaAnalysisPort } from '../ports/mediaAnalysisPort.js';
import { createDriveFilesStore } from '../services/driveFiles.js';
import { createFirebaseMetadataAdapter } from '../services/firebaseMetadataStore.js';
import { createMediaAnalysisBrowserAdapter } from '../services/mediaAnalysisBrowserAdapter.js';
import { getMediaAnalysisAccessToken } from '../services/mediaAnalysisAuth.js';
import { createYoutubePort } from '../ports/youtubePort.js';
import { createYoutubeBrowserAdapter } from '../services/youtubeBrowserAdapter.js';

async function loadCompatibilityModules() {
  const [
    { initCalendar },
    { initNotes },
    { initBookmarks },
    { initWorkMusic },
    { initClipViewer },
    { initPomodoro },
    { initMainTabs },
    { createMainTabsEngine },
    { initProfile },
    { createClipViewerBrowserAdapter },
    { initCloudSyncBackend }
  ] = await Promise.all([
    import('../features/calendar.js'),
    import('../features/notes.js'),
    import('../features/bookmarks.js'),
    import('../features/workmusic.js'),
    import('../features/clipviewer.js'),
    import('../features/pomodoro.js'),
    import('../features/mainTabs.js'),
    import('../features/mainTabs/mainTabsEngine.js'),
    import('../features/profile.js'),
    import('../features/clipviewer/clipViewerBrowserAdapter.js'),
    import('../services/cloudSyncBackend.js')
  ]);

  return {
    initBookmarks,
    initCalendar,
    initClipViewer,
    initCloudSyncBackend,
    initMainTabs,
    createMainTabsEngine,
    createClipViewerBrowserAdapter,
    initProfile,
    initNotes,
    initPomodoro,
    initWorkMusic
  };
}

export function createAppComposer({
  createAuthController = createAppAuthController,
  createDriveFileAdapter = createDriveFilesStore,
  createFiles = createFilePort,
  createFirebaseAdapter = createFirebaseMetadataAdapter,
  createFeatures = createCompatibilityFeatures,
  createMetadata = createMetadataPort,
  createMediaAnalysis = createMediaAnalysisPort,
  createMediaAnalysisAdapter = createMediaAnalysisBrowserAdapter,
  createYoutube = createYoutubePort,
  createYoutubeAdapter = createYoutubeBrowserAdapter,
  host = window,
  initializeShell = initializeAppShell,
  loadModules = loadCompatibilityModules,
  root = document
} = {}) {
  async function start() {
    const modules = await loadModules();
    const appAuthController = createAuthController({ host });
    const mainTabsEngine = modules.createMainTabsEngine({ host });
    host.mainTabsEngine = mainTabsEngine;
    initializeShell({ host, mainTabsEngine, root });
    const compatibilityFeatures = createFeatures({ host, initializers: modules });
    const youtubeAdapter = createYoutubeAdapter({
      apiKey: host.APP_CONFIG?.youtubeApiKey || '',
      host
    });
    const youtubePort = createYoutube({ adapter: youtubeAdapter });
    const mediaAnalysisAdapter = createMediaAnalysisAdapter({
      apiBaseUrl: host.APP_CONFIG?.mediaAnalysis?.apiBaseUrl || '',
      getAccessToken: host.APP_CONFIG?.mediaAnalysis?.requireAuth
        ? getMediaAnalysisAccessToken
        : undefined,
      fetchImpl: host.fetch?.bind?.(host)
    });
    const mediaAnalysisPort = createMediaAnalysis({ adapter: mediaAnalysisAdapter });

    const cloudSync = modules.initCloudSyncBackend({
      appAuthController,
      compatibilityFeatures,
      createDriveFileAdapter,
      createFilePort: createFiles,
      createFirebaseMetadataAdapter: createFirebaseAdapter,
      createMetadataPort: createMetadata
    });
    compatibilityFeatures.initialize({
      appAuthController,
      clipViewerBrowserAdapter: modules.createClipViewerBrowserAdapter,
      clipViewerOptions: cloudSync.clipViewerOptions,
      mainTabsEngine,
      mediaAnalysisPort,
      root,
      youtubePort
    });

    return {
      appAuthController,
      mainTabsEngine,
      mediaAnalysisPort,
      youtubePort,
      compatibilityFeatures,
      tabEngines: compatibilityFeatures.getTabEngines?.() || {}
    };
  }

  return { start };
}
