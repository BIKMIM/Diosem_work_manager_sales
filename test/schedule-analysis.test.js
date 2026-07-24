import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkData } from '../src/utils/parser-core.js';
import { checkDuplicateAssignments } from '../src/utils/validators.js';
import { calculatePersonalOvertime } from '../src/utils/overtime-calculator.js';

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
  assert.equal(secondTask.timeInfo, '10시-15시30분 (5.5시간 기준)');
});
