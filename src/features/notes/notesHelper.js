export const DEFAULT_NOTES_TAB = { id: 'memo', name: '메모', order: 0 };

export function normalizeNotesTabs(tabs) {
  const source = Array.isArray(tabs) && tabs.length ? tabs : [DEFAULT_NOTES_TAB];
  return source
    .map((tab, index) => ({
      id: String(tab?.id || `memo_${index}`),
      name: String(tab?.name || '메모'),
      order: Number.isFinite(Number(tab?.order)) ? Number(tab.order) : index * 10
    }))
    .sort((a, b) => a.order - b.order);
}

export function makeNotesTabId(now = Date.now(), random = Math.random()) {
  return `tab_${now.toString(36)}_${random.toString(36).slice(2, 7)}`;
}

export function makeSafeNotesFileName(name) {
  return (
    String(name || 'memo')
      .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
      .trim() || 'memo'
  );
}

export function formatNotesBackupDate(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return {
    display: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
    stamp: `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`
  };
}
