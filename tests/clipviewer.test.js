import test from 'node:test';
import assert from 'node:assert/strict';

import { initClipViewer } from '../src/features/clipviewer.js';

function createElement() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    appendChild() {},
    classList: { toggle() {} },
    contains: () => false,
    innerHTML: '',
    listeners,
    style: {},
    textContent: '',
    value: ''
  };
}

test('CLIP mobile refresh invokes the injected legacy render callback after loading app data', async () => {
  const elements = new Map(
    [
      'clipFolderInput',
      'clipRefreshBtn',
      'clipClearBtn',
      'clipViewer',
      'clipMessage',
      'clipStatus'
    ].map((id) => [id, createElement()])
  );
  global.window = {
    matchMedia: () => ({ matches: true, addEventListener() {} })
  };
  global.document = {
    createElement: () => createElement(),
    getElementById: (id) => elements.get(id) || null
  };
  const calls = [];

  initClipViewer({
    ensureLogin: () => true,
    getClipPages: () => [],
    loadAppDataFromDrive: async () => calls.push('load-app-data'),
    renderEverything: () => calls.push('render-features')
  });

  await elements.get('clipRefreshBtn').listeners.get('click')();

  assert.deepEqual(calls, ['load-app-data', 'render-features']);
});
