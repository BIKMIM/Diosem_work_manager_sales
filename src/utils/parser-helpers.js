import { WORKERS } from '../data/workers.js';

const TITLE_PATTERN = /(프로|기정|차장|TL|부장님|팀장)$/;
const WORK_SYMBOLS_PATTERN = /^[■□▪▫●○◆★☆\s]+/;
const NON_WORKER_TOKENS = new Set(['안전', '확인', '취소', '작업취소']);
export const DEFAULT_WORK_HOURS = 5;

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

const formatDuration = (hours) => {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}시간${minutes > 0 ? `${minutes}분` : ''}`;
};

const parseDurationHours = (text) => {
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*시간(?:\s*(\d{1,2})\s*분)?/);
  if (!match) return null;
  return parseFloat(match[1]) + (match[2] ? parseInt(match[2], 10) / 60 : 0);
};

const getTrailingDuration = (text, clockEndIndex) => {
  const trailing = text.slice(clockEndIndex);
  const parenthesisMatch = trailing.match(/^\s*\(([^)]*)\)/);
  if (!parenthesisMatch) return { duration: null, consumedLength: 0 };

  const duration = parseDurationHours(parenthesisMatch[1]);
  return duration === null
    ? { duration: null, consumedLength: 0 }
    : { duration, consumedLength: parenthesisMatch[0].length };
};

export const parseScheduleHeader = (line) => {
  const match = line.match(/▣\s*(\d{4})년(?:\s*(\d{1,2})월\s*(\d+)주)?/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) : null;
  const week = match[3] ? parseInt(match[3], 10) : null;
  return {
    year,
    month,
    week,
    key: month && week ? `${year}-${month}-W${week}` : `${year}-input`,
    label: month && week ? `${year}년 ${month}월 ${week}주` : `${year}년 입력 주간`
  };
};

// 날짜 파싱 (예: "<6월 9일 월요일>")
export const parseDate = (line) => {
  const match = line.match(/<(\d+)월\s*(\d+)일\s*(\S+)>/);
  if (!match) return null;

  return {
    month: parseInt(match[1], 10),
    day: parseInt(match[2], 10),
    dayOfWeek: match[3]
  };
};

export const getExpectedDayOfWeek = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][date.getDay()];
};

// 직책명 제거 헬퍼 함수
export const removeTitle = (name) => name.replace(TITLE_PATTERN, '').trim();

// 연차/반차/교육 및 업무성 부재 파싱
export const parseLeave = (line) => {
  const yearLeave = [];
  const halfLeave = [];
  const halfHalfLeave = [];
  const education = [];
  const allLeavePattern = /([가-힣]+)\s*:\s*([^/■◆□★<]+)/g;
  const dutyKeywordPattern = /^(교육|출장|외근|회의|점검|참석인원|지원)$/;
  let match;

  while ((match = allLeavePattern.exec(line)) !== null) {
    const keyword = match[1].trim();
    const names = match[2]
      .trim()
      .split(/[,\s/]+/)
      .map(name => removeTitle(name.replace(/\([^)]*\)/g, '').trim()))
      .filter(name => name && WORKERS.includes(name));

    if (names.length === 0) continue;

    if (/^(연차|민방위|예비군|휴가|여름휴가|겨울휴가)$/.test(keyword)) {
      yearLeave.push(...names);
    } else if (/^(반차|오전반차|오후반차)$/.test(keyword)) {
      halfLeave.push(...names);
    } else if (keyword === '반반차') {
      halfHalfLeave.push(...names);
    } else if (dutyKeywordPattern.test(keyword)) {
      education.push(...names);
    }
  }

  return {
    yearLeave: [...new Set(yearLeave)],
    halfLeave: [...new Set(halfLeave)],
    halfHalfLeave: [...new Set(halfHalfLeave)],
    education: [...new Set(education)]
  };
};

export const hasWorkerDelimiter = (line) => (
  /\s\/\s/.test(line) || /(?:^|\s)-?\s*작업인원\s*:/.test(line)
);

const splitWorkerSection = (line) => {
  const slashMatch = /\s\/\s/.exec(line);
  const workerLabelMatch = /(?:^|\s)-?\s*작업인원\s*:\s*/.exec(line);
  const delimiterMatch = slashMatch && workerLabelMatch
    ? (slashMatch.index < workerLabelMatch.index ? slashMatch : workerLabelMatch)
    : (slashMatch || workerLabelMatch);

  if (!delimiterMatch) return null;

  return {
    workContent: line.slice(0, delimiterMatch.index).trim(),
    workerContent: line.slice(delimiterMatch.index + delimiterMatch[0].length).trim()
  };
};

const parseWorkers = (workerContent) => {
  const unconfirmedWorkers = [];
  const withoutUnconfirmed = workerContent.replace(
    /([가-힣]{2,5})\s*\(\s*확인\s*\)/g,
    (_, name) => {
      unconfirmedWorkers.push(removeTitle(name));
      return ' ';
    }
  );
  const cleaned = withoutUnconfirmed.replace(/\([^)]*\)/g, ' ');
  const candidates = cleaned
    .split(/[,\s]+/)
    .map(removeTitle)
    .filter(name => /^[가-힣]{2,4}$/.test(name) && !NON_WORKER_TOKENS.has(name));

  return {
    workers: [...new Set(candidates.filter(name => WORKERS.includes(name)))],
    unknownWorkers: [...new Set(candidates.filter(name => !WORKERS.includes(name)))],
    unconfirmedWorkers: [...new Set(unconfirmedWorkers)]
  };
};

const parseTimeInfo = (workContent) => {
  const rangeMatch = /(\d{1,2})시(?:\s*(\d{1,2})분)?\s*-\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/.exec(workContent);
  if (rangeMatch) {
    const startTime = toDecimalHour(rangeMatch[1], rangeMatch[2]);
    let endTime = toDecimalHour(rangeMatch[3], rangeMatch[4]);
    if (endTime < startTime) endTime += 24;

    const trailing = getTrailingDuration(workContent, rangeMatch.index + rangeMatch[0].length);
    const workHours = trailing.duration ?? (endTime - startTime);
    return {
      startTime,
      endTime,
      workHours,
      hasKnownDuration: true,
      usesDefaultDuration: false,
      timeInfo: `${formatClockTime(startTime)}-${formatClockTime(endTime)} (${formatDuration(workHours)} 기준)`,
      matchIndex: rangeMatch.index,
      matchLength: rangeMatch[0].length + trailing.consumedLength
    };
  }

  const startMatch = /(\d{1,2})시(?:\s*(\d{1,2})분)?/.exec(workContent);
  if (startMatch) {
    const startTime = toDecimalHour(startMatch[1], startMatch[2]);
    const trailing = getTrailingDuration(workContent, startMatch.index + startMatch[0].length);
    const usesDefaultDuration = trailing.duration === null;
    const workHours = trailing.duration ?? DEFAULT_WORK_HOURS;
    const endTime = startTime + workHours;

    return {
      startTime,
      endTime,
      workHours,
      hasKnownDuration: true,
      usesDefaultDuration,
      timeInfo: `${formatClockTime(startTime)}-${formatClockTime(endTime)} (${usesDefaultDuration ? '기본 ' : ''}${formatDuration(workHours)} 기준)`,
      matchIndex: startMatch.index,
      matchLength: startMatch[0].length + trailing.consumedLength
    };
  }

  const durationMatch = /\(([^)]*시간[^)]*)\)/.exec(workContent);
  const workHours = durationMatch ? parseDurationHours(durationMatch[1]) : null;
  if (workHours !== null) {
    return {
      startTime: null,
      endTime: null,
      workHours,
      hasKnownDuration: true,
      usesDefaultDuration: false,
      timeInfo: `${formatDuration(workHours)} 기준`,
      matchIndex: durationMatch.index,
      matchLength: durationMatch[0].length
    };
  }

  return {
    startTime: null,
    endTime: null,
    workHours: DEFAULT_WORK_HOURS,
    hasKnownDuration: true,
    usesDefaultDuration: true,
    timeInfo: `기본 ${formatDuration(DEFAULT_WORK_HOURS)} 기준`,
    matchIndex: -1,
    matchLength: 0
  };
};

// 작업 라인 파싱
export const parseWorkLine = (line) => {
  const sections = splitWorkerSection(line);
  if (!sections) return null;

  const canceled = /(?:\s|[-–—])(?:작업\s*)?취소(?:\s|$)/.test(line);
  const { workers, unknownWorkers, unconfirmedWorkers } = parseWorkers(sections.workerContent);
  const workContent = sections.workContent.replace(WORK_SYMBOLS_PATTERN, '').trim();
  const time = parseTimeInfo(workContent);

  const taskName = time.matchIndex >= 0
    ? `${workContent.slice(0, time.matchIndex)} ${workContent.slice(time.matchIndex + time.matchLength)}`
      .replace(/\s+/g, ' ')
      .trim()
    : workContent;

  return {
    taskName: taskName || '작업',
    timeInfo: time.timeInfo,
    startTime: time.startTime,
    endTime: time.endTime,
    workHours: time.workHours,
    hasKnownDuration: time.hasKnownDuration,
    usesDefaultDuration: time.usesDefaultDuration,
    workers,
    unknownWorkers,
    unconfirmedWorkers,
    canceled,
    rawLine: line.trim()
  };
};
