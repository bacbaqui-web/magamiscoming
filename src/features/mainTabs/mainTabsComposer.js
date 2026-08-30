import { MAIN_TAB_ICONS, renderMainTabIcon } from './mainTabsHelper.js';

const SCROLLBAR_STYLE_ID = 'magamiscoming-custom-tab-scrollbar';
const SCROLLBAR_CSS = `html{color-scheme:dark;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.28) transparent}html::-webkit-scrollbar{width:10px;height:10px}html::-webkit-scrollbar-track{background:transparent}html::-webkit-scrollbar-thumb{border:3px solid transparent;border-radius:999px;background:rgba(255,255,255,.28);background-clip:content-box}html::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.48);background-clip:content-box}`;

export function createMainTabsComposer({ root = document } = {}) {
  const elements = {
    addButton: root.getElementById('profileAddCustomTabBtn'),
    cancelButton: root.getElementById('cancelMainCustomTabBtn'),
    closeButton: root.getElementById('closeMainCustomTabModalBtn'),
    customSection: root.getElementById('main-custom-tab-section'),
    frame: root.getElementById('mainCustomTabFrame'),
    iconPicker: root.getElementById('mainCustomTabIconPicker'),
    mainTabs: root.getElementById('main-tabs'),
    modal: root.getElementById('mainCustomTabModal'),
    nameInput: root.getElementById('mainCustomTabNameInput'),
    reloadButton: root.getElementById('reloadMainCustomTabBtn'),
    saveButton: root.getElementById('saveMainCustomTabBtn'),
    settingsList: root.getElementById('mainCustomTabSettingsList'),
    title: root.getElementById('mainCustomTabModalTitle'),
    urlInput: root.getElementById('mainCustomTabUrlInput'),
    viewTitle: root.getElementById('mainCustomTabViewTitle'),
    viewUrl: root.getElementById('mainCustomTabViewUrl')
  };
  const profileButton = elements.mainTabs?.querySelector('[data-tab="profile"]');
  let editingId = null;
  let selectedIcon = 'link';

  function isReady() {
    return Boolean(
      elements.mainTabs &&
      profileButton &&
      elements.addButton &&
      elements.modal &&
      elements.customSection &&
      elements.frame
    );
  }

  function renderIconPicker() {
    elements.iconPicker.innerHTML = '';
    Object.keys(MAIN_TAB_ICONS).forEach((icon) => {
      const button = root.createElement('button');
      button.type = 'button';
      button.className = `main-custom-tab-icon-option${selectedIcon === icon ? ' active' : ''}`;
      button.dataset.icon = icon;
      button.setAttribute('aria-label', `${icon} 아이콘`);
      button.setAttribute('aria-pressed', selectedIcon === icon ? 'true' : 'false');
      button.innerHTML = renderMainTabIcon(icon);
      button.addEventListener('click', () => {
        selectedIcon = icon;
        renderIconPicker();
      });
      elements.iconPicker.appendChild(button);
    });
  }

  function openModal(tab = null) {
    editingId = tab?.id || null;
    selectedIcon = tab?.icon || 'link';
    elements.title.textContent = editingId ? '커스텀 탭 수정' : '커스텀 탭 추가';
    elements.nameInput.value = tab?.name || '';
    elements.urlInput.value = tab?.url || '';
    renderIconPicker();
    elements.modal.classList.remove('hidden');
    elements.nameInput.focus();
  }

  function closeModal() {
    elements.modal.classList.add('hidden');
    editingId = null;
  }

  function showCustomTab(tab, button) {
    root.body.classList.add('custom-tab-view-active');
    root.body.classList.remove('workmusic-tab-view-active');
    root.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
    root
      .querySelectorAll('#main-tabs .notepad-tab')
      .forEach((tabButton) => tabButton.classList.remove('active'));
    elements.customSection.classList.add('active');
    elements.customSection.dataset.customTabId = tab.id;
    button.classList.add('active');
    elements.viewTitle.textContent = tab.name;
    elements.viewUrl.textContent = tab.url;
    if (elements.frame.src !== tab.url) elements.frame.src = tab.url;
  }

  function render(tabs, actions) {
    elements.mainTabs
      .querySelectorAll('[data-custom-main-tab]')
      .forEach((button) => button.remove());
    tabs.forEach((tab) => {
      const button = root.createElement('button');
      button.type = 'button';
      button.className = 'notepad-tab main-custom-tab';
      button.dataset.customMainTab = tab.id;
      button.title = tab.name;
      button.setAttribute('aria-label', `${tab.name} 열기`);
      button.innerHTML = renderMainTabIcon(tab.icon);
      button.addEventListener('click', () => showCustomTab(tab, button));
      elements.mainTabs.insertBefore(button, profileButton);
    });
    elements.settingsList.innerHTML = '';
    if (!tabs.length) {
      const empty = root.createElement('div');
      empty.className = 'profile-custom-tab-empty';
      empty.textContent = '추가한 커스텀 탭이 없습니다.';
      elements.settingsList.appendChild(empty);
      return;
    }
    tabs.forEach((tab) => {
      const row = root.createElement('div');
      row.className = 'profile-custom-tab-row';
      const info = root.createElement('div');
      info.className = 'profile-custom-tab-info';
      info.innerHTML = renderMainTabIcon(tab.icon);
      const copy = root.createElement('div');
      const name = root.createElement('strong');
      name.textContent = tab.name;
      const url = root.createElement('span');
      url.textContent = tab.url;
      copy.append(name, url);
      info.appendChild(copy);
      const actionBox = root.createElement('div');
      actionBox.className = 'profile-custom-tab-actions';
      const editButton = root.createElement('button');
      editButton.type = 'button';
      editButton.textContent = '수정';
      editButton.addEventListener('click', () => actions.edit(tab));
      const deleteButton = root.createElement('button');
      deleteButton.type = 'button';
      deleteButton.textContent = '삭제';
      deleteButton.addEventListener('click', () => actions.delete(tab));
      actionBox.append(editButton, deleteButton);
      row.append(info, actionBox);
      elements.settingsList.appendChild(row);
    });
  }

  function applyScrollbarTheme() {
    try {
      const frameDocument = elements.frame.contentDocument;
      if (!frameDocument?.head || frameDocument.getElementById(SCROLLBAR_STYLE_ID)) return;
      const style = frameDocument.createElement('style');
      style.id = SCROLLBAR_STYLE_ID;
      style.textContent = SCROLLBAR_CSS;
      frameDocument.head.appendChild(style);
    } catch (_) {
      // 외부 사이트는 동일 출처 정책상 내부 CSS를 변경할 수 없다.
    }
  }

  return {
    applyScrollbarTheme,
    closeModal,
    elements,
    getDraft: () => ({
      editingId,
      name: elements.nameInput.value,
      selectedIcon,
      url: elements.urlInput.value
    }),
    isReady,
    openModal,
    render
  };
}
