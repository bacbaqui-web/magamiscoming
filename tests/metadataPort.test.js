import test from 'node:test';
import assert from 'node:assert/strict';

import { createMetadataPort } from '../src/ports/metadataPort.js';

test('Metadata Port does not call its Adapter before AppAuthController has a user', async () => {
  const calls = [];
  const adapter = {
    assertReady() {
      calls.push('ready');
    },
    isActive() {
      calls.push('active');
      return true;
    },
    loadAppParts() {
      calls.push('load');
      return { calendar: {} };
    },
    saveAppParts() {
      calls.push('save');
      return true;
    }
  };
  const port = createMetadataPort({
    adapter,
    authController: { getState: () => ({ currentUser: null }) }
  });

  assert.equal(port.isActive(), false);
  assert.equal(await port.loadAppParts(), null);
  assert.equal(await port.saveAppParts({}), false);
  assert.deepEqual(calls, []);
});

test('Metadata Port forwards authenticated reads, writes, and options to its Adapter', async () => {
  const calls = [];
  const adapter = {
    assertReady() {
      calls.push(['ready']);
    },
    isActive() {
      return true;
    },
    async loadAppParts(options) {
      calls.push(['load', options]);
      return { calendar: { customTasks: [] } };
    },
    async saveAppParts(parts, options) {
      calls.push(['save', parts, options]);
      return true;
    }
  };
  const port = createMetadataPort({
    adapter,
    authController: { getState: () => ({ currentUser: { email: 'artist@example.com' } }) }
  });
  const loadOptions = { includeCalendar: true, includeDeferred: false };
  const parts = { calendar: { customTasks: [] } };
  const saveOptions = { notes: false };

  assert.equal(port.isActive(), true);
  port.assertReady();
  assert.deepEqual(await port.loadAppParts(loadOptions), parts);
  assert.equal(await port.saveAppParts(parts, saveOptions), true);
  assert.deepEqual(calls, [['ready'], ['load', loadOptions], ['save', parts, saveOptions]]);
});
