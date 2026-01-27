import { useState } from 'react';
import AlertModal from './AlertModal';

export default function WorkInput({ value, onChange, onAnalyze, onClear }) {
  const [alertMessage, setAlertMessage] = useState('');

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleCopyAll = () => {
    if (value.trim()) {
      navigator.clipboard.writeText(value).then(() => {
        setAlertMessage('전체 텍스트가 복사되었습니다.');
      }).catch(() => {
        setAlertMessage('복사에 실패했습니다.');
      });
    } else {
      setAlertMessage('복사할 내용이 없습니다.');
    }
  };

  const placeholder = `작업 데이터를 입력하세요.

예시:
<6월 9일 월요일>
연차: 홍길동 / 반차: 김철수
■ XX 작업 (8시간 기준) - 이상엽, 신재웅, 최이택
■ YY 작업 (9:00-19:00) - 조광호, 윤호진`;

  return (
    <div className="work-input">
      <div className="work-input-header">
        <h2>작업 데이터 입력</h2>
        <button onClick={handleCopyAll} className="btn-copy-all" title="전체 텍스트 복사">
          📋 전체 복사
        </button>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={15}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onAnalyze} className="btn-analyze" style={{ flex: 1 }}>
          작업 미배정 인원 확인 (기술팀 총 {WORKERS.length}명)
        </button>
        <button onClick={onClear} className="btn-clear">
          초기화
        </button>
      </div>

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage('')}
        />
      )}
    </div>
  );
}
