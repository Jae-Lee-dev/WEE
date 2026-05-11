export type DutyTone = "green" | "orange" | "red" | "blue" | "grey";

export type DutyWeekday = "월" | "화" | "수" | "목" | "금" | "토" | "일";

export type DutyStatus = "상시" | "운영중" | "예정" | "만료" | "비활성";

export type DutyTag = {
  id: string;
  label: string;
  tone: DutyTone;
};

export type DutyTimeRow = {
  id: string;
  weekday: DutyWeekday;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  time: string;
};

export type DutyListRow = {
  id: string;
  name: string;
  location: string;
  weekday: string;
  time: string;
  status: DutyStatus;
  statusTone: DutyTone;
  operationPeriod: string;
  operationCountText: string;
  appliedWorkerCount: number;
  appliedWorkerCountText: string;
  tags: readonly DutyTag[];
  tone: DutyTone;
  timeRows: readonly DutyTimeRow[];
};

export type DutyAssignedWorker = {
  id: string;
  name: string;
  weekday: DutyWeekday;
  time: string;
  checked?: boolean;
  disabled?: boolean;
};

export type DutySelectedDetailFixture = {
  duty: DutyListRow;
  basicInfo: {
    name: string;
    location: string;
    tags: readonly DutyTag[];
    weekday: string;
    time: string;
  };
  timeSettings: DutyTimeRow;
  assignedWorkersTitle: string;
  assignedWorkers: readonly DutyAssignedWorker[];
  editBasicButtonLabel: string;
  editTimeButtonLabel: string;
};

export type DutyFilterOption = {
  id: string;
  label: string;
  selected?: boolean;
};

export type DutyDialogField = {
  label: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
};

export type DutyDialogWeekdayOption = {
  value: DutyWeekday;
  label: DutyWeekday;
  selected: boolean;
};

export type DutyCreateDialogFixture = {
  title: string;
  nameField: DutyDialogField;
  tagSearchField: DutyDialogField;
  locationField: DutyDialogField;
  locationOptions: readonly DutyFilterOption[];
  weekdays: readonly DutyDialogWeekdayOption[];
  timeRows: readonly DutyTimeRow[];
  cancelLabel: string;
  saveLabel: string;
};

export type DutyEditBasicDialogFixture = {
  title: string;
  nameField: DutyDialogField;
  locationField: DutyDialogField;
  locationOptions: readonly DutyFilterOption[];
  tags: readonly DutyTag[];
  addTagLabel: string;
  weekdays: readonly DutyDialogWeekdayOption[];
  timeChangeHint: string;
  cancelLabel: string;
  saveLabel: string;
};

export type DutyEditTimeDialogFixture = {
  title: string;
  startTimeField: DutyDialogField;
  endTimeField: DutyDialogField;
  applyScheduleLabel: string;
  assignedWorkers: readonly Required<DutyAssignedWorker>[];
  cancelLabel: string;
  saveLabel: string;
};

export type DutyTagRow = {
  id: string;
  label: string;
  countText: string;
  tone: DutyTone;
};

export type DutyTagDialogDuty = {
  id: string;
  name: string;
  location: string;
  weekdays: string;
  checked: boolean;
  disabled: boolean;
};

export type DutyTagEditDialogFixture = {
  title: string;
  selectedTag: DutyTagRow;
  currentCountText: string;
  searchPlaceholder: string;
  duties: readonly DutyTagDialogDuty[];
  cancelLabel: string;
  saveLabel: string;
};

export const dutyTags = [
  { id: "duty-tag-question", label: "질문", tone: "orange" },
  { id: "duty-tag-admin", label: "행정", tone: "grey" },
  { id: "duty-tag-special", label: "특강", tone: "red" },
  { id: "duty-tag-makeup", label: "보강", tone: "blue" },
  { id: "duty-tag-lab", label: "실험", tone: "green" },
  { id: "duty-tag-essay", label: "논술", tone: "orange" },
] as const satisfies readonly DutyTag[];

export const dutyLocationOptions = [
  { id: "all", label: "근무지 (전체)", selected: true },
  { id: "daechi-a", label: "대치 A학원" },
  { id: "seocho-b", label: "서초 B학원" },
  { id: "jamsil-c", label: "잠실 C학원" },
  { id: "songpa-e", label: "송파 E학원" },
] as const satisfies readonly DutyFilterOption[];

