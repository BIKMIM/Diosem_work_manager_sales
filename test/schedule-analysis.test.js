import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkData } from '../src/utils/parser-core.js';
import { checkDuplicateAssignments, checkLeaveConflicts } from '../src/utils/validators.js';
import { calculatePersonalOvertime } from '../src/utils/overtime-calculator.js';
import { WORKERS } from '../src/data/workers.js';
import { getHolidayName } from '../src/utils/holidays.js';

test('연속된 주간 작업과 잔업 작업을 중복 배정으로 판단하지 않는다', () => {
  const input = `<7월 29일 수요일>
■10시(5시간) 김정규프로 P1F 층 베이 ETCH SYM3 EAPP / 박준경, 권용덕, 신지호
■15시(5시간) 노재영프로 P2L LAM / 박준경, 권용덕, 신지호`;

  const dailyData = parseWorkData(input);
  const [firstTask, secondTask] = dailyData[0].tasks;

  assert.deepEqual(
    {
      startTime: firstTask.startTime,
      endTime: firstTask.endTime,
      workHours: firstTask.workHours,
      timeInfo: firstTask.timeInfo
    },
    {
      startTime: 10,
      endTime: 15,
      workHours: 5,
      timeInfo: '10시-15시 (5시간 기준)'
    }
  );
  assert.deepEqual(
    {
      startTime: secondTask.startTime,
      endTime: secondTask.endTime,
      workHours: secondTask.workHours,
      timeInfo: secondTask.timeInfo
    },
    {
      startTime: 15,
      endTime: 20,
      workHours: 5,
      timeInfo: '15시-20시 (5시간 기준)'
    }
  );

  assert.deepEqual(checkDuplicateAssignments(dailyData), []);

  const overtime = calculatePersonalOvertime(dailyData);
  for (const worker of ['박준경', '권용덕', '신지호']) {
    assert.equal(overtime[worker].totalWorkHours, 10);
    assert.equal(overtime[worker].totalOvertime, 2);
  }
});

test('실제로 시간이 겹치는 작업은 중복 배정으로 판단한다', () => {
  const input = `<7월 29일 수요일>
■10시(5시간) 첫 번째 작업 / 박준경
■14시(5시간) 두 번째 작업 / 박준경`;

  const duplicates = checkDuplicateAssignments(parseWorkData(input));

  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].worker, '박준경');
});

test('30분 시작 시각과 소수 시간 작업을 계산한다', () => {
  const input = `<7월 28일 화요일>
■11시30분(4시간) 첫 번째 작업 / 신재웅
■10시(5.5시간) 두 번째 작업 / 서한주`;

  const [firstTask, secondTask] = parseWorkData(input)[0].tasks;

  assert.equal(firstTask.startTime, 11.5);
  assert.equal(firstTask.endTime, 15.5);
  assert.equal(firstTask.timeInfo, '11시30분-15시30분 (4시간 기준)');
  assert.equal(secondTask.startTime, 10);
  assert.equal(secondTask.endTime, 15.5);
  assert.equal(secondTask.timeInfo, '10시-15시30분 (5시간30분 기준)');
});

test('직원 명단은 합의한 직급 예외와 신규 입사자 순서를 사용한다', () => {
  assert.deepEqual(WORKERS.slice(0, 2), ['강범일', '이상엽']);
  assert.equal(WORKERS[WORKERS.indexOf('고상원') + 1], '김민우');
  assert.deepEqual(WORKERS.slice(-2), ['김주환', '서한주']);
  assert.equal(WORKERS.length, 23);
});

test('신규 다중 행 작업의 작업인원을 배정하고 확인 인원은 제외한다', () => {
  const input = `▣ 2026년 8월 1주
<8월 3일 월요일>
■[신규] 10시30분 (2일간)
- 호기정보: 16L 4층 14베이 IMP VIISTA
- 담당현업: 송지은프로
- 작업인원: 최광섭, 신재웅, 신지호, 김진성(확인) (현업PO_UR40082449수취완료)`;

  const [day] = parseWorkData(input);
  assert.equal(day.tasks.length, 1);
  assert.deepEqual(day.tasks[0].workers, ['최광섭', '신재웅', '신지호']);
  assert.equal(day.tasks[0].startTime, 10.5);
  assert.equal(day.tasks[0].endTime, 15.5);
  assert.equal(day.tasks[0].workHours, 5);
  assert.equal(day.tasks[0].usesDefaultDuration, true);
  assert.equal(day.warnings.filter(w => w.type === 'unknown-worker').length, 0);
  assert.equal(day.warnings.filter(w => w.type === 'unknown-duration').length, 0);
});

