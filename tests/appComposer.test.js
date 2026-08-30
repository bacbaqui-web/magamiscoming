import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppComposer } from '../src/app/appComposer.js';

test('AppComposer preserves shell, compatibility feature, and main-tabs initialization order', async () => {
  const order = [];
  const host = {
    APP_CONFIG: { mediaAnalysis: { apiBaseUrl: 'http://127.0.0.1:8000' } },
    showTab() {}
  };
  const authController = { id: 'auth-controller' };
  const mainTabsEngine = { id: 'main-tabs-engine' };
  const createDriveFileAdapter = () => ({ id: 'drive-file-adapter' });
  const createFiles = () => ({ id: 'file-port' });
  const createFirebaseAdapter = () => ({ id: 'firebase-adapter' });
  const createMetadata = () => ({ id: 'metadata-port' });
  const mediaAnalysisAdapter = { id: 'media-analysis-adapter' };
  const mediaAnalysisPort = { id: 'media-analysis-port' };
  const compatibilityFeatures = {
    getTabEngines() {
      return { notes: 'notes-engine', pomodoro: 'pomodoro-engine' };
    },
    initialize({
      appAuthController,
      clipViewerBrowserAdapter,
      clipViewerOptions,
      mainTabsEngine: receivedEngine,
      mediaAnalysisPort: receivedMediaAnalysisPort
    }) {
      order.push('features');
      assert.equal(appAuthController, authController);
      assert.equal(receivedEngine, mainTabsEngine);
      assert.equal(clipViewerOptions.id, 'clip-options');
      assert.equal(clipViewerBrowserAdapter, modules.createClipViewerBrowserAdapter);
      assert.equal(receivedMediaAnalysisPort, mediaAnalysisPort);
    }
  };
  const modules = {
    createClipViewerBrowserAdapter() {},
    createMainTabsEngine() {
      order.push('main-tabs-engine');
      return mainTabsEngine;
    },
    initCloudSyncBackend(options) {
      order.push('cloud');
      assert.equal(options.appAuthController, authController);
      assert.equal(options.compatibilityFeatures, compatibilityFeatures);
      assert.equal(options.createDriveFileAdapter, createDriveFileAdapter);
      assert.equal(options.createFilePort, createFiles);
      assert.equal(options.createFirebaseMetadataAdapter, createFirebaseAdapter);
      assert.equal(options.createMetadataPort, createMetadata);
      return { clipViewerOptions: { id: 'clip-options' } };
    }
  };

  const composer = createAppComposer({
    createAuthController() {
      order.push('auth-controller');
      return authController;
    },
    createFirebaseAdapter,
    createDriveFileAdapter,
    createFiles,
    createFeatures({ host: receivedHost, initializers }) {
      order.push('compatibility');
      assert.equal(receivedHost, host);
      assert.equal(initializers, modules);
      return compatibilityFeatures;
    },
    createMetadata,
    createMediaAnalysis({ adapter }) {
      assert.equal(adapter, mediaAnalysisAdapter);
      return mediaAnalysisPort;
    },
    createMediaAnalysisAdapter({ apiBaseUrl }) {
      assert.equal(apiBaseUrl, 'http://127.0.0.1:8000');
      return mediaAnalysisAdapter;
    },
    host,
    initializeShell({ mainTabsEngine: receivedEngine }) {
      order.push('shell');
      assert.equal(receivedEngine, mainTabsEngine);
    },
    async loadModules() {
      order.push('modules');
      return modules;
    },
    root: {}
  });

  const result = await composer.start();

  assert.equal(result.appAuthController, authController);
  assert.equal(result.compatibilityFeatures, compatibilityFeatures);
  assert.equal(result.mainTabsEngine, mainTabsEngine);
  assert.equal(result.mediaAnalysisPort, mediaAnalysisPort);
  assert.deepEqual(result.tabEngines, {
    notes: 'notes-engine',
    pomodoro: 'pomodoro-engine'
  });
  assert.deepEqual(order, [
    'modules',
    'auth-controller',
    'main-tabs-engine',
    'shell',
    'compatibility',
    'cloud',
    'features'
  ]);
});
