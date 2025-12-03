import { formatHours } from '../utils/timeUtils';
import { WORKERS } from '../data/workers';

export default function OvertimeResults({ overtimeData, onShowDetails }) {
  if (!overtimeData) {
    return null;
  }

  // 잔업 시간이 있는 직원만 필터링 (0시간인 사람 제외)
  // WORKERS 배열 순서대로 정렬
  const workersWithWork = Object.entries(overtimeData)
    .filter(([_, data]) => data.totalOvertime > 0)
    .sort((a, b) => {
      // WORKERS 배열에서의 인덱스를 기준으로 정렬
      const indexA = WORKERS.indexOf(a[0]);
      const indexB = WORKERS.indexOf(b[0]);
      return indexA - indexB;
    });

  if (workersWithWork.length === 0) {
    return (
      <div className="results-section">
        <h2>주간 누적 잔업 시간</h2>
        <p className="success-message">근무 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="results-section">
      <h2>주간 누적 잔업 시간</h2>
      <div className="overtime-list">
        {workersWithWork.map(([worker, data]) => {
          // 총 실제 근무시간 = 기본 근무시간 + 잔업시간
          const totalActualWorkHours = data.baseWorkHours + data.totalOvertime;
          const remainingHours = 52 - totalActualWorkHours;
          const isOver52 = totalActualWorkHours > 52;

          return (
            <div
              key={worker}
              className="overtime-item"
              onClick={() => onShowDetails(worker, data)}
            >
              <div className="overtime-worker-name">{worker}:</div>
              <div className="overtime-info">
                <span className="overtime-hours">{formatHours(data.totalOvertime)}</span>
                {isOver52 ? (
                  <span className="over-limit-badge">
                    (초과: {formatHours(Math.abs(remainingHours))})
                  </span>
                ) : (
                  <span className="remaining-hours">
                    (여유: {formatHours(remainingHours)})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
