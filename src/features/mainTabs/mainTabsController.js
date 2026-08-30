import { normalizeCustomTabUrl } from './mainTabsHelper.js';

export function createMainTabsController({
  composer,
  engine,
  host = window,
  root = document
} = {}) {
  const { elements } = composer;

  function render() {
    composer.render(engine.getState().mainCustomTabs, {
      delete(tab) {
        const deletingActiveTab = elements.customSection.dataset.customTabId === tab.id;
        engine.deleteCustomTab(tab.id);
        if (deletingActiveTab) {
          elements.frame.removeAttribute('src');
          delete elements.customSection.dataset.customTabId;
          host.showTab?.('profile');
        }
        render();
        host.cloudSaveMainCustomTabs?.();
      },
      edit: composer.openModal
    });
  }

  function saveDraft() {
    const draft = composer.getDraft();
    const name = draft.name.trim();
    const url = normalizeCustomTabUrl(draft.url);
    if (!name) return host.showAlert?.('커스텀 탭 이름을 입력해 주세요.');
    if (!url) return host.showAlert?.('http:// 또는 https:// 형식의 올바른 URL을 입력해 주세요.');
    engine.saveCustomTab({
      id: draft.editingId || `custom_${Date.now().toString(36)}`,
      name,
      url,
      icon: draft.selectedIcon
    });
    render();
    composer.closeModal();
    host.cloudSaveMainCustomTabs?.();
  }

  elements.saveButton.addEventListener('click', saveDraft);
  elements.addButton.addEventListener('click', () => composer.openModal());
  elements.closeButton?.addEventListener('click', composer.closeModal);
  elements.cancelButton?.addEventListener('click', composer.closeModal);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) composer.closeModal();
  });
  elements.reloadButton?.addEventListener('click', () => {
    if (!elements.frame.src) return;
    const currentUrl = elements.frame.src;
    elements.frame.removeAttribute('src');
    requestAnimationFrame(() => {
      elements.frame.src = currentUrl;
    });
  });
  elements.frame.addEventListener('load', composer.applyScrollbarTheme);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.classList.contains('hidden'))
      composer.closeModal();
  });

  render();
  return { render };
}
