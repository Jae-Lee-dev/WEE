export type WorkerDetailScheduleTone = "green" | "orange" | "blue";

export type WorkerDetailScheduleBlock = {
  id: string;
  dayId: string;
  title: string;
  startHour: number;
  endHour: number;
  tone: WorkerDetailScheduleTone;
};

export type WorkerDetailScheduleHistory = {
  id: string;
  status: "활성" | "종료" | "대기";
  title: string;
  workDays: string;
  memo: string;
  actionLabel: string;
};

export type WorkerDetailWorkRecord = {
  id: string;
  date: string;
  duty: string;
  time: string;
  flag: string;
  tone: "green" | "orange" | "red";
};

export const workerDetailScheduleDays = [
  { id: "sun", label: "일" },
  { id: "mon", label: "월" },
  { id: "tue", label: "화" },
  { id: "wed", label: "수" },
  { id: "thu", label: "목" },
  { id: "fri", label: "금" },
  { id: "sat", label: "토" },
] as const;

export const workerDetailScheduleHours = [
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "00",
] as const;

export const workerDetailScheduleBlocks = [
  {
    id: "english-c-mon",
    dayId: "mon",
    title: "영어 C반",
    startHour: 19,
    endHour: 21,
    tone: "green",
  },
  {
    id: "english-c-wed",
    dayId: "wed",
    title: "영어 C반",
    startHour: 19,
    endHour: 21,
    tone: "green",
  },
  {
    id: "korean-e-wed",
    dayId: "wed",
    title: "국어 E반",
    startHour: 14,
    endHour: 16,
    tone: "orange",
  },
  {
    id: "korean-e-fri",
    dayId: "fri",
    title: "국어 E반",
    startHour: 14,
    endHour: 16,
    tone: "orange",
  },
  {
    id: "lab-admin-sun",
    dayId: "sun",
    title: "연구실 행정",
    startHour: 9,
    endHour: 12,
    tone: "blue",
  },
] as const satisfies readonly WorkerDetailScheduleBlock[];

export const workerDetailScheduleHistory = [
  {
    id: "schedule-2026-04-01",
    status: "활성",
    title: "2026.04.01 시간표",
    workDays: "월, 화, 목, 금 근무",
    memo: "관리자 승인",
    actionLabel: "시간표 보기",
  },
  {
    id: "schedule-2026-03-30",
    status: "종료",
    title: "2026.03.30 시간표",
    workDays: "월, 수, 금 근무",
    memo: "변경 제출 반영",
    actionLabel: "시간표 보기",
  },
  {
    id: "schedule-2026-02-01",
    status: "종료",
    title: "2026.02.01 시간표",
    workDays: "화, 목, 토 근무",
    memo: "초기 배정",
    actionLabel: "시간표 보기",
  },
] as const satisfies readonly WorkerDetailScheduleHistory[];

export const workerDetailRecentWorkRecords = [
  {
    id: "record-1",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "위치 이상",
    tone: "red",
  },
  {
    id: "record-2",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-3",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-4",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-5",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-6",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "위치 미확인",
    tone: "orange",
  },
  {
    id: "record-7",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-8",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
  {
    id: "record-9",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "결근 후보",
    tone: "red",
  },
  {
    id: "record-10",
    date: "26.04.15",
    duty: "수학 A반",
    time: "14:00~16:00",
    flag: "정상",
    tone: "green",
  },
] as const satisfies readonly WorkerDetailWorkRecord[];
