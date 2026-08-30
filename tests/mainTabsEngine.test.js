import test from 'node:test';
import assert from 'node:assert/strict';

import { createMainTabsEngine } from '../src/features/mainTabs/mainTabsEngine.js';

test('MainTabsEngine normalizes and owns hidden tab state without allowing profile to hide', () => {
  const host = { __hiddenMainTabs: ['notes', 'notes', 'profile'], __mainCustomTabs: [] };
  const engine = createMainTabsEngine({ host });

  assert.deepEqual(engine.getState().hiddenMainTabs, ['notes']);
  engine.setTabVisible('bookmarks', false);
  engine.setTabVisible('notes', true);
  engine.setTabVisible('profile', false);

  assert.deepEqual(engine.getState().hiddenMainTabs, ['bookmarks']);
  assert.deepEqual(host.__hiddenMainTabs, ['bookmarks']);
});

test('MainTabsEngine preserves custom tab CRUD and saved order compatibility', () => {
  const host = { __hiddenMainTabs: [], __mainCustomTabs: [] };
  const engine = createMainTabsEngine({ host });

  engine.saveCustomTab({
    id: 'reference',
    name: ' 자료 ',
    url: 'https://example.com',
    icon: 'book',
    order: 7
  });
  assert.deepEqual(engine.getState().mainCustomTabs, [
    {
      id: 'reference',
      name: '자료',
      url: 'https://example.com',
      icon: 'book',
      order: 7
    }
  ]);

  engine.saveCustomTab({
    id: 'reference',
    name: '수정',
    url: 'https://example.org',
    icon: 'star'
  });
  assert.equal(engine.getState().mainCustomTabs[0].name, '수정');
  engine.deleteCustomTab('reference');
  assert.deepEqual(engine.getState().mainCustomTabs, []);
  assert.deepEqual(host.__mainCustomTabs, []);
});

test('MainTabsEngine returns copies so callers cannot mutate owned state', () => {
  const engine = createMainTabsEngine({
    host: {
      __hiddenMainTabs: ['notes'],
      __mainCustomTabs: [{ id: 'one', name: 'One', url: 'https://example.com' }]
    }
  });
  const state = engine.getState();
  state.hiddenMainTabs.push('bookmarks');
  state.mainCustomTabs[0].name = 'Changed';

  assert.deepEqual(engine.getState().hiddenMainTabs, ['notes']);
  assert.equal(engine.getState().mainCustomTabs[0].name, 'One');
});
