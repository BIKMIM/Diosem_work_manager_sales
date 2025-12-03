import { useState } from 'react';
import { WORKERS } from '../data/workers';
import AlertModal from './AlertModal';

export default function SeparationManager({ pairs, onChange }) {
  const [person1, setPerson1] = useState('');
  const [person2, setPerson2] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleAdd = () => {
    if (!person1 || !person2) {
      setAlertMessage('두 명의 직원을 모두 선택해주세요.');
      return;
    }

    if (person1 === person2) {
      setAlertMessage('같은 사람을 선택할 수 없습니다.');
      return;
    }

    // 중복 체크
    const isDuplicate = pairs.some(
      ([p1, p2]) =>
        (p1 === person1 && p2 === person2) || (p1 === person2 && p2 === person1)
    );

    if (isDuplicate) {
      setAlertMessage('이미 등록된 쌍입니다.');
      return;
    }

    onChange([...pairs, [person1, person2]]);
    setPerson1('');
    setPerson2('');
  };

  const handleRemove = (index) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange(newPairs);
  };

  return (
    <div className="separation-manager">
      <h2>분리 대상 관리</h2>

      <div className="separation-form">
        <select value={person1} onChange={(e) => setPerson1(e.target.value)}>
          <option value="">직원 1 선택</option>
          {WORKERS.map((worker) => (
            <option key={worker} value={worker}>
              {worker}
            </option>
          ))}
        </select>

        <span>↔</span>

        <select value={person2} onChange={(e) => setPerson2(e.target.value)}>
          <option value="">직원 2 선택</option>
          {WORKERS.map((worker) => (
            <option key={worker} value={worker}>
              {worker}
            </option>
          ))}
        </select>

        <button onClick={handleAdd} className="btn-add">
          추가
        </button>
      </div>

      <div className="separation-list">
        {pairs.length === 0 ? (
          <p className="empty-message">등록된 분리 대상이 없습니다.</p>
        ) : (
          <ul>
            {pairs.map(([p1, p2], index) => (
              <li key={index}>
                <span>
                  {p1} ↔ {p2}
                </span>
                <button onClick={() => handleRemove(index)} className="btn-remove">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
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
