import { createMainTabsComposer } from './mainTabs/mainTabsComposer.js';
import { createMainTabsController } from './mainTabs/mainTabsController.js';

export function initMainTabs({ engine, host = window, root = document } = {}) {
  const composer = createMainTabsComposer({ root });
  if (!composer.isReady()) return null;
  const controller = createMainTabsController({ composer, engine, host, root });
  host.renderMainCustomTabs = controller.render;
  return { composer, controller, engine };
}
