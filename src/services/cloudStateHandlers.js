import { installBookmarkCloudHandlers } from './bookmarkCloudHandlers.js';
import { installCloudPersistenceHandlers } from './cloudPersistenceHandlers.js';
import { installWorkMusicCloudHandlers } from './workMusicCloudHandlers.js';

export function installCloudStateHandlers(options) {
  installCloudPersistenceHandlers(options);
  installBookmarkCloudHandlers({
    renameBookmarkTabDriveFolder: options.renameBookmarkTabDriveFolder,
    scheduleSave: options.scheduleSaveNonNotesData,
    setDriveStatus: options.setDriveStatus
  });
  installWorkMusicCloudHandlers();
}