export const dutyTagFilterOptions = [
  { id: "all", label: "근무 태그 (전체)", selected: true },
  { id: "duty-tag-question", label: "질문" },
  { id: "duty-tag-admin", label: "행정" },
  { id: "duty-tag-special", label: "특강" },
  { id: "duty-tag-makeup", label: "보강" },
  { id: "duty-tag-lab", label: "실험" },
  { id: "duty-tag-essay", label: "논술" },
] as const satisfies readonly DutyFilterOption[];

export const dutyStatusFilterOptions = [
  { id: "all", label: "상태 (전체)", selected: true },
  { id: "permanent", label: "상시" },
  { id: "active", label: "운영중" },
  { id: "scheduled", label: "예정" },
  { id: "expired", label: "만료" },
  { id: "inactive", label: "비활성" },
] as const satisfies readonly DutyFilterOption[];

export const dutyWeekdayOptions = [
  { value: "월", label: "월", selected: false },
  { value: "화", label: "화", selected: false },
  { value: "수", label: "수", selected: false },
  { value: "목", label: "목", selected: false },
  { value: "금", label: "금", selected: false },
  { value: "토", label: "토", selected: false },
  { value: "일", label: "일", selected: false },
] as const satisfies readonly DutyDialogWeekdayOption[];

export const dutyListRows = [
  {
    id: "duty-chemistry-g-mon",
    name: "화학 G반",
    location: "서초 B학원",
    weekday: "월요일",
    time: "10:00~12:00",
    status: "예정",
    statusTone: "blue",
    operationPeriod: "2026.06.01~2026.08.31",
    operationCountText: "총 14회",
    appliedWorkerCount: 2,
    appliedWorkerCountText: "할당 조교 2명",
    tags: [dutyTags[5]],
    tone: "orange",
    timeRows: [
      {
        id: "duty-chemistry-g-mon",
        weekday: "월",
        weekdayLabel: "월요일",
        startTime: "10:00",
        endTime: "12:00",
        time: "10:00~12:00",
      },
    ],
  },
  {
    id: "duty-physics-f-mon",
    name: "물리 F반",
    location: "대치 A학원",
    weekday: "월요일",
    time: "13:00~15:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "2026.05.04~2026.07.27",
    operationCountText: "총 13회",
    appliedWorkerCount: 4,
    appliedWorkerCountText: "할당 조교 4명",
    tags: [dutyTags[2]],
    tone: "red",
    timeRows: [
      {
        id: "duty-physics-f-mon",
        weekday: "월",
        weekdayLabel: "월요일",
        startTime: "13:00",
        endTime: "15:00",
        time: "13:00~15:00",
      },
    ],
  },
  {
    id: "duty-korean-e-mon",
    name: "국어 E반",
    location: "송파 E학원",
    weekday: "월요일",
    time: "14:00~16:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "상시",
    operationCountText: "반복 운영",
    appliedWorkerCount: 2,
    appliedWorkerCountText: "할당 조교 2명",
    tags: [dutyTags[3]],
    tone: "blue",
    timeRows: [
      {
        id: "duty-korean-e-mon",
        weekday: "월",
        weekdayLabel: "월요일",
        startTime: "14:00",
        endTime: "16:00",
        time: "14:00~16:00",
      },
    ],
  },
  {
    id: "duty-korean-e-wed",
    name: "국어 E반",
    location: "송파 E학원",
    weekday: "수요일",
    time: "14:00~16:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "상시",
    operationCountText: "반복 운영",
    appliedWorkerCount: 1,
    appliedWorkerCountText: "할당 조교 1명",
    tags: [dutyTags[3]],
    tone: "blue",
    timeRows: [
      {
        id: "duty-korean-e-wed",
        weekday: "수",
        weekdayLabel: "수요일",
        startTime: "14:00",
        endTime: "16:00",
        time: "14:00~16:00",
      },
    ],
  },
  {
    id: "duty-korean-e-fri",
    name: "국어 E반",
    location: "송파 E학원",
    weekday: "금요일",
    time: "14:00~16:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "상시",
    operationCountText: "반복 운영",
    appliedWorkerCount: 1,
    appliedWorkerCountText: "할당 조교 1명",
    tags: [dutyTags[3]],
    tone: "blue",
    timeRows: [
      {
        id: "duty-korean-e-fri",
        weekday: "금",
        weekdayLabel: "금요일",
        startTime: "14:00",
        endTime: "16:00",
        time: "14:00~16:00",
      },
    ],
  },
  {
    id: "duty-english-c-mon",
    name: "영어 C반",
    location: "잠실 C학원",
    weekday: "월요일",
    time: "19:00~21:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "2026.05.11~2026.06.22",
    operationCountText: "총 7회",
    appliedWorkerCount: 3,
    appliedWorkerCountText: "할당 조교 3명",
    tags: [dutyTags[0]],
    tone: "green",
    timeRows: [
      {
        id: "duty-english-c-mon",
        weekday: "월",
        weekdayLabel: "월요일",
        startTime: "19:00",
        endTime: "21:00",
        time: "19:00~21:00",
      },
    ],
  },
  {
    id: "duty-english-c-wed",
    name: "영어 C반",
    location: "잠실 C학원",
    weekday: "수요일",
    time: "19:00~21:00",
    status: "운영중",
    statusTone: "green",
    operationPeriod: "2026.05.13~2026.06.24",
    operationCountText: "총 7회",
    appliedWorkerCount: 2,
    appliedWorkerCountText: "할당 조교 2명",
    tags: [dutyTags[0]],
    tone: "green",
    timeRows: [
      {
        id: "duty-english-c-wed",
        weekday: "수",
        weekdayLabel: "수요일",
        startTime: "19:00",
        endTime: "21:00",
        time: "19:00~21:00",
      },
    ],
  },
  {
    id: "duty-research-admin-sun",
    name: "연구실 행정",
    location: "잠실 C학원",
    weekday: "일요일",
    time: "09:00~12:00",
    status: "상시",
    statusTone: "grey",
    operationPeriod: "상시",
    operationCountText: "반복 운영",
    appliedWorkerCount: 2,
    appliedWorkerCountText: "할당 조교 2명",
    tags: [dutyTags[1]],
    tone: "green",
    timeRows: [
      {
        id: "duty-research-admin-sun",
        weekday: "일",
        weekdayLabel: "일요일",
        startTime: "09:00",
        endTime: "12:00",
        time: "09:00~12:00",
      },
    ],
  },
] as const satisfies readonly DutyListRow[];

