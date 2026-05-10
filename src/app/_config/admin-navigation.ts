export type AdminIconName =
  | "dashboard"
  | "workers"
  | "schedule"
  | "records"
  | "payroll"
  | "handover"
  | "settings";

export type AdminTab = {
  label: string;
  href: string;
  screenId: string;
  badge?: string;
};

export type AdminSection = {
  key: AdminIconName;
  label: string;
  href: string;
  icon: AdminIconName;
  badge?: string;
  badgeTone?: "green" | "ai";
  tabs: AdminTab[];
};

export type AdminScreenMetric = {
  label: string;
  value: string;
  unit: string;
  tag: string;
  tone?: "green" | "orange" | "red" | "blue" | "grey";
};

export type AdminScreen = {
  href: string;
  screenId: string;
  title: string;
  description: string;
  metrics: AdminScreenMetric[];
  tableTitle: string;
  tableColumns: string[];
  tableRows: string[][];
};

export const adminSections: AdminSection[] = [
  {
    key: "dashboard",
    label: "대시보드",
    href: "/dashboard",
    icon: "dashboard",
    tabs: [
      { label: "운영 인박스", href: "/dashboard", screenId: "DSH-01" },
      {
        label: "근무지별 대시보드",
        href: "/dashboard/locations",
        screenId: "DSH-02",
      },
      {
        label: "근무자별 대시보드",
        href: "/dashboard/workers",
        screenId: "DSH-03",
      },
      {
        label: "AI 이상탐지 ∙ 모니터링",
        href: "/dashboard/ai-monitoring",
        screenId: "DSH-04",
      },
    ],
  },
  {
    key: "workers",
    label: "조교 관리",
    href: "/workers",
    icon: "workers",
    badge: "6",
    tabs: [
      { label: "조교 목록", href: "/workers", screenId: "WKR-02" },
      { label: "소속 신청", href: "/workers/applications", screenId: "WKR-01" },
      { label: "근무자 태그 관리", href: "/workers/tags", screenId: "WKR-06" },
    ],
  },
  {
    key: "schedule",
    label: "근무 ∙ 시간표",
    href: "/schedule",
    icon: "schedule",
    badge: "12",
    tabs: [
      {
        label: "근무 시간표",
        href: "/schedule/timeline",
        screenId: "SCH-02",
      },
      { label: "승인 대기", href: "/schedule", screenId: "SCH-01" },
      { label: "근무 목록", href: "/schedule/duties", screenId: "DUT-01" },
      {
        label: "근무 태그 관리",
        href: "/schedule/duty-tags",
        screenId: "DUT-03",
      },
    ],
  },
  {
    key: "records",
    label: "근무 기록",
    href: "/records",
    icon: "records",
    badge: "22",
    tabs: [
      { label: "근무기록", href: "/records", screenId: "REC-01", badge: "6" },
      {
        label: "이상감지처리 이력",
        href: "/records/anomaly-history",
        screenId: "REC-02",
      },
      {
        label: "이의신청 이력",
        href: "/records/corrections",
        screenId: "REC-03",
      },
      { label: "출퇴근 이력", href: "/records/attendance", screenId: "REC-04" },
    ],
  },
  {
    key: "payroll",
    label: "급여 관리",
    href: "/payroll",
    icon: "payroll",
    tabs: [
      { label: "급여 산정", href: "/payroll", screenId: "PAY-01" },
      { label: "급여 명세", href: "/payroll/statements", screenId: "PAY-02" },
    ],
  },
  {
    key: "handover",
    label: "인수인계",
    href: "/handover",
    icon: "handover",
    badge: "AI",
    badgeTone: "ai",
    tabs: [{ label: "문서 편집", href: "/handover", screenId: "HO-01" }],
  },
  {
    key: "settings",
    label: "설정",
    href: "/settings",
    icon: "settings",
    tabs: [
      { label: "사업장 일반", href: "/settings", screenId: "SET-01" },
      { label: "근무지 관리", href: "/settings/locations", screenId: "SET-02" },
      {
        label: "운영/정산 기준",
        href: "/settings/rules",
        screenId: "SET-03",
      },
      { label: "알림 설정", href: "/settings/notifications", screenId: "SET-04" },
      { label: "요금제/결제", href: "/settings/billing", screenId: "SET-05" },
    ],
  },
];

