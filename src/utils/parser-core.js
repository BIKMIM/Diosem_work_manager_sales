import {
  getExpectedDayOfWeek,
  hasWorkerDelimiter,
  parseDate,
  parseLeave,
  parseScheduleHeader,
  parseWorkLine
} from './parser-helpers.js';
import { getHolidayName } from './holidays.js';

const WORK_LINE_PATTERN = /^[■□▪▫●○◆★☆]/;
const DATE_LINE_PATTERN = /^<\d{1,2}월\s*\d{1,2}일/;

const formatDate = (day) => `${day.month}월 ${day.day}일 ${day.dayOfWeek}`;

const mergeUnique = (target, additions) => {
  additions.forEach(item => {
    if (!target.includes(item)) target.push(item);
  });
};

const addLeaveInfo = (day, line) => {
  const leave = parseLeave(line);
  mergeUnique(day.yearLeave, leave.yearLeave);
  mergeUnique(day.halfLeave, leave.halfLeave);
  mergeUnique(day.halfHalfLeave, leave.halfHalfLeave);
  mergeUnique(day.education, leave.education);
};

const addTaskWarnings = (day, task) => {
  const date = formatDate(day);

  if (task.canceled) {
    day.warnings.push({
      type: 'canceled-task',
      date,
      message: `취소 표시가 있는 작업을 배정 및 잔업 계산에서 제외했습니다: ${task.taskName}`
    });
    return false;
  }

  if (task.unknownWorkers.length > 0) {
    day.warnings.push({
      type: 'unknown-worker',
      date,
      message: `명단에 없는 이름을 확인해주세요: ${task.unknownWorkers.join(', ')}`
    });
  }

  if (!task.hasKnownDuration && task.workers.length > 0) {
    day.warnings.push({
      type: 'unknown-duration',
      date,
      message: `배정은 반영했지만 잔업 시간은 계산하지 않았습니다: ${task.taskName}`
    });
  }

  return true;
};

// 전체 텍스트 파싱
export const parseWorkData = (text) => {
  const lines = text.split(/\r?\n/);
  const dailyData = [];
  let currentDay = null;
  let scheduleContext = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const parsedSchedule = parseScheduleHeader(trimmed);
    if (parsedSchedule) {
      scheduleContext = parsedSchedule;
      continue;
    }

    const dateInfo = parseDate(trimmed);
    if (dateInfo) {
      const holidayName = getHolidayName(
        dateInfo.month,
        dateInfo.day,
        dateInfo.dayOfWeek,
        scheduleContext?.year
      );

      currentDay = {
        ...dateInfo,
        year: scheduleContext?.year || null,
        weekKey: scheduleContext?.key || 'input-week',
        weekLabel: scheduleContext?.label || '입력 주간',
        isHoliday: holidayName !== null,
        holidayName: holidayName || null,
        yearLeave: [],
        halfLeave: [],
        halfHalfLeave: [],
        education: [],
        tasks: [],
        warnings: []
      };
      dailyData.push(currentDay);

      if (scheduleContext?.year) {
        const expectedDayOfWeek = getExpectedDayOfWeek(
          scheduleContext.year,
          dateInfo.month,
          dateInfo.day
        );
        if (expectedDayOfWeek && expectedDayOfWeek !== dateInfo.dayOfWeek) {
          currentDay.warnings.push({
            type: 'date-mismatch',
            date: formatDate(currentDay),
            message: `${scheduleContext.year}년 ${dateInfo.month}월 ${dateInfo.day}일은 ${expectedDayOfWeek}입니다. 입력된 요일을 확인해주세요.`
          });
        }
      }

      addLeaveInfo(currentDay, trimmed);
      continue;
    }

    if (!currentDay) continue;

    if (WORK_LINE_PATTERN.test(trimmed)) {
      let fullWorkContent = trimmed;
      let consumedUntil = i;

      if (!hasWorkerDelimiter(fullWorkContent)) {
        for (let nextIndex = i + 1; nextIndex < lines.length; nextIndex++) {
          const nextLine = lines[nextIndex].trim();
          if (WORK_LINE_PATTERN.test(nextLine) || DATE_LINE_PATTERN.test(nextLine)) break;

          consumedUntil = nextIndex;
          if (nextLine) fullWorkContent += ` ${nextLine}`;
          if (hasWorkerDelimiter(fullWorkContent)) break;
          if (nextIndex - i >= 8) break;
        }
      }

      const task = parseWorkLine(fullWorkContent);
      if (!task) {
        currentDay.warnings.push({
          type: 'unparsed-task',
          date: formatDate(currentDay),
          message: `작업자 구분('/' 또는 '작업인원:')을 찾지 못했습니다: ${trimmed.slice(0, 80)}`
        });
      } else if (addTaskWarnings(currentDay, task) && task.workers.length > 0) {
        currentDay.tasks.push(task);
      }

      i = consumedUntil;
      continue;
    }

    if (hasWorkerDelimiter(trimmed)) {
      const task = parseWorkLine(`■ ${trimmed}`);
      if (task && addTaskWarnings(currentDay, task) && task.workers.length > 0) {
        currentDay.tasks.push(task);
      }
      continue;
    }

    if (trimmed.includes(':')) {
      addLeaveInfo(currentDay, trimmed);
    }
  }

  return dailyData;
};
