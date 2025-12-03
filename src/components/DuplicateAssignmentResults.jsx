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
              동일 날짜에 {dup.count}개 작업에 배정됨 (야간작업 제외):
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
