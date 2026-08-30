import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractBookmarkDomain,
  getOpenableBookmarkUrl,
  getYoutubeThumbnail,
  isBookmarkImageUrl,
  isBookmarkVideoUrl,
  isGenericBookmarkUrl
} from '../src/features/bookmarks/bookmarksHelper.js';

test('북마크 입력 URL을 기존 이미지, 영상과 일반 링크 규칙으로 분류한다', () => {
  assert.equal(isBookmarkImageUrl('https://cdn.example.com/a.webp?size=2'), true);
  assert.equal(isBookmarkVideoUrl('https://www.youtube.com/watch?v=abcdefghijk'), true);
  assert.equal(isGenericBookmarkUrl('https://example.com/article'), true);
  assert.equal(isGenericBookmarkUrl('https://instagram.com/p/one'), false);
});

test('도메인, 열 수 있는 URL과 YouTube 미리보기 규칙을 보존한다', () => {
  assert.equal(extractBookmarkDomain('https://www.example.com/a'), 'example.com');
  assert.equal(getOpenableBookmarkUrl('javascript:alert(1)'), '');
  assert.equal(
    getYoutubeThumbnail('https://www.youtube.com/watch?v=abcdefghijk'),
    'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg'
  );
});
