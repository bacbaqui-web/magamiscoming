export function normalizeClipPath(path) {
  const segments = String(path || '')
    .replaceAll('\\', '/')
    .replace(/^\.[/:]+/, '')
    .replace(/^\/+/, '')
    .normalize('NFC')
    .split('/');
  const normalized = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') normalized.pop();
    else normalized.push(segment);
  }
  return normalized.join('/').toLowerCase();
}

function getFilePath(file) {
  return normalizeClipPath(file?.webkitRelativePath || file?.name);
}

export function naturalSortClipFiles(files) {
  return [...files].sort((a, b) =>
    getFilePath(a).localeCompare(getFilePath(b), undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  );
}

export function collectCmcPagePaths(projectRows, nodeRows) {
  const rootId = projectRows?.[0]?.[0];
  if (rootId == null || !Array.isArray(nodeRows)) return [];
  const nodeMap = new Map(nodeRows.map((row) => [row[0], row]));
  let currentId = nodeMap.get(rootId)?.[1];
  const visited = new Set();
  const paths = [];

  while (currentId != null && currentId !== 0 && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;
    if (node[3]) paths.push(normalizeClipPath(node[3]));
    currentId = node[2];
  }
  return paths;
}

export function createClipFileOrder(files, cmcCandidates = []) {
  const clipFiles = files.filter((file) => file?.name?.toLowerCase().endsWith('.clip'));
  const filesByPath = new Map(clipFiles.map((file) => [getFilePath(file), file]));
  let best = null;

  for (const candidate of cmcCandidates) {
    if (candidate.error || !Array.isArray(candidate.pagePaths)) continue;
    const cmcPath = normalizeClipPath(candidate.relativePath || candidate.name);
    const slashIndex = cmcPath.lastIndexOf('/');
    const directory = slashIndex >= 0 ? cmcPath.slice(0, slashIndex) : '';
    const list = [];
    const missingPaths = [];

    for (const pagePath of candidate.pagePaths) {
      const fullPath = normalizeClipPath(directory ? `${directory}/${pagePath}` : pagePath);
      const matched = filesByPath.get(fullPath);
      if (matched) list.push(matched);
      else missingPaths.push(fullPath);
    }
    if (!best || list.length > best.list.length) {
      best = {
        list,
        cmcName: candidate.name,
        missing: missingPaths.length,
        missingPaths,
        cmcCount: cmcCandidates.length,
        usedFallback: false
      };
    }
  }

  if (best?.list.length) return best;
  return {
    list: naturalSortClipFiles(clipFiles),
    cmcName: null,
    missing: 0,
    missingPaths: [],
    cmcCount: cmcCandidates.length,
    usedFallback: true
  };
}
