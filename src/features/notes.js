import { createNotesComposer } from './notes/notesComposer.js';
import { createNotesController } from './notes/notesController.js';
import { createNotesEngine } from './notes/notesEngine.js';

export function initNotes({ host = window, root = document } = {}) {
  const composer = createNotesComposer({ root });
  if (!composer) return null;

  const engine = createNotesEngine({
    initialState: {
      tabs: host.__notesTabList,
      notes: host.__notesTabs,
      activeId: host.__notesActiveTabId
    }
  });
  const controller = createNotesController({ composer, engine, host });
  composer.bind(controller);

  // Cloud Sync 공개 함수가 Engine을 우회하지 않도록 두는 임시 Compatibility 경계이다.
  host.__notesControllerCompatibility = controller;
  host.renderNotesUI = () =>
    controller.hydrate({
      tabs: host.__notesTabList,
      notes: host.__notesTabs,
      activeId: host.__notesActiveTabId
    });
  host.downloadAllNotesBackup = controller.backupAll;
  controller.render();

  return { controller, engine, renderFromCompatibility: host.renderNotesUI };
}
