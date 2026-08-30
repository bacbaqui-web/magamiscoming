import { downloadTextFile } from '../tabSettings.js';
import { formatNotesBackupDate, makeNotesTabId, makeSafeNotesFileName } from './notesHelper.js';

export function createNotesController({ composer, engine, host = window }) {
  let saveTimer = null;
  let tabSwitchInProgress = false;
  let controller;

  function publish() {
    const snapshot = engine.getSnapshot();
    host.__notesTabList = snapshot.tabs;
    host.__notesTabs = snapshot.notes;
    host.__notesActiveTabId = snapshot.activeId;
    return snapshot;
  }

  function render() {
    composer.render(publish());
  }

  function persistence() {
    return host.__notesPersistence || {};
  }

  function scheduleSave() {
    host.clearTimeout(saveTimer);
    saveTimer = host.setTimeout(() => {
      saveTimer = null;
      persistence().schedule?.();
    }, 500);
  }

  async function saveNow(tabId, value) {
    if (tabId) engine.setNote(tabId, value);
    publish();
    host.clearTimeout(saveTimer);
    saveTimer = null;
    await persistence().saveNow?.();
  }

  function backupTab(tabId) {
    const snapshot = publish();
    const tab = snapshot.tabs.find((item) => item.id === tabId);
    const formatted = formatNotesBackupDate(new Date());
    downloadTextFile(
      `${makeSafeNotesFileName(tab?.name)}_${formatted.stamp}.txt`,
      [
        '메모 탭 백업',
        `탭: ${tab?.name || '메모'}`,
        `다운로드 시각: ${formatted.display}`,
        '',
        snapshot.notes[tabId] || '(내용 없음)'
      ].join('\n')
    );
    host.showFeedbackMessage?.('메모 탭을 다운로드했습니다.');
  }

  controller = {
    async addTab({ id = makeNotesTabId(), name }) {
      if (!engine.addTab({ id, name })) return;
      render();
      persistence().schedule?.();
    },
    backupAll() {
      const snapshot = publish();
      const formatted = formatNotesBackupDate(new Date());
      const lines = [
        '메모 전체 백업',
        `다운로드 시각: ${formatted.display}`,
        '',
        '========================================',
        ''
      ];
      snapshot.tabs.forEach((tab, index) => {
        lines.push(`[${index + 1}] ${tab.name || `탭 ${index + 1}`}`);
        lines.push('----------------------------------------');
        lines.push(snapshot.notes[tab.id] || '(내용 없음)');
        lines.push('', '========================================', '');
      });
      downloadTextFile(`memo_backup_${formatted.stamp}.txt`, lines.join('\n'));
      host.showFeedbackMessage?.('메모를 txt로 다운로드했습니다.');
    },
    async deleteTab(tabId) {
      if (!engine.deleteTab(tabId)) return;
      render();
      persistence().schedule?.();
    },
    hydrate(state) {
      engine.hydrate(state);
      render();
    },
    openCreate() {
      composer.openCreate({
        getTabs: () => engine.getSnapshot().tabs,
        onCreate: async (name) => {
          const snapshot = engine.getSnapshot();
          await saveNow(snapshot.activeId, snapshot.notes[snapshot.activeId] || '');
          await controller.addTab({ name });
        }
      });
    },
    openSettings(tabId) {
      const tab = engine.getSnapshot().tabs.find((item) => item.id === tabId);
      if (!tab) return;
      composer.openSettings({
        tab,
        getTabs: () => engine.getSnapshot().tabs,
        onSave: controller.renameTab,
        onDelete: controller.deleteTab,
        onBackup: backupTab,
        onReorder: controller.reorderTabs,
        onCreate: null
      });
    },
    async renameTab(tabId, name) {
      if (!engine.renameTab(tabId, name)) return;
      render();
      persistence().schedule?.();
    },
    render,
    async reorderTabs(tabs) {
      engine.reorderTabs(tabs);
      render();
      persistence().schedule?.();
    },
    saveActiveNow(value) {
      const activeId = engine.getSnapshot().activeId;
      return saveNow(activeId, value).catch((error) => console.error(error));
    },
    saveNoteNow: saveNow,
    saveNoteScheduled(tabId, value) {
      if (tabId) engine.setNote(tabId, value);
      publish();
      scheduleSave();
    },
    async setActiveTab(tabId) {
      if (!engine.setActiveTab(tabId)) return;
      render();
      persistence().schedule?.();
    },
    async switchTab(tabId, currentValue) {
      const snapshot = engine.getSnapshot();
      if (tabSwitchInProgress || tabId === snapshot.activeId) return;
      tabSwitchInProgress = true;
      engine.setNote(snapshot.activeId, currentValue);
      try {
        await saveNow(snapshot.activeId, currentValue);
        engine.setActiveTab(tabId);
        render();
        persistence().schedule?.();
      } catch (error) {
        console.error(error);
        host.showAlert?.(
          '메모 저장이 끝나지 않아 탭을 전환하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } finally {
        tabSwitchInProgress = false;
      }
    },
    updateActiveText(value) {
      const activeId = engine.getSnapshot().activeId;
      engine.setNote(activeId, value);
      publish();
      scheduleSave();
    }
  };

  return controller;
}
