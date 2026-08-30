export function createClipViewerComposer({ host = window, root = document } = {}) {
  const elements = {
    clearButton: root.getElementById('clipClearBtn'),
    folderInput: root.getElementById('clipFolderInput'),
    message: root.getElementById('clipMessage'),
    refreshButton: root.getElementById('clipRefreshBtn'),
    status: root.getElementById('clipStatus'),
    viewer: root.getElementById('clipViewer')
  };
  if (!elements.viewer) return null;

  const isMobile = () => host.matchMedia?.('(max-width: 768px)').matches;

  function setDropActive(active) {
    elements.message?.classList.toggle('drag-over', active);
    elements.viewer.classList.toggle('drag-over', active);
  }

  function bindDropZone(element, controller) {
    if (!element) return;
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    });
    element.addEventListener('dragleave', (event) => {
      if (element.contains(event.relatedTarget)) return;
      setDropActive(false);
    });
    element.addEventListener('drop', async (event) => {
      event.preventDefault();
      setDropActive(false);
      await controller.openDroppedFiles(event.dataTransfer);
    });
  }

  return {
    appendPage({ name, url }) {
      const image = root.createElement('img');
      image.className = 'clip-page';
      image.alt = name;
      image.src = url;
      elements.viewer.appendChild(image);
    },
    bind(controller) {
      elements.folderInput?.addEventListener('change', (event) =>
        controller.openFiles(Array.from(event.target.files || []))
      );
      elements.refreshButton?.addEventListener('click', controller.refresh);
      elements.clearButton?.addEventListener('click', controller.clear);
      bindDropZone(elements.message, controller);
      bindDropZone(elements.viewer, controller);
      host.matchMedia?.('(max-width: 768px)').addEventListener?.('change', controller.showEmpty);
    },
    clearFolderInput() {
      if (elements.folderInput) elements.folderInput.value = '';
    },
    clearPages() {
      elements.viewer.innerHTML = '';
    },
    hideMessage() {
      if (elements.message) elements.message.style.display = 'none';
    },
    isMobile,
    setStatus(text) {
      if (elements.status) elements.status.textContent = text;
    },
    showMessage(html) {
      if (!elements.message) return;
      elements.message.style.display = 'flex';
      elements.message.innerHTML = html;
    }
  };
}