const selectedDutyDetailTag = {
  ...dutyTags[0],
  tone: "green",
} as const satisfies DutyTag;

export const selectedDutyDetail = {
  duty: dutyListRows[5],
  basicInfo: {
    name: "영어 C반",
    location: "잠실 C학원",
    tags: [selectedDutyDetailTag],
    weekday: "월요일",
    time: "19:00~21:00",
  },
  timeSettings: {
    id: "selected-duty-english-c-mon",
    weekday: "월",
    weekdayLabel: "월요일",
    startTime: "19:00",
    endTime: "21:00",
    time: "19:00~21:00",
  },
  assignedWorkersTitle: "할당된 조교 (3명)",
  assignedWorkers: [
    { id: "worker-kim-seoyeon", name: "김서연", weekday: "월", time: "19:00~21:00" },
    { id: "worker-park-jihoon", name: "박지훈", weekday: "월", time: "19:00~21:00" },
    { id: "worker-kang-taewoo", name: "강태우", weekday: "월", time: "19:00~21:00" },
  ],
  editBasicButtonLabel: "기본 정보 수정",
  editTimeButtonLabel: "시간 조정",
} as const satisfies DutySelectedDetailFixture;

export const selectedDutyDetailRouteId = "duty_english_c";

export const dutyCreateDialog = {
  title: "근무 개설",
  nameField: {
    label: "이름",
    required: true,
    placeholder: "예) 수학 A반 질문조교",
  },
  tagSearchField: {
    label: "근무 태그 (복수 가능)",
    placeholder: "태그를 검색하거나 새 태그를 입력하세요",
  },
  locationField: {
    label: "근무지",
    required: true,
    placeholder: "근무지를 검색해 주세요",
  },
  locationOptions: [
    { id: "daechi-a", label: "대치 A학원" },
    { id: "seocho-b", label: "서초 B학원" },
    { id: "jamsil-c", label: "잠실 C학원" },
    { id: "songpa-e", label: "송파 E학원" },
  ],
  weekdays: dutyWeekdayOptions,
  timeRows: [
    {
      id: "create-duty-time",
      weekday: "월",
      weekdayLabel: "요일 선택",
      startTime: "00:00",
      endTime: "00:00",
      time: "00:00~00:00",
    },
  ],
  cancelLabel: "취소",
  saveLabel: "변경사항 저장",
} as const satisfies DutyCreateDialogFixture;

