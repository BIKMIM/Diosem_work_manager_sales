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
          // 정상 근무 (또는 교육): 8시간 기본 근무시간
          overtimeByPerson[worker].baseWorkHours += 8;
        }
      }

      // 실제 작업한 경우 상세 내역 기록
      if (workedHours > 0) {
        let dailyOvertime = 0;

        if (isWeekend) {
          // ⭐ [수정됨] 주말: 근무 시간 전체를 잔업(특근)으로 인정
          // 기존 코드: Math.max(0, workedHours - 5) -> 5시간 근무 시 0이 되는 문제 해결
          dailyOvertime = workedHours;
        } else {
          // 평일 잔업 계산
          const workerTasks = dailyTaskDetails[worker] || [];
          
          workerTasks.forEach(task => {
            let taskOvertime = 0;

            // 1. 종료 시간 기준 체크 ("10시-20시")
            if (task.timeInfo) {
              const endTimeMatch = task.timeInfo.match(/(\d{1,2})시-(\d{1,2})시/);
              if (endTimeMatch) {
                const endTime = parseInt(endTimeMatch[2]);
                if (endTime > 18) {
                  // 18시 이후 시간은 잔업
                  taskOvertime = (endTime - 18);
                }
              } else {
                // 2. 시간대 없이 "(10시간 기준)" 등으로만 적힌 경우 체크 (보강됨)
                const durationMatch = task.timeInfo.match(/(\d+(?:\.\d+)?)시간\s*기준/);
                if (durationMatch) {
                  const duration = parseFloat(durationMatch[1]);
                  // 8시간을 초과하는 부분은 잔업으로 간주
                  if (duration > 8) {
                    taskOvertime = duration - 8;
                  }
                }
              }
            }
            dailyOvertime += taskOvertime;
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
