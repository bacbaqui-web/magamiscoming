import test from 'node:test';
import assert from 'node:assert/strict';

import { createNotesController } from '../src/features/notes/notesController.js';
import { createNotesEngine } from '../src/features/notes/notesEngine.js';

test('NotesController saves the latest input before switching tabs', async () => {
  const saves = [];
  const renders = [];
  const timers = new Map();
  let timerId = 0;
  const host = {
    clearTimeout(id) {
      timers.delete(id);
    },
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    __notesPersistence: {
      async saveNow() {
        saves.push({
          activeId: host.__notesActiveTabId,
          notes: { ...host.__notesTabs }
        });
      },
      schedule() {}
    }
  };
  const engine = createNotesEngine({
    initialState: {
      tabs: [
        { id: 'memo', name: '메모', order: 0 },
        { id: 'later', name: '나중', order: 10 }
      ],
      notes: { memo: '', later: '기존' },
      activeId: 'memo'
    }
  });
  const composer = {
    render(state) {
      renders.push(state);
    }
  };
  const controller = createNotesController({ composer, engine, host });

  controller.updateActiveText('빠른 입력');
  await controller.switchTab('later', '빠른 입력');

  assert.deepEqual(saves, [{ activeId: 'memo', notes: { memo: '빠른 입력', later: '기존' } }]);
  assert.equal(engine.getSnapshot().activeId, 'later');
  assert.equal(engine.getSnapshot().notes.memo, '빠른 입력');
  assert.equal(renders.at(-1).notes.later, '기존');
});
