export function createCalendarController({
  engine,
  ensureLogin = () => true,
  host = window,
  render = () => {},
  saveNow = async () => {},
  saveSettings = () => {}
}) {
  function publish() {
    const snapshot = engine.getSnapshot();
    host.customTasks = snapshot.tasks;
    host.taskStatus = snapshot.taskStatus;
    host.__calendarViewMode = snapshot.viewMode;
    return snapshot;
  }

  async function change(mutator, { persist = true } = {}) {
    if (!ensureLogin()) return false;
    const changed = mutator();
    if (changed === false) return false;
    publish();
    render();
    if (persist) await saveNow();
    return true;
  }

  return {
    deleteTask(id) {
      return change(() => engine.deleteTask(id));
    },
    findTask: engine.findTask,
    getSnapshot: engine.getSnapshot,
    hydrate(state) {
      engine.hydrate(state);
      publish();
      render();
    },
    moveMonth(offset, { shouldRender = true } = {}) {
      if (!engine.moveMonth(offset)) return false;
      if (shouldRender) render();
      return true;
    },
    moveWeek(offset, { shouldRender = true } = {}) {
      if (!engine.moveWeek(offset)) return false;
      if (shouldRender) render();
      return true;
    },
    publish,
    render() {
      publish();
      render();
    },
    saveCalendarSettings(settings) {
      engine.saveSettings(settings);
      const snapshot = publish();
      render();
      saveSettings();
      return snapshot;
    },
    toggleTaskComplete(id, occurrenceDate = '') {
      return change(() => engine.toggleTaskComplete(id, occurrenceDate));
    },
    upsertTask(task) {
      return change(() => engine.upsertTask(task));
    }
  };
}
