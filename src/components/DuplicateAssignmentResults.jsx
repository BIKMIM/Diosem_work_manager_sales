export default function DuplicateAssignmentResults({ duplicates }) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  return (
    <div className="results-section">
      <h2>⚠️ 중복 배정 경고</h2>
      <div className="warning-list">
        {duplicates.map((dup, index) => (
          <div key={index} className="warning-item duplicate-warning">
            <div className="warning-header">
              <span className="warning-date">{dup.date}</span>
              <span className="warning-worker">{dup.worker}</span>
            </div>
            <div className="warning-detail">
              {dup.reason === 'unknown-time'
                ? `동일 날짜의 ${dup.count}개 작업 중 시간 미상 작업이 있어 중복 여부를 확인해야 합니다:`
                : `동일 날짜에 시간대가 겹치는 ${dup.count}개 작업이 있습니다:`}
            </div>
            <ul className="warning-tasks">
              {dup.tasks.map((task, idx) => (
                <li key={idx}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
