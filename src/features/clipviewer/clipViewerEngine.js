function cloneOrder(order) {
  return {
    ...order,
    list: [...order.list],
    missingPaths: [...order.missingPaths]
  };
}

function cloneManifest(manifest) {
  return manifest.map((page) => ({ ...page }));
}

export function createClipViewerEngine() {
  let state = {
    sourceFiles: [],
    localPages: [],
    manifest: [],
    order: {
      list: [],
      cmcName: null,
      missing: 0,
      missingPaths: [],
      cmcCount: 0,
      usedFallback: false
    },
    sync: { phase: 'idle', message: '' }
  };

  return {
    addLocalPage(page) {
      state.localPages = [...state.localPages, { ...page }];
    },
    clearLocalPages() {
      const pages = state.localPages;
      state.localPages = [];
      return pages.map((page) => ({ ...page }));
    },
    getManifest() {
      return cloneManifest(state.manifest);
    },
    getSnapshot() {
      return {
        sourceFiles: [...state.sourceFiles],
        localPages: state.localPages.map((page) => ({ ...page })),
        manifest: cloneManifest(state.manifest),
        order: cloneOrder(state.order),
        sync: { ...state.sync }
      };
    },
    replaceManifest(manifest) {
      state.manifest = cloneManifest(Array.isArray(manifest) ? manifest : []);
    },
    replaceSourceFiles(files) {
      state.sourceFiles = [...(files || [])];
    },
    setOrder(order) {
      state.order = cloneOrder(order);
    },
    setSync(phase, message = '') {
      state.sync = { phase, message };
    }
  };
}
