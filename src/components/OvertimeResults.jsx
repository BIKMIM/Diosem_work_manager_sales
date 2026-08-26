import { formatHours } from '../utils/timeUtils';
import { WORKERS } from '../data/workers';

export default function OvertimeResults({ overtimeData, onShowDetails }) {
  if (!overtimeData) {
    return null;
  }

  const workersWithWork = Object.entries(overtimeData)
    .flatMap(([worker, data]) => Object.values(data.weeks || {})
      .filter(week => week.totalOvertime > 0)
      .map(week => ({ worker, data: week })))
    .sort((a, b) => (
      a.data.weekOrder - b.data.weekOrder ||
      WORKERS.indexOf(a.worker) - WORKERS.indexOf(b.worker)
    ));

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
        {workersWithWork.map(({ worker, data }) => {
          // 총 실제 근무시간 = 기본 근무시간 + 잔업시간
          const totalActualWorkHours = data.baseWorkHours + data.totalOvertime;
          const remainingHours = 52 - totalActualWorkHours;
          const isOver52 = totalActualWorkHours > 52;

          return (
            <div
              key={`${worker}-${data.weekKey}`}
              className="overtime-item"
              onClick={() => onShowDetails(worker, data)}
            >
              <div className="overtime-worker-name">
                {worker}
                <span className="overtime-week-label">{data.weekLabel}</span>
              </div>
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
