import { WORKERS } from '../data/workers.js';

const toDecimalHour = (hour, minute = 0) => (
  parseInt(hour, 10) + (parseInt(minute || 0, 10) / 60)
);

const formatClockTime = (decimalHour) => {
  const totalMinutes = Math.round(decimalHour * 60);
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesOfDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const dayPrefix = dayOffset > 0 ? '익일 ' : '';

  return `${dayPrefix}${hour}시${minute > 0 ? `${minute}분` : ''}`;
};

// 날짜 파싱 (예: "<6월 9일 월요일>")
export const parseDate = (line) => {
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
export const removeTitle = (name) => {
  return name.replace(/(프로|기정|차장|TL|부장님|팀장)$/, '').trim();
};

// 연차/반차/교육 등 모든 부재 파싱 (새로운 로직)
export const parseLeave = (line) => {
  const yearLeave = [];
  const halfLeave = [];
  const halfHalfLeave = []; // 반반차 (2시간 조기퇴근)
  const education = [];

  // "키워드: 이름들" 패턴을 모두 찾기
  // 슬래시(/)로 구분된 여러 항목 처리
  // =========================================================
  // 부재 키워드 설정
  // 반반차 키워드 변경 시 아래 상수만 수정하면 됩니다.
  // =========================================================
  const HALF_HALF_LEAVE_KEYWORD = '반반차'; // 2시간 조기퇴근

  // 작업 기호나 다음 구분자를 만나기 전까지 이름 영역으로 처리
  const allLeavePattern = /([가-힣]+)\s*:\s*([^/■◆□★<]+)/g;
  let match;

  while ((match = allLeavePattern.exec(line)) !== null) {
    const keyword = match[1].trim();
    const namesStr = match[2].trim();

    // 이름 추출 (쉼표, 공백, 슬래시로 구분)
    // 쉼표, 공백, 슬래시를 이름 구분자로 처리
    const names = namesStr
      .split(/[,\s/]+/)
      .map(n => removeTitle(n.replace(/\([^)]*\)/g, '').trim()))
      .filter(n => n && n.length >= 2 && WORKERS.includes(n));

    if (names.length === 0) continue;

    // 키워드에 따라 분류
    if (keyword.match(/^(연차|민방위|예비군|휴가|여름휴가|겨울휴가)$/)) {
      // 8시간 차감
      yearLeave.push(...names);
    } else if (keyword.match(/^(반차|오전반차|오후반차)$/)) {
      // 4시간 차감
      halfLeave.push(...names);
    } else if (keyword === HALF_HALF_LEAVE_KEYWORD) {
      // 2시간 차감 (반반차 - 조기퇴근)
      halfHalfLeave.push(...names);
    } else {
      // 그 외 모든 것 (교육, 출장, 병가 등) - 근무 간주, 차감 없음
      education.push(...names);
    }
  }

  // 중복 제거
  return {
    yearLeave: [...new Set(yearLeave)],
    halfLeave: [...new Set(halfLeave)],
    halfHalfLeave: [...new Set(halfHalfLeave)],
    education: [...new Set(education)]
  };
};

// 작업 라인 파싱
export const parseWorkLine = (line) => {
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
  let startTime = null;
  let endTime = null;
  let timeInfo = '';
  let timePrefixLength = 0;
  const workContent = beforeSlash.replace(/^[■□▪▫●○◆★☆]\s*/, '');

  // "10시-15시(5시간 기준)", "10시30분-15시30분" 형태
  const timeRangeMatch = workContent.match(
    /^(\d{1,2})시(?:\s*(\d{1,2})분)?\s*-\s*(\d{1,2})시(?:\s*(\d{1,2})분)?(?:\s*\((\d+(?:\.\d+)?)\s*시간[^)]*\))?/
  );

  if (timeRangeMatch) {
    startTime = toDecimalHour(timeRangeMatch[1], timeRangeMatch[2]);
    endTime = toDecimalHour(timeRangeMatch[3], timeRangeMatch[4]);

    // 종료 시각이 시작 시각보다 이르면 자정을 넘긴 작업으로 처리
    if (endTime < startTime) {
      endTime += 24;
    }

    workHours = timeRangeMatch[5]
      ? parseFloat(timeRangeMatch[5])
      : endTime - startTime;
    timeInfo = `${formatClockTime(startTime)}-${formatClockTime(endTime)} (${workHours}시간 기준)`;
    timePrefixLength = timeRangeMatch[0].length;
  } else {
    // "10시(5시간)", "11시30분(4시간)", "10시(6시간이상 예상)" 형태
    const startDurationMatch = workContent.match(
      /^(\d{1,2})시(?:\s*(\d{1,2})분)?(?:\s*\((\d+(?:\.\d+)?)\s*시간[^)]*\))?/
    );

    if (startDurationMatch) {
      startTime = toDecimalHour(startDurationMatch[1], startDurationMatch[2]);
      workHours = startDurationMatch[3] ? parseFloat(startDurationMatch[3]) : 8;
      endTime = startTime + workHours;
      timeInfo = `${formatClockTime(startTime)}-${formatClockTime(endTime)} (${workHours}시간 기준)`;
      timePrefixLength = startDurationMatch[0].length;
    } else {
      // "(X시간)", "(X시간 기준)" 형태만 있는 경우
      const hourMatch = workContent.match(/\((\d+(?:\.\d+)?)\s*시간[^)]*\)/);
      if (hourMatch) {
        workHours = parseFloat(hourMatch[1]);
        timeInfo = `${workHours}시간 기준`;
      } else {
        // 시간 정보가 없으면 기본 8시간
        workHours = 8;
        timeInfo = '8시간 기준';
      }
    }
  }

  // 작업명 추출 (앞의 기호와 시작 시간 정보 제거)
  let taskName = workContent
    .slice(timePrefixLength)
    .replace(/\([^)]*시간[^)]*\)/, '')
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
