export function installCloudPersistenceHandlers({
  clearScheduledNotesSave,
  ensureLogin,
  queueNotesSave,
  saveNonNotesDataNow,
  scheduleSaveNonNotesData,
  scheduleSaveNotesData
}) {
  window.__notesPersistence = {
    async saveNow() {
      if (!ensureLogin()) return;
      clearScheduledNotesSave();
      await queueNotesSave();
    },
    schedule() {
      if (ensureLogin()) scheduleSaveNotesData();
    }
  };
  window.__bookmarksPersistence = {
    schedule() {
      if (ensureLogin()) scheduleSaveNonNotesData();
    }
  };
  window.cloudSaveAll = async () => {
    if (ensureLogin()) await saveNonNotesDataNow();
  };
  window.cloudSaveMainTabVisibility = () => {
    if (ensureLogin()) scheduleSaveNonNotesData();
  };
  window.cloudSaveMainCustomTabs = () => {
    if (ensureLogin()) scheduleSaveNonNotesData();
  };
  window.cloudSaveCalendarSettings = () => {
    if (ensureLogin()) scheduleSaveNonNotesData();
  };
  window.cloudSaveWorkMusic = async () => {
    if (ensureLogin()) scheduleSaveNonNotesData();
  };
  window.cloudSavePomodoro = async () => {
    if (ensureLogin()) scheduleSaveNonNotesData();
  };
}