export const dutyEditBasicDialog = {
  title: "근무 기본 정보 수정",
  nameField: {
    label: "이름",
    value: "영어 C반",
  },
  locationField: {
    label: "근무지",
    value: "잠실 C학원",
  },
  locationOptions: [
    { id: "daechi-a", label: "대치 A학원" },
    { id: "seocho-b", label: "서초 B학원" },
    { id: "jamsil-c", label: "잠실 C학원", selected: true },
    { id: "songpa-e", label: "송파 E학원" },
  ],
  tags: [dutyTags[0]],
  addTagLabel: "태그 추가",
  weekdays: [
    { value: "월", label: "월", selected: true },
    { value: "화", label: "화", selected: false },
    { value: "수", label: "수", selected: false },
    { value: "목", label: "목", selected: false },
    { value: "금", label: "금", selected: false },
    { value: "토", label: "토", selected: false },
    { value: "일", label: "일", selected: false },
  ],
  timeChangeHint: "시간 변경은 시간 조정 버튼을 클릭하여 수정할 수 있어요.",
  cancelLabel: "취소",
  saveLabel: "변경사항 저장",
} as const satisfies DutyEditBasicDialogFixture;

export const dutyEditTimeDialog = {
  title: "근무 시간 조정",
  startTimeField: {
    label: "시작 시간",
    value: "19:00",
  },
  endTimeField: {
    label: "종료 시간",
    value: "21:00",
  },
  applyScheduleLabel: "일괄 적용",
  assignedWorkers: [
    {
      id: "worker-kim-seoyeon",
      name: "김서연",
      weekday: "월",
      time: "19:00~21:00",
      checked: true,
      disabled: false,
    },
    {
      id: "worker-park-jihoon",
      name: "박지훈",
      weekday: "월",
      time: "19:00~21:00",
      checked: true,
      disabled: false,
    },
    {
      id: "worker-kang-taewoo",
      name: "강태우",
      weekday: "월",
      time: "19:00~21:00",
      checked: true,
      disabled: false,
    },
  ],
  cancelLabel: "취소",
  saveLabel: "변경사항 저장",
} as const satisfies DutyEditTimeDialogFixture;

export const dutyTagRows = [
  {
    id: "duty-tag-row-question",
    label: "질문",
    countText: "사용 근무 4건",
    tone: "orange",
  },
  {
    id: "duty-tag-row-admin",
    label: "행정",
    countText: "사용 근무 2건",
    tone: "grey",
  },
  {
    id: "duty-tag-row-special",
    label: "특강",
    countText: "사용 근무 4건",
    tone: "red",
  },
  {
    id: "duty-tag-row-makeup",
    label: "보강",
    countText: "사용 근무 4건",
    tone: "blue",
  },
  {
    id: "duty-tag-row-lab",
    label: "실험",
    countText: "사용 근무 4건",
    tone: "green",
  },
  {
    id: "duty-tag-row-essay",
    label: "논술",
    countText: "사용 근무 4건",
    tone: "orange",
  },
] as const satisfies readonly DutyTagRow[];

export const dutyTagEditDialog = {
  title: "근무자 태그 수정",
  selectedTag: dutyTagRows[0],
  currentCountText: "4건",
  searchPlaceholder: "근무명 또는 근무지를 검색해 주세요",
  duties: [
    {
      id: "duty-tag-dialog-physics-f-1",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: false,
    },
    {
      id: "duty-tag-dialog-physics-f-2",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: false,
    },
    {
      id: "duty-tag-dialog-physics-f-3",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: false,
    },
    {
      id: "duty-tag-dialog-physics-f-4",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: false,
    },
    {
      id: "duty-tag-dialog-physics-f-disabled-1",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: true,
    },
    {
      id: "duty-tag-dialog-physics-f-disabled-2",
      name: "물리F반",
      location: "대치 A학원",
      weekdays: "화, 금",
      checked: true,
      disabled: true,
    },
  ],
  cancelLabel: "취소",
  saveLabel: "저장",
} as const satisfies DutyTagEditDialogFixture;
