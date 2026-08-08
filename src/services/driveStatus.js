export function createDriveStatusStore(indicatorEl) {
  let statusTimer = null;
  let pendingUploads = 0;
  let uploadProgress = {
    active: false,
    planned: false,
    pending: 0,
    completed: 0,
    total: 0,
    label: 'Drive 업로드'
  };

  function renderIndicator(text, isBusy) {
    indicatorEl.setAttribute('aria-label', text);
    indicatorEl.title = text;
    indicatorEl.classList.toggle('busy', isBusy);
    indicatorEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 11a8 8 0 1 0 2 5.3" />
        <path d="M20 4v7h-7" />
      </svg>`;
    const accessibleText = document.createElement('span');
    accessibleText.className = 'sr-only';
    accessibleText.textContent = text;
    indicatorEl.appendChild(accessibleText);
  }

  function setStatus(text, autoHide = true, isBusy = false) {
    if (!indicatorEl) return;
    renderIndicator(text, isBusy);
    indicatorEl.classList.add('show');
    clearTimeout(statusTimer);
    if (autoHide) {
      statusTimer = setTimeout(() => indicatorEl.classList.remove('show'), 1800);
    }
  }

  function setBusy(text) {
    setStatus(text, false, true);
  }

  function hide() {
    if (indicatorEl) indicatorEl.classList.remove('show');
  }

  function hasPendingUploads() {
    return pendingUploads > 0 || uploadProgress.active;
  }

  function updateUploadProgress(autoHide = false) {
    const total = Math.max(1, Number(uploadProgress.total || 0));
    const completed = Math.min(total, Number(uploadProgress.completed || 0));
    const percent = Math.floor((completed / total) * 100);
    setStatus(`${uploadProgress.label} ${completed}/${total} (${percent}%)`, autoHide, !autoHide);
  }

  function beginUploadBatch(total, label = 'Drive 업로드') {
    uploadProgress = {
      active: true,
      planned: true,
      pending: 0,
      completed: 0,
      total: Math.max(1, Number(total || 0)),
      label
    };
    updateUploadProgress(false);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      if (uploadProgress.pending <= 0 && uploadProgress.completed < uploadProgress.total) {
        uploadProgress.active = false;
      }
    };
  }

  function beginUpload(label = 'Drive 업로드') {
    if (!uploadProgress.active) {
      uploadProgress = {
        active: true,
        planned: false,
        pending: 0,
        completed: 0,
        total: 0,
        label
      };
    }
    pendingUploads += 1;
    uploadProgress.pending += 1;
    if (!uploadProgress.planned) uploadProgress.total += 1;
    updateUploadProgress(false);
  }

  function finishUpload() {
    pendingUploads = Math.max(0, pendingUploads - 1);
    uploadProgress.pending = Math.max(0, uploadProgress.pending - 1);
    uploadProgress.completed = Math.min(
      Math.max(1, uploadProgress.total),
      uploadProgress.completed + 1
    );
    const complete =
      uploadProgress.pending <= 0 && uploadProgress.completed >= uploadProgress.total;
    updateUploadProgress(complete);
    if (complete) {
      uploadProgress.active = false;
      uploadProgress.planned = false;
    }
  }

  return {
    beginUpload,
    beginUploadBatch,
    finishUpload,
    hasPendingUploads,
    hide,
    setBusy,
    setStatus
  };
}
