// 고정 공휴일 - 매년 동일한 날짜 (음력 제외)
const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: '신정' },
  { month: 3,  day: 1,  name: '삼일절' },
  { month: 5,  day: 5,  name: '어린이날' },
  { month: 6,  day: 6,  name: '현충일' },
  { month: 8,  day: 15, name: '광복절' },
  { month: 10, day: 3,  name: '개천절' },
  { month: 10, day: 9,  name: '한글날' },
  { month: 12, day: 25, name: '크리스마스' },
];

// 연도별 변동 공휴일 (음력 기반 + 대체공휴일)
// 출처: 우주항공청 월력요항 기준 — 매년 다음 해 공식 발표 후 갱신 필요
const VARIABLE_HOLIDAYS = {
  2025: [
    { month: 1,  day: 28, name: '설날 연휴' },
    { month: 1,  day: 29, name: '설날' },
    { month: 1,  day: 30, name: '설날 연휴' },
    { month: 3,  day: 3,  name: '삼일절 대체공휴일' },  // 3/1 토요일
    { month: 5,  day: 5,  name: '석가탄신일' },          // 어린이날과 겹침
    { month: 10, day: 5,  name: '추석 연휴' },
    { month: 10, day: 6,  name: '추석' },
    { month: 10, day: 7,  name: '추석 연휴' },
    { month: 10, day: 8,  name: '추석 대체공휴일' },
  ],
  2026: [
    { month: 2,  day: 16, name: '설날 연휴' },
    { month: 2,  day: 17, name: '설날' },
    { month: 2,  day: 18, name: '설날 연휴' },
    { month: 3,  day: 2,  name: '삼일절 대체공휴일' },   // 3/1 일요일
    { month: 5,  day: 1,  name: '노동절' },
    { month: 5,  day: 24, name: '석가탄신일' },
    { month: 5,  day: 25, name: '석가탄신일 대체공휴일' }, // 5/24 일요일
    { month: 6,  day: 3,  name: '전국동시지방선거' },
    { month: 7,  day: 17, name: '제헌절' },
    { month: 8,  day: 17, name: '광복절 대체공휴일' },   // 8/15 토요일
    { month: 9,  day: 24, name: '추석 연휴' },
    { month: 9,  day: 25, name: '추석' },
    { month: 9,  day: 26, name: '추석 연휴' },
    { month: 10, day: 5,  name: '개천절 대체공휴일' },   // 10/3 토요일
  ],
  2027: [
    { month: 2,  day: 6,  name: '설날 연휴' },
    { month: 2,  day: 7,  name: '설날' },
    { month: 2,  day: 8,  name: '설날 연휴' },
    { month: 2,  day: 9,  name: '설날 대체공휴일' },
    { month: 5,  day: 1,  name: '노동절' },
    { month: 5,  day: 3,  name: '노동절 대체공휴일' },
    { month: 5,  day: 13, name: '석가탄신일' },
    { month: 7,  day: 17, name: '제헌절' },
    { month: 7,  day: 19, name: '제헌절 대체공휴일' },
    { month: 8,  day: 16, name: '광복절 대체공휴일' },   // 8/15 일요일
    { month: 9,  day: 14, name: '추석 연휴' },
    { month: 9,  day: 15, name: '추석' },
    { month: 9,  day: 16, name: '추석 연휴' },
    { month: 10, day: 4,  name: '개천절 대체공휴일' },
    { month: 10, day: 11, name: '한글날 대체공휴일' },
    { month: 12, day: 27, name: '크리스마스 대체공휴일' },
  ],
};

const DAY_OF_WEEK_MAP = {
  '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3,
  '목요일': 4, '금요일': 5, '토요일': 6,
};

// 월/일/요일 문자열로 연도 추론 (dayOfWeek 없으면 현재 연도 사용)
const inferYear = (month, day, dayOfWeekStr) => {
  const targetDow = DAY_OF_WEEK_MAP[dayOfWeekStr];
  if (targetDow === undefined) return new Date().getFullYear();

  const currentYear = new Date().getFullYear();
  for (const year of [currentYear, currentYear + 1, currentYear - 1]) {
    if (new Date(year, month - 1, day).getDay() === targetDow) return year;
  }
  return currentYear;
};

// 해당 날짜의 공휴일 이름 반환 (공휴일 아니면 null)
export const getHolidayName = (month, day, dayOfWeekStr, explicitYear = null) => {
  const year = explicitYear || inferYear(month, day, dayOfWeekStr);

  const fixed = FIXED_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (fixed) return fixed.name;

  const variable = (VARIABLE_HOLIDAYS[year] || []).find(h => h.month === month && h.day === day);
  return variable ? variable.name : null;
};

export const isKoreanHoliday = (month, day, dayOfWeekStr, explicitYear = null) => {
  return getHolidayName(month, day, dayOfWeekStr, explicitYear) !== null;
};
