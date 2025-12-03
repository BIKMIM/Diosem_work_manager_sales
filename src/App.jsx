import { useState, useEffect } from 'react';
import './styles/base.css';
import './styles/layout.css';
import './styles/settings.css';
import './styles/work-input.css';
import './styles/results.css';
import './styles/modals.css';
import './styles/responsive.css';
import { DEFAULT_SEPARATION_PAIRS } from './data/workers';
import {
  saveSeparationPairs,
  loadSeparationPairs,
  saveWorkInput,
  loadWorkInput
} from './utils/storage';
import { parseWorkData } from './utils/parser-core';
import {
  checkSeparationViolations,
  checkUnassigned,
  checkDuplicateAssignments,
  checkLeaveConflicts
} from './utils/validators';
import { calculatePersonalOvertime } from './utils/overtime-calculator';
import Settings from './components/Settings';
import WorkInput from './components/WorkInput';
import ViolationResults from './components/ViolationResults';
import UnassignedResults from './components/UnassignedResults';
import OvertimeResults from './components/OvertimeResults';
import OvertimeModal from './components/OvertimeModal';
import DuplicateAssignmentResults from './components/DuplicateAssignmentResults';
import LeaveConflictResults from './components/LeaveConflictResults';
import ConfirmModal from './components/ConfirmModal';
import AlertModal from './components/AlertModal';

function App() {
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'settings'
  const [separationPairs, setSeparationPairs] = useState([]);
  const [workInput, setWorkInput] = useState('');
  const [violations, setViolations] = useState(null);
  const [unassigned, setUnassigned] = useState(null);
  const [overtimeData, setOvertimeData] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [leaveConflicts, setLeaveConflicts] = useState(null);
  const [modalWorker, setModalWorker] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // 초기 로드
  useEffect(() => {
    const savedPairs = loadSeparationPairs();
    setSeparationPairs(savedPairs || DEFAULT_SEPARATION_PAIRS);

    const savedInput = loadWorkInput();
    setWorkInput(savedInput);
  }, []);

  // 분리 대상 변경 시 저장
  const handleSeparationChange = (newPairs) => {
    setSeparationPairs(newPairs);
    saveSeparationPairs(newPairs);
  };

  // 작업 입력 변경 시 저장
  const handleWorkInputChange = (value) => {
    setWorkInput(value);
    saveWorkInput(value);
  };

  // 초기화
  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setWorkInput('');
    saveWorkInput('');
    setViolations(null);
    setUnassigned(null);
    setOvertimeData(null);
    setDuplicates(null);
    setLeaveConflicts(null);
    setShowClearConfirm(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  // 분석 실행
  const handleAnalyze = () => {
    if (!workInput.trim()) {
      setAlertMessage('작업 데이터를 입력해주세요.');
      return;
    }

    try {
      const dailyData = parseWorkData(workInput);

      // 디버깅: 파싱된 데이터 확인
      console.log('=== 파싱된 데이터 ===');
      console.log('dailyData:', JSON.stringify(dailyData, null, 2));

      if (dailyData.length === 0) {
        setAlertMessage('유효한 작업 데이터가 없습니다.');
        return;
      }

      const violationResults = checkSeparationViolations(dailyData, separationPairs);
      const unassignedResults = checkUnassigned(dailyData);
      const overtimeResults = calculatePersonalOvertime(dailyData);
      const duplicateResults = checkDuplicateAssignments(dailyData);
      const leaveConflictResults = checkLeaveConflicts(dailyData);

      console.log('=== 분석 결과 ===');
      console.log('violations:', violationResults);
      console.log('unassigned:', unassignedResults);
      console.log('overtime:', overtimeResults);
      console.log('duplicates:', duplicateResults);
      console.log('leaveConflicts:', leaveConflictResults);

      setViolations(violationResults);
      setUnassigned(unassignedResults);
      setOvertimeData(overtimeResults);
      setDuplicates(duplicateResults);
      setLeaveConflicts(leaveConflictResults);

      // 결과로 스크롤
      setTimeout(() => {
        document.querySelector('.results-container')?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 100);
    } catch (error) {
      console.error('Analysis error:', error);
      setAlertMessage('데이터 분석 중 오류가 발생했습니다. 입력 형식을 확인해주세요.');
    }
  };

  // 잔업 상세 모달 열기
  const handleShowOvertimeDetails = (worker, data) => {
    setModalWorker(worker);
    setModalData(data);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setModalWorker(null);
    setModalData(null);
  };

  // 설정 페이지 표시
  if (currentPage === 'settings') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Diosem 작업 배정 현황 (영업팀)</h1>
        </header>
        <main className="app-main">
          <Settings
            separationPairs={separationPairs}
            onSeparationChange={handleSeparationChange}
            onClose={() => setCurrentPage('main')}
          />
        </main>
      </div>
    );
  }

  // 메인 페이지 표시
  return (
    <div className="app">
      <header className="app-header">
        <h1>Diosem 작업 배정 현황 (영업팀)</h1>
        <button className="btn-settings" onClick={() => setCurrentPage('settings')}>
          ⚙️ 설정
        </button>
      </header>

      <main className="app-main">
        <WorkInput
          value={workInput}
          onChange={handleWorkInputChange}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
        />

        {(violations !== null || unassigned !== null || overtimeData !== null || duplicates !== null || leaveConflicts !== null) && (
          <div className="results-container">
            <LeaveConflictResults conflicts={leaveConflicts} />
            <DuplicateAssignmentResults duplicates={duplicates} />
            <ViolationResults violations={violations} />
            <UnassignedResults unassigned={unassigned} />
            <OvertimeResults
              overtimeData={overtimeData}
              onShowDetails={handleShowOvertimeDetails}
            />
          </div>
        )}
      </main>

      {modalWorker && (
        <OvertimeModal
          worker={modalWorker}
          data={modalData}
          onClose={handleCloseModal}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          message="모든 입력 내용과 결과를 초기화하시겠습니까?"
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      )}

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage('')}
        />
      )}
    </div>
  );
}

export default App;
