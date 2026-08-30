import {
  getDefaultAppData,
  mergeDriveParts,
  normalizeTabList,
  splitAppDataForDrive
} from './appDataTransforms.js';
import { applyStoredAppData, buildAppData as buildCurrentAppData } from './appDataRuntime.js';
import { installBookmarkDriveHandlers } from './bookmarkDriveHandlers.js';
import { installCloudStateHandlers } from './cloudStateHandlers.js';
import { createDriveImageUrlStore } from './driveImageUrls.js';
import { createDriveStatusStore } from './driveStatus.js';
export function initCloudSyncBackend({
  appAuthController,
  compatibilityFeatures,
  createDriveFileAdapter,
  createFilePort,
  createFirebaseMetadataAdapter,
  createMetadataPort
}) {
  // ===== Hybrid Firebase metadata + Google Drive file backend =====
  // Firebase가 켜진 상태에서는 앱 메타데이터를 Firestore에만 저장합니다.

  const DRIVE_APP_CONFIG = window.APP_CONFIG || {};
  const FIREBASE_CONFIG = DRIVE_APP_CONFIG.firebase || {};
  const FIREBASE_ENABLED = !!(
    FIREBASE_CONFIG.enabled &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId
  );
  const DRIVE_CONFIG = DRIVE_APP_CONFIG.drive || {};
  const DRIVE_FOLDERS = DRIVE_CONFIG.folders || {};
  const DRIVE_FILES = DRIVE_CONFIG.files || {};
  const DRIVE_SCOPE = [
    DRIVE_CONFIG.scope || 'https://www.googleapis.com/auth/drive.file',
    ...(FIREBASE_ENABLED ? ['email', 'profile'] : [])
  ].join(' ');
  const DRIVE_CALENDAR_FOLDER = DRIVE_FOLDERS.calendar || '달력';
  const DRIVE_BOOKMARKS_FOLDER = DRIVE_FOLDERS.bookmarks || '북마크';
  const DRIVE_WORKMUSIC_FOLDER = DRIVE_FOLDERS.workmusic || '노동요';
  const DRIVE_CLIP_FOLDER = DRIVE_FOLDERS.clipviewer || '클립뷰어';
  const DRIVE_CALENDAR_FILE = DRIVE_FILES.calendar || 'calendar.json';
  const DRIVE_BOOKMARKS_FILE = DRIVE_FILES.bookmarks || 'bookmarks.json';
  const DRIVE_WORKMUSIC_FILE = DRIVE_FILES.workmusic || 'workmusic.json';
  const DRIVE_POMODORO_FILE = DRIVE_FILES.pomodoro || 'pomodoro.json';
  const DRIVE_CLIP_FILE = DRIVE_FILES.clipviewer || 'clipviewer.json';
  const DEFAULT_GOOGLE_CLIENT_ID = DRIVE_APP_CONFIG.googleClientId || '';
  const AUTO_LOGIN_STORAGE_KEY = 'magamiscoming.autoLogin';
  const SAVE_DELAY_MS = 450;
  const NON_NOTES_SAVE_DELAY_MS = 500;

  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const loadingOverlay = document.getElementById('loading-overlay');
  const driveSaveIndicator = document.getElementById('driveSaveIndicator');

  let googleTokenClient = null;
  let googleTokenRequestMode = 'manual';
  let driveAccessToken = null;
  let driveReady = false;
  let nonNotesSaveTimer = null;
  let notesSaveTimer = null;
  let driveSaveQueue = Promise.resolve();
  let driveSaveInFlight = 0;
  let notesSaveRunPromise = null;
  let notesSaveQueued = false;
  let deferredAppDataPromise = null;
  let deferredAppDataLoaded = false;
  let deferredAppDataError = null;
  let clipPagesRendered = false;
  let autoSignInAttempting = false;
  let silentSignInUnavailable = false;
  let userHasInteracted = false;
  const driveStatus = createDriveStatusStore(driveSaveIndicator);
  const setDriveStatus = (...args) => driveStatus.setStatus(...args);
  const setDriveBusy = (...args) => driveStatus.setBusy(...args);
  const hideDriveStatus = () => driveStatus.hide();
  const beginDriveUploadBatch = (...args) => driveStatus.beginUploadBatch(...args);
  const beginDriveUpload = (...args) => driveStatus.beginUpload(...args);
  const finishDriveUpload = () => driveStatus.finishUpload();

  ['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
    window.addEventListener(
      type,
      () => {
        userHasInteracted = true;
      },
      { once: true, capture: true }
    );
  });
  window.addEventListener('beforeunload', (e) => {
    if (!hasPendingDriveWork()) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  function hasPendingDriveWork() {
    return (
      driveStatus.hasPendingUploads() ||
      driveSaveInFlight > 0 ||
      !!nonNotesSaveTimer ||
      !!notesSaveTimer ||
      notesSaveQueued ||
      !!notesSaveRunPromise
    );
  }

  function getGoogleClientId() {
    return DEFAULT_GOOGLE_CLIENT_ID;
  }
  function shouldAutoLogin() {
    try {
      return localStorage.getItem(AUTO_LOGIN_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }
  function rememberAutoLogin() {
    try {
      localStorage.setItem(AUTO_LOGIN_STORAGE_KEY, '1');
    } catch (_) {}
  }
  function forgetAutoLogin() {
    try {
      localStorage.removeItem(AUTO_LOGIN_STORAGE_KEY);
    } catch (_) {}
  }
  function genId(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  const firebaseAdapter = createFirebaseMetadataAdapter({
    enabled: FIREBASE_ENABLED,
    config: FIREBASE_CONFIG,
    normalizeTabList,
    genId
  });
  const metadataPort = createMetadataPort({
    adapter: firebaseAdapter,
    authController: appAuthController
  });

  function isFirebaseActive() {
    return metadataPort.isActive();
  }

  function getFirebaseStatusLabel() {
    return FIREBASE_ENABLED ? 'Firebase' : 'Google Drive';
  }

  function assertMetadataBackendReady() {
    metadataPort.assertReady();
  }

  async function signInFirebaseWithGoogleToken(accessToken) {
    return firebaseAdapter.signInWithGoogleToken(accessToken);
  }

  async function signOutFirebase() {
    return firebaseAdapter.signOut();
  }

  function downloadTextFile(fileName, text, mimeType = 'text/plain;charset=utf-8') {
    const content = String(mimeType).includes('json') ? text : '\ufeff' + text;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let currentAppData = getDefaultAppData();

  function buildAppData() {
    return buildCurrentAppData(currentAppData);
  }

  function applyAppData(data) {
    currentAppData = applyStoredAppData(data, { revokeAllDriveImageUrls });
    window.mainTabsEngine?.replaceState({
      hiddenMainTabs: window.__hiddenMainTabs,
      mainCustomTabs: window.__mainCustomTabs
    });
  }

  async function waitForGoogle() {
    for (let i = 0; i < 80; i++) {
      if (window.google?.accounts?.oauth2) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  async function setupTokenClient() {
    const clientId = getGoogleClientId();
    if (!clientId) return false;
    const ok = await waitForGoogle();
    if (!ok) {
      window.showAlert('Google 로그인 스크립트를 불러오지 못했습니다.');
      return false;
    }
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: async (resp) => {
        const requestMode = googleTokenRequestMode;
        googleTokenRequestMode = 'manual';
        if (resp?.access_token) {
          driveAccessToken = resp.access_token;
          silentSignInUnavailable = false;
          rememberAutoLogin();
          try {
            await signInFirebaseWithGoogleToken(resp.access_token);
            await afterGoogleLogin();
          } catch (e) {
            autoSignInAttempting = false;
            driveAccessToken = null;
            forgetAutoLogin();
            console.error(e);
            window.showAlert('Firebase 로그인에 실패했습니다: ' + (e.message || e));
          }
        } else {
          autoSignInAttempting = false;
          if (requestMode === 'silent') {
            silentSignInUnavailable = true;
            hideDriveStatus();
            console.info('Silent Google login skipped', resp);
          } else {
            window.showAlert('구글 로그인에 실패했습니다.');
          }
        }
      },
      error_callback: (err) => {
        const requestMode = googleTokenRequestMode;
        googleTokenRequestMode = 'manual';
        autoSignInAttempting = false;
        if (requestMode === 'silent') {
          silentSignInUnavailable = true;
          hideDriveStatus();
          console.info('Silent Google login unavailable', err);
          return;
        }
        window.showAlert('구글 로그인 창을 열지 못했습니다. 팝업 차단 설정을 확인해 주세요.');
      }
    });
    return true;
  }

  function requestGoogleAccessToken({ prompt = 'consent', mode = 'manual' } = {}) {
    googleTokenRequestMode = mode;
    googleTokenClient.requestAccessToken({ prompt });
  }

  async function doSignIn() {
    if (!googleTokenClient) {
      const ok = await setupTokenClient();
      if (!ok) return;
    }
    silentSignInUnavailable = false;
    rememberAutoLogin();
    requestGoogleAccessToken({ prompt: driveAccessToken ? '' : 'consent', mode: 'manual' });
  }

  async function tryAutoSignIn() {
    if (!shouldAutoLogin() || driveAccessToken || silentSignInUnavailable || autoSignInAttempting)
      return;
    if (!googleTokenClient) {
      const ok = await setupTokenClient();
      if (!ok) return;
    }
    autoSignInAttempting = true;
    setDriveBusy('Google 로그인 확인 중...');
    requestGoogleAccessToken({ prompt: '', mode: 'silent' });
  }

  async function driveFetch(url, options = {}) {
    if (!driveAccessToken) throw new Error('구글 로그인이 필요합니다.');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', 'Bearer ' + driveAccessToken);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      driveAccessToken = null;
      driveReady = false;
      setDriveStatus('Google 인증 복구 중...');
      tryAutoSignIn().catch((e) => console.error(e));
      throw new Error('Google 인증이 만료되었습니다. 다시 로그인하세요.');
    }
    if (!res.ok) {
      throw new Error((await res.text()) || 'Drive API 오류 ' + res.status);
    }
    return res;
  }

  async function getUserProfile() {
    try {
      return await driveFetch('https://www.googleapis.com/oauth2/v3/userinfo').then((r) =>
        r.json()
      );
    } catch (_e) {
      return {};
    }
  }

  const driveFileAdapter = createDriveFileAdapter({
    driveFetch,
    firebaseEnabled: FIREBASE_ENABLED,
    folders: DRIVE_FOLDERS,
    files: DRIVE_FILES,
    getBookmarkTabList: () => window.__bookmarkTabList,
    canUseDrive: () => driveReady && !!driveAccessToken
  });
  const driveFiles = createFilePort({ adapter: driveFileAdapter });

  const findDriveFile = (...args) => driveFiles.findFile(...args);
  const ensureDriveFolders = () => driveFiles.ensureFolders();
  const getLegacyDriveFolder = (...args) => driveFiles.getLegacyFolder(...args);
  const getBookmarkTabDriveFolder = (...args) => driveFiles.getBookmarkTabFolder(...args);
  const uploadDriveMultipart = (...args) => driveFiles.uploadMultipart(...args);
  const renameBookmarkTabDriveFolder = (...args) => driveFiles.renameBookmarkTabFolder(...args);
  const deleteDriveFile = (...args) => driveFiles.deleteFile(...args);
  const downloadDriveBlob = (...args) => driveFiles.downloadBlob(...args);
  const saveJsonToDrive = (...args) => driveFiles.saveJson(...args);
  const loadJsonFromDrive = (...args) => driveFiles.loadJson(...args);
  const saveNotesToDrive = (...args) => driveFiles.saveNotes(...args);
  const loadNotesFromDrive = (...args) => driveFiles.loadNotes(...args);
  const cleanupLegacyJsonFiles = () => driveFiles.cleanupLegacyJsonFiles();
  const formatDriveFileTime = (...args) => driveFiles.formatDriveFileTime(...args);
  const fileExtFromBlob = (...args) => driveFiles.fileExtFromBlob(...args);

  const driveImageUrls = createDriveImageUrlStore({
    downloadBlob: (fileId) => downloadDriveBlob(fileId),
    getBookmarks: () => window.imageBookmarks
  });
  const revokeDriveImageUrl = (...args) => driveImageUrls.revoke(...args);
  const revokeAllDriveImageUrls = () => driveImageUrls.revokeAll();
  const clearDriveImageUrls = () => driveImageUrls.clear();
  const resolveDriveBookmarkImages = () => driveImageUrls.resolveBookmarkImages();

  async function saveAppPartsToFirebase(parts, options) {
    return metadataPort.saveAppParts(parts, options);
  }

  async function loadAppPartsFromFirebase(options) {
    return metadataPort.loadAppParts(options);
  }

  async function withDriveSaveInFlight(run) {
    driveSaveInFlight += 1;
    try {
      return await run();
    } finally {
      driveSaveInFlight = Math.max(0, driveSaveInFlight - 1);
    }
  }

  async function saveAppDataNow() {
    if (!driveReady || !driveAccessToken) return;
    return withDriveSaveInFlight(async () => {
      setDriveBusy(`${getFirebaseStatusLabel()} 저장 중...`);
      try {
        const data = buildAppData();
        currentAppData = data;
        const parts = splitAppDataForDrive(data);
        if (isFirebaseActive()) {
          await saveAppPartsToFirebase(parts);
          setDriveStatus('Firebase 저장 완료');
          return;
        }
        assertMetadataBackendReady();
        const folders = await ensureDriveFolders();
        await Promise.all([
          saveJsonToDrive(folders.system.id, DRIVE_CALENDAR_FILE, parts.calendar),
          saveNotesToDrive(folders.notes.id, folders.system.id, parts.notes),
          saveJsonToDrive(folders.system.id, DRIVE_BOOKMARKS_FILE, parts.bookmarks),
          saveJsonToDrive(folders.system.id, DRIVE_WORKMUSIC_FILE, parts.workmusic),
          saveJsonToDrive(folders.system.id, DRIVE_POMODORO_FILE, parts.pomodoro),
          saveJsonToDrive(folders.system.id, DRIVE_CLIP_FILE, parts.clipviewer)
        ]);
        await cleanupLegacyJsonFiles();
        setDriveStatus('Google Drive 저장 완료');
      } catch (e) {
        console.error(e);
        setDriveStatus(`${getFirebaseStatusLabel()} 저장 실패`, true);
        throw e;
      }
    });
  }
  async function saveNonNotesDataNow() {
    if (!driveReady || !driveAccessToken) return;
    return withDriveSaveInFlight(async () => {
      setDriveBusy(`${getFirebaseStatusLabel()} 저장 중...`);
      try {
        const data = buildAppData();
        currentAppData = data;
        const parts = splitAppDataForDrive(data);
        if (isFirebaseActive()) {
          await saveAppPartsToFirebase(parts, { notes: false });
          setDriveStatus('Firebase 저장 완료');
          return;
        }
        assertMetadataBackendReady();
        const folders = await ensureDriveFolders();
        await Promise.all([
          saveJsonToDrive(folders.system.id, DRIVE_CALENDAR_FILE, parts.calendar),
          saveJsonToDrive(folders.system.id, DRIVE_BOOKMARKS_FILE, parts.bookmarks),
          saveJsonToDrive(folders.system.id, DRIVE_WORKMUSIC_FILE, parts.workmusic),
          saveJsonToDrive(folders.system.id, DRIVE_POMODORO_FILE, parts.pomodoro),
          saveJsonToDrive(folders.system.id, DRIVE_CLIP_FILE, parts.clipviewer)
        ]);
        await cleanupLegacyJsonFiles();
        setDriveStatus('Google Drive 저장 완료');
      } catch (e) {
        console.error(e);
        setDriveStatus(`${getFirebaseStatusLabel()} 저장 실패`, true);
        throw e;
      }
    });
  }
  async function saveNotesDataNow() {
    if (!driveReady || !driveAccessToken) return;
    return withDriveSaveInFlight(async () => {
      setDriveBusy(`메모 ${getFirebaseStatusLabel()} 저장 중...`);
      try {
        const data = buildAppData();
        currentAppData = data;
        const parts = splitAppDataForDrive(data);
        if (isFirebaseActive()) {
          await saveAppPartsToFirebase(parts, { notes: true, nonNotes: false });
          setDriveStatus('메모 Firebase 저장 완료');
          return;
        }
        assertMetadataBackendReady();
        const folders = await ensureDriveFolders();
        await saveNotesToDrive(folders.notes.id, folders.system.id, parts.notes);
        setDriveStatus('메모 Drive 저장 완료');
      } catch (e) {
        console.error(e);
        setDriveStatus('메모 저장 실패', true);
        throw e;
      }
    });
  }

  function queueDriveSave(saveFn) {
    const run = driveSaveQueue.catch(() => {}).then(saveFn);
    driveSaveQueue = run.catch(() => {});
    return run;
  }

  function queueNotesSave() {
    notesSaveQueued = true;
    if (notesSaveRunPromise) return notesSaveRunPromise;
    notesSaveRunPromise = queueDriveSave(async () => {
      while (notesSaveQueued) {
        notesSaveQueued = false;
        await saveNotesDataNow();
      }
    }).finally(() => {
      notesSaveRunPromise = null;
    });
    return notesSaveRunPromise;
  }

  function scheduleSaveNonNotesData() {
    clearTimeout(nonNotesSaveTimer);
    currentAppData = buildAppData();
    setDriveStatus(`${getFirebaseStatusLabel()} 저장 예약됨`);
    nonNotesSaveTimer = setTimeout(() => {
      nonNotesSaveTimer = null;
      queueDriveSave(saveNonNotesDataNow).catch((e) => console.error(e));
    }, NON_NOTES_SAVE_DELAY_MS);
  }

  function scheduleSaveAppData() {
    clearTimeout(nonNotesSaveTimer);
    currentAppData = buildAppData();
    setDriveStatus('저장 예약됨');
    nonNotesSaveTimer = setTimeout(() => {
      nonNotesSaveTimer = null;
      queueDriveSave(saveAppDataNow).catch((e) => console.error(e));
    }, SAVE_DELAY_MS);
  }

  function saveNonNotesDataQueuedNow() {
    clearTimeout(nonNotesSaveTimer);
    nonNotesSaveTimer = null;
    return queueDriveSave(saveNonNotesDataNow);
  }

  function saveAppDataQueuedNow() {
    clearTimeout(nonNotesSaveTimer);
    nonNotesSaveTimer = null;
    return queueDriveSave(saveAppDataNow);
  }

  function scheduleSaveNotesData() {
    clearTimeout(notesSaveTimer);
    currentAppData = buildAppData();
    setDriveStatus(`메모 ${getFirebaseStatusLabel()} 저장 예약됨`);
    notesSaveTimer = setTimeout(() => {
      notesSaveTimer = null;
      queueNotesSave().catch((e) => console.error(e));
    }, SAVE_DELAY_MS);
  }

  function clearScheduledNotesSave() {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = null;
  }

  async function loadAppDataFromDrive() {
    const firebaseParts = await loadAppPartsFromFirebase();
    if (firebaseParts) {
      applyAppData(mergeDriveParts(firebaseParts));
      await resolveDriveBookmarkImages();
      await window.loadClipPagesFromDrive?.(false);
      return;
    }
    if (FIREBASE_ENABLED) {
      currentAppData = getDefaultAppData();
      applyAppData(currentAppData);
      await saveAppDataNow();
      return;
    }
    const folders = await ensureDriveFolders();
    const legacyCalendar = await getLegacyDriveFolder(DRIVE_CALENDAR_FOLDER);
    const legacyBookmarks = await getLegacyDriveFolder(DRIVE_BOOKMARKS_FOLDER);
    const legacyWorkmusic = await getLegacyDriveFolder(DRIVE_WORKMUSIC_FOLDER);
    const legacyClipviewer = await getLegacyDriveFolder(DRIVE_CLIP_FOLDER);
    const parts = {
      calendar:
        (await loadJsonFromDrive(folders.system.id, DRIVE_CALENDAR_FILE)) ||
        (legacyCalendar ? await loadJsonFromDrive(legacyCalendar.id, DRIVE_CALENDAR_FILE) : null),
      notes: await loadNotesFromDrive(folders.notes.id, folders.system.id),
      bookmarks:
        (await loadJsonFromDrive(folders.system.id, DRIVE_BOOKMARKS_FILE)) ||
        (legacyBookmarks
          ? await loadJsonFromDrive(legacyBookmarks.id, DRIVE_BOOKMARKS_FILE)
          : null),
      workmusic:
        (await loadJsonFromDrive(folders.system.id, DRIVE_WORKMUSIC_FILE)) ||
        (legacyWorkmusic
          ? await loadJsonFromDrive(legacyWorkmusic.id, DRIVE_WORKMUSIC_FILE)
          : null),
      pomodoro: await loadJsonFromDrive(folders.system.id, DRIVE_POMODORO_FILE),
      clipviewer:
        (await loadJsonFromDrive(folders.system.id, DRIVE_CLIP_FILE)) ||
        (legacyClipviewer ? await loadJsonFromDrive(legacyClipviewer.id, DRIVE_CLIP_FILE) : null)
    };
    const hasAny = Object.values(parts).some(Boolean);
    if (!hasAny) {
      currentAppData = getDefaultAppData();
      applyAppData(currentAppData);
      await saveAppDataNow();
      return;
    }
    applyAppData(mergeDriveParts(parts));
    if (isFirebaseActive()) {
      await saveAppPartsToFirebase(splitAppDataForDrive(buildAppData()));
    }
    await resolveDriveBookmarkImages();
    await window.loadClipPagesFromDrive?.(false);
  }

  async function getDriveLoadFolders() {
    const folders = await ensureDriveFolders();
    const [legacyCalendar, legacyBookmarks, legacyWorkmusic, legacyClipviewer] = await Promise.all([
      getLegacyDriveFolder(DRIVE_CALENDAR_FOLDER),
      getLegacyDriveFolder(DRIVE_BOOKMARKS_FOLDER),
      getLegacyDriveFolder(DRIVE_WORKMUSIC_FOLDER),
      getLegacyDriveFolder(DRIVE_CLIP_FOLDER)
    ]);
    return { folders, legacyCalendar, legacyBookmarks, legacyWorkmusic, legacyClipviewer };
  }

  async function loadCalendarPartFromDrive() {
    const firebaseParts = await loadAppPartsFromFirebase({
      includeCalendar: true,
      includeDeferred: false
    });
    const firebaseCalendar = firebaseParts?.calendar;
    if (firebaseCalendar) {
      compatibilityFeatures.hydrateCalendar({
        tasks: firebaseCalendar.customTasks,
        taskStatus: firebaseCalendar.taskStatus,
        viewMode: firebaseCalendar.calendarViewMode
      });
      window.mainTabsEngine.replaceState({
        hiddenMainTabs: firebaseCalendar.hiddenMainTabs,
        mainCustomTabs: firebaseCalendar.mainCustomTabs
      });
      currentAppData.customTasks = window.customTasks;
      currentAppData.state = currentAppData.state || {};
      currentAppData.state.taskStatus = window.taskStatus;
      currentAppData.state.calendarViewMode = window.__calendarViewMode;
      currentAppData.state.hiddenMainTabs = window.__hiddenMainTabs;
      currentAppData.state.mainCustomTabs = window.__mainCustomTabs;
      compatibilityFeatures.renderMainTabs();
      return { firebase: true, calendar: firebaseCalendar };
    }
    if (FIREBASE_ENABLED) {
      return { firebase: true, calendar: null };
    }
    const { folders, legacyCalendar } = await getDriveLoadFolders();
    const calendar =
      (await loadJsonFromDrive(folders.system.id, DRIVE_CALENDAR_FILE)) ||
      (legacyCalendar ? await loadJsonFromDrive(legacyCalendar.id, DRIVE_CALENDAR_FILE) : null);
    if (calendar) {
      compatibilityFeatures.hydrateCalendar({
        tasks: calendar.customTasks,
        taskStatus: calendar.taskStatus,
        viewMode: calendar.calendarViewMode
      });
      window.mainTabsEngine.replaceState({
        hiddenMainTabs: calendar.hiddenMainTabs,
        mainCustomTabs: calendar.mainCustomTabs
      });
      currentAppData.customTasks = window.customTasks;
      currentAppData.state = currentAppData.state || {};
      currentAppData.state.taskStatus = window.taskStatus;
      currentAppData.state.calendarViewMode = window.__calendarViewMode;
      currentAppData.state.hiddenMainTabs = window.__hiddenMainTabs;
      currentAppData.state.mainCustomTabs = window.__mainCustomTabs;
      compatibilityFeatures.renderMainTabs();
    }
    return { folders, legacyCalendar, calendar };
  }

  async function loadDeferredAppDataFromDrive() {
    const firebaseParts = await loadAppPartsFromFirebase({
      includeCalendar: false,
      includeDeferred: true
    });
    if (firebaseParts) {
      firebaseParts.calendar = {
        customTasks: window.customTasks || [],
        taskStatus: window.taskStatus || {},
        calendarViewMode: window.__calendarViewMode === 'month' ? 'month' : 'week',
        hiddenMainTabs: window.__hiddenMainTabs || [],
        mainCustomTabs: window.__mainCustomTabs || [],
        updatedAt: new Date().toISOString()
      };
      applyAppData(mergeDriveParts(firebaseParts));
      compatibilityFeatures.renderAll();
      resolveDriveBookmarkImages()
        .then(() => compatibilityFeatures.renderBookmarks())
        .catch((e) => console.warn('bookmark image background load failed', e));
      return;
    }
    if (FIREBASE_ENABLED) {
      compatibilityFeatures.renderAll();
      resolveDriveBookmarkImages()
        .then(() => compatibilityFeatures.renderBookmarks())
        .catch((e) => console.warn('bookmark image background load failed', e));
      return;
    }
    const { folders, legacyBookmarks, legacyWorkmusic, legacyClipviewer } =
      await getDriveLoadFolders();
    const parts = {
      notes: await loadNotesFromDrive(folders.notes.id, folders.system.id),
      bookmarks:
        (await loadJsonFromDrive(folders.system.id, DRIVE_BOOKMARKS_FILE)) ||
        (legacyBookmarks
          ? await loadJsonFromDrive(legacyBookmarks.id, DRIVE_BOOKMARKS_FILE)
          : null),
      workmusic:
        (await loadJsonFromDrive(folders.system.id, DRIVE_WORKMUSIC_FILE)) ||
        (legacyWorkmusic
          ? await loadJsonFromDrive(legacyWorkmusic.id, DRIVE_WORKMUSIC_FILE)
          : null),
      pomodoro: await loadJsonFromDrive(folders.system.id, DRIVE_POMODORO_FILE),
      clipviewer:
        (await loadJsonFromDrive(folders.system.id, DRIVE_CLIP_FILE)) ||
        (legacyClipviewer ? await loadJsonFromDrive(legacyClipviewer.id, DRIVE_CLIP_FILE) : null)
    };
    parts.calendar = {
      customTasks: window.customTasks || [],
      taskStatus: window.taskStatus || {},
      calendarViewMode: window.__calendarViewMode === 'month' ? 'month' : 'week',
      hiddenMainTabs: window.__hiddenMainTabs || [],
      mainCustomTabs: window.__mainCustomTabs || [],
      updatedAt: new Date().toISOString()
    };
    applyAppData(mergeDriveParts(parts));
    if (isFirebaseActive()) {
      await saveAppPartsToFirebase(splitAppDataForDrive(buildAppData()));
    }
    compatibilityFeatures.renderAll();
    resolveDriveBookmarkImages()
      .then(() => compatibilityFeatures.renderBookmarks())
      .catch((e) => console.warn('bookmark image background load failed', e));
  }

  async function afterGoogleLogin() {
    autoSignInAttempting = false;
    loadingOverlay.classList.remove('hidden');
    try {
      const user = await getUserProfile();
      appAuthController.setCurrentUser(user);
      compatibilityFeatures.refreshProfile();
      driveReady = true;
      appAuthController.setReady(true);
      await appAuthController.startPostLoginDataLoad(async () => {
        await loadCalendarPartFromDrive();
        compatibilityFeatures.renderCalendar();
        loadingOverlay.classList.add('hidden');
        deferredAppDataLoaded = false;
        deferredAppDataError = null;
        deferredAppDataPromise = loadDeferredAppDataFromDrive()
          .then(() => {
            deferredAppDataLoaded = true;
          })
          .catch((e) => {
            deferredAppDataError = e;
            console.error(e);
            setDriveStatus('일부 데이터 로드 실패', true);
          });
      });
    } catch (e) {
      console.error(e);
      window.showAlert('Google Drive 데이터 로드 실패: ' + (e.message || e));
    } finally {
      loadingOverlay.classList.add('hidden');
    }
  }

  signInBtn.onclick = () => doSignIn();
  signOutBtn.onclick = async () => {
    if (
      hasPendingDriveWork() &&
      !window.confirm(
        '아직 Drive 저장/업로드가 끝나지 않았습니다. 로그아웃하면 일부 변경이 반영되지 않을 수 있습니다. 그래도 로그아웃할까요?'
      )
    ) {
      return;
    }
    forgetAutoLogin();
    clearTimeout(nonNotesSaveTimer);
    clearTimeout(notesSaveTimer);
    nonNotesSaveTimer = null;
    notesSaveTimer = null;
    clearDriveImageUrls();
    await signOutFirebase();
    driveAccessToken = null;
    driveReady = false;
    appAuthController.setCurrentUser(null);
    driveFiles.resetFolders();
    deferredAppDataPromise = null;
    deferredAppDataLoaded = false;
    deferredAppDataError = null;
    clipPagesRendered = false;
    autoSignInAttempting = false;
    silentSignInUnavailable = false;
    compatibilityFeatures.refreshProfile();
    appAuthController.setReady(true);
    applyAppData(getDefaultAppData());
    compatibilityFeatures.renderAll();
    window.clearClipLocal?.();
    window.showClipMessage?.(
      '<div class="clip-empty-title">CLIP 폴더를 열어주세요</div><div class="clip-empty-body">원고가 들어있는 폴더를 이곳에 끌어다 놓거나, 위의 폴더 아이콘으로 선택하면 미리보기를 펼쳐볼 수 있습니다.</div>'
    );
    window.setClipStatus?.('');
  };

  window.ensureLogin = () => {
    if (!appAuthController.getState().ready) {
      window.showAlert('Google Drive에서 데이터를 다운로드 준비 중입니다.');
      return false;
    }
    if (autoSignInAttempting) return false;
    if (!driveAccessToken) {
      if (shouldAutoLogin() && !silentSignInUnavailable) {
        tryAutoSignIn().catch((e) => console.error(e));
        if (userHasInteracted) setDriveStatus('Google 로그인 복구 중...');
      } else if (userHasInteracted) {
        setDriveStatus('Google 로그인 후 이용해 주세요.');
      }
      return false;
    }
    return true;
  };
  const ensureLogin = window.ensureLogin;
  window.waitForFeatureData = (tabId) => {
    if (!driveAccessToken) return null;
    if (tabId === 'calendar' || tabId === 'profile') return null;
    if (tabId !== 'clipviewer' && (!deferredAppDataPromise || deferredAppDataLoaded)) return null;
    if (tabId === 'clipviewer' && deferredAppDataLoaded && clipPagesRendered) return null;
    const waitForData = deferredAppDataPromise || Promise.resolve();
    return waitForData.then(async () => {
      if (deferredAppDataError) throw deferredAppDataError;
      if (tabId === 'clipviewer' && !clipPagesRendered) {
        await window.loadClipPagesFromDrive?.(true);
        clipPagesRendered = true;
      }
    });
  };

  window.downloadAppDataBackup = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    downloadTextFile(
      `magamiscoming_backup_${stamp}.json`,
      JSON.stringify(buildAppData(), null, 2),
      'application/json;charset=utf-8'
    );
    window.showFeedbackMessage?.('전체 데이터 JSON 백업을 다운로드했습니다.');
  };

  installCloudStateHandlers({
    clearScheduledNotesSave,
    ensureLogin,
    queueNotesSave,
    renameBookmarkTabDriveFolder,
    saveNonNotesDataNow: saveNonNotesDataQueuedNow,
    scheduleSaveNonNotesData,
    scheduleSaveNotesData,
    setDriveStatus
  });

  async function uploadDriveMultipartWithProgress(args) {
    beginDriveUpload('Drive 업로드');
    try {
      return await uploadDriveMultipart(args);
    } finally {
      finishDriveUpload();
    }
  }

  installBookmarkDriveHandlers({
    beginDriveUpload,
    deleteDriveFile,
    ensureLogin,
    fileExtFromBlob,
    finishDriveUpload,
    formatDriveFileTime,
    genId,
    getBookmarkTabDriveFolder,
    renderBookmarks: compatibilityFeatures.renderBookmarks,
    revokeDriveImageUrl,
    saveNonNotesDataNow: saveNonNotesDataQueuedNow,
    scheduleSaveAppData,
    scheduleSaveNonNotesData,
    setDriveStatus,
    uploadDriveMultipart
  });

  // 자동 초기 상태
  appAuthController.setReady(true);
  setTimeout(async () => {
    await setupTokenClient();
    if (!driveAccessToken) {
      window.setClipStatus?.('');
      await tryAutoSignIn();
    }
  }, 500);

  return {
    clipViewerOptions: {
      ensureLogin,
      isDriveLoggedIn: () => !!driveAccessToken,
      ensureClipCurrentFolder: async () => (await ensureDriveFolders()).clipCurrent,
      findDriveFile,
      uploadDriveMultipart: uploadDriveMultipartWithProgress,
      downloadDriveBlob,
      beginDriveUploadBatch,
      getClipPages: () => (currentAppData.state && currentAppData.state.clipPages) || [],
      saveClipManifest: async (manifest) => {
        currentAppData.state = currentAppData.state || {};
        currentAppData.state.clipPages = manifest;
        await saveAppDataQueuedNow();
      },
      loadAppDataFromDrive,
      renderEverything: compatibilityFeatures.renderAll
    }
  };
}
