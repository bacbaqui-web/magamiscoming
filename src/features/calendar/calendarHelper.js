const KST_TIME_ZONE = 'Asia/Seoul';

export function normalizeViewMode(value) {
  return value === 'month' ? 'month' : 'week';
}

export function normalizeWeekStartDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : 1;
}

export function toKST(date) {
  return new Date(date.toLocaleString('en-US', { timeZone: KST_TIME_ZONE }));
}

export function ymdKST(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function parseTaskDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfWeek(date, weekStartDay = 1) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOffset = (result.getDay() - normalizeWeekStartDay(weekStartDay) + 7) % 7;
  result.setDate(result.getDate() - startOffset);
  return result;
}

export function getWeekRange(anchor, weekStartDay = 1) {
  const start = startOfWeek(anchor, weekStartDay);
  return { start, end: addDays(start, 6) };
}

export function getMonthGridRange(anchor, weekStartDay = 1) {
  const firstDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(firstDate, weekStartDay);
  return { start, end: addDays(start, 41) };
}

export function isRecurringTask(task) {
  return !!task?.repeatEnabled && Array.isArray(task.repeatDays) && task.repeatDays.length > 0;
}

export function taskOccursOnDate(task, date, fullDate = ymdKST(date)) {
  if (isRecurringTask(task)) return task.repeatDays.includes(date.getDay());
  if (!task?.date) return false;
  return task.date <= fullDate && fullDate <= (task.endDate || task.date);
}

export function countRepeatDaysAfter(startDate, endDate, repeatDays) {
  const dayCount = Math.max(0, Math.round((endDate - startDate) / 86400000));
  const fullWeeks = Math.floor(dayCount / 7);
  let count = fullWeeks * repeatDays.length;
  for (let offset = fullWeeks * 7 + 1; offset <= dayCount; offset += 1) {
    if (repeatDays.includes(addDays(startDate, offset).getDay())) count += 1;
  }
  return count;
}

export function getTaskOccurrenceCount(task, occurrenceDate) {
  const anchorValue = Number.isFinite(Number(task.countAnchor)) ? Number(task.countAnchor) : 1;
  const anchorDate = parseTaskDate(task.repeatStartDate || task.date);
  if (occurrenceDate >= anchorDate) {
    return anchorValue + countRepeatDaysAfter(anchorDate, occurrenceDate, task.repeatDays);
  }
  return (
    anchorValue -
    countRepeatDaysAfter(addDays(occurrenceDate, -1), addDays(anchorDate, -1), task.repeatDays)
  );
}
