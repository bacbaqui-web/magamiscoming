import test from 'node:test';
import assert from 'node:assert/strict';

import { createProfileEngine } from '../src/features/profile/profileEngine.js';

test('ProfileEngine reads auth and tab settings without owning either state', () => {
  let user = { name: '작가', email: 'artist@example.com' };
  let settings = { hiddenMainTabs: ['notes'], mainCustomTabs: [] };
  const visibilityRequests = [];
  const engine = createProfileEngine({
    appAuthController: { getState: () => ({ currentUser: user }) },
    mainTabsEngine: {
      getState: () => settings,
      setTabVisible: (...args) => visibilityRequests.push(args)
    }
  });

  assert.equal(engine.getState().user, user);
  assert.equal(engine.getState().tabSettings, settings);
  engine.requestTabVisibility('notes', true);
  assert.deepEqual(visibilityRequests, [['notes', true]]);

  user = null;
  settings = { hiddenMainTabs: [], mainCustomTabs: [] };
  assert.equal(engine.getState().user, null);
  assert.deepEqual(engine.getState().tabSettings.hiddenMainTabs, []);
});
