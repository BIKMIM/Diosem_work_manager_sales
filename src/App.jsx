import { useState } from 'react';
import './styles/base.css';
import './styles/layout.css';
import './styles/settings.css';
import './styles/work-input.css';
import './styles/results.css';
import './styles/modals.css';
import './styles/responsive.css';
import {
  saveWorkInput,
  loadWorkInput
} from './utils/storage';
import { parseWorkData } from './utils/parser-core';
import {
  checkUnassigned,
  checkDuplicateAssignments,
  checkLeaveConflicts
} from './utils/validators';
import { calculatePersonalOvertime } from './utils/overtime-calculator';
import WorkInput from './components/WorkInput';
import UnassignedResults from './components/UnassignedResults';
import OvertimeResults from './components/OvertimeResults';
import OvertimeModal from './components/OvertimeModal';
import DuplicateAssignmentResults from './components/DuplicateAssignmentResults';
import LeaveConflictResults from './components/LeaveConflictResults';
import AnalysisWarnings from './components/AnalysisWarnings';
import ConfirmModal from './components/ConfirmModal';
import AlertModal from './components/AlertModal';
import {
  APP_CONFIG,
  analyzeVariant,
  getInitialVariantState,
  saveVariantState,
  VariantResults,
  VariantSettings
} from '@variant';

function App() {
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'settings'
  const [variantState, setVariantState] = useState(getInitialVariantState);
  const [workInput, setWorkInput] = useState(() => loadWorkInput(APP_CONFIG.variant));
  const [violations, setViolations] = useState(null);
  const [unassigned, setUnassigned] = useState(null);
  const [overtimeData, setOvertimeData] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [leaveConflicts, setLeaveConflicts] = useState(null);
  const [analysisWarnings, setAnalysisWarnings] = useState(null);
  const [modalWorker, setModalWorker] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // 분리 대상 변경 시 저장
  const handleVariantStateChange = (newState) => {
    setVariantState(newState);
    saveVariantState(newState);
  };

  // 작업 입력 변경 시 저장
  const handleWorkInputChange = (value) => {
    setWorkInput(value);
    saveWorkInput(value, APP_CONFIG.variant);
  };

  // 초기화
  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setWorkInput('');
    saveWorkInput('', APP_CONFIG.variant);
    setViolations(null);
    setUnassigned(null);
    setOvertimeData(null);
    setDuplicates(null);
    setLeaveConflicts(null);
    setAnalysisWarnings(null);
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

      if (dailyData.length === 0) {
        setAlertMessage('유효한 작업 데이터가 없습니다.');
        return;
      }

      const violationResults = analyzeVariant(dailyData, variantState);
      const unassignedResults = checkUnassigned(dailyData);
      const overtimeResults = calculatePersonalOvertime(dailyData);
      const duplicateResults = checkDuplicateAssignments(dailyData);
      const leaveConflictResults = checkLeaveConflicts(dailyData);

      setViolations(violationResults);
      setUnassigned(unassignedResults);
      setOvertimeData(overtimeResults);
      setDuplicates(duplicateResults);
      setLeaveConflicts(leaveConflictResults);
      setAnalysisWarnings(dailyData.flatMap(day => day.warnings || []));

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
  if (APP_CONFIG.enableSeparation && currentPage === 'settings') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            Diosem 작업 배정 현황 ({APP_CONFIG.teamName})
            <span className="app-version">v{APP_CONFIG.version} · {APP_CONFIG.releaseDate}</span>
          </h1>
        </header>
        <main className="app-main">
          <VariantSettings
            variantState={variantState}
            onVariantStateChange={handleVariantStateChange}
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
        <h1>
          Diosem 작업 배정 현황 ({APP_CONFIG.teamName})
          <span className="app-version">v{APP_CONFIG.version} · {APP_CONFIG.releaseDate}</span>
        </h1>
        {APP_CONFIG.enableSeparation && (
          <button className="btn-settings" onClick={() => setCurrentPage('settings')}>
            ⚙️ 설정
          </button>
        )}
      </header>

      <main className="app-main">
        <WorkInput
          value={workInput}
          onChange={handleWorkInputChange}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
        />

        {(unassigned !== null || overtimeData !== null || duplicates !== null || leaveConflicts !== null) && (
          <div className="results-container">
            <AnalysisWarnings warnings={analysisWarnings} />
            <LeaveConflictResults conflicts={leaveConflicts} />
            <DuplicateAssignmentResults duplicates={duplicates} />
            <VariantResults results={violations} />
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
