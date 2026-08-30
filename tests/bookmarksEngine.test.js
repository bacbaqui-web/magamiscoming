import test from 'node:test';
import assert from 'node:assert/strict';

import { createBookmarksEngine } from '../src/features/bookmarks/bookmarksEngine.js';

test('BookmarksEngine이 탭, 항목, 활성 탭과 이동 규칙을 소유한다', () => {
  const engine = createBookmarksEngine({
    initialState: {
      tabs: [
        { id: 'default', name: '기본', order: 0 },
        { id: 'ref', name: '자료', order: 10 }
      ],
      bookmarks: [
        { id: 'old', type: 'link', bookmarkTabId: 'default', timestampMs: 1 },
        { id: 'new', type: 'video', bookmarkTabId: 'default', timestampMs: 2 }
      ],
      activeId: 'default'
    }
  });

  assert.deepEqual(
    engine.getActiveBookmarks().map((item) => item.id),
    ['new', 'old']
  );
  assert.equal(engine.moveBookmark('new', 'ref'), true);
  assert.equal(engine.setActiveTab('ref'), true);
  assert.deepEqual(
    engine.getActiveBookmarks().map((item) => item.id),
    ['new']
  );
  engine.deleteTab('ref');
  assert.equal(engine.findBookmark('new'), null);
  assert.equal(engine.getSnapshot().activeId, 'default');
});

test('BookmarksEngine Snapshot을 외부에서 바꿔도 내부 상태는 변하지 않는다', () => {
  const engine = createBookmarksEngine({
    initialState: {
      tabs: [{ id: 'default', name: '기본', order: 0 }],
      bookmarks: [{ id: 'one', title: '원본' }],
      activeId: 'default'
    }
  });
  const snapshot = engine.getSnapshot();
  snapshot.tabs[0].name = '변경';
  snapshot.bookmarks[0].title = '변경';

  assert.equal(engine.getSnapshot().tabs[0].name, '기본');
  assert.equal(engine.getSnapshot().bookmarks[0].title, '원본');
});