export const entryRoutes = [
  { label: "로그인", href: "/login" },
  { label: "회원가입", href: "/signup" },
  { label: "비밀번호 재설정", href: "/forgot-password" },
  { label: "워크스페이스 생성", href: "/onboarding/workspace" },
  { label: "운영 기준 설정", href: "/onboarding/setup" },
] as const;

export type AdminRouteImplementationStatus =
  | "figma-backed"
  | "deferred"
  | "detail-ready";

export type AdminRouteMeta = {
  screenId: string;
  href: string;
  title: string;
  figmaBacked: boolean;
  status: AdminRouteImplementationStatus;
  authoritativeFrameId?: string;
  sampleHref?: string;
  deferredReason?: string;
};

export const adminRouteRegistry: AdminRouteMeta[] = [
  {
    screenId: "DSH-01",
    href: "/dashboard",
    title: "운영 인박스",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "1:2",
  },
  {
    screenId: "DSH-02",
    href: "/dashboard/locations",
    title: "근무지별 대시보드",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No dedicated Figma frame found in register.",
  },
  {
    screenId: "DSH-03",
    href: "/dashboard/workers",
    title: "근무자별 대시보드",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No dedicated Figma frame found in register.",
  },
  {
    screenId: "DSH-04",
    href: "/dashboard/ai-monitoring",
    title: "AI 이상탐지 ∙ 모니터링",
    figmaBacked: false,
    status: "deferred",
    deferredReason:
      "Registered dashboard anomaly frames are DSH-01 inbox filter states.",
  },
  {
    screenId: "WKR-01",
    href: "/workers/applications",
    title: "소속 신청",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "52:4791",
  },
  {
    screenId: "WKR-02",
    href: "/workers",
    title: "조교 목록",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "10:2322",
  },
  {
    screenId: "WKR-03",
    href: "/workers/[workerId]",
    title: "조교 상세-기본 정보",
    figmaBacked: true,
    status: "detail-ready",
    authoritativeFrameId: "19:10529",
    sampleHref: "/workers/worker_kim_seoyeon",
  },
  {
    screenId: "WKR-04",
    href: "/workers/[workerId]/schedule",
    title: "조교 상세-시간표",
    figmaBacked: true,
    status: "detail-ready",
    authoritativeFrameId: "52:3183",
    sampleHref: "/workers/worker_kim_seoyeon/schedule",
  },
  {
    screenId: "WKR-05",
    href: "/workers/[workerId]/payroll",
    title: "조교 상세-급여 현황",
    figmaBacked: true,
    status: "detail-ready",
    authoritativeFrameId: "52:4087",
    sampleHref: "/workers/worker_kim_seoyeon/payroll",
  },
  {
    screenId: "WKR-06",
    href: "/workers/tags",
    title: "근무자 태그 관리",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "52:6431",
  },
  {
    screenId: "SCH-01",
    href: "/schedule",
    title: "승인 대기",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "57:5653",
  },
  {
    screenId: "SCH-02",
    href: "/schedule/timeline",
    title: "전체 시간표 타임라인",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "10:2939",
  },
  {
    screenId: "DUT-01",
    href: "/schedule/duties",
    title: "근무 목록",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "57:7431",
  },
  {
    screenId: "DUT-02",
    href: "/schedule/duties/[dutyId]",
    title: "근무 상세",
    figmaBacked: true,
    status: "detail-ready",
    authoritativeFrameId: "57:8000",
    sampleHref: "/schedule/duties/duty_english_c",
  },
  {
    screenId: "DUT-03",
    href: "/schedule/duty-tags",
    title: "근무 태그 관리",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "57:9966",
  },
  {
    screenId: "REC-01",
    href: "/records",
    title: "근무기록",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "15:4152",
  },
  {
    screenId: "REC-02",
    href: "/records/anomaly-history",
    title: "이상감지처리 이력",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "61:8549",
  },
  {
    screenId: "REC-03",
    href: "/records/corrections",
    title: "이의신청 이력",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "61:10252",
  },
  {
    screenId: "REC-04",
    href: "/records/attendance",
    title: "출퇴근 이력",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "61:10580",
  },
  {
    screenId: "PAY-01",
    href: "/payroll",
    title: "급여 산정",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "15:4706",
  },
  {
    screenId: "PAY-02",
    href: "/payroll/statements",
    title: "급여 명세",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "54:7269",
  },
  {
    screenId: "HO-01",
    href: "/handover",
    title: "문서 편집",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "66:10947",
  },
  {
    screenId: "SET-01",
    href: "/settings",
    title: "사업장 일반",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "15:5475",
  },
  {
    screenId: "SET-02",
    href: "/settings/locations",
    title: "근무지 관리",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "66:8153",
  },
  {
    screenId: "SET-03",
    href: "/settings/rules",
    title: "운영/정산 기준",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "66:9305",
  },
  {
    screenId: "SET-04",
    href: "/settings/notifications",
    title: "알림 설정",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "66:9792",
  },
  {
    screenId: "SET-05",
    href: "/settings/billing",
    title: "요금제/결제",
    figmaBacked: true,
    status: "figma-backed",
    authoritativeFrameId: "66:10190",
  },
  {
    screenId: "AUTH-01",
    href: "/login",
    title: "로그인",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No entry/auth Figma frame found in register.",
  },
  {
    screenId: "AUTH-02",
    href: "/signup",
    title: "회원가입",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No entry/auth Figma frame found in register.",
  },
  {
    screenId: "AUTH-03",
    href: "/forgot-password",
    title: "비밀번호 찾기",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No entry/auth Figma frame found in register.",
  },
  {
    screenId: "ONB-01",
    href: "/onboarding/workspace",
    title: "사업장 생성",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No entry/onboarding Figma frame found in register.",
  },
  {
    screenId: "ONB-02",
    href: "/onboarding/setup",
    title: "초기 설정 가이드",
    figmaBacked: false,
    status: "deferred",
    deferredReason: "No entry/onboarding Figma frame found in register.",
  },
];

