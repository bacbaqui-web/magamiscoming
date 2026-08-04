const ICONS = {
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13"/>'
};

function iconSvg(icon, label = '') {
  const path = ICONS[icon] || ICONS.link;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>${label ? `<span>${label}</span>` : ''}`;
}

function normalizeCustomTabs(tabs) {
  const seen = new Set();
  return (Array.isArray(tabs) ? tabs : [])
    .filter((tab) => tab?.id && !seen.has(tab.id) && seen.add(tab.id))
    .map((tab) => ({
      id: String(tab.id),
      name:
        String(tab.name || '커스텀 탭')
          .trim()
          .slice(0, 30) || '커스텀 탭',
      url: String(tab.url || ''),
      icon: ICONS[tab.icon] ? tab.icon : 'link'
    }))
    .filter((tab) => /^https?:\/\//i.test(tab.url));
}

function safeUrl(value) {
  const raw = String(value || '').trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_) {
    return '';
  }
}

export function initMainTabs() {
  const mainTabs = document.getElementById('main-tabs');
  const profileButton = mainTabs?.querySelector('[data-tab="profile"]');
  const profileAddButton = document.getElementById('profileAddCustomTabBtn');
  const settingsList = document.getElementById('mainCustomTabSettingsList');
  const modal = document.getElementById('mainCustomTabModal');
  const title = document.getElementById('mainCustomTabModalTitle');
  const nameInput = document.getElementById('mainCustomTabNameInput');
  const urlInput = document.getElementById('mainCustomTabUrlInput');
  const iconPicker = document.getElementById('mainCustomTabIconPicker');
  const saveButton = document.getElementById('saveMainCustomTabBtn');
  const closeButton = document.getElementById('closeMainCustomTabModalBtn');
  const cancelButton = document.getElementById('cancelMainCustomTabBtn');
  if (!mainTabs || !profileButton || !profileAddButton || !modal) return;

  let editingId = null;
  let selectedIcon = 'link';

  function getTabs() {
    window.__mainCustomTabs = normalizeCustomTabs(window.__mainCustomTabs);
    return window.__mainCustomTabs;
  }

  function renderIconPicker() {
    iconPicker.innerHTML = '';
    Object.keys(ICONS).forEach((icon) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `main-custom-tab-icon-option${selectedIcon === icon ? ' active' : ''}`;
      button.dataset.icon = icon;
      button.setAttribute('aria-label', `${icon} 아이콘`);
      button.setAttribute('aria-pressed', selectedIcon === icon ? 'true' : 'false');
      button.innerHTML = iconSvg(icon);
      button.addEventListener('click', () => {
        selectedIcon = icon;
        renderIconPicker();
      });
      iconPicker.appendChild(button);
    });
  }

  function openModal(tab = null) {
    editingId = tab?.id || null;
    selectedIcon = tab?.icon || 'link';
    title.textContent = editingId ? '커스텀 탭 수정' : '커스텀 탭 추가';
    nameInput.value = tab?.name || '';
    urlInput.value = tab?.url || '';
    renderIconPicker();
    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    editingId = null;
  }

  function render() {
    mainTabs.querySelectorAll('[data-custom-main-tab]').forEach((button) => button.remove());
    const tabs = getTabs();
    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'notepad-tab main-custom-tab';
      button.dataset.customMainTab = tab.id;
      button.title = tab.name;
      button.setAttribute('aria-label', `${tab.name} 열기`);
      button.innerHTML = iconSvg(tab.icon);
      button.addEventListener('click', () => window.open(tab.url, '_blank', 'noopener,noreferrer'));
      mainTabs.insertBefore(button, profileButton);
    });

    settingsList.innerHTML = '';
    if (!tabs.length) {
      const empty = document.createElement('div');
      empty.className = 'profile-custom-tab-empty';
      empty.textContent = '추가한 커스텀 탭이 없습니다.';
      settingsList.appendChild(empty);
      return;
    }
    tabs.forEach((tab) => {
      const row = document.createElement('div');
      row.className = 'profile-custom-tab-row';
      const info = document.createElement('div');
      info.className = 'profile-custom-tab-info';
      info.innerHTML = iconSvg(tab.icon);
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = tab.name;
      const url = document.createElement('span');
      url.textContent = tab.url;
      copy.append(name, url);
      info.appendChild(copy);
      const actions = document.createElement('div');
      actions.className = 'profile-custom-tab-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = '수정';
      editButton.addEventListener('click', () => openModal(tab));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.textContent = '삭제';
      deleteButton.addEventListener('click', () => {
        window.__mainCustomTabs = getTabs().filter((item) => item.id !== tab.id);
        render();
        window.cloudSaveMainCustomTabs?.();
      });
      actions.append(editButton, deleteButton);
      row.append(info, actions);
      settingsList.appendChild(row);
    });
  }

  saveButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = safeUrl(urlInput.value);
    if (!name) {
      window.showAlert?.('커스텀 탭 이름을 입력해 주세요.');
      return;
    }
    if (!url) {
      window.showAlert?.('http:// 또는 https:// 형식의 올바른 URL을 입력해 주세요.');
      return;
    }
    const tabs = getTabs();
    const next = {
      id: editingId || `custom_${Date.now().toString(36)}`,
      name,
      url,
      icon: selectedIcon
    };
    window.__mainCustomTabs = editingId
      ? tabs.map((tab) => (tab.id === editingId ? next : tab))
      : [...tabs, next];
    render();
    closeModal();
    window.cloudSaveMainCustomTabs?.();
  });
  profileAddButton.addEventListener('click', () => openModal());
  closeButton?.addEventListener('click', closeModal);
  cancelButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  window.renderMainCustomTabs = render;
  render();
}
