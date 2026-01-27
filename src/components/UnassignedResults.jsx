export default function UnassignedResults({ unassigned }) {
  if (!unassigned || unassigned.length === 0) {
    return (
      <div className="results-section">
        <h2>미배정 인원</h2>
        <p className="success-message">분석할 작업 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="results-section">
      <h2>미배정 인원</h2>
      <div className="unassigned-list">
        {unassigned.map((day, index) => {
          // 작업 미배정 인원 계산
          // (연차, 반차, 그리고 교육/출장자도 제외)
          const actualUnassigned = day.workers.filter(
            w => !day.yearLeave.includes(w) && 
                 !day.halfLeave.includes(w) &&
                 (!day.education || !day.education.includes(w)) 
          );

          return (
            <div
              key={index}
              className={actualUnassigned.length === 0 ? "unassigned-day all-assigned" : "unassigned-day"}
            >
              <div className="unassigned-date">{day.date}</div>

              {actualUnassigned.length === 0 ? (
                <div className="all-assigned-message">
                  ✓ 모든 직원이 배정되었습니다
                </div>
              ) : (
                <div className="actual-unassigned">
                  <span className="unassigned-label">작업 미배정 인원:</span>
                  <span className="unassigned-names">
                    {actualUnassigned.join(', ')}
                    <span className="count">({actualUnassigned.length}명)</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}