import test from 'node:test';
import assert from 'node:assert/strict';

import { createFirebaseMetadataAdapter } from '../src/services/firebaseMetadataStore.js';

test('Firebase Metadata Adapter keeps the existing user document and collection paths', async () => {
  const documentPaths = [];
  const collectionPaths = [];
  const auth = { currentUser: null };
  const appModule = { initializeApp: () => ({}) };
  const authModule = {
    GoogleAuthProvider: { credential: () => ({}) },
    browserLocalPersistence: {},
    getAuth: () => auth,
    setPersistence: async () => {},
    signInWithCredential: async () => {
      auth.currentUser = { uid: 'user-1' };
      return { user: auth.currentUser };
    },
    signOut: async () => {
      auth.currentUser = null;
    }
  };
  const firestoreModule = {
    collection(_db, ...path) {
      collectionPaths.push(path.join('/'));
      return { path: path.join('/') };
    },
    deleteDoc: async () => {},
    doc(parent, ...path) {
      const fullPath = parent?.path ? `${parent.path}/${path.join('/')}` : path.join('/');
      documentPaths.push(fullPath);
      return { path: fullPath };
    },
    getDoc: async () => ({ exists: () => false }),
    getDocs: async () => ({ docs: [], forEach() {} }),
    getFirestore: () => ({}),
    setDoc: async () => {},
    writeBatch: () => ({
      commit: async () => {},
      delete() {},
      set() {}
    })
  };
  const adapter = createFirebaseMetadataAdapter({
    enabled: true,
    config: {},
    genId: () => 'generated-id',
    normalizeTabList: (tabs) => tabs || [],
    loadModules: async () => [appModule, authModule, firestoreModule]
  });

  await adapter.signInWithGoogleToken('token');
  await adapter.saveAppParts({
    calendar: {},
    notes: { notesTabList: [], notesTabs: {} },
    bookmarks: { imageBookmarks: [] },
    workmusic: { workMusicSongs: [] },
    pomodoro: {},
    clipviewer: {}
  });

  assert.ok(documentPaths.includes('users/user-1/app/calendar_main'));
  assert.ok(documentPaths.includes('users/user-1/app/notes_meta'));
  assert.ok(documentPaths.includes('users/user-1/app/bookmarks_meta'));
  assert.ok(documentPaths.includes('users/user-1/app/workmusic_main'));
  assert.ok(documentPaths.includes('users/user-1/app/pomodoro_main'));
  assert.ok(documentPaths.includes('users/user-1/app/clipviewer_main'));
  assert.ok(collectionPaths.includes('users/user-1/notesTabs'));
  assert.ok(collectionPaths.includes('users/user-1/bookmarks'));
});
