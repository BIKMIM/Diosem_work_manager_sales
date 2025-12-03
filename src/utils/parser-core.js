import { parseDate, parseLeave, parseWorkLine } from './parser-helpers';

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
