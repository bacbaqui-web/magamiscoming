export function createProfileController({ engine, host = window, root = document } = {}) {
  root.querySelectorAll('[data-main-tab-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      engine.requestTabVisibility(input.dataset.mainTabToggle, input.checked);
      host.renderMainTabVisibility?.();
      host.cloudSaveMainTabVisibility?.();
    });
  });

  root.querySelectorAll('[data-main-tab-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.mainTabSettings === 'calendar') {
        host.openCalendarSettings?.();
        return;
      }
      host.showFeedbackMessage?.('이 탭은 아직 별도 설정 항목이 없습니다.');
    });
  });

  return { refresh: engine.refresh };
}
