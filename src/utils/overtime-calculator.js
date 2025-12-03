import { WORKERS } from '../data/workers';

// 개인별 잔업 계산
export const calculatePersonalOvertime = (dailyData) => {
  const overtimeByPerson = {};

  // 초기화
  WORKERS.forEach(worker => {
    overtimeByPerson[worker] = {
      dailyDetails: [],
      totalOvertime: 0,
      totalWorkHours: 0,
      baseWorkHours: 0, // 기본 근무시간 (연차/반차 반영)
      leaveDeductions: [] // 연차/반차 차감 내역
    };
  });

  for (const day of dailyData) {
    const dateStr = `${day.month}월 ${day.day}일 ${day.dayOfWeek}`;
    const isWeekend = day.dayOfWeek.includes('토요일') || day.dayOfWeek.includes('일요일');

    // 각 직원의 일일 총 근무시간 계산 및 작업 내역 수집
    const dailyWorkHours = {};
    const dailyTaskDetails = {}; // 각 직원의 작업 상세 내역

    for (const task of day.tasks) {
      for (const worker of task.workers) {
        if (!dailyWorkHours[worker]) {
          dailyWorkHours[worker] = 0;
          dailyTaskDetails[worker] = [];
        }
        dailyWorkHours[worker] += task.workHours;
        dailyTaskDetails[worker].push({
          taskName: task.taskName,
          hours: task.workHours,
          timeInfo: task.timeInfo
        });
      }
    }

    // 각 직원별로 기본 근무시간 및 잔업 계산
    WORKERS.forEach(worker => {
      const isFullLeave = day.yearLeave.includes(worker);
      const isHalfLeave = day.halfLeave.includes(worker);
      const workedHours = dailyWorkHours[worker] || 0;

      // 평일만 기본 근무시간 계산
      if (!isWeekend) {
        if (isFullLeave) {
          // 연차: 기본 근무시간 추가 안 함, 차감 기록
          overtimeByPerson[worker].leaveDeductions.push({
            date: dateStr,
            type: '연차/민방위/예비군/휴가',
            hours: -8
          });
        } else if (isHalfLeave) {
          // 반차: 4시간만 기본 근무시간으로 추가, 차감 기록
          overtimeByPerson[worker].baseWorkHours += 4;
          overtimeByPerson[worker].leaveDeductions.push({
            date: dateStr,
            type: '반차/오전반차/오후반차',
            hours: -4
          });
        } else {
          // 정상 근무: 8시간 기본 근무시간
          overtimeByPerson[worker].baseWorkHours += 8;
        }
      }

      // 실제 작업한 경우 상세 내역 기록
      if (workedHours > 0) {
        let dailyOvertime = 0;

        if (isWeekend) {
          // 주말: 5시간 초과분이 잔업
          dailyOvertime = Math.max(0, workedHours - 5);
        } else {
          // 평일: 종료 시간이 18시 이후인 경우만 잔업 계산
          // dailyTaskDetails에서 각 작업의 종료 시간을 확인
          const workerTasks = dailyTaskDetails[worker] || [];
          workerTasks.forEach(task => {
            if (task.timeInfo) {
              // "10시-20시 (10시간 기준)" 형태에서 종료 시간 추출
              const endTimeMatch = task.timeInfo.match(/(\d{1,2})시-(\d{1,2})시/);
              if (endTimeMatch) {
                const endTime = parseInt(endTimeMatch[2]);
                if (endTime > 18) {
                  // 18시 이후까지 작업한 경우, 18시 이후 시간만 잔업
                  dailyOvertime += (endTime - 18);
                }
              }
            }
          });
        }

        overtimeByPerson[worker].dailyDetails.push({
          date: dateStr,
          workHours: workedHours,
          overtime: dailyOvertime,
          isWeekend,
          tasks: dailyTaskDetails[worker] || []
        });

        overtimeByPerson[worker].totalOvertime += dailyOvertime;
        overtimeByPerson[worker].totalWorkHours += workedHours;
      }
    });
  }

  return overtimeByPerson;
};
