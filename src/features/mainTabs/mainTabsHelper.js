export const MAIN_TAB_ICONS = {
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13"/>'
};

export function normalizeHiddenMainTabs(tabs) {
  return [...new Set((Array.isArray(tabs) ? tabs : []).map(String))].filter(
    (tabId) => tabId && tabId !== 'profile'
  );
}

export function normalizeCustomTabs(tabs) {
  const seen = new Set();
  return (Array.isArray(tabs) ? tabs : [])
    .filter((tab) => tab?.id && !seen.has(String(tab.id)) && seen.add(String(tab.id)))
    .map((tab) => {
      const normalized = {
        id: String(tab.id),
        name:
          String(tab.name || '커스텀 탭')
            .trim()
            .slice(0, 30) || '커스텀 탭',
        url: String(tab.url || ''),
        icon: MAIN_TAB_ICONS[tab.icon] ? tab.icon : 'link'
      };
      if (Number.isFinite(tab.order)) normalized.order = tab.order;
      return normalized;
    })
    .filter((tab) => /^https?:\/\//i.test(tab.url));
}

export function normalizeCustomTabUrl(value) {
  const raw = String(value || '').trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_) {
    return '';
  }
}

export function renderMainTabIcon(icon, label = '') {
  const path = MAIN_TAB_ICONS[icon] || MAIN_TAB_ICONS.link;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>${label ? `<span>${label}</span>` : ''}`;
}
