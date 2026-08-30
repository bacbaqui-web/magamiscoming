import test from 'node:test';
import assert from 'node:assert/strict';

import { createNotesEngine } from '../src/features/notes/notesEngine.js';

test('NotesEngine owns tab CRUD, active tab, and text without exposing mutable state', () => {
  const engine = createNotesEngine({
    initialState: {
      tabs: [
        { id: 'memo', name: '메모', order: 0 },
        { id: 'later', name: '나중', order: 10 }
      ],
      notes: { memo: '첫 번째', later: '두 번째' },
      activeId: 'memo'
    }
  });

  const exposed = engine.getSnapshot();
  exposed.tabs[0].name = '외부 변경';
  exposed.notes.memo = '외부 변경';
  assert.equal(engine.getSnapshot().tabs[0].name, '메모');
  assert.equal(engine.getSnapshot().notes.memo, '첫 번째');

  engine.setNote('memo', '수정');
  engine.setActiveTab('later');
  engine.renameTab('later', '다음');
  engine.reorderTabs([
    { id: 'later', name: '다음', order: 0 },
    { id: 'memo', name: '메모', order: 10 }
  ]);
  assert.deepEqual(engine.getSnapshot(), {
    tabs: [
      { id: 'later', name: '다음', order: 0 },
      { id: 'memo', name: '메모', order: 10 }
    ],
    notes: { memo: '수정', later: '두 번째' },
    activeId: 'later'
  });

  engine.deleteTab('later');
  assert.equal(engine.getSnapshot().activeId, 'memo');
});

test('NotesEngine restores a valid default tab and active id from stored data', () => {
  const engine = createNotesEngine({
    initialState: { tabs: [], notes: { memo: '복원' }, activeId: 'missing' }
  });
  assert.deepEqual(engine.getSnapshot(), {
    tabs: [{ id: 'memo', name: '메모', order: 0 }],
    notes: { memo: '복원' },
    activeId: 'memo'
  });
});