test('작업자 명단이 있고 시간이 생략되면 기본 5시간으로 계산한다', () => {
  const input = `▣ 2026년 8월 4주
<8월 27일 목요일>
■(재작업) 10시 정승훈TL M15X LAM 이설 / 이상엽, 신지호
<8월 28일 금요일>
■DB하이텍 / 최광섭, 임영곤, 고상원, 김은우`;

  const [reworkDay, noClockDay] = parseWorkData(input);
  assert.equal(reworkDay.tasks[0].workHours, 5);
  assert.equal(reworkDay.tasks[0].startTime, 10);
  assert.equal(reworkDay.tasks[0].endTime, 15);
  assert.equal(reworkDay.tasks[0].timeInfo, '10시-15시 (기본 5시간 기준)');
  assert.equal(noClockDay.tasks[0].workHours, 5);
  assert.equal(noClockDay.tasks[0].startTime, null);
  assert.equal(noClockDay.tasks[0].endTime, null);
  assert.equal(noClockDay.tasks[0].timeInfo, '기본 5시간 기준');
  assert.equal(reworkDay.warnings.length + noClockDay.warnings.length, 0);
});

test('특화PM 접두어와 시간·분 소요시간을 파싱한다', () => {
  const input = `▣ 2026년 8월 2주
<8월 13일 목요일>
■◆ [특화PM-WOW설비 작업] 10시(5시간)
유성민프로 P3 설비 / 최현철, 조용준, 신재웅
■15시(5시간) 후속 작업 / 최현철, 조용준, 신재웅
■10시30분(4시간10분) 별도 작업 / 김진탁`;

  const [day] = parseWorkData(input);
  assert.equal(day.tasks[0].startTime, 10);
  assert.equal(day.tasks[0].endTime, 15);
  assert.equal(day.tasks[2].workHours, 4 + (10 / 60));
  assert.equal(day.tasks[2].timeInfo, '10시30분-14시40분 (4시간10분 기준)');
  assert.deepEqual(checkDuplicateAssignments([day]), []);

  const overtime = calculatePersonalOvertime([day]);
  for (const worker of ['최현철', '조용준', '신재웅']) {
    assert.equal(overtime[worker].totalOvertime, 2);
  }
});

test('취소 작업은 배정, 중복, 잔업 계산에서 제외한다', () => {
  const input = `▣ 2026년 8월 3주
<8월 20일 목요일>
■10시(10시간) 취소 작업 / 박경식, 조용준 -작업취소
■10시(5시간) 정상 작업 / 김민우`;

  const [day] = parseWorkData(input);
  assert.deepEqual(day.tasks.flatMap(task => task.workers), ['김민우']);
  assert.equal(day.warnings.filter(w => w.type === 'canceled-task').length, 1);
  assert.equal(calculatePersonalOvertime([day]).박경식.totalOvertime, 0);
});

test('연도 헤더를 이용해 날짜와 요일 불일치를 경고한다', () => {
  const input = `▣ 2026년 8월 3주
<8월 22일 일요일>
■9시(5시간) 작업 / 임영곤`;

  const [day] = parseWorkData(input);
  assert.equal(day.warnings[0].type, 'date-mismatch');
  assert.match(day.warnings[0].message, /토요일/);
});

test('공휴일 작업은 명시된 작업시간 전체를 잔업으로 계산한다', () => {
  const input = `▣ 2026년 8월 3주
<8월 17일 월요일>
■9시(5시간) 공휴일 작업 / 이상엽`;

  const [day] = parseWorkData(input);
  assert.equal(day.isHoliday, true);
  assert.equal(calculatePersonalOvertime([day]).이상엽.totalOvertime, 5);
});

test('예비군 인원이 작업에 배정되면 휴가자 배정 오류로 표시한다', () => {
  const input = `▣ 2026년 8월 4주
<8월 26일 수요일> 예비군: 김민우, 신지호
■10시30분(4시간10분) 작업 / 김진탁, 신지호`;

  const conflicts = checkLeaveConflicts(parseWorkData(input));
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].worker, '신지호');
});

test('명단에 없는 작업자는 조용히 버리지 않고 경고한다', () => {
  const input = `<8월 24일 월요일>
■10시(5시간) 작업 / 이상엽, 홍길동`;

  const [day] = parseWorkData(input);
  assert.deepEqual(day.tasks[0].workers, ['이상엽']);
  assert.match(day.warnings[0].message, /홍길동/);
});

test('여러 주를 한 번에 입력해도 52시간 계산용 집계는 주차별로 분리한다', () => {
  const input = `▣ 2026년 8월 1주
<8월 3일 월요일>
■10시(10시간) 1주 작업 / 이상엽
▣ 2026년 8월 2주
<8월 10일 월요일>
■10시(10시간) 2주 작업 / 이상엽`;

  const overtime = calculatePersonalOvertime(parseWorkData(input)).이상엽;
  const weeks = Object.values(overtime.weeks);
  assert.equal(weeks.length, 2);
  assert.deepEqual(weeks.map(week => week.totalOvertime), [2, 2]);
  assert.deepEqual(weeks.map(week => week.baseWorkHours), [8, 8]);
  assert.equal(overtime.totalOvertime, 4);
});

test('2026~2027 공식 월력요항 날짜를 사용한다', () => {
  assert.equal(getHolidayName(2, 17, '화요일', 2026), '설날');
  assert.equal(getHolidayName(5, 1, '금요일', 2026), '노동절');
  assert.equal(getHolidayName(9, 28, '월요일', 2026), null);
  assert.equal(getHolidayName(2, 9, '화요일', 2027), '설날 대체공휴일');
  assert.equal(getHolidayName(9, 15, '수요일', 2027), '추석');
});
