import { createPomodoroComposer } from './pomodoro/pomodoroComposer.js';
import { createPomodoroController } from './pomodoro/pomodoroController.js';
import { createPomodoroEngine } from './pomodoro/pomodoroEngine.js';

export function initPomodoro({ host = window, root = document } = {}) {
  const composer = createPomodoroComposer({ root });
  if (!composer) return null;

  const engine = createPomodoroEngine({ initialState: host.__pomodoroState });
  const controller = createPomodoroController({ engine, host, render: composer.render });
  composer.bind(controller);

  host.renderPomodoroUI = () => controller.hydrate(host.__pomodoroState);
  host.setInterval(controller.tick, 500);
  controller.render();

  return {
    engine,
    renderFromCompatibility: host.renderPomodoroUI
  };
}
