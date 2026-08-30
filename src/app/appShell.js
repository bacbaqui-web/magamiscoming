export function initializeAppShell({ host = window, mainTabsEngine, root = document } = {}) {
  const tabButtons = root.querySelectorAll('#main-tabs .notepad-tab');
  const tabContents = root.querySelectorAll('.tab-content');
  const driveSaveIndicator = root.getElementById('driveSaveIndicator');

  const showFeedbackMessage = (message) => {
    const element = root.createElement('div');
    element.textContent = message;
    element.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:16px 20px;border-radius:10px;z-index:2000;max-width:90%';
    root.body.appendChild(element);
    setTimeout(() => element.remove(), 2000);
  };

  const showAlert = (message) => {
    root.getElementById('modal-message').textContent = message;
    root.getElementById('alert-modal').classList.remove('hidden');
  };

  const hideAlert = () => {
    root.getElementById('alert-modal').classList.add('hidden');
  };

  function syncDriveSaveIndicatorPlacement() {
    if (!driveSaveIndicator) return;
    const mainTabs = root.getElementById('main-tabs');
    if (mainTabs && driveSaveIndicator.parentElement !== mainTabs) {
      mainTabs.appendChild(driveSaveIndicator);
    }
  }

  async function showTab(tabId) {
    root.body.classList.remove('custom-tab-view-active');
    root.body.classList.toggle('workmusic-tab-view-active', tabId === 'workmusic');
    if (host.waitForFeatureData) {
      const waiting = host.waitForFeatureData(tabId);
      if (waiting) {
        root.getElementById('loading-overlay')?.classList.remove('hidden');
        try {
          await waiting;
        } catch (error) {
          console.error(error);
          host.showAlert?.(
            '앱 데이터를 다운로드하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          );
        } finally {
          root.getElementById('loading-overlay')?.classList.add('hidden');
        }
      }
    }
    tabContents.forEach((content) => content.classList.remove('active'));
    root
      .querySelectorAll('#main-tabs .notepad-tab')
      .forEach((button) => button.classList.remove('active'));
    root.getElementById(`${tabId}-section`).classList.add('active');
    const button = root.querySelector(`#main-tabs .notepad-tab[data-tab="${tabId}"]`);
    if (button) button.classList.add('active');
    syncDriveSaveIndicatorPlacement();
  }

  function renderMainTabVisibility() {
    const hiddenTabs = new Set(mainTabsEngine.getState().hiddenMainTabs);
    tabButtons.forEach((button) => {
      if (button.dataset.tab === 'profile') return;
      button.classList.toggle('main-tab-hidden', hiddenTabs.has(button.dataset.tab));
    });
    root.querySelectorAll('[data-main-tab-toggle]').forEach((input) => {
      input.checked = !hiddenTabs.has(input.dataset.mainTabToggle);
    });
    const activeButton = root.querySelector('#main-tabs .notepad-tab.active');
    if (activeButton?.classList.contains('main-tab-hidden')) showTab('profile');
  }

  host.showFeedbackMessage = showFeedbackMessage;
  host.showAlert = showAlert;
  host.showTab = showTab;
  host.renderMainTabVisibility = renderMainTabVisibility;

  root.getElementById('modal-close-btn').addEventListener('click', hideAlert);
  root
    .getElementById('backupNotesBtn')
    ?.addEventListener('click', () => host.downloadAllNotesBackup?.());
  root
    .getElementById('backupAllDataBtn')
    ?.addEventListener('click', () => host.downloadAppDataBackup?.());
  tabButtons.forEach((button) =>
    button.addEventListener('click', () => showTab(button.dataset.tab))
  );

  showTab('calendar');
  renderMainTabVisibility();

  return { renderMainTabVisibility, showTab };
}
