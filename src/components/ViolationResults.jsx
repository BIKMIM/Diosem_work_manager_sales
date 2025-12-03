export default function ViolationResults({ violations }) {
  if (!violations || violations.length === 0) {
    return (
      <div className="results-section">
        <h2>분리 위반 검사</h2>
        <p className="success-message">분리 위반 사항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="results-section">
      <h2>분리 위반 검사</h2>
      <div className="violation-list">
        <p className="warning-message">총 {violations.length}건의 위반이 발견되었습니다.</p>
        <ul>
          {violations.map((violation, index) => (
            <li key={index} className="violation-item">
              <div className="violation-date">{violation.date}</div>
              <div className="violation-task">{violation.task}</div>
              <div className="violation-pair">
                {violation.pair[0]} ↔ {violation.pair[1]}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
