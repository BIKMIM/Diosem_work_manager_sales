import { WORKERS } from '../data/workers';

// 분리 위반 검사
export const checkSeparationViolations = (dailyData, separationPairs) => {
  const violations = [];

  for (const day of dailyData) {
    for (const task of day.tasks) {
      const workers = task.workers;

      for (const [person1, person2] of separationPairs) {
        if (workers.includes(person1) && workers.includes(person2)) {
          violations.push({
            date: `${day.month}월 ${day.day}일 ${day.dayOfWeek}`,
            task: task.taskName,
            pair: [person1, person2]
          });
        }
      }
    }
  }

  return violations;
};

// 미배정 인원 검사
export const checkUnassigned = (dailyData) => {
  const unassignedByDay = [];

  for (const day of dailyData) {
    const assignedWorkers = new Set();

    // 작업에 배정된 직원
    for (const task of day.tasks) {
      task.workers.forEach(w => assignedWorkers.add(w));
    }

    // 미배정 직원 = 전체 - 배정됨 (휴가자 포함하여 표시)
    const unassigned = WORKERS.filter(w => !assignedWorkers.has(w));

    // 모든 날짜를 포함
    unassignedByDay.push({
      date: `${day.month}월 ${day.day}일 ${day.dayOfWeek}`,
      workers: unassigned,
      yearLeave: day.yearLeave,
      halfLeave: day.halfLeave,
      education: day.education, 
      allAssigned: unassigned.length === 0
    });
  }

  return unassignedByDay;
};

// 중복 배정 검사 (같은 날 여러 작업에 배정된 경우)
export const checkDuplicateAssignments = (dailyData) => {
  const duplicates = [];

  for (const day of dailyData) {
    const dateStr = `${day.month}월 ${day.day}일 ${day.dayOfWeek}`;
    const workerTaskCount = {}; // 각 작업자의 작업 목록

    // 각 작업을 순회하며 작업자별 작업 수 계산
    for (const task of day.tasks) {
      for (const worker of task.workers) {
        if (!workerTaskCount[worker]) {
          workerTaskCount[worker] = [];
        }
        workerTaskCount[worker].push({
          taskName: task.taskName,
          timeInfo: task.timeInfo
        });
      }
    }

    // 2개 이상 작업에 배정된 작업자 찾기
    for (const [worker, tasks] of Object.entries(workerTaskCount)) {
      if (tasks.length > 1) {
        // 각 작업의 시간대 파싱
        const timeRanges = tasks.map(task => {
          if (task.timeInfo) {
            const timeMatch = task.timeInfo.match(/(\d{1,2})시-(\d{1,2})시/);
            if (timeMatch) {
              return {
                start: parseInt(timeMatch[1]),
                end: parseInt(timeMatch[2]),
                taskName: task.taskName,
                timeInfo: task.timeInfo
              };
            }
          }
          return null;
        }).filter(t => t !== null);

        // 시간대 정보가 없는 작업이 있으면 중복으로 간주
        if (timeRanges.length !== tasks.length) {
          duplicates.push({
            date: dateStr,
            worker,
            tasks: tasks.map(t => `${t.taskName} (${t.timeInfo || '시간 미상'})`),
            count: tasks.length
          });
          continue;
        }

        // 시간대 순으로 정렬
        timeRanges.sort((a, b) => a.start - b.start);

        // 연속 작업인지 확인 (시간대가 겹치는지 체크)
        let hasOverlap = false;
        for (let i = 0; i < timeRanges.length - 1; i++) {
          const current = timeRanges[i];
          const next = timeRanges[i + 1];

          // 다음 작업 시작이 현재 작업 종료보다 이전이면 겹침
          if (next.start < current.end) {
            hasOverlap = true;
            break;
          }

          // 너무 큰 간격이 있으면 (3시간 이상) 다른 작업으로 간주
          if (next.start - current.end > 3) {
            hasOverlap = true;
            break;
          }
        }

        // 시간대가 겹치거나 간격이 너무 크면 중복 배정 경고
        if (hasOverlap) {
          duplicates.push({
            date: dateStr,
            worker,
            tasks: tasks.map(t => `${t.taskName} (${t.timeInfo || '시간 미상'})`),
            count: tasks.length
          });
        }
      }
    }
  }

  return duplicates;
};

// 휴가자 배정 오류 검사
export const checkLeaveConflicts = (dailyData) => {
  const conflicts = [];

  for (const day of dailyData) {
    const dateStr = `${day.month}월 ${day.day}일 ${day.dayOfWeek}`;

    // 연차/민방위/예비군/휴가 등으로 빠진 사람들
    const onLeave = new Set([...day.yearLeave, ...day.halfLeave]);

    // 작업에 배정된 사람들
    const assignedWorkers = new Set();
    const workerTasks = {}; // 작업자별 작업 목록

    for (const task of day.tasks) {
      for (const worker of task.workers) {
        assignedWorkers.add(worker);
        if (!workerTasks[worker]) {
          workerTasks[worker] = [];
        }
        workerTasks[worker].push({
          taskName: task.taskName,
          timeInfo: task.timeInfo
        });
      }
    }

    // 휴가인데 작업에 배정된 경우 찾기
    for (const worker of onLeave) {
      if (assignedWorkers.has(worker)) {
        const leaveType = day.yearLeave.includes(worker)
          ? '연차/민방위/예비군/휴가'
          : '반차/오전반차/오후반차';

        conflicts.push({
          date: dateStr,
          worker,
          leaveType,
          tasks: workerTasks[worker].map(t => `${t.taskName} (${t.timeInfo || '시간 미상'})`)
        });
      }
    }
  }

  return conflicts;
};
