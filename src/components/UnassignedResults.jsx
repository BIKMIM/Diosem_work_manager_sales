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
      <h2>일별 미배정 및 부재 현황</h2>
      <div className="unassigned-list">
        {unassigned.map((day, index) => {
          // 1. 작업 미배정 인원 (화면 중앙에 크게 표시될 진짜 대기자)
          const actualUnassigned = day.workers.filter(
            w => !day.yearLeave.includes(w) && 
                 !day.halfLeave.includes(w) &&
                 (!day.education || !day.education.includes(w))
          );

          // 2. 부재자 데이터 존재 여부 확인
          const hasAbsence = day.yearLeave.length > 0 || 
                             day.halfLeave.length > 0 || 
                             (day.education && day.education.length > 0);

          return (
            <div
              key={index}
              className={actualUnassigned.length === 0 ? "unassigned-day all-assigned" : "unassigned-day"}
            >
              {/* === [헤더 영역] 좌측: 날짜 / 우측: 부재자 정보 === */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                borderBottom: '1px solid #eee',
                paddingBottom: '8px',
                marginBottom: '10px'
              }}>
                {/* 날짜 (좌측) */}
                <div className="unassigned-date" style={{ margin: 0, border: 'none', padding: 0 }}>
                  {day.date}
                </div>

                {/* 부재자 정보 (우측) - 교육, 연차 등 */}
                {hasAbsence && (
                  <div style={{ fontSize: '0.85rem', textAlign: 'right', lineHeight: '1.4' }}>
                    {day.education && day.education.length > 0 && (
                      <div style={{ color: '#2563eb' }}>
                        <span style={{ fontWeight: 'bold' }}>교육/기타:</span> {day.education.join(', ')}
                      </div>
                    )}
                    {day.yearLeave.length > 0 && (
                      <div style={{ color: '#e11d48' }}>
                        <span style={{ fontWeight: 'bold' }}>연차:</span> {day.yearLeave.join(', ')}
                      </div>
                    )}
                    {day.halfLeave.length > 0 && (
                      <div style={{ color: '#ea580c' }}>
                        <span style={{ fontWeight: 'bold' }}>반차:</span> {day.halfLeave.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* === [몸통 영역] 진짜 미배정 대기 인원만 표시 === */}
              {actualUnassigned.length === 0 ? (
                <div className="all-assigned-message">
                  ✓ 작업 가능 인원 전원 배정 완료
                </div>
              ) : (
                <div className="actual-unassigned">
                  <span className="unassigned-label">대기 인원(미배정):</span>
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