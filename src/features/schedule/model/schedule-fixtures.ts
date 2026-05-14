export type ScheduleRequestKind = "initial" | "change";

export type ScheduleApprovalStatusText =
  | "승인 대기"
  | "검토 대기";

export type ScheduleTimelineTone = "green" | "orange" | "pink" | "blue";

export type ScheduleTimelineDayId =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type ScheduleTimelineDay = {
  id: ScheduleTimelineDayId;
  label: string;
  fullLabel: string;
};

export type ScheduleTimelineBlock = {
  id: string;
  dayId: ScheduleTimelineDayId;
  label: string;
  sourceSlotIndex?: number;
  dutyId?: string;
  worker: string;
  workerId?: string;
  time: string;
  startHour: number;
  endHour: number;
  locationId?: string;
  locationName: string;
  tagIds?: readonly string[];
  tone: ScheduleTimelineTone;
  tagLabel?: string;
};

export type ScheduleApprovalRequestDetail = {
  workerName: string;
  workerTag: string;
  workerStatusText: string;
  submittedAt: string;
  submittedKindText: string;
  submittedBlockCountText: string;
  correctionStatusText: string;
  adjustmentDutyName: string;
  adjustmentDayText: string;
  adjustmentLocationName: string;
  adjustmentTimeText: string;
  adjustmentStartTime: string;
  adjustmentEndTime: string;
  timelineBlocks: readonly ScheduleTimelineBlock[];
  rejectDialog: {
    title: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    confirmLabel: string;
  };
};

export type ScheduleApprovalRequestRow = {
  id: string;
  workerName: string;
  dutyName: string;
  requestDate: string;
  requestedTime: string;
  requestKind: ScheduleRequestKind;
  requestKindText: string;
  reasonText: string;
  statusText: ScheduleApprovalStatusText;
  selectedDetail: ScheduleApprovalRequestDetail;
};

export type ScheduleFilterOption = {
  value: string;
  label: string;
};

export type ScheduleTimelineFilters = {
  weekLabel: string;
  weekShortLabel: string;
  locationOptions: readonly ScheduleFilterOption[];
  dutyOptions: readonly ScheduleFilterOption[];
  dutyTagOptions: readonly ScheduleFilterOption[];
  workerOptions: readonly ScheduleFilterOption[];
};

export type ScheduleSelectedWorkerAssignment = {
  id: string;
  dutyName: string;
  tagLabel: string;
  dayLabel: string;
  time: string;
  locationName: string;
};

export type ScheduleSelectedWorkerContext = {
  workerId: string;
  workerName: string;
  statusText: string;
  assignedCountText: string;
  detailHref: string;
  scheduleHref: string;
  selectedBlockIds: readonly string[];
  assignments: readonly ScheduleSelectedWorkerAssignment[];
  actions: {
    editScheduleLabel: string;
    viewWorkerLabel: string;
  };
};

const ihaeunApprovalTimelineBlocks = [
  block(
    "approval-ihaeun-mon-math-a",
    "mon",
    "수학 A반",
    "이하은",
    "19:00~21:00",
    19,
    21,
    "대치 A학원",
    "green",
    "질문",
  ),
  block(
    "approval-ihaeun-wed-korean-e",
    "wed",
    "국어 E반",
    "이하은",
    "14:00~16:00",
    14,
    16,
    "송파 E학원",
    "green",
    "논술",
  ),
  block(
    "approval-ihaeun-wed-english-c",
    "wed",
    "영어 C반",
    "이하은",
    "19:00~21:00",
    19,
    21,
    "대치 A학원",
    "green",
    "질문",
  ),
  block(
    "approval-ihaeun-fri-korean-e",
    "fri",
    "국어 E반",
    "이하은",
    "14:00~16:00",
    14,
    16,
    "송파 E학원",
    "green",
    "논술",
  ),
] as const satisfies readonly ScheduleTimelineBlock[];

const selectedApprovalDetail = {
  workerName: "이하은",
  workerTag: "베테랑",
  workerStatusText: "활성",
  submittedAt: "04.15",
  submittedKindText: "변경",
  submittedBlockCountText: "5건",
  correctionStatusText: "없음",
  adjustmentDutyName: "수학 A반",
  adjustmentDayText: "월요일",
  adjustmentLocationName: "대치 A학원",
  adjustmentTimeText: "19:00~21:00",
  adjustmentStartTime: "19:00",
  adjustmentEndTime: "21:00",
  timelineBlocks: ihaeunApprovalTimelineBlocks,
  rejectDialog: {
    title: "시간표 반려",
    reasonLabel: "반려 사유 (선택)",
    reasonPlaceholder: "반려 사유를 입력해 주세요",
    confirmLabel: "반려 확정하기",
  },
} as const satisfies ScheduleApprovalRequestDetail;

