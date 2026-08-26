import { WORKERS } from '../data/workers.js';

const hasTimeRange = (task) => (
  Number.isFinite(task.startTime) && Number.isFinite(task.endTime)
);

const createOvertimeRecord = (weekKey = null, weekLabel = null, weekOrder = 0) => ({
  weekKey,
  weekLabel,
  weekOrder,
  dailyDetails: [],
  totalOvertime: 0,
  totalWorkHours: 0,
  baseWorkHours: 0,
  leaveDeductions: []
});

const applyToRecords = (records, callback) => records.forEach(callback);

// 개인별 잔업 계산. 전체 합계와 주차별 결과를 함께 제공한다.
export const calculatePersonalOvertime = (dailyData) => {
  const overtimeByPerson = {};
  const weekOrder = new Map();

  dailyData.forEach(day => {
    const key = day.weekKey || 'input-week';
    if (!weekOrder.has(key)) weekOrder.set(key, weekOrder.size);
  });

  WORKERS.forEach(worker => {
    overtimeByPerson[worker] = {
      ...createOvertimeRecord(),
      weeks: {}
    };
  });

  for (const day of dailyData) {
    const dateStr = `${day.month}월 ${day.day}일 ${day.dayOfWeek}`;
    const isWeekend = day.dayOfWeek.includes('토요일') || day.dayOfWeek.includes('일요일');
    const isHoliday = day.isHoliday || false;
    const isRestDay = isWeekend || isHoliday;
    const dailyWorkHours = {};
    const dailyTaskDetails = {};
    const weekKey = day.weekKey || 'input-week';
    const weekLabel = day.weekLabel || '입력 주간';

    for (const task of day.tasks) {
      for (const worker of task.workers) {
        if (!dailyTaskDetails[worker]) dailyTaskDetails[worker] = [];
        if (!dailyWorkHours[worker]) dailyWorkHours[worker] = 0;
        if (Number.isFinite(task.workHours)) dailyWorkHours[worker] += task.workHours;
        dailyTaskDetails[worker].push({
          taskName: task.taskName,
          hours: task.workHours,
          timeInfo: task.timeInfo,
          startTime: task.startTime,
          endTime: task.endTime
        });
      }
    }

    WORKERS.forEach(worker => {
      const aggregate = overtimeByPerson[worker];
      if (!aggregate.weeks[weekKey]) {
        aggregate.weeks[weekKey] = createOvertimeRecord(
          weekKey,
          weekLabel,
          weekOrder.get(weekKey) || 0
        );
      }
      const week = aggregate.weeks[weekKey];
      const records = [aggregate, week];
      const isFullLeave = day.yearLeave.includes(worker);
      const isHalfLeave = day.halfLeave.includes(worker);
      const isHalfHalfLeave = (day.halfHalfLeave || []).includes(worker);
      const workerTasks = dailyTaskDetails[worker] || [];
      const workedHours = dailyWorkHours[worker] || 0;

      if (!isRestDay) {
        if (isFullLeave) {
          applyToRecords(records, record => record.leaveDeductions.push({
            date: dateStr,
            type: '연차/민방위/예비군/휴가',
            hours: -8
          }));
        } else if (isHalfLeave) {
          applyToRecords(records, record => {
            record.baseWorkHours += 4;
            record.leaveDeductions.push({
              date: dateStr,
              type: '반차/오전반차/오후반차',
              hours: -4
            });
          });
        } else if (isHalfHalfLeave) {
          applyToRecords(records, record => {
            record.baseWorkHours += 6;
            record.leaveDeductions.push({
              date: dateStr,
              type: '반반차(조기퇴근)',
              hours: -2
            });
          });
        } else {
          applyToRecords(records, record => { record.baseWorkHours += 8; });
        }
      }

      if (workerTasks.length === 0) return;

      let dailyOvertime = 0;
      workerTasks.forEach(task => {
        if (isRestDay) {
          if (Number.isFinite(task.hours)) dailyOvertime += task.hours;
        } else if (hasTimeRange(task)) {
          dailyOvertime += Math.max(0, task.endTime - Math.max(task.startTime, 18));
        } else if (Number.isFinite(task.hours) && task.hours > 8) {
          dailyOvertime += task.hours - 8;
        }
      });

      const detail = {
        date: dateStr,
        workHours: workedHours,
        overtime: dailyOvertime,
        isWeekend,
        isHoliday,
        tasks: workerTasks
      };
      applyToRecords(records, record => {
        record.dailyDetails.push(detail);
        record.totalOvertime += dailyOvertime;
        record.totalWorkHours += workedHours;
      });
    });
  }

  return overtimeByPerson;
};
