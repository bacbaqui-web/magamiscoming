const WEEK_OFFSETS = [-2, -1, 0, 1, 2];
const WEEK_TRANSITION_MS = 300;
const WHEEL_DELTA_THRESHOLD = 0;
const WHEEL_GESTURE_SETTLE_MS = 120;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_START_STORAGE_KEY = 'magamiscoming-calendar-week-start';

function loadWeekStartDay() {
  try {
    const saved = Number(localStorage.getItem(WEEK_START_STORAGE_KEY));
    return Number.isInteger(saved) && saved >= 0 && saved <= 6 ? saved : 1;
  } catch {
    return 1;
  }
}

let weekStartDay = loadWeekStartDay();

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOffset = (result.getDay() - weekStartDay + 7) % 7;
  result.setDate(result.getDate() - startOffset);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

let currentWeekStart = startOfWeek(new Date());

export function initCalendar() {
  // 시간/날짜 관련 유틸리티
  const TZ = 'Asia/Seoul';
  function ymdKST(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
  function toKST(date) {
    return new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  }
  currentWeekStart = startOfWeek(toKST(new Date()));
  // 모달 관련 DOM
  const taskModal = document.getElementById('taskModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskDescriptionInput = document.getElementById('taskDescription');
  const taskDateDisplay = document.getElementById('taskDateDisplay');
  const taskMiniCalendar = document.getElementById('taskMiniCalendar');
  const taskCalendarMonth = document.getElementById('taskCalendarMonth');
  const taskCalendarWeekdays = document.getElementById('taskCalendarWeekdays');
  const taskCalendarDays = document.getElementById('taskCalendarDays');
  const taskCalendarPrevMonth = document.getElementById('taskCalendarPrevMonth');
  const taskCalendarNextMonth = document.getElementById('taskCalendarNextMonth');
  const taskDatePicker = document.querySelector('.task-date-picker');
  const taskColorInputs = [...document.querySelectorAll('input[name="taskColor"]')];
  const taskCustomColorInput = document.getElementById('taskCustomColor');
  const taskCustomColorOption = taskCustomColorInput?.closest('.task-color-option.custom');
  const taskRepeatEnabledInput = document.getElementById('taskRepeatEnabled');
  const taskRepeatPanel = document.getElementById('taskRepeatPanel');
  const taskRepeatDayInputs = [...document.querySelectorAll('input[name="taskRepeatDay"]')];
  const taskCountEnabledInput = document.getElementById('taskCountEnabled');
  const taskCountPanel = document.getElementById('taskCountPanel');
  const taskCountAnchorInput = document.getElementById('taskCountAnchor');
  const taskCountUnitInput = document.getElementById('taskCountUnit');
  const taskExcludeFromDdayInput = document.getElementById('taskExcludeFromDday');
  const taskRepeatSettings = document.querySelector('.task-repeat-settings');
  const calendarSettingsModal = document.getElementById('calendarSettingsModal');
  const calendarWeekStartSelect = document.getElementById('calendarWeekStart');
  const saveCalendarSettingsBtn = document.getElementById('saveCalendarSettingsBtn');
  const cancelCalendarSettingsBtn = document.getElementById('cancelCalendarSettingsBtn');
  const taskHoverTooltip = document.createElement('div');
  taskHoverTooltip.className = 'task-hover-tooltip';
  taskHoverTooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(taskHoverTooltip);
  const calendarGridEl = document.getElementById('calendarGrid');
  const addUndatedTaskBtn = document.getElementById('addUndatedTaskBtn');
  const undatedTaskList = document.getElementById('undatedTaskList');
  let isWheelGestureLocked = false;
  let wheelUnlockTimer = null;
  let isUndatedTaskMode = false;

  // 달력 아래 리스트
  const agendaListEl = document.getElementById('agendaList');
  let taskRangeStart = '';
  let taskRangeEnd = '';
  let isSelectingRangeEnd = false;
  let taskCalendarViewDate = toKST(new Date());

  const attachCalendarEventListeners = () => {
    cancelBtn?.addEventListener('click', closeModal);
    saveTaskBtn?.addEventListener('click', saveTask);
    deleteTaskBtn?.addEventListener('click', () => window.deleteTask && window.deleteTask());
    taskModal?.addEventListener('click', (e) => {
      if (e.target === taskModal) closeModal();
    });
    taskDateDisplay?.addEventListener('click', toggleTaskMiniCalendar);
    taskCalendarPrevMonth?.addEventListener('click', () => changeTaskCalendarMonth(-1));
    taskCalendarNextMonth?.addEventListener('click', () => changeTaskCalendarMonth(1));
    taskModal?.querySelector('.task-modal-content')?.addEventListener('click', (event) => {
      if (!taskMiniCalendar || taskMiniCalendar.classList.contains('hidden')) return;
      const clickedInsideDatePicker = event
        .composedPath()
        .some(
          (element) => element instanceof Element && element.classList.contains('task-date-picker')
        );
      if (clickedInsideDatePicker) return;
      finalizeSingleDaySelection();
    });
    taskRepeatEnabledInput?.addEventListener('change', updateTaskRepeatControls);
    taskCountEnabledInput?.addEventListener('change', updateTaskRepeatControls);
    taskCustomColorInput?.addEventListener('click', () => {
      const customRadio = taskColorInputs.find((input) => input.value === 'custom');
      if (customRadio) customRadio.checked = true;
    });
    taskCustomColorInput?.addEventListener('input', () => {
      const customRadio = taskColorInputs.find((input) => input.value === 'custom');
      if (customRadio) customRadio.checked = true;
      updateCustomColorOption(taskCustomColorInput.value, true);
    });
    saveCalendarSettingsBtn?.addEventListener('click', saveCalendarSettings);
    cancelCalendarSettingsBtn?.addEventListener('click', closeCalendarSettings);
    calendarSettingsModal?.addEventListener('click', (event) => {
      if (event.target === calendarSettingsModal) closeCalendarSettings();
    });
    addUndatedTaskBtn?.addEventListener('click', () => openModal({ todoOnly: true }));
    calendarGridEl?.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        scheduleWheelGestureUnlock();
        if (!event.deltaY || isChangingWeek || isWheelGestureLocked) return;

        if (
          event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
          Math.abs(event.deltaY) < WHEEL_DELTA_THRESHOLD
        )
          return;
        isWheelGestureLocked = true;
        changeWeek(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false }
    );
    calendarGridEl?.addEventListener('keydown', (event) => {
      if (event.repeat || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      changeWeek(event.key === 'ArrowDown' ? 1 : -1);
    });
  };

  const getRelativeWeekTitle = (weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const todayWeekStart = startOfWeek(toKST(new Date()));
    const weekDifference = Math.round((weekStart - todayWeekStart) / 604800000);
    const relativeLabels = {
      '-2': '지지난주',
      '-1': '지난주',
      0: '이번주',
      1: '다음주',
      2: '다다음주'
    };
    const context =
      relativeLabels[weekDifference] ||
      `${Math.abs(weekDifference)}주 ${weekDifference < 0 ? '전' : '후'}`;
    const endYear =
      weekStart.getFullYear() === weekEnd.getFullYear() ? '' : `${weekEnd.getFullYear()}년 `;
    return `${context} ${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${endYear}${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;
  };

  let isChangingWeek = false;
  const getWeekScale = (offset) => {
    const distance = Math.abs(offset);
    if (distance === 0) return 1;
    if (distance === 1) return 0.94;
    return 0.88;
  };

  const scheduleWheelGestureUnlock = () => {
    window.clearTimeout(wheelUnlockTimer);
    wheelUnlockTimer = window.setTimeout(() => {
      if (isChangingWeek) {
        scheduleWheelGestureUnlock();
        return;
      }
      isWheelGestureLocked = false;
    }, WHEEL_GESTURE_SETTLE_MS);
  };

  const changeWeek = async (offset) => {
    if (!offset || isChangingWeek) return;
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    isChangingWeek = true;
    const previousRows = new Map(
      [...calendarGrid.querySelectorAll('.week-row')].map((row) => [
        row.dataset.weekStart,
        {
          rect: row.getBoundingClientRect(),
          offset: Number(row.dataset.weekOffset),
          opacity: Number.parseFloat(getComputedStyle(row).opacity)
        }
      ])
    );

    currentWeekStart = addDays(currentWeekStart, offset * 7);
    renderCalendar();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isChangingWeek = false;
      return;
    }

    const animations = [];
    calendarGrid.querySelectorAll('.week-row').forEach((row) => {
      const previous = previousRows.get(row.dataset.weekStart);
      const currentOffset = Number(row.dataset.weekOffset);
      const currentScale = getWeekScale(currentOffset);
      const currentOpacity = Number.parseFloat(getComputedStyle(row).opacity);
      let animation;

      if (previous) {
        const currentRect = row.getBoundingClientRect();
        const currentUnscaledWidth = currentRect.width / currentScale;
        const currentUnscaledHeight = currentRect.height / currentScale;
        const initialScaleX = previous.rect.width / currentUnscaledWidth;
        const initialScaleY = previous.rect.height / currentUnscaledHeight;
        const translateX =
          previous.rect.left + previous.rect.width / 2 - (currentRect.left + currentRect.width / 2);
        const translateY =
          previous.rect.top + previous.rect.height / 2 - (currentRect.top + currentRect.height / 2);
        animation = row.animate(
          [
            {
              transform: `translate(${translateX}px, ${translateY}px) scale(${initialScaleX}, ${initialScaleY})`,
              opacity: previous.opacity
            },
            { transform: `translateY(0) scale(${currentScale})`, opacity: currentOpacity }
          ],
          {
            duration: WEEK_TRANSITION_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }
        );
      } else {
        animation = row.animate(
          [
            {
              transform: `translateY(${offset > 0 ? 72 : -72}px) scale(${currentScale})`,
              opacity: 0
            },
            { transform: `translateY(0) scale(${currentScale})`, opacity: currentOpacity }
          ],
          {
            duration: WEEK_TRANSITION_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }
        );
      }
      animations.push(animation.finished.catch(() => undefined));
    });

    calendarGrid
      .querySelectorAll(
        '.week-row[aria-current="true"] .week-row-title, .week-row[aria-current="true"] .task-item'
      )
      .forEach((element) => {
        const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          delay: 120,
          easing: 'ease-out',
          fill: 'backwards'
        });
        animations.push(animation.finished.catch(() => undefined));
      });

    await Promise.all(animations);
    isChangingWeek = false;
  };

  const isRecurringTask = (task) =>
    !!task.repeatEnabled && Array.isArray(task.repeatDays) && task.repeatDays.length > 0;

  const getContrastTextColor = (hexColor) => {
    const hex = String(hexColor || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return '#fff';
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? '#222' : '#fff';
  };

  const updateCustomColorOption = (color = '#8b5cf6', hasSelectedColor = false) => {
    if (!taskCustomColorOption) return;
    taskCustomColorOption.style.setProperty('--task-custom-color', color);
    taskCustomColorOption.classList.toggle('has-selected-color', hasSelectedColor);
  };

  const taskOccursOnDate = (task, date, fullDate) => {
    if (isRecurringTask(task)) return task.repeatDays.includes(date.getDay());
    if (!task.date) return false;
    const taskEndDate = task.endDate || task.date;
    return task.date <= fullDate && fullDate <= taskEndDate;
  };

  const countRepeatDaysAfter = (startDate, endDate, repeatDays) => {
    const dayCount = Math.max(0, Math.round((endDate - startDate) / 86400000));
    const fullWeeks = Math.floor(dayCount / 7);
    let count = fullWeeks * repeatDays.length;
    for (let offset = fullWeeks * 7 + 1; offset <= dayCount; offset += 1) {
      if (repeatDays.includes(addDays(startDate, offset).getDay())) count += 1;
    }
    return count;
  };

  const getTaskOccurrenceCount = (task, occurrenceDate) => {
    const anchorValue = Number.isFinite(Number(task.countAnchor)) ? Number(task.countAnchor) : 1;
    const anchorDate = parseTaskDate(task.repeatStartDate || task.date);
    if (occurrenceDate >= anchorDate) {
      return anchorValue + countRepeatDaysAfter(anchorDate, occurrenceDate, task.repeatDays);
    }
    return (
      anchorValue -
      countRepeatDaysAfter(addDays(occurrenceDate, -1), addDays(anchorDate, -1), task.repeatDays)
    );
  };

  const createDayCell = (date, weekOffset, weekTasks) => {
    const day = document.createElement('div');
    day.className = 'calendar-day relative';
    if (date.getDay() === 6) day.classList.add('weekend-saturday');
    if (date.getDay() === 0) day.classList.add('weekend-sunday');
    const fullDate = ymdKST(date);
    if (fullDate === ymdKST(new Date())) day.classList.add('today');

    const dayTop = document.createElement('div');
    dayTop.className = 'day-top';
    const weekday = document.createElement('span');
    weekday.className = 'day-weekday';
    weekday.textContent = WEEKDAY_LABELS[date.getDay()];
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayTop.appendChild(weekday);
    dayTop.appendChild(dayNumber);
    day.appendChild(dayTop);

    const divider = document.createElement('div');
    divider.className = 'day-divider';
    day.appendChild(divider);

    weekTasks.forEach((task) => {
      const taskEndDate = task.endDate || task.date;
      if (!taskOccursOnDate(task, date, fullDate)) {
        const placeholder = document.createElement('div');
        placeholder.className = 'task-lane-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        day.appendChild(placeholder);
        return;
      }

      const taskElement = document.createElement('div');
      taskElement.className = 'task-item custom-task';
      if (task.category) taskElement.classList.add(`custom-${task.category}`);
      if (task.category === 'custom' && task.customColor) {
        taskElement.style.background = task.customColor;
        taskElement.style.color = getContrastTextColor(task.customColor);
      }
      if (isRecurringTask(task) || task.date === taskEndDate)
        taskElement.classList.add('range-single');
      else if (fullDate === task.date) taskElement.classList.add('range-start');
      else if (fullDate === taskEndDate) taskElement.classList.add('range-end');
      else taskElement.classList.add('range-middle');
      const occurrenceCount = task.countEnabled ? getTaskOccurrenceCount(task, date) : null;
      const countText =
        occurrenceCount === null ? '' : ` ${occurrenceCount}${task.countUnit || ''}`;
      taskElement.textContent = `${task.title}${countText}`;
      taskElement.setAttribute('aria-label', task.title);
      taskElement.addEventListener('mouseenter', () => showTaskTooltip(taskElement, task));
      taskElement.addEventListener('mouseleave', hideTaskTooltip);
      const occurrenceComplete = isRecurringTask(task)
        ? !!task.occurrenceStatus?.[fullDate]
        : !!task.complete;
      if (occurrenceComplete) taskElement.classList.add('complete');
      if (weekOffset === 0) {
        taskElement.addEventListener('click', async (event) => {
          event.stopPropagation();
          if (event.detail === 1) {
            if (!window.ensureLogin || !window.ensureLogin()) return;
            if (isRecurringTask(task)) {
              task.occurrenceStatus = task.occurrenceStatus || {};
              task.occurrenceStatus[fullDate] = !task.occurrenceStatus[fullDate];
            } else {
              task.complete = !task.complete;
            }
            await window.cloudSaveAll();
            renderCalendar();
          } else if (event.detail === 2) {
            openModal(task);
          }
        });
      }
      day.appendChild(taskElement);
    });

    if (weekOffset === 0) {
      day.addEventListener('click', (event) => {
        event.stopPropagation();
        openModal({ date: fullDate, endDate: fullDate });
      });
    }
    return day;
  };

  const showTaskTooltip = (taskElement, task) => {
    const title = document.createElement('div');
    title.className = 'task-hover-tooltip-title';
    title.textContent = task.title;
    taskHoverTooltip.replaceChildren(title);

    if (task.description) {
      const description = document.createElement('div');
      description.className = 'task-hover-tooltip-description';
      description.textContent = task.description;
      taskHoverTooltip.appendChild(description);
    }

    taskHoverTooltip.classList.add('visible');
    const targetRect = taskElement.getBoundingClientRect();
    const tooltipRect = taskHoverTooltip.getBoundingClientRect();
    const left = Math.min(
      window.innerWidth - tooltipRect.width - 8,
      Math.max(8, targetRect.left + targetRect.width / 2 - tooltipRect.width / 2)
    );
    const topAbove = targetRect.top - tooltipRect.height - 8;
    const top = topAbove >= 8 ? topAbove : targetRect.bottom + 8;
    taskHoverTooltip.style.left = `${left}px`;
    taskHoverTooltip.style.top = `${top}px`;
  };

  const hideTaskTooltip = () => {
    taskHoverTooltip.classList.remove('visible');
  };

  const createWeekNavigationZone = (direction) => {
    const offset = direction === 'up' ? -1 : 1;
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = `week-navigation-zone ${direction}`;
    zone.setAttribute('aria-label', direction === 'up' ? '이전 주로 이동' : '다음 주로 이동');
    zone.innerHTML = `
      <span class="timeline-direction-cue" aria-hidden="true">
        <svg viewBox="0 0 220 72" focusable="false">
          <path d="M10 60 L110 10 L210 60" />
        </svg>
      </span>`;
    zone.addEventListener('click', (event) => {
      event.stopPropagation();
      changeWeek(offset);
    });
    return zone;
  };

  const setWeekTitleContent = (title, text) => {
    const parts = text.split(/(\d+)/);
    title.replaceChildren(
      ...parts.filter(Boolean).map((part) => {
        if (!/^\d+$/.test(part)) return document.createTextNode(part);
        const number = document.createElement('span');
        number.className = 'week-title-number';
        number.textContent = part;
        return number;
      })
    );
  };

  const createCalendarSettingsButton = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-settings-button';
    button.title = '주간 달력 설정';
    button.setAttribute('aria-label', '주간 달력 설정 열기');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>`;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openCalendarSettings();
    });
    return button;
  };

  const createWeekRow = (weekOffset) => {
    const weekStart = addDays(currentWeekStart, weekOffset * 7);
    const weekStartYmd = ymdKST(weekStart);
    const weekEndYmd = ymdKST(addDays(weekStart, 6));
    const weekTasks = (window.customTasks || [])
      .filter((task) => {
        if (isRecurringTask(task)) return true;
        if (!task.date) return false;
        const taskEndDate = task.endDate || task.date;
        return task.date <= weekEndYmd && taskEndDate >= weekStartYmd;
      })
      .sort((a, b) => {
        const startComparison = a.date.localeCompare(b.date);
        if (startComparison !== 0) return startComparison;
        const endComparison = (b.endDate || b.date).localeCompare(a.endDate || a.date);
        if (endComparison !== 0) return endComparison;
        return Number(a.id || 0) - Number(b.id || 0);
      });
    const row = document.createElement('div');
    const distance = Math.abs(weekOffset);
    row.className = `week-row week-distance-${distance}`;
    if (ymdKST(weekStart) === ymdKST(startOfWeek(toKST(new Date())))) {
      row.classList.add('actual-current-week');
      if (weekOffset < 0) row.classList.add('actual-week-before');
      if (weekOffset > 0) row.classList.add('actual-week-after');
      const currentWeekFrame = document.createElement('span');
      currentWeekFrame.className = 'actual-current-week-frame';
      currentWeekFrame.setAttribute('aria-hidden', 'true');
      row.appendChild(currentWeekFrame);
    }
    row.dataset.weekOffset = weekOffset;
    row.dataset.weekStart = ymdKST(weekStart);
    row.setAttribute(
      'aria-label',
      `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 시작 주`
    );
    if (weekOffset === 0) {
      row.setAttribute('aria-current', 'true');
      const header = document.createElement('div');
      header.className = 'week-row-header';
      const title = document.createElement('h2');
      title.className = 'week-row-title';
      title.setAttribute('aria-live', 'polite');
      setWeekTitleContent(title, getRelativeWeekTitle(weekStart));
      header.appendChild(title);
      header.appendChild(createCalendarSettingsButton());
      row.appendChild(header);
      row.appendChild(createWeekNavigationZone('up'));
      row.appendChild(createWeekNavigationZone('down'));
    }
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const dayCell = createDayCell(addDays(weekStart, dayOffset), weekOffset, weekTasks);
      if (dayOffset === 0) dayCell.classList.add('week-edge-start');
      if (dayOffset === 6) dayCell.classList.add('week-edge-end');
      row.appendChild(dayCell);
    }
    return row;
  };

  // 선택된 주를 중심으로 앞뒤 2주씩 작업보드 타임라인으로 렌더링
  const renderCalendar = () => {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    hideTaskTooltip();
    calendarGrid.replaceChildren(...WEEK_OFFSETS.map(createWeekRow));

    renderUndatedTasks();
    renderAgendaList();
  };

  const renderUndatedTasks = () => {
    if (!undatedTaskList) return;
    const tasks = (window.customTasks || [])
      .filter((task) => !task.date)
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    undatedTaskList.replaceChildren(
      ...tasks.map((task) => {
        const tag = document.createElement('div');
        tag.className = 'undated-task-tag';
        if (task.category) tag.classList.add(`color-${task.category}`);
        if (task.category === 'custom' && task.customColor) {
          tag.style.background = task.customColor;
          tag.style.color = getContrastTextColor(task.customColor);
        }
        if (task.complete) tag.classList.add('complete');

        const completeButton = document.createElement('button');
        completeButton.type = 'button';
        completeButton.className = 'undated-task-complete';
        completeButton.textContent = task.complete ? '✓' : '';
        completeButton.setAttribute(
          'aria-label',
          task.complete ? '할 일 미완료로 변경' : '할 일 완료'
        );
        completeButton.addEventListener('click', async () => {
          if (!window.ensureLogin || !window.ensureLogin()) return;
          task.complete = !task.complete;
          await window.cloudSaveAll();
          renderCalendar();
        });

        const titleButton = document.createElement('button');
        titleButton.type = 'button';
        titleButton.className = 'undated-task-title';
        titleButton.textContent = task.title;
        titleButton.addEventListener('click', () => openModal(task));

        tag.appendChild(completeButton);
        tag.appendChild(titleButton);
        return tag;
      })
    );
  };

  // 달력 아래 리스트 (문구/추가버튼/체크박스 제거)
  const renderAgendaList = () => {
    if (!agendaListEl) return;
    const tasks = (window.customTasks || []).slice();
    const order = { '': 1, important: 2, family: 3, special: 4, yellow: 5 };
    const dotColor = (cat, customColor) => {
      if (cat === 'important') return '#dc2626';
      if (cat === 'family') return '#2563eb';
      if (cat === 'special') return '#16a34a';
      if (cat === 'yellow') return '#eab308';
      if (cat === 'transparent') {
        return 'conic-gradient(#eee 25%, #777 0 50%, #eee 0 75%, #777 0) 0 0 / 6px 6px';
      }
      if (cat === 'custom') return customColor || '#8b5cf6';
      return '#f5f5f5';
    };

    // D-day 계산 (KST 자정 기준)
    const toKSTMidnight = (d) => {
      const k = toKST(d);
      return new Date(k.getFullYear(), k.getMonth(), k.getDate());
    };
    const parseYMD = (s) => {
      const [y, m, dd] = String(s).split('-').map(Number);
      return new Date(y, (m || 1) - 1, dd || 1);
    };
    const diffDaysFromToday = (ymd) => {
      const today = toKSTMidnight(new Date());
      const target = toKSTMidnight(parseYMD(ymd));
      return Math.round((target - today) / (1000 * 60 * 60 * 24));
    };
    const formatDday = (ymd) => {
      const diff = diffDaysFromToday(ymd);
      if (diff === 0) return 'D-day';
      if (diff > 0) return `D-${diff}`;
      return null; // 지난 일정은 표시하지 않음
    };

    const dated = tasks
      .filter((t) => !!t.date && !t.excludeFromDday && formatDday(t.date))
      .sort((a, b) => {
        const ca = !!a.complete,
          cb = !!b.complete;
        if (ca !== cb) return ca ? 1 : -1; // 완료는 아래로
        const da = String(a.date);
        const db = String(b.date);
        if (da !== db) return da.localeCompare(db);
        return (order[a.category] || 99) - (order[b.category] || 99);
      });

    const makeRow = (t, { showDate }) => {
      const row = document.createElement('div');
      row.className = 'agenda-item';

      const dot = document.createElement('div');
      dot.className = 'agenda-dot';
      dot.style.background = dotColor(t.category, t.customColor);
      if (t.category === 'transparent') dot.style.boxShadow = 'inset 0 0 0 1px #777';

      const date = document.createElement('div');
      date.className = 'agenda-date';
      date.textContent = showDate ? formatDday(t.date) || '' : '';

      const text = document.createElement('div');
      text.className = 'agenda-text';
      text.textContent = t.title;
      if (t.complete) {
        row.classList.add('complete');
        // 완료 표시(원래처럼): 회색 + 취소선
        text.style.textDecoration = 'line-through';
        text.style.opacity = '.9';
        text.style.color = '#7a7a7a';
      }

      const actions = document.createElement('div');
      actions.className = 'agenda-actions';

      // 설정(편집) 버튼만 유지
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'agenda-settings-btn';
      settingsBtn.type = 'button';
      settingsBtn.setAttribute('title', '설정');
      settingsBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:18px;height:18px;opacity:.9">
            <path d="M12 20a1 1 0 0 1-1-1v-1.1a7.8 7.8 0 0 1-1.9-.8l-.8.8a1 1 0 0 1-1.4 0l-1.4-1.4a1 1 0 0 1 0-1.4l.8-.8a7.8 7.8 0 0 1-.8-1.9H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1.1a7.8 7.8 0 0 1 .8-1.9l-.8-.8a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0l.8.8a7.8 7.8 0 0 1 1.9-.8V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.1a7.8 7.8 0 0 1 1.9.8l.8-.8a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4l-.8.8a7.8 7.8 0 0 1 .8 1.9H20a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.1a7.8 7.8 0 0 1-.8 1.9l.8.8a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4 0l-.8-.8a7.8 7.8 0 0 1-1.9.8V19a1 1 0 0 1-1 1z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`;
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(t);
      });
      actions.appendChild(settingsBtn);

      row.appendChild(dot);
      row.appendChild(date);
      row.appendChild(text);
      row.appendChild(actions);

      // 항목 클릭: 완료 토글(체크박스 대신)
      row.addEventListener('click', async () => {
        if (!window.ensureLogin || !window.ensureLogin()) return;
        t.complete = !t.complete;

        // 즉시 UI 반영: 회색 + 취소선 (원래처럼)
        row.classList.toggle('complete', !!t.complete);
        if (t.complete) {
          text.style.textDecoration = 'line-through';
          text.style.opacity = '.9';
          text.style.color = '#7a7a7a';
        } else {
          text.style.textDecoration = '';
          text.style.opacity = '';
          text.style.color = '';
        }

        // 완료 항목은 아래로 이동
        if (row.parentElement) {
          const parent = row.parentElement;
          if (t.complete) parent.appendChild(row);
          else parent.prepend(row);
        }

        await window.cloudSaveAll();
        renderCalendar();
      });
      return row;
    };

    agendaListEl.innerHTML = '';

    // 날짜 있는 일정만 표시한다. 날짜 없는 할 일은 달력 위 전용 영역에서 관리한다.
    dated.forEach((t) => agendaListEl.appendChild(makeRow(t, { showDate: true })));
  };

  // 작업 모달
  const setSelectedTaskColor = (category = '') => {
    const supportedCategory = [
      '',
      'important',
      'family',
      'special',
      'yellow',
      'transparent',
      'custom'
    ].includes(category)
      ? category
      : '';
    taskColorInputs.forEach((input) => {
      input.checked = input.value === supportedCategory;
    });
  };

  const updateTaskRepeatControls = () => {
    const repeatEnabled = !!taskRepeatEnabledInput?.checked;
    taskRepeatPanel?.classList.toggle('hidden', !repeatEnabled);
    if (repeatEnabled && !taskRepeatDayInputs.some((input) => input.checked) && taskRangeStart) {
      const anchorDay = parseTaskDate(taskRangeStart).getDay();
      taskRepeatDayInputs.forEach((input) => {
        input.checked = Number(input.value) === anchorDay;
      });
    }
    const countEnabled = repeatEnabled && !!taskCountEnabledInput?.checked;
    taskCountPanel?.classList.toggle('count-disabled', !countEnabled);
    if (taskCountAnchorInput) taskCountAnchorInput.disabled = !countEnabled;
    if (taskCountUnitInput) taskCountUnitInput.disabled = !countEnabled;
  };

  const setTaskRepeatValues = (task = {}) => {
    const repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays : [];
    if (taskRepeatEnabledInput) taskRepeatEnabledInput.checked = !!task.repeatEnabled;
    taskRepeatDayInputs.forEach((input) => {
      input.checked = repeatDays.includes(Number(input.value));
    });
    if (taskCountEnabledInput) taskCountEnabledInput.checked = !!task.countEnabled;
    if (taskCountAnchorInput) {
      taskCountAnchorInput.value = task.countAnchor === undefined ? '' : String(task.countAnchor);
    }
    if (taskCountUnitInput) taskCountUnitInput.value = task.countUnit || '';
    updateTaskRepeatControls();
  };

  const parseTaskDate = (ymd) => {
    const [year, month, day] = String(ymd).split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatTaskDate = (ymd) => {
    if (!ymd) return '날짜 선택';
    const [year, month, day] = ymd.split('-');
    return `${year}. ${month}. ${day}.`;
  };

  const updateTaskDateDisplay = () => {
    if (!taskDateDisplay) return;
    taskDateDisplay.textContent =
      taskRangeStart && taskRangeEnd && taskRangeStart !== taskRangeEnd
        ? `${formatTaskDate(taskRangeStart)} ~ ${formatTaskDate(taskRangeEnd)}`
        : formatTaskDate(taskRangeStart);
  };

  const closeTaskMiniCalendar = () => {
    taskMiniCalendar?.classList.add('hidden');
  };

  const finalizeSingleDaySelection = () => {
    if (isSelectingRangeEnd && taskRangeStart && !taskRangeEnd) taskRangeEnd = taskRangeStart;
    isSelectingRangeEnd = false;
    updateTaskDateDisplay();
    closeTaskMiniCalendar();
  };

  const selectTaskCalendarDate = (date) => {
    const selectedDate = ymdKST(date);
    if (!isSelectingRangeEnd) {
      taskRangeStart = selectedDate;
      taskRangeEnd = '';
      isSelectingRangeEnd = true;
      updateTaskDateDisplay();
      renderTaskMiniCalendar();
      return;
    }

    [taskRangeStart, taskRangeEnd] = [taskRangeStart, selectedDate].sort();
    isSelectingRangeEnd = false;
    updateTaskDateDisplay();
    closeTaskMiniCalendar();
  };

  const renderTaskMiniCalendar = () => {
    if (!taskCalendarMonth || !taskCalendarWeekdays || !taskCalendarDays) return;
    const year = taskCalendarViewDate.getFullYear();
    const month = taskCalendarViewDate.getMonth();
    const firstDate = new Date(year, month, 1);
    const leadingDays = (firstDate.getDay() - weekStartDay + 7) % 7;
    const gridStart = addDays(firstDate, -leadingDays);

    taskCalendarMonth.textContent = `${year}년 ${month + 1}월`;
    taskCalendarWeekdays.replaceChildren(
      ...Array.from({ length: 7 }, (_, index) => {
        const label = document.createElement('span');
        label.textContent = WEEKDAY_LABELS[(weekStartDay + index) % 7];
        return label;
      })
    );
    taskCalendarDays.replaceChildren(
      ...Array.from({ length: 42 }, (_, index) => {
        const date = addDays(gridStart, index);
        const ymd = ymdKST(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = date.getDate();
        if (date.getMonth() !== month) button.classList.add('outside-month');
        if (ymd === ymdKST(toKST(new Date()))) button.classList.add('today');
        if (ymd === taskRangeStart) button.classList.add('range-start');
        if (ymd === taskRangeEnd) button.classList.add('range-end');
        if (taskRangeStart && taskRangeEnd && taskRangeStart < ymd && ymd < taskRangeEnd) {
          button.classList.add('in-range');
        }
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          selectTaskCalendarDate(date);
        });
        return button;
      })
    );
  };

  const toggleTaskMiniCalendar = () => {
    if (!taskMiniCalendar) return;
    if (!taskMiniCalendar.classList.contains('hidden')) {
      finalizeSingleDaySelection();
      return;
    }
    taskCalendarViewDate = taskRangeStart ? parseTaskDate(taskRangeStart) : toKST(new Date());
    isSelectingRangeEnd = false;
    renderTaskMiniCalendar();
    taskMiniCalendar.classList.remove('hidden');
  };

  const changeTaskCalendarMonth = (amount) => {
    taskCalendarViewDate = new Date(
      taskCalendarViewDate.getFullYear(),
      taskCalendarViewDate.getMonth() + amount,
      1
    );
    renderTaskMiniCalendar();
  };

  const openModal = (task = null) => {
    window.currentTask = task;
    isUndatedTaskMode = !!(task && (task.todoOnly || (task.id && !task.date)));
    if (task && task.id) {
      taskTitleInput.value = task.title;
      taskDescriptionInput.value = task.description || '';
      taskRangeStart = task.date || '';
      taskRangeEnd = task.endDate || task.date || '';
      setSelectedTaskColor(task.category || '');
      if (taskCustomColorInput) taskCustomColorInput.value = task.customColor || '#8b5cf6';
      updateCustomColorOption(task.customColor || '#8b5cf6', task.category === 'custom');
      setTaskRepeatValues(task);
      if (taskExcludeFromDdayInput) {
        taskExcludeFromDdayInput.checked = !!task.excludeFromDday;
      }
      deleteTaskBtn.classList.remove('hidden');
    } else if (task && 'date' in task) {
      taskTitleInput.value = '';
      taskDescriptionInput.value = '';
      taskRangeStart = task.date || '';
      taskRangeEnd = task.endDate || task.date || '';
      setSelectedTaskColor(task.category || '');
      if (taskCustomColorInput) taskCustomColorInput.value = task.customColor || '#8b5cf6';
      updateCustomColorOption(task.customColor || '#8b5cf6', task.category === 'custom');
      setTaskRepeatValues(task);
      if (taskExcludeFromDdayInput) {
        taskExcludeFromDdayInput.checked = !!task.excludeFromDday;
      }
      deleteTaskBtn.classList.add('hidden');
    } else {
      taskTitleInput.value = '';
      taskDescriptionInput.value = '';
      taskRangeStart = '';
      taskRangeEnd = '';
      setSelectedTaskColor();
      if (taskCustomColorInput) taskCustomColorInput.value = '#8b5cf6';
      updateCustomColorOption('#8b5cf6', false);
      setTaskRepeatValues();
      if (taskExcludeFromDdayInput) taskExcludeFromDdayInput.checked = false;
      deleteTaskBtn.classList.add('hidden');
    }
    isSelectingRangeEnd = false;
    taskDatePicker?.classList.toggle('hidden', isUndatedTaskMode);
    taskRepeatSettings?.classList.toggle('hidden', isUndatedTaskMode);
    updateTaskDateDisplay();
    closeTaskMiniCalendar();
    taskModal.style.display = 'flex';
  };
  const closeModal = () => {
    finalizeSingleDaySelection();
    taskModal.style.display = 'none';
  };

  const openCalendarSettings = () => {
    if (!calendarSettingsModal || !calendarWeekStartSelect) return;
    calendarWeekStartSelect.value = String(weekStartDay);
    calendarSettingsModal.style.display = 'flex';
    calendarWeekStartSelect.focus();
  };

  const closeCalendarSettings = () => {
    if (calendarSettingsModal) calendarSettingsModal.style.display = 'none';
  };

  const saveCalendarSettings = () => {
    if (!calendarWeekStartSelect) return;
    const nextWeekStartDay = Number(calendarWeekStartSelect.value);
    if (!Number.isInteger(nextWeekStartDay) || nextWeekStartDay < 0 || nextWeekStartDay > 6) return;

    const selectedWeekAnchor = addDays(currentWeekStart, 3);
    weekStartDay = nextWeekStartDay;
    try {
      localStorage.setItem(WEEK_START_STORAGE_KEY, String(weekStartDay));
    } catch {
      // 저장이 제한된 환경에서도 현재 세션에는 설정을 적용한다.
    }
    currentWeekStart = startOfWeek(selectedWeekAnchor);
    closeCalendarSettings();
    renderCalendar();
  };

  const saveTask = async () => {
    if (!window.ensureLogin || !window.ensureLogin()) return;
    window.customTasks = window.customTasks || [];
    window.taskStatus = window.taskStatus || {};
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const selectedStartDate = isUndatedTaskMode ? '' : taskRangeStart;
    const selectedEndDate = taskRangeEnd || selectedStartDate;
    const [date, endDate] = selectedStartDate
      ? [selectedStartDate, selectedEndDate].sort()
      : ['', ''];
    const category = taskColorInputs.find((input) => input.checked)?.value || '';
    const customColor = category === 'custom' ? taskCustomColorInput?.value || '#8b5cf6' : '';
    const repeatEnabled = !isUndatedTaskMode && !!taskRepeatEnabledInput?.checked;
    const repeatDays = repeatEnabled
      ? taskRepeatDayInputs.filter((input) => input.checked).map((input) => Number(input.value))
      : [];
    if (repeatEnabled && repeatDays.length === 0) {
      window.showFeedbackMessage?.('반복할 요일을 선택해주세요.');
      return;
    }
    const countEnabled = repeatEnabled && !!taskCountEnabledInput?.checked;
    const countAnchor =
      taskCountAnchorInput?.value !== '' && Number.isFinite(Number(taskCountAnchorInput?.value))
        ? Number(taskCountAnchorInput.value)
        : 1;
    const countUnit = countEnabled ? taskCountUnitInput?.value.trim() || '' : '';
    if (!title && !repeatEnabled) {
      window.showFeedbackMessage?.('제목을 입력해주세요.');
      return;
    }
    const data = {
      id: window.currentTask && window.currentTask.id ? window.currentTask.id : Date.now(),
      title,
      description,
      date,
      endDate,
      category,
      customColor,
      repeatEnabled,
      repeatDays,
      repeatStartDate: repeatEnabled ? date : '',
      countEnabled,
      countAnchor,
      countUnit,
      excludeFromDday: !!taskExcludeFromDdayInput?.checked,
      occurrenceStatus: window.currentTask?.occurrenceStatus || {},
      todoOnly: !date,
      complete: window.currentTask?.complete ?? false
    };
    const idx = window.customTasks.findIndex((t) => t.id === data.id);
    if (idx > -1) window.customTasks[idx] = data;
    else window.customTasks.push(data);
    await window.cloudSaveAll();
    closeModal();
    renderCalendar();
  };

  attachCalendarEventListeners();
  window.renderCalendar = renderCalendar;
  window.openTaskModal = openModal;
  window.closeTaskModal = closeModal;
  renderCalendar();
}
