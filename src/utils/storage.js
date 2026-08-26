// localStorage 키
const STORAGE_KEYS = {
  SEPARATION_PAIRS: 'diosem_separation_pairs',
  LEGACY_WORK_INPUT: 'diosem_work_input',
  WORK_INPUT: (variant) => `diosem_work_input_${variant}`
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
export const saveWorkInput = (text, variant = 'sales') => {
  try {
    localStorage.setItem(STORAGE_KEYS.WORK_INPUT(variant), text);
  } catch (error) {
    console.error('Failed to save work input:', error);
  }
};

// 작업 입력 데이터 불러오기
export const loadWorkInput = (variant = 'sales') => {
  try {
    const variantValue = localStorage.getItem(STORAGE_KEYS.WORK_INPUT(variant));
    if (variantValue !== null) return variantValue;

    // 기존 영업팀 저장 내용은 최초 한 번 그대로 이어받는다.
    if (variant === 'sales') {
      return localStorage.getItem(STORAGE_KEYS.LEGACY_WORK_INPUT) || '';
    }
    return '';
  } catch (error) {
    console.error('Failed to load work input:', error);
    return '';
  }
};
