import SeparationManager from './SeparationManager';

export default function Settings({ separationPairs, onSeparationChange, onClose }) {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>설정</h2>
        <button className="btn-back" onClick={onClose}>
          ← 돌아가기
        </button>
      </div>

      <div className="settings-content">
        <SeparationManager
          pairs={separationPairs}
          onChange={onSeparationChange}
        />
      </div>
    </div>
  );
}
