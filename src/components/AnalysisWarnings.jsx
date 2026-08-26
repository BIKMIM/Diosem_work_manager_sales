const TYPE_LABELS = {
  'canceled-task': '취소 작업 제외',
  'date-mismatch': '날짜 확인',
  'unknown-duration': '시간 확인',
  'unknown-worker': '미등록 작업자',
  'unparsed-task': '작업 형식 확인'
};

export default function AnalysisWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="results-section analysis-warnings">
      <h2>입력 확인 사항</h2>
      <div className="warning-list">
        {warnings.map((warning, index) => (
          <div className="warning-item parser-warning" key={`${warning.type}-${warning.date}-${index}`}>
            <div className="warning-header">
              <span className="warning-date">{warning.date || '입력 전체'}</span>
              <span className="parser-warning-badge">
                {TYPE_LABELS[warning.type] || '확인 필요'}
              </span>
            </div>
            <div className="warning-detail">{warning.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
