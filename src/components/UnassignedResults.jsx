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
          // 1. 작업 미배정 인원 (화면 중앙에 표시될 진짜 대기자)
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
              {/* === [헤더 영역] 날짜와 부재자 정보를 왼쪽 정렬로 배치 === */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-start', // 왼쪽 정렬
                alignItems: 'center',         // 수직 중앙 정렬
                flexWrap: 'wrap',             // 화면 좁으면 줄바꿈
                gap: '15px',                  // 날짜와 부재자 정보 사이 간격
                borderBottom: '1px solid #eee',
                paddingBottom: '8px',
                marginBottom: '10px'
              }}>
                {/* 날짜 */}
                <div className="unassigned-date" style={{ margin: 0, border: 'none', padding: 0 }}>
                  {day.date}
                </div>

                {/* 부재자 정보 (날짜 바로 옆에 표시) */}
                {hasAbsence && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '0.9rem', 
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    {day.education && day.education.length > 0 && (
                      <span style={{ color: '#2563eb' }}>
                        <span style={{ fontWeight: 'bold' }}>교육/기타:</span> {day.education.join(', ')}
                      </span>
                    )}
                    {/* 구분선 (교육이 있고 연차도 있을 때만 표시) */}
                    {(day.education?.length > 0 && (day.yearLeave.length > 0 || day.halfLeave.length > 0)) && (
                      <span style={{ color: '#ccc' }}>|</span>
                    )}

                    {day.yearLeave.length > 0 && (
                      <span style={{ color: '#e11d48' }}>
                        <span style={{ fontWeight: 'bold' }}>연차:</span> {day.yearLeave.join(', ')}
                      </span>
                    )}
                    
                    {/* 구분선 (연차가 있고 반차도 있을 때만 표시) */}
                    {(day.yearLeave.length > 0 && day.halfLeave.length > 0) && (
                      <span style={{ color: '#ccc' }}>|</span>
                    )}

                    {day.halfLeave.length > 0 && (
                      <span style={{ color: '#ea580c' }}>
                        <span style={{ fontWeight: 'bold' }}>반차:</span> {day.halfLeave.join(', ')}
                      </span>
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