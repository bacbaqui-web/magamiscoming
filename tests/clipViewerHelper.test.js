import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectCmcPagePaths,
  createClipFileOrder,
  normalizeClipPath
} from '../src/features/clipviewer/clipViewerHelper.js';

function file(name, webkitRelativePath = name) {
  return { name, webkitRelativePath };
}

test('CanvasNode의 FirstChildIndex에서 NextIndex 연결 순서대로 페이지 경로를 만든다', () => {
  const paths = collectCmcPagePaths(
    [[100]],
    [
      [100, 11, 0, null],
      [11, 0, 12, '.\\pages\\002.clip'],
      [12, 0, 13, './pages/010.clip'],
      [13, 0, 0, 'pages/020.clip']
    ]
  );

  assert.deepEqual(paths, ['pages/002.clip', 'pages/010.clip', 'pages/020.clip']);
});

test('경로 구분자, 선행 상대 경로와 상위 경로를 정규화한다', () => {
  assert.equal(normalizeClipPath('.\\작품\\Pages\\..\\Pages\\001.CLIP'), '작품/pages/001.clip');
  assert.equal(normalizeClipPath('/작품//./pages/002.clip'), '작품/pages/002.clip');
});

test('CMC에 없는 파일은 표시 목록에서 건너뛰고 누락 경로를 보고한다', () => {
  const first = file('001.clip', 'project/pages/001.clip');
  const result = createClipFileOrder(
    [first],
    [
      {
        name: 'project.cmc',
        relativePath: 'project/project.cmc',
        pagePaths: ['pages/001.clip', 'pages/missing.clip']
      }
    ]
  );

  assert.deepEqual(result.list, [first]);
  assert.equal(result.missing, 1);
  assert.deepEqual(result.missingPaths, ['project/pages/missing.clip']);
});

test('CMC 분석에 실패하면 CLIP 파일을 자연 정렬한다', () => {
  const page10 = file('page10.clip', 'project/page10.clip');
  const page2 = file('page2.clip', 'project/page2.clip');
  const result = createClipFileOrder(
    [page10, page2],
    [{ name: 'project.cmc', error: new Error('invalid sqlite') }]
  );

  assert.deepEqual(result.list, [page2, page10]);
  assert.equal(result.usedFallback, true);
  assert.equal(result.cmcCount, 1);
});
