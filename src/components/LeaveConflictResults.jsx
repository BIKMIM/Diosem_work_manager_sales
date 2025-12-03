export default function LeaveConflictResults({ conflicts }) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="results-section">
      <h2>⚠️ 휴가자 배정 오류</h2>
      <div className="warning-list">
        {conflicts.map((conflict, index) => (
          <div key={index} className="warning-item leave-conflict-warning">
            <div className="warning-header">
              <span className="warning-date">{conflict.date}</span>
              <span className="warning-worker">{conflict.worker}</span>
              <span className="leave-badge">{conflict.leaveType}</span>
            </div>
            <div className="warning-detail">
              {conflict.leaveType} 상태인데 작업에 배정됨:
            </div>
            <ul className="warning-tasks">
              {conflict.tasks.map((task, idx) => (
                <li key={idx}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
