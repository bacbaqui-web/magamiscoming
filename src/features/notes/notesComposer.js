import { openTabSettings, renderManagedTab } from '../tabSettings.js';

export function createNotesComposer({ root = document } = {}) {
  const notesArea = root.getElementById('notesArea');
  const tabsContainer = root.getElementById('notesTabsContainer');
  if (!notesArea || !tabsContainer) return null;

  function bind(controller) {
    tabsContainer.addEventListener('click', async (event) => {
      const settingsButton = event.target.closest('[data-action="tab-settings"]');
      if (settingsButton) {
        event.preventDefault();
        event.stopPropagation();
        const tabId = settingsButton.closest('.notes-tab')?.dataset.tabId;
        if (tabId) controller.openSettings(tabId);
        return;
      }
      if (event.target.closest('[data-action="new-tab"]')) {
        controller.openCreate();
        return;
      }
      const tabId = event.target.closest('.notes-tab')?.dataset.tabId;
      if (tabId) await controller.switchTab(tabId, notesArea.value);
    });
    notesArea.addEventListener('input', () => controller.updateActiveText(notesArea.value));
    notesArea.addEventListener('blur', () => controller.saveActiveNow(notesArea.value));
  }

  function openCreate(options) {
    openTabSettings({
      title: '메모 새 탭',
      create: true,
      defaultName: '새 탭',
      ...options
    });
  }

  function openSettings(options) {
    openTabSettings({ title: '메모 탭 설정', ...options });
  }

  function render(state) {
    tabsContainer.innerHTML =
      state.tabs
        .map((tab) =>
          renderManagedTab({
            className: 'notes-tab',
            id: tab.id,
            label: tab.name || '메모',
            active: tab.id === state.activeId
          })
        )
        .join('') + renderManagedTab({ className: 'notes-tab', newTab: true });
    notesArea.value = state.notes[state.activeId] || '';
  }

  return { bind, openCreate, openSettings, render };
}
