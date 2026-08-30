import { createProfileComposer } from './profile/profileComposer.js';
import { createProfileController } from './profile/profileController.js';
import { createProfileEngine } from './profile/profileEngine.js';

export function initProfile(options = {}) {
  const engine = createProfileEngine(options);
  const composer = createProfileComposer({ engine, root: options.root });
  const controller = createProfileController({ engine, host: options.host, root: options.root });
  return { composer, controller, engine };
}
