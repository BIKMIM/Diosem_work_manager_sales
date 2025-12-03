import { WORKERS } from '../data/workers';

// 날짜 파싱 (예: "<6월 9일 월요일>")
const parseDate = (line) => {
  const match = line.match(/<(\d+)월\s*(\d+)일\s*(\S+)>/);
  if (match) {
    return {
      month: parseInt(match[1]),
      day: parseInt(match[2]),
      dayOfWeek: match[3]
    };
  }
  return null;
};

// 직책명 제거 헬퍼 함수
const removeTitle = (name) => {
  return name.replace(/(프로|기정|차장|TL|부장님|팀장)$/, '').trim();
};

// 연차/반차 파싱 (기존 HTML 프로그램 로직 참고)
const parseLeave = (line) => {
  const yearLeave = [];
  const halfLeave = [];

  // 연차/민방위/예비군/휴가 처리 (8시간 차감) - 슬래시 구분 및 다양한 키워드 처리
  const fullAbsencePattern = /(연차|민방위|예비군|여름휴가|여름\s*휴가|겨울휴가|겨울\s*휴가|휴가)\s*:\s*([^■◆□★<]*?)(?=\s*\/\s*(연차|민방위|예비군|여름휴가|여름\s*휴가|겨울휴가|겨울\s*휴가|휴가|반차|오전반차|오후반차|교육)\s*:|■|◆|□|★|<|$)/g;
  let match;
  let fullAbsenceNames = '';

  while ((match = fullAbsencePattern.exec(line)) !== null) {
    if (fullAbsenceNames) fullAbsenceNames += ', ';
    fullAbsenceNames += match[2].trim();
  }

  if (fullAbsenceNames) {
    const cleanedNames = fullAbsenceNames
      .replace(/\s*\/\s*(연차|민방위|예비군|반차|오전반차|오후반차|교육|여름휴가|겨울휴가|휴가):\s*/g, ', ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .split(/,\s*|\s*\/\s*/)
      .map(n => removeTitle(n.replace(/\([^)]*\)/g, '').trim()))
      .filter(n => n && !n.match(/^(연차|민방위|예비군|반차|오전반차|오후반차|교육|여름휴가|겨울휴가|휴가)$/) && WORKERS.includes(n));

    yearLeave.push(...cleanedNames);
  }

  // 반차 처리 (오전반차, 오후반차 포함)
  const halfAbsencePattern = /(반차|오전반차|오후반차)\s*:\s*([^■◆□★<]*?)(?=\s*\/\s*(연차|민방위|예비군|여름휴가|여름\s*휴가|겨울휴가|겨울\s*휴가|휴가|반차|오전반차|오후반차|교육)\s*:|■|◆|□|★|<|$)/g;
  let halfAbsenceNames = '';

  while ((match = halfAbsencePattern.exec(line)) !== null) {
    if (halfAbsenceNames) halfAbsenceNames += ', ';
    halfAbsenceNames += match[2].trim();
  }

  if (halfAbsenceNames) {
    const cleanedNames = halfAbsenceNames
      .replace(/\s*\/\s*(연차|민방위|예비군|반차|오전반차|오후반차|교육|여름휴가|겨울휴가|휴가):\s*/g, ', ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .split(/,\s*|\s*\/\s*/)
      .map(n => removeTitle(n.replace(/\([^)]*\)/g, '').trim()))
      .filter(n => n && !n.match(/^(연차|민방위|예비군|반차|오전반차|오후반차|교육|여름휴가|겨울휴가|휴가)$/) && WORKERS.includes(n));

    halfLeave.push(...cleanedNames);
  }

  return { yearLeave, halfLeave };
};

// 작업 라인 파싱
const parseWorkLine = (line) => {
  // ■10시-15시(5시간 기준) 작업내용 / 직원1, 직원2, 직원3
  // ★ 작업명 / 직원1, 직원2
  // 기호 작업내용 / 직원1, 직원2

  // / 기준으로 분리
  if (!line.includes(' / ')) return null;

  const slashIndex = line.indexOf(' / ');
  const beforeSlash = line.substring(0, slashIndex).trim();
  const workersStr = line.substring(slashIndex + 3).trim();

  // 직원 이름 파싱 (기존 HTML 프로그램 로직 적용 + 불규칙한 띄어쓰기 처리)
  // 1. 괄호 안의 내용 제거 (예: "김진성(샘플수집)" -> "김진성")
  // 2. 직책명 제거 (프로, 차장, TL 등)
  // 3. 쉼표와 공백으로 분리 (불규칙한 띄어쓰기 대응)

  // 먼저 괄호 제거
  let cleanedStr = workersStr.replace(/\([^)]*\)/g, '');

  // 한글 이름 패턴으로 직접 추출 (2-4글자 한글)
  const namePattern = /[가-힣]{2,4}(?:프로|기정|차장|TL|부장님|팀장)?/g;
  const foundNames = [];
  let match;

  while ((match = namePattern.exec(cleanedStr)) !== null) {
    const name = removeTitle(match[0]);
    // 직책만 있는 경우 제외
    if (name && name.length >= 2 && !name.match(/^(프로|기정|차장|TL|부장님|팀장)$/)) {
      foundNames.push(name);
    }
  }

  // WORKERS 리스트에 있는 이름만 필터링 (중복 제거)
  const workers = [...new Set(foundNames)].filter(w => WORKERS.includes(w));

  if (workers.length === 0) return null;

  // 시간 정보 추출
  let workHours = 0;
  let startTime = '';
  let endTime = '';
  let timeInfo = '';

  // "10시-15시(5시간 기준)" 형태
  const timeRangeMatch = beforeSlash.match(/(\d{1,2})시\s*-\s*(\d{1,2})시\s*\((\d+(?:\.\d+)?)\s*시간/);
  if (timeRangeMatch) {
    startTime = timeRangeMatch[1];
    endTime = timeRangeMatch[2];
    workHours = parseFloat(timeRangeMatch[3]);
    timeInfo = `${startTime}시-${endTime}시 (${workHours}시간 기준)`;
  } else {
    // "(X시간 기준)" 형태만 있는 경우
    const hourMatch = beforeSlash.match(/\((\d+(?:\.\d+)?)\s*시간\s*기준\)/);
    if (hourMatch) {
      workHours = parseFloat(hourMatch[1]);
      timeInfo = `${workHours}시간 기준`;
    } else {
      // 시간 정보가 없으면 기본 8시간
      workHours = 8;
      timeInfo = '8시간 기준';
    }
  }

  // 작업명 추출 (앞의 기호와 시간 정보 제거)
  let taskName = beforeSlash
    .replace(/^[■□▪▫●○◆★☆]\s*/, '') // 앞의 기호 제거
    .replace(/\d{1,2}시\s*-\s*\d{1,2}시\s*\([^)]+\)/, '') // 시간 범위 제거
    .replace(/\([^)]*시간[^)]*\)/, '') // 시간 정보 제거
    .trim();

  return {
    taskName: taskName || '작업',
    timeInfo,
    startTime,
    endTime,
    workHours,
    workers
  };
};

