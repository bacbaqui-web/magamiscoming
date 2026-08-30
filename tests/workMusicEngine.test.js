import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicEngine } from '../src/features/workmusic/workMusicEngine.js';

test('Engine이 활성 탭 곡과 현재 인덱스를 소유한다', () => {
  const engine = createWorkMusicEngine({
    initialState: {
      tabs: [
        { id: 'default', name: '기본', order: 0 },
        { id: 'focus', name: '집중', order: 10 }
      ],
      songs: [
        { id: 'a', workMusicTabId: 'default' },
        { id: 'b', workMusicTabId: 'focus' }
      ],
      currentIndex: 5
    }
  });
  assert.equal(engine.getSnapshot().currentIndex, 0);
  engine.setActiveTab('focus');
  assert.equal(engine.getSnapshot().currentIndex, 0);
  assert.deepEqual(
    engine.getActiveSongs().map((song) => song.id),
    ['b']
  );
});

test('입력과 Snapshot 및 활성 곡 복사본 변경이 Engine 내부를 바꾸지 않는다', () => {
  const songs = [{ id: 'a', title: '원본' }];
  const tabs = [{ id: 'default', name: '기본', order: 0 }];
  const engine = createWorkMusicEngine({ initialState: { songs, tabs, playOrder: [0] } });
  songs[0].title = '입력 변경';
  tabs[0].name = '입력 변경';
  const snapshot = engine.getSnapshot();
  snapshot.songs[0].title = 'Snapshot 변경';
  snapshot.tabs[0].name = 'Snapshot 변경';
  snapshot.playOrder.push(9);
  const active = engine.getActiveSongs();
  active[0].title = '활성 곡 변경';
  assert.equal(engine.getSnapshot().songs[0].title, '원본');
  assert.equal(engine.getSnapshot().tabs[0].name, '기본');
  assert.deepEqual(engine.getSnapshot().playOrder, [0]);
});

test('존재하지 않는 활성 탭과 잘못된 재생 순서를 정규화한다', () => {
  const engine = createWorkMusicEngine({
    initialState: { activeTabId: 'missing', songs: [{ id: 'a' }, { id: 'b' }] }
  });
  assert.equal(engine.getSnapshot().activeTabId, 'default');
  engine.setState('playOrder', [1, 1, 9]);
  assert.deepEqual(engine.getSnapshot().playOrder, [0, 1]);
});

test('호환 전역의 읽기·쓰기가 Engine 상태를 경유한다', () => {
  const host = {};
  const engine = createWorkMusicEngine({ initialState: { volume: 80 } });
  engine.bindCompatibility(host);
  host.workMusicVolume = 140;
  host.workMusicSeamlessOverlapSeconds = 10;
  assert.equal(engine.getSnapshot().volume, 100);
  assert.equal(host.workMusicVolume, 100);
  assert.equal(engine.getSnapshot().seamlessEnabled, true);
});

test('호환 전역 getter의 배열과 항목 변경도 Engine 내부를 바꾸지 않는다', () => {
  const host = {};
  const engine = createWorkMusicEngine({
    initialState: { songs: [{ id: 'a', title: '원본' }], playOrder: [0] }
  });
  engine.bindCompatibility(host);
  host.workMusicSongs[0].title = '변경';
  host.workMusicSongs.push({ id: 'b' });
  host.__workMusicTabList[0].name = '변경';
  host.workMusicCurrentPlayOrder.push(9);
  assert.equal(engine.getSnapshot().songs[0].title, '원본');
  assert.equal(engine.getSnapshot().songs.length, 1);
  assert.equal(engine.getSnapshot().tabs[0].name, '기본');
  assert.deepEqual(engine.getSnapshot().playOrder, [0]);
});

test('탭 삭제 뒤 곡 길이에 맞게 현재 인덱스를 정규화한다', () => {
  const engine = createWorkMusicEngine({
    initialState: { songs: [{ id: 'a' }, { id: 'b' }], currentIndex: 1 }
  });
  engine.setSongs([{ id: 'a' }]);
  assert.equal(engine.getSnapshot().currentIndex, 0);
});
