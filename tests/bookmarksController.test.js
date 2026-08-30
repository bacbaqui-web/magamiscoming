import test from 'node:test';
import assert from 'node:assert/strict';

import { createBookmarksController } from '../src/features/bookmarks/bookmarksController.js';
import { createBookmarksEngine } from '../src/features/bookmarks/bookmarksEngine.js';

test('BookmarksController가 Engine 변경을 호환 상태에 게시하고 저장을 예약한다', () => {
  let renders = 0;
  let saves = 0;
  const host = {
    __bookmarksPersistence: { schedule: () => saves++ }
  };
  const engine = createBookmarksEngine();
  const controller = createBookmarksController({ engine, host, render: () => renders++ });

  controller.addTab({ id: 'ref', name: '자료' });
  controller.addBookmark({ id: 'one', type: 'link', pageUrl: 'https://example.com' });
  controller.updateBookmark('one', { title: '제목' });
  controller.moveBookmark('one', 'default');

  assert.equal(host.__bookmarkActiveTabId, 'ref');
  assert.equal(host.imageBookmarks[0].title, '제목');
  assert.equal(host.imageBookmarks[0].bookmarkTabId, 'default');
  assert.equal(renders, 4);
  assert.equal(saves, 4);
});
