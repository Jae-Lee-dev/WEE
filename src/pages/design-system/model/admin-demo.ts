export const demoWorkspace = {
  name: "김쌤 수학학원",
  code: "WEE-ABC123",
  managerName: "김민채",
  managerRole: "관리자",
} as const;

export const demoLocations = [
  { id: "location_daechi_a", name: "대치 A학원", shortName: "대치 A" },
  { id: "location_gangnam_b", name: "강남 B학원", shortName: "강남 B" },
  { id: "location_jamsil_c", name: "잠실 C학원", shortName: "잠실 C" },
  { id: "location_songpa_e", name: "송파 E학원", shortName: "송파 E" },
] as const;

export const demoWorkers = [
  {
    id: "worker_kim_seoyeon",
    name: "김서연",
    phone: "010-1200-3400",
    tag: "베테랑",
    payroll: "시급 ₩10,000",
    status: "활성",
  },
  {
    id: "worker_lee_haeun",
    name: "이하은",
    phone: "010-4411-1290",
    tag: "신입",
    payroll: "시급 ₩8,500",
    status: "활성",
  },
  {
    id: "worker_kang_taewoo",
    name: "강태우",
    phone: "010-8810-2254",
    tag: "유의대상",
    payroll: "월급 ₩800,000",
    status: "비활성",
  },
] as const;

export const demoInboxItems = [
  {
    id: "inbox_affiliation_kim",
    type: "소속 신청 대기",
    target: "김서연",
    location: "대치 A학원",
    description: "신규 조교 승인 필요",
    date: "04.15",
    status: "신청 확인",
  },
  {
    id: "inbox_schedule_lee",
    type: "시간표 승인 대기",
    target: "이하은",
    location: "잠실 C학원",
    description: "수학 A반 시간표 변경",
    date: "04.15",
    status: "승인 대기",
  },
  {
    id: "inbox_anomaly_song",
    type: "이상 플래그 미처리",
    target: "송현우",
    location: "대치 A학원",
    description: "위치 이상 확인 필요",
    date: "04.14",
    status: "미처리",
  },
] as const;

export const foundationMetrics = [
  { label: "소속 신청", value: "6", unit: "개", tag: "승인 대기", tone: "orange" },
  { label: "시간표 승인", value: "12", unit: "건", tag: "검토 필요", tone: "orange" },
  { label: "이상 플래그", value: "4", unit: "건", tag: "미처리", tone: "red" },
] as const;