export const adminScreens: Record<string, AdminScreen> = {
  "/dashboard": {
    href: "/dashboard",
    screenId: "DSH-01",
    title: "운영 인박스",
    description: "승인, 이상 감지, 정산 이슈를 우선순위대로 모아 봅니다.",
    metrics: [
      { label: "승인 대기", value: "12", unit: "건", tag: "오늘", tone: "orange" },
      { label: "이상 감지", value: "4", unit: "건", tag: "확인 필요", tone: "red" },
      { label: "정산 확인", value: "8", unit: "건", tag: "이번 주", tone: "blue" },
    ],
    tableTitle: "최근 운영 항목",
    tableColumns: ["유형", "대상", "상태", "갱신"],
    tableRows: [
      ["근무 승인", "강남 1관 · 박서연", "검토 대기", "10분 전"],
      ["이상 감지", "본관 · 이민재", "관리자 확인", "24분 전"],
      ["급여 산정", "5월 1주차", "초안 생성", "1시간 전"],
    ],
  },
  "/dashboard/locations": {
    href: "/dashboard/locations",
    screenId: "DSH-02",
    title: "근무지별 대시보드",
    description: "근무지 단위로 출근, 결근, 승인 대기 현황을 비교합니다.",
    metrics: [
      { label: "활성 근무지", value: "5", unit: "곳", tag: "운영 중" },
      { label: "출근율", value: "94", unit: "%", tag: "오늘", tone: "blue" },
      { label: "대기 승인", value: "7", unit: "건", tag: "근무지별", tone: "orange" },
    ],
    tableTitle: "근무지 현황",
    tableColumns: ["근무지", "출근", "결근", "승인 대기"],
    tableRows: [
      ["본관", "18명", "1명", "3건"],
      ["강남 1관", "12명", "0명", "2건"],
      ["서초관", "9명", "1명", "2건"],
    ],
  },
  "/dashboard/workers": {
    href: "/dashboard/workers",
    screenId: "DSH-03",
    title: "근무자별 대시보드",
    description: "근무자별 예정 근무, 누적 시간, 예외 항목을 확인합니다.",
    metrics: [
      { label: "활성 조교", value: "37", unit: "명", tag: "전체" },
      { label: "시간 초과", value: "3", unit: "명", tag: "주의", tone: "orange" },
      { label: "미확인 기록", value: "5", unit: "건", tag: "오늘", tone: "red" },
    ],
    tableTitle: "근무자 요약",
    tableColumns: ["근무자", "오늘 근무", "누적 시간", "상태"],
    tableRows: [
      ["김민채", "14:00-18:00", "22시간", "정상"],
      ["박서연", "16:00-21:00", "28시간", "시간 초과"],
      ["이민재", "휴무", "18시간", "기록 확인"],
    ],
  },
  "/dashboard/ai-monitoring": {
    href: "/dashboard/ai-monitoring",
    screenId: "DSH-04",
    title: "AI 이상탐지 ∙ 모니터링",
    description: "출퇴근 기록과 근무 패턴에서 감지된 예외를 추적합니다.",
    metrics: [
      { label: "신규 탐지", value: "4", unit: "건", tag: "오늘", tone: "red" },
      { label: "처리 완료", value: "16", unit: "건", tag: "7일", tone: "green" },
      { label: "정확도", value: "91", unit: "%", tag: "최근", tone: "blue" },
    ],
    tableTitle: "탐지 큐",
    tableColumns: ["유형", "대상", "신뢰도", "상태"],
    tableRows: [
      ["위치 이탈", "본관 · 이민재", "높음", "확인 필요"],
      ["시간 중복", "서초관 · 최윤아", "중간", "검토 중"],
      ["미퇴근", "강남 1관 · 박서연", "높음", "알림 발송"],
    ],
  },
  "/workers": {
    href: "/workers",
    screenId: "WKR-02",
    title: "조교 목록",
    description: "소속 조교의 근무 상태, 태그, 기본 정보를 관리합니다.",
    metrics: [
      { label: "활성 조교", value: "37", unit: "명", tag: "근무 가능" },
      { label: "소속 대기", value: "6", unit: "명", tag: "신청", tone: "orange" },
      { label: "비활성", value: "3", unit: "명", tag: "숨김", tone: "grey" },
    ],
    tableTitle: "조교 현황",
    tableColumns: ["이름", "근무지", "태그", "상태"],
    tableRows: [
      ["김민채", "본관", "관리자", "활성"],
      ["박서연", "강남 1관", "수학", "활성"],
      ["이민재", "서초관", "신규", "확인 필요"],
    ],
  },
  "/workers/applications": {
    href: "/workers/applications",
    screenId: "WKR-01",
    title: "소속 신청",
    description: "새로 들어온 조교 소속 신청을 승인하거나 반려합니다.",
    metrics: [
      { label: "대기 신청", value: "6", unit: "건", tag: "신규", tone: "orange" },
      { label: "승인 완료", value: "11", unit: "건", tag: "이번 주" },
      { label: "반려", value: "1", unit: "건", tag: "이번 주", tone: "red" },
    ],
    tableTitle: "신청 큐",
    tableColumns: ["신청자", "희망 근무지", "신청일", "상태"],
    tableRows: [
      ["정하린", "본관", "05.10", "대기"],
      ["오지후", "강남 1관", "05.10", "대기"],
      ["한서준", "서초관", "05.09", "검토 중"],
    ],
  },
  "/workers/tags": {
    href: "/workers/tags",
    screenId: "WKR-06",
    title: "근무자 태그 관리",
    description: "조교 분류와 필터링에 쓰는 태그를 정리합니다.",
    metrics: [
      { label: "사용 태그", value: "14", unit: "개", tag: "전체" },
      { label: "미사용", value: "2", unit: "개", tag: "정리", tone: "grey" },
      { label: "자동 부여", value: "5", unit: "개", tag: "규칙" },
    ],
    tableTitle: "태그 목록",
    tableColumns: ["태그", "대상 수", "색상", "상태"],
    tableRows: [
      ["관리자", "3명", "Green", "사용 중"],
      ["신규", "6명", "Blue", "사용 중"],
      ["장기 휴무", "2명", "Grey", "사용 중"],
    ],
  },
  "/schedule": {
    href: "/schedule",
    screenId: "SCH-01",
    title: "승인 대기",
    description: "근무 신청과 시간표 변경 요청을 검토합니다.",
    metrics: [
      { label: "승인 대기", value: "12", unit: "건", tag: "전체", tone: "orange" },
      { label: "긴급 변경", value: "2", unit: "건", tag: "오늘", tone: "red" },
      { label: "승인 완료", value: "28", unit: "건", tag: "이번 주" },
    ],
    tableTitle: "승인 요청",
    tableColumns: ["요청", "근무자", "시간", "상태"],
    tableRows: [
      ["신규 근무", "박서연", "05.10 16:00", "대기"],
      ["시간 변경", "김민채", "05.11 14:00", "검토 중"],
      ["대체 근무", "최윤아", "05.12 18:00", "대기"],
    ],
  },
  "/schedule/timeline": {
    href: "/schedule/timeline",
    screenId: "SCH-02",
    title: "전체 시간표 타임라인",
    description: "근무지와 근무자 기준으로 전체 시간표를 훑어봅니다.",
    metrics: [
      { label: "오늘 근무", value: "46", unit: "건", tag: "예정" },
      { label: "빈 슬롯", value: "3", unit: "개", tag: "채움 필요", tone: "red" },
      { label: "변경 요청", value: "9", unit: "건", tag: "이번 주", tone: "orange" },
    ],
    tableTitle: "시간표 스냅샷",
    tableColumns: ["시간", "본관", "강남 1관", "서초관"],
    tableRows: [
      ["14:00", "김민채", "박서연", "미배정"],
      ["16:00", "이민재", "오지후", "최윤아"],
      ["18:00", "정하린", "미배정", "한서준"],
    ],
  },
  "/schedule/duties": {
    href: "/schedule/duties",
    screenId: "DUT-01",
    title: "근무 목록",
    description: "근무 단위의 상태와 배정 정보를 확인합니다.",
    metrics: [
      { label: "진행 중", value: "18", unit: "건", tag: "현재" },
      { label: "예정", value: "44", unit: "건", tag: "오늘" },
      { label: "취소", value: "2", unit: "건", tag: "이번 주", tone: "grey" },
    ],
    tableTitle: "근무 목록",
    tableColumns: ["근무명", "근무지", "담당", "상태"],
    tableRows: [
      ["자습실 감독", "본관", "김민채", "진행 중"],
      ["질문 응대", "강남 1관", "박서연", "예정"],
      ["마감 정리", "서초관", "이민재", "예정"],
    ],
  },
  "/schedule/duty-tags": {
    href: "/schedule/duty-tags",
    screenId: "DUT-03",
    title: "근무 태그 관리",
    description: "근무 유형별 태그를 만들고 정리합니다.",
    metrics: [
      { label: "근무 태그", value: "9", unit: "개", tag: "전체" },
      { label: "필수 태그", value: "4", unit: "개", tag: "규칙" },
      { label: "미사용", value: "1", unit: "개", tag: "정리", tone: "grey" },
    ],
    tableTitle: "근무 태그",
    tableColumns: ["태그", "근무 수", "색상", "상태"],
    tableRows: [
      ["자습실", "18건", "Green", "사용 중"],
      ["상담 보조", "7건", "Blue", "사용 중"],
      ["마감", "12건", "Grey", "사용 중"],
    ],
  },
  "/records": {
    href: "/records",
    screenId: "REC-01",
    title: "근무기록",
    description: "출퇴근과 근무 완료 기록을 조회하고 보정합니다.",
    metrics: [
      { label: "오늘 기록", value: "42", unit: "건", tag: "수집" },
      { label: "누락", value: "3", unit: "건", tag: "확인", tone: "red" },
      { label: "보정", value: "5", unit: "건", tag: "이번 주", tone: "orange" },
    ],
    tableTitle: "근무기록",
    tableColumns: ["근무자", "출근", "퇴근", "상태"],
    tableRows: [
      ["김민채", "13:58", "18:02", "완료"],
      ["박서연", "15:57", "-", "근무 중"],
      ["이민재", "-", "20:01", "출근 누락"],
    ],
  },
  "/records/anomaly-history": {
    href: "/records/anomaly-history",
    screenId: "REC-02",
    title: "이상감지처리 이력",
    description: "감지된 예외의 처리 결과와 담당자를 확인합니다.",
    metrics: [
      { label: "처리 대기", value: "4", unit: "건", tag: "현재", tone: "red" },
      { label: "처리 완료", value: "19", unit: "건", tag: "7일" },
      { label: "오탐", value: "2", unit: "건", tag: "7일", tone: "grey" },
    ],
    tableTitle: "처리 이력",
    tableColumns: ["유형", "대상", "담당", "결과"],
    tableRows: [
      ["미퇴근", "박서연", "김민채", "알림 발송"],
      ["위치 이탈", "이민재", "김민채", "확인 중"],
      ["시간 중복", "최윤아", "오지후", "보정 완료"],
    ],
  },
  "/records/corrections": {
    href: "/records/corrections",
    screenId: "REC-03",
    title: "이의신청 이력",
    description: "근무기록 이의신청의 접수, 검토, 처리 상태를 봅니다.",
    metrics: [
      { label: "신규 접수", value: "2", unit: "건", tag: "오늘", tone: "orange" },
      { label: "검토 중", value: "5", unit: "건", tag: "전체" },
      { label: "완료", value: "14", unit: "건", tag: "이번 달" },
    ],
    tableTitle: "이의신청",
    tableColumns: ["신청자", "기록일", "사유", "상태"],
    tableRows: [
      ["박서연", "05.08", "퇴근 누락", "검토 중"],
      ["최윤아", "05.07", "시간 오류", "승인"],
      ["한서준", "05.05", "근무지 오류", "반려"],
    ],
  },
  "/records/attendance": {
    href: "/records/attendance",
    screenId: "REC-04",
    title: "출퇴근 이력",
    description: "위치와 시간 기준으로 출퇴근 이벤트를 확인합니다.",
    metrics: [
      { label: "출근 이벤트", value: "51", unit: "건", tag: "오늘" },
      { label: "퇴근 이벤트", value: "38", unit: "건", tag: "오늘" },
      { label: "위치 예외", value: "2", unit: "건", tag: "확인", tone: "red" },
    ],
    tableTitle: "출퇴근 이벤트",
    tableColumns: ["근무자", "구분", "시각", "위치"],
    tableRows: [
      ["김민채", "출근", "13:58", "본관"],
      ["박서연", "출근", "15:57", "강남 1관"],
      ["이민재", "퇴근", "20:01", "서초관"],
    ],
  },
  "/payroll": {
    href: "/payroll",
    screenId: "PAY-01",
    title: "급여 산정",
    description: "근무기록을 바탕으로 급여 초안을 산정합니다.",
    metrics: [
      { label: "산정 대상", value: "37", unit: "명", tag: "5월" },
      { label: "검토 필요", value: "8", unit: "건", tag: "기록", tone: "orange" },
      { label: "예상 지급액", value: "12.8", unit: "M", tag: "원", tone: "blue" },
    ],
    tableTitle: "급여 산정",
    tableColumns: ["근무자", "근무 시간", "산정액", "상태"],
    tableRows: [
      ["김민채", "42시간", "504,000원", "확정 가능"],
      ["박서연", "38시간", "456,000원", "기록 확인"],
      ["이민재", "31시간", "372,000원", "확정 가능"],
    ],
  },
  "/payroll/statements": {
    href: "/payroll/statements",
    screenId: "PAY-02",
    title: "급여 명세",
    description: "확정된 급여 명세의 발행과 열람 상태를 관리합니다.",
    metrics: [
      { label: "발행 대기", value: "12", unit: "건", tag: "이번 달", tone: "orange" },
      { label: "발행 완료", value: "25", unit: "건", tag: "이번 달" },
      { label: "열람", value: "19", unit: "건", tag: "조교" },
    ],
    tableTitle: "급여 명세",
    tableColumns: ["기간", "대상", "지급액", "상태"],
    tableRows: [
      ["2026.05 1주", "김민채", "504,000원", "발행 완료"],
      ["2026.05 1주", "박서연", "456,000원", "검토 필요"],
      ["2026.05 1주", "이민재", "372,000원", "발행 대기"],
    ],
  },
  "/handover": {
    href: "/handover",
    screenId: "HO-01",
    title: "문서 편집",
    description: "근무지 운영 문서와 인수인계 내용을 관리합니다.",
    metrics: [
      { label: "활성 문서", value: "8", unit: "개", tag: "전체" },
      { label: "AI 초안", value: "3", unit: "개", tag: "검토", tone: "green" },
      { label: "미확인 변경", value: "5", unit: "건", tag: "오늘", tone: "orange" },
    ],
    tableTitle: "최근 문서",
    tableColumns: ["문서", "근무지", "수정자", "상태"],
    tableRows: [
      ["본관 마감 절차", "본관", "김민채", "게시"],
      ["질문 응대 규칙", "강남 1관", "박서연", "검토"],
      ["서초관 공지", "서초관", "이민재", "초안"],
    ],
  },
  "/settings": {
    href: "/settings",
    screenId: "SET-01",
    title: "사업장 일반",
    description: "사업장 기본 정보와 관리자 프로필을 설정합니다.",
    metrics: [
      { label: "운영 사업장", value: "1", unit: "개", tag: "활성" },
      { label: "관리자", value: "3", unit: "명", tag: "권한" },
      { label: "미완료 설정", value: "2", unit: "개", tag: "확인", tone: "orange" },
    ],
    tableTitle: "기본 설정",
    tableColumns: ["항목", "값", "담당", "상태"],
    tableRows: [
      ["사업장명", "Wee 학원", "김민채", "완료"],
      ["대표 연락처", "02-0000-0000", "김민채", "완료"],
      ["운영 시간", "14:00-22:00", "오지후", "확인"],
    ],
  },
  "/settings/locations": {
    href: "/settings/locations",
    screenId: "SET-02",
    title: "근무지 관리",
    description: "근무지 위치, 운영 상태, 출퇴근 기준을 설정합니다.",
    metrics: [
      { label: "근무지", value: "5", unit: "곳", tag: "전체" },
      { label: "활성", value: "4", unit: "곳", tag: "운영" },
      { label: "점검", value: "1", unit: "곳", tag: "위치", tone: "orange" },
    ],
    tableTitle: "근무지",
    tableColumns: ["근무지", "주소", "반경", "상태"],
    tableRows: [
      ["본관", "서울 서초구", "100m", "활성"],
      ["강남 1관", "서울 강남구", "120m", "활성"],
      ["서초관", "서울 서초구", "80m", "점검"],
    ],
  },
  "/settings/rules": {
    href: "/settings/rules",
    screenId: "SET-03",
    title: "운영/정산 기준",
    description: "근무 승인, 시급, 정산 규칙을 정의합니다.",
    metrics: [
      { label: "정산 규칙", value: "6", unit: "개", tag: "활성" },
      { label: "승인 규칙", value: "4", unit: "개", tag: "활성" },
      { label: "검토 필요", value: "1", unit: "개", tag: "변경", tone: "orange" },
    ],
    tableTitle: "운영 기준",
    tableColumns: ["규칙", "값", "적용", "상태"],
    tableRows: [
      ["기본 시급", "12,000원", "전체", "활성"],
      ["야간 가산", "1.5배", "22시 이후", "활성"],
      ["자동 승인", "30분 이내", "대체 근무", "검토"],
    ],
  },
  "/settings/notifications": {
    href: "/settings/notifications",
    screenId: "SET-04",
    title: "알림 설정",
    description: "관리자와 조교에게 발송되는 알림 규칙을 설정합니다.",
    metrics: [
      { label: "관리자 알림", value: "7", unit: "개", tag: "활성" },
      { label: "조교 알림", value: "9", unit: "개", tag: "활성" },
      { label: "실패", value: "1", unit: "건", tag: "오늘", tone: "red" },
    ],
    tableTitle: "알림 규칙",
    tableColumns: ["알림", "대상", "채널", "상태"],
    tableRows: [
      ["승인 요청", "관리자", "앱", "활성"],
      ["근무 시작", "조교", "푸시", "활성"],
      ["급여 명세", "조교", "앱", "점검"],
    ],
  },
  "/settings/billing": {
    href: "/settings/billing",
    screenId: "SET-05",
    title: "요금제/결제",
    description: "요금제, 결제 수단, 청구 이력을 관리합니다.",
    metrics: [
      { label: "요금제", value: "Pro", unit: "", tag: "활성" },
      { label: "다음 결제", value: "21", unit: "일", tag: "남음", tone: "blue" },
      { label: "청구서", value: "5", unit: "건", tag: "이력" },
    ],
    tableTitle: "청구 이력",
    tableColumns: ["기간", "금액", "결제 수단", "상태"],
    tableRows: [
      ["2026.05", "99,000원", "카드 1234", "예정"],
      ["2026.04", "99,000원", "카드 1234", "완료"],
      ["2026.03", "99,000원", "카드 1234", "완료"],
    ],
  },
};

export function findSectionByPath(pathname: string) {
  return (
    adminSections.find(
      (section) =>
        pathname === section.href || pathname.startsWith(`${section.href}/`),
    ) ?? adminSections[0]
  );
}

export function findScreenByHref(href: string) {
  return adminScreens[href];
}

export function findRouteMetaByHref(href: string) {
  return adminRouteRegistry.find(
    (route) => route.href === href || route.sampleHref === href,
  );
}
