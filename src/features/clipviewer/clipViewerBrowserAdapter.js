import { collectCmcPagePaths } from './clipViewerHelper.js';

function findAsciiBytes(bytes, text) {
  const pattern = [...text].map((character) => character.charCodeAt(0));
  outer: for (let index = 0; index <= bytes.length - pattern.length; index++) {
    for (let offset = 0; offset < pattern.length; offset++) {
      if (bytes[index + offset] !== pattern[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function detectImageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return null;
}

function readDirectoryEntries(reader) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(entries);
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

async function collectEntryFiles(entry, path = '') {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file((file) => {
        try {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            configurable: true
          });
        } catch (_) {
          // 일부 브라우저의 File 경로 속성은 변경할 수 없다.
        }
        resolve([file]);
      }, reject);
    });
  }
  if (!entry.isDirectory) return [];
  const entries = await readDirectoryEntries(entry.createReader());
  const nested = await Promise.all(
    entries.map((child) => collectEntryFiles(child, path + entry.name + '/'))
  );
  return nested.flat();
}

export function createClipViewerBrowserAdapter({ host = window } = {}) {
  let sqlPromise = null;

  async function getSql() {
    if (!sqlPromise) {
      sqlPromise = host.initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });
    }
    return sqlPromise;
  }

  async function openClipDatabase(file) {
    const SQL = await getSql();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const offset = findAsciiBytes(bytes, 'SQLite format 3');
    if (offset < 0) throw new Error('SQLite 데이터를 찾지 못했습니다.');
    return new SQL.Database(bytes.slice(offset));
  }

  return {
    createObjectUrl: (blob) => host.URL.createObjectURL(blob),
    async extractPreview(file) {
      const db = await openClipDatabase(file);
      try {
        const result = db.exec(
          'SELECT ImageData FROM CanvasPreview WHERE ImageData IS NOT NULL ORDER BY ImageWidth * ImageHeight DESC LIMIT 1'
        );
        const imageData = result?.[0]?.values?.[0]?.[0];
        if (!imageData) return null;
        const imageBytes = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);
        const type = detectImageType(imageBytes);
        return type ? new Blob([imageBytes], { type }) : null;
      } catch (_) {
        return null;
      } finally {
        db.close();
      }
    },
    async getDroppedFiles(dataTransfer) {
      const items = [...(dataTransfer?.items || [])];
      const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
      if (!entries.length) return [...(dataTransfer?.files || [])];
      const nested = await Promise.all(entries.map((entry) => collectEntryFiles(entry)));
      return nested.flat();
    },
    async readCmcPagePaths(file) {
      const db = await openClipDatabase(file);
      try {
        const project = db.exec('SELECT ProjectRootCanvasNode FROM Project LIMIT 1');
        const nodes = db.exec(
          'SELECT MainId, FirstChildIndex, NextIndex, LinkPath FROM CanvasNode'
        );
        return collectCmcPagePaths(project?.[0]?.values || [], nodes?.[0]?.values || []);
      } finally {
        db.close();
      }
    },
    revokeObjectUrl: (url) => host.URL.revokeObjectURL(url),
    yieldToBrowser: () => new Promise((resolve) => host.setTimeout(resolve, 0))
  };
}
