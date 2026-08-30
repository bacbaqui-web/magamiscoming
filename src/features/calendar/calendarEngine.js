import {
  addDays,
  normalizeViewMode,
  normalizeWeekStartDay,
  startOfWeek,
  toKST
} from './calendarHelper.js';

function cloneTask(task) {
  return { ...task, occurrenceStatus: { ...(task.occurrenceStatus || {}) } };
}

function cloneTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : []).map(cloneTask);
}

export function createCalendarEngine({ initialState = {}, now = () => new Date() } = {}) {
  let state;

  function hydrate(next = {}) {
    const weekStartDay = normalizeWeekStartDay(next.weekStartDay);
    const today = toKST(now());
    const weekAnchor = next.weekAnchor ? new Date(next.weekAnchor) : today;
    const monthAnchor = next.monthAnchor ? new Date(next.monthAnchor) : today;
    state = {
      tasks: cloneTasks(next.tasks),
      taskStatus: { ...(next.taskStatus || {}) },
      viewMode: normalizeViewMode(next.viewMode),
      weekStartDay,
      weekStart: startOfWeek(weekAnchor, weekStartDay),
      monthDate: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
    };
  }

  function getSnapshot() {
    return {
      tasks: cloneTasks(state.tasks),
      taskStatus: { ...state.taskStatus },
      viewMode: state.viewMode,
      weekStartDay: state.weekStartDay,
      weekStart: new Date(state.weekStart),
      monthDate: new Date(state.monthDate)
    };
  }

  hydrate(initialState);

  return {
    deleteTask(id) {
      const previousLength = state.tasks.length;
      state.tasks = state.tasks.filter((task) => task.id !== id);
      return previousLength !== state.tasks.length;
    },
    findTask(id) {
      const task = state.tasks.find((item) => item.id === id);
      return task ? cloneTask(task) : null;
    },
    getSnapshot,
    hydrate,
    moveMonth(offset) {
      if (!offset) return false;
      state.monthDate = new Date(
        state.monthDate.getFullYear(),
        state.monthDate.getMonth() + offset,
        1
      );
      return true;
    },
    moveWeek(offset) {
      if (!offset) return false;
      state.weekStart = addDays(state.weekStart, offset * 7);
      return true;
    },
    saveSettings({ viewMode, weekStartDay }) {
      const selectedWeekAnchor = addDays(state.weekStart, 3);
      const previousViewMode = state.viewMode;
      state.weekStartDay = normalizeWeekStartDay(weekStartDay);
      state.weekStart = startOfWeek(selectedWeekAnchor, state.weekStartDay);
      state.viewMode = normalizeViewMode(viewMode);
      if (state.viewMode === 'month' && previousViewMode !== 'month') {
        const monthAnchor = addDays(state.weekStart, 3);
        state.monthDate = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
      }
      return true;
    },
    toggleTaskComplete(id, occurrenceDate = '') {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return false;
      if (occurrenceDate) {
        task.occurrenceStatus = task.occurrenceStatus || {};
        task.occurrenceStatus[occurrenceDate] = !task.occurrenceStatus[occurrenceDate];
      } else {
        task.complete = !task.complete;
      }
      return true;
    },
    upsertTask(task) {
      if (!task?.id) return false;
      const nextTask = cloneTask(task);
      const index = state.tasks.findIndex((item) => item.id === nextTask.id);
      if (index >= 0) state.tasks[index] = nextTask;
      else state.tasks.push(nextTask);
      return true;
    }
  };
}
