import { WORKERS } from '../data/workers';

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

// 연차/반차 파싱 (기존 HTML 프로그램 로직 참고)
export const parseLeave = (line) => {
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
