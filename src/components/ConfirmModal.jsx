export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>확인</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn-modal-cancel" onClick={onCancel}>
            취소
          </button>
          <button className="btn-modal-confirm" onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
