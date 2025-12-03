import { formatHours } from '../utils/timeUtils';

export default function OvertimeModal({ worker, data, onClose }) {
  if (!worker || !data) return null;

  const totalActualWorkHours = data.baseWorkHours + data.totalOvertime;
  const remainingHours = 52 - totalActualWorkHours;
  const isOver52 = totalActualWorkHours > 52;

  // 연차/반차와 작업 내역을 날짜별로 병합하여 정렬
  const allEntries = [];

  // 연차/반차 차감 추가
  data.leaveDeductions.forEach(deduction => {
    allEntries.push({
      date: deduction.date,
      type: 'leave',
      leaveType: deduction.type,
      hours: deduction.hours
    });
  });

  // 작업 내역 추가
  data.dailyDetails.forEach(detail => {
    allEntries.push({
      date: detail.date,
      type: 'work',
      workHours: detail.workHours,
      overtime: detail.overtime,
      isWeekend: detail.isWeekend,
      tasks: detail.tasks
    });
  });

  // 날짜순 정렬
  allEntries.sort((a, b) => {
    const dateA = new Date(2024, parseInt(a.date.split('월')[0]) - 1, parseInt(a.date.split('월')[1].split('일')[0]));
    const dateB = new Date(2024, parseInt(b.date.split('월')[0]) - 1, parseInt(b.date.split('월')[1].split('일')[0]));
    return dateA - dateB;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={onClose}>
        <div className="modal-header">
          <h3>{worker} 주간 잔업 상세 내역</h3>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="overtime-details">
            <div className="daily-entries">
              {allEntries.map((entry, index) => {
                // 내용이 없는 항목은 건너뛰기 (연차/반차가 아니고 잔업도 없는 경우)
                if (entry.type !== 'leave' && entry.overtime === 0) {
                  return null;
                }

                return (
                  <div key={index} className="daily-entry">
                    <div className="entry-date">{entry.date}</div>
                    {entry.type === 'leave' ? (
                      <div className="entry-leave">
                        {entry.leaveType}: <span className="overtime-time-negative">{entry.hours}시간</span>
                      </div>
                    ) : (
                      <div className="entry-work">
                        <div className="task-type">
                          - {entry.isWeekend ? '주말 작업' : '평일 잔업 (종료시간 기준)'}
                          <span className="overtime-time-positive">: {formatHours(entry.overtime)}</span>
                        </div>
                        <div className="task-description">
                          ({entry.tasks[0]?.taskName.substring(0, 30)}{entry.tasks[0]?.taskName.length > 30 ? '...' : ''})
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {allEntries.length === 0 && (
                <p className="empty-message">이번 주 내역이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
