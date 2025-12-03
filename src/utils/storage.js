// localStorage 키
const STORAGE_KEYS = {
  SEPARATION_PAIRS: 'diosem_separation_pairs',
  WORK_INPUT: 'diosem_work_input'
};

// 분리 대상 쌍 저장
export const saveSeparationPairs = (pairs) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SEPARATION_PAIRS, JSON.stringify(pairs));
  } catch (error) {
    console.error('Failed to save separation pairs:', error);
  }
};

// 분리 대상 쌍 불러오기
export const loadSeparationPairs = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SEPARATION_PAIRS);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load separation pairs:', error);
    return null;
  }
};

// 작업 입력 데이터 저장
export const saveWorkInput = (text) => {
  try {
    localStorage.setItem(STORAGE_KEYS.WORK_INPUT, text);
  } catch (error) {
    console.error('Failed to save work input:', error);
  }
};

// 작업 입력 데이터 불러오기
export const loadWorkInput = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.WORK_INPUT) || '';
  } catch (error) {
    console.error('Failed to load work input:', error);
    return '';
  }
};