export const scheduleApprovalRequests = [
  requestRow(
    "request-kim-seoyeon-change-0415-1",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-initial-0415-1",
    "김서연",
    "수학 B반",
    "26.04.15",
    "14:00~16:00",
    "initial",
    "최초",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-initial-0415-2",
    "김서연",
    "수학 B반",
    "26.04.15",
    "16:00~18:00",
    "initial",
    "최초",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-2",
    "김서연",
    "수학 B반",
    "26.04.15",
    "18:00~20:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-3",
    "김서연",
    "수학 B반",
    "26.04.15",
    "20:00~22:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-4",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-5",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "검토 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-6",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-7",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-8",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-9",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-10",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-11",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-12",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-13",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-kim-seoyeon-change-0415-14",
    "김서연",
    "수학 B반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 B반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
  requestRow(
    "request-ihaeun-change-0415",
    "이하은",
    "수학 A반",
    "26.04.15",
    "19:00~21:00",
    "change",
    "변경",
    "수학 A반 추가",
    "승인 대기",
    selectedApprovalDetail,
  ),
] as const satisfies readonly ScheduleApprovalRequestRow[];

export const scheduleApprovalSummary = {
  listCountText: "17",
  selectedRequestId: "request-ihaeun-change-0415",
  approveLabel: "승인",
  rejectLabel: "시간표 반려",
} as const;

export const scheduleTimelineFilters = {
  weekLabel: "2026.04.13 - 2026.04.19",
  weekShortLabel: "04.13~04.19",
  locationOptions: [
    { value: "all", label: "근무지 (전체)" },
    { value: "daechi-a", label: "대치 A학원" },
    { value: "seocho-b", label: "서초 B학원" },
    { value: "jamsil-c", label: "잠실 C학원" },
    { value: "gangnam-d", label: "강남 D학원" },
    { value: "songpa-e", label: "송파 E학원" },
  ],
  dutyOptions: [
    { value: "all", label: "근무 (전체)" },
    { value: "math-a", label: "수학 A반" },
    { value: "chemistry-g", label: "화학 G반" },
    { value: "physics-f", label: "물리 F반" },
    { value: "korean-e", label: "국어 E반" },
    { value: "english-c", label: "영어 C반" },
    { value: "lab-admin", label: "연구실 행정" },
  ],
  dutyTagOptions: [
    { value: "all", label: "근무 태그 (전체)" },
    { value: "question", label: "질문" },
    { value: "essay", label: "논술" },
    { value: "admin", label: "행정" },
  ],
  workerOptions: [
    { value: "all", label: "조교 (전체)" },
    { value: "worker_kim_seoyeon", label: "김서연" },
    { value: "kang-taewoo", label: "강태우" },
    { value: "song-hyunwoo", label: "송현우" },
    { value: "jeong-suhyeon", label: "정수현" },
  ],
} as const satisfies ScheduleTimelineFilters;

export const scheduleTimelineDays = [
  { id: "mon", label: "월", fullLabel: "월요일" },
  { id: "tue", label: "화", fullLabel: "화요일" },
  { id: "wed", label: "수", fullLabel: "수요일" },
  { id: "thu", label: "목", fullLabel: "목요일" },
  { id: "fri", label: "금", fullLabel: "금요일" },
  { id: "sat", label: "토", fullLabel: "토요일" },
  { id: "sun", label: "일", fullLabel: "일요일" },
] as const satisfies readonly ScheduleTimelineDay[];

export const scheduleTimelineTimeSlots = [
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
  "01",
  "02",
] as const satisfies readonly string[];

export const scheduleTimelineBlocks = [
  block(
    "schedule-kang-taewoo-mon-chemistry-g",
    "mon",
    "화학 G반",
    "강태우",
    "09:00~11:00",
    9,
    11,
    "대치 A학원",
    "orange",
  ),
  block(
    "schedule-song-hyunwoo-mon-physics-f",
    "mon",
    "물리 F반",
    "송현우",
    "13:00~15:00",
    13,
    15,
    "강남 D학원",
    "pink",
  ),
  block(
    "schedule-jeong-suhyeon-mon-korean-e",
    "mon",
    "국어 E반",
    "정수현",
    "14:00~16:00",
    14,
    16,
    "송파 E학원",
    "blue",
    "논술",
  ),
  block(
    "schedule-ihaeun-mon-english-c",
    "mon",
    "영어 C반",
    "김서연",
    "19:00~21:00",
    19,
    21,
    "잠실 C학원",
    "green",
    "질문",
  ),
  block(
    "schedule-ihaeun-wed-korean-e",
    "wed",
    "국어 E반",
    "김서연",
    "14:00~16:00",
    14,
    16,
    "송파 E학원",
    "green",
    "논술",
  ),
  block(
    "schedule-ihaeun-wed-english-c",
    "wed",
    "영어 C반",
    "김서연",
    "19:00~21:00",
    19,
    21,
    "잠실 C학원",
    "green",
    "질문",
  ),
  block(
    "schedule-ihaeun-fri-korean-e",
    "fri",
    "국어 E반",
    "김서연",
    "14:00~16:00",
    14,
    16,
    "송파 E학원",
    "green",
    "논술",
  ),
  block(
    "schedule-ihaeun-sun-lab-admin",
    "sun",
    "연구실 행정",
    "김서연",
    "09:00~12:00",
    9,
    12,
    "서초 B학원",
    "green",
    "행정",
  ),
] as const satisfies readonly ScheduleTimelineBlock[];

export const scheduleSelectedWorkerContext = {
  workerId: "worker_kim_seoyeon",
  workerName: "김서연",
  statusText: "활성",
  assignedCountText: "현재 배정 근무 (5건)",
  detailHref: "/workers/worker_kim_seoyeon",
  scheduleHref: "/workers/worker_kim_seoyeon/schedule",
  selectedBlockIds: [
    "schedule-ihaeun-mon-english-c",
    "schedule-ihaeun-wed-korean-e",
    "schedule-ihaeun-wed-english-c",
    "schedule-ihaeun-fri-korean-e",
    "schedule-ihaeun-sun-lab-admin",
  ],
  assignments: [
    {
      id: "assignment-ihaeun-mon-english-c",
      dutyName: "영어 C반",
      tagLabel: "질문",
      dayLabel: "월",
      time: "19:00 ~21:00",
      locationName: "잠실 C학원",
    },
    {
      id: "assignment-ihaeun-wed-korean-e",
      dutyName: "국어 E반",
      tagLabel: "논술",
      dayLabel: "수",
      time: "14:00 ~16:00",
      locationName: "송파 E학원",
    },
    {
      id: "assignment-ihaeun-wed-english-c",
      dutyName: "영어 C반",
      tagLabel: "질문",
      dayLabel: "수",
      time: "19:00 ~21:00",
      locationName: "잠실 C학원",
    },
    {
      id: "assignment-ihaeun-fri-korean-e",
      dutyName: "국어 E반",
      tagLabel: "논술",
      dayLabel: "금",
      time: "14:00 ~16:00",
      locationName: "송파 E학원",
    },
    {
      id: "assignment-ihaeun-sun-lab-admin",
      dutyName: "연구실 행정",
      tagLabel: "행정",
      dayLabel: "일",
      time: "09:00 ~12:00",
      locationName: "서초 B학원",
    },
  ],
  actions: {
    editScheduleLabel: "조교 시간표 편집",
    viewWorkerLabel: "조교 상세 보기",
  },
} as const satisfies ScheduleSelectedWorkerContext;

function requestRow(
  id: string,
  workerName: string,
  dutyName: string,
  requestDate: string,
  requestedTime: string,
  requestKind: ScheduleRequestKind,
  requestKindText: string,
  reasonText: string,
  statusText: ScheduleApprovalStatusText,
  selectedDetail: ScheduleApprovalRequestDetail,
): ScheduleApprovalRequestRow {
  return {
    id,
    workerName,
    dutyName,
    requestDate,
    requestedTime,
    requestKind,
    requestKindText,
    reasonText,
    statusText,
    selectedDetail,
  };
}

function block(
  id: string,
  dayId: ScheduleTimelineDayId,
  label: string,
  worker: string,
  time: string,
  startHour: number,
  endHour: number,
  locationName: string,
  tone: ScheduleTimelineTone,
  tagLabel?: string,
): ScheduleTimelineBlock {
  return {
    id,
    dayId,
    label,
    worker,
    time,
    startHour,
    endHour,
    locationName,
    tone,
    tagLabel,
  };
}
