// 시간 문자열을 분으로 변환 (예: "9:30" -> 570)
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// 분을 시간 문자열로 변환 (예: 570 -> "9:30")
export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

// 작업 시간 계산
export const calculateWorkHours = (startTime, endTime, breakMinutes = 60) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const totalMinutes = end - start - breakMinutes;
  return totalMinutes / 60;
};

// 잔업 시간 계산 (8시간 초과분)
export const calculateOvertime = (workHours) => {
  return Math.max(0, workHours - 8);
};

// 시간 포맷팅 (예: 1.5 -> "1시간 30분", 2 -> "2시간")
export const formatHours = (hours) => {
  if (hours === 0) return '0시간';

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
};

// 주간 총 잔업 계산
export const calculateWeeklyOvertime = (dailyOvertimes) => {
  return dailyOvertimes.reduce((sum, ot) => sum + ot, 0);
};

// 52시간 초과 여부 확인
export const isOver52Hours = (weeklyHours) => {
  return weeklyHours > 52;
};