// 전체 텍스트 파싱
export const parseWorkData = (text) => {
  const lines = text.split('\n');
  const dailyData = [];
  let currentDay = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // 날짜 라인 (연차 정보가 같은 줄에 있을 수 있음)
    const dateInfo = parseDate(trimmed);
    if (dateInfo) {
      currentDay = {
        ...dateInfo,
        yearLeave: [],
        halfLeave: [],
        tasks: []
      };
      dailyData.push(currentDay);

      // 날짜 라인과 같은 줄에 연차 정보가 있는지 확인 (더 많은 키워드 지원)
      const leaveKeywords = ['연차:', '반차:', '예비군:', '휴가:', '민방위:',
                            '여름휴가:', '겨울휴가:', '오전반차:', '오후반차:', '교육:'];
      if (leaveKeywords.some(keyword => trimmed.includes(keyword))) {
        const { yearLeave, halfLeave } = parseLeave(trimmed);
        currentDay.yearLeave.push(...yearLeave);
        currentDay.halfLeave.push(...halfLeave);
      }
      continue;
    }

    if (!currentDay) continue;

    // 연차/반차 라인 (별도 라인으로 나오는 경우)
    const leaveKeywords = ['연차:', '반차:', '예비군:', '휴가:', '민방위:',
                          '여름휴가:', '겨울휴가:', '오전반차:', '오후반차:', '교육:'];
    if (leaveKeywords.some(keyword => trimmed.includes(keyword))) {
      const { yearLeave, halfLeave } = parseLeave(trimmed);
      currentDay.yearLeave.push(...yearLeave);
      currentDay.halfLeave.push(...halfLeave);
      continue;
    }

    // 작업 라인 처리 (기존 HTML 프로그램의 다중 라인 처리 로직 적용)
    if (trimmed.match(/^[■□▪▫●○◆★☆]/)) {
      // / 가 있으면 완전한 작업 라인
      if (trimmed.includes(' / ')) {
        const task = parseWorkLine(trimmed);
        if (task && task.workers.length > 0) {
          currentDay.tasks.push(task);
        }
      } else {
        // / 가 없으면 다음 줄과 합쳐야 할 수 있음 (특화PM 등)
        // 현재 라인과 다음 몇 줄을 합쳐서 처리
        let fullWorkContent = trimmed;
        let nextLineIndex = i + 1;

        // 다음 줄들을 확인하여 작업 내용의 일부인지 판단
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim();

          // 다음 작업(기호로 시작) 또는 날짜 섹션을 만나면 중단
          if (nextLine.match(/^[■□▪▫●○◆★☆]/) || nextLine.match(/^<\d{1,2}월\s*\d{1,2}일/)) {
            break;
          }

          // 비어있지 않은 줄이면 작업 내용에 추가
          if (nextLine.length > 0) {
            fullWorkContent += ' ' + nextLine;
          }

          nextLineIndex++;

          // 최대 5줄까지만 확인 (무한 루프 방지)
          if (nextLineIndex - i > 5) {
            break;
          }
        }

        // 합쳐진 내용에 / 가 있으면 파싱
        if (fullWorkContent.includes(' / ')) {
          const task = parseWorkLine(fullWorkContent);
          if (task && task.workers.length > 0) {
            currentDay.tasks.push(task);
          }
          // 처리한 줄 수만큼 인덱스 이동
          i = nextLineIndex - 1;
        }
      }
    } else if (trimmed.includes(' / ')) {
      // 기호 없이 / 만 있는 경우도 작업 라인으로 처리
      const task = parseWorkLine('■ ' + trimmed);
      if (task && task.workers.length > 0) {
        currentDay.tasks.push(task);
      }
    }
  }

  return dailyData;
};

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
      allAssigned: unassigned.length === 0
    });
  }

  return unassignedByDay;
};

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
          // 예: 10시-15시, 14시-20시 → 겹침 (14 < 15)
          // 예: 10시-15시, 15시-20시 → 겹치지 않음 (15 >= 15)
          // 예: 10시-15시, 16시-20시 → 겹치지 않음 (16 >= 15)
          if (next.start < current.end) {
            hasOverlap = true;
            break;
          }

          // 너무 큰 간격이 있으면 (3시간 이상) 다른 작업으로 간주
          // 예: 10시-15시, 19시-22시 → 간격 4시간, 중복 배정
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
