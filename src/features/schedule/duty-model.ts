import type {
  DutyAssignedWorker,
  DutyListRow,
  DutyStatus,
  DutyTag,
  DutyTone,
  DutyWeekday,
} from "./duty-fixtures";

export type DutyLocationOption = {
  id: string;
  label: string;
};

export type DutyFormState = {
  name: string;
  tagText: string;
  locationId: string;
  weekday: DutyWeekday | "";
  startTime: string;
  endTime: string;
  operationStartDate: string;
  operationEndDate: string;
};

export type DutyFormField = keyof DutyFormState;

export type DutyFormErrors = Partial<Record<DutyFormField, string>>;

export type CreateDutyInput = {
  name: string;
  nameKey: string;
  tags: readonly string[];
  locationId: string;
  locationName: string;
  weekday: DutyWeekday;
  startTime: string;
  endTime: string;
  operationStartDate: string | null;
  operationEndDate: string | null;
};

export type StoredDuty = CreateDutyInput & {
  id: string;
  assignedWorkerCount: number;
  assignedWorkers?: readonly DutyAssignedWorker[];
  manualStatus: "active" | "inactive";
};

const weekdayLabels: Record<DutyWeekday, string> = {
  월: "월요일",
  화: "화요일",
  수: "수요일",
  목: "목요일",
  금: "금요일",
  토: "토요일",
  일: "일요일",
};

const weekdayByDateIndex: DutyWeekday[] = ["일", "월", "화", "수", "목", "금", "토"];
const dutyTones: DutyTone[] = ["green", "orange", "red", "blue"];

export const initialDutyForm: DutyFormState = {
  name: "",
  tagText: "",
  locationId: "",
  weekday: "",
  startTime: "",
  endTime: "",
  operationStartDate: "",
  operationEndDate: "",
};

export function getDutyFormErrors(
  form: DutyFormState,
  locations: readonly DutyLocationOption[],
): DutyFormErrors {
  const errors: DutyFormErrors = {};
  const name = normalizeDutyText(form.name);
  const hasOperationStart = Boolean(form.operationStartDate);
  const hasOperationEnd = Boolean(form.operationEndDate);

  if (!name) {
    errors.name = "근무 이름을 입력해 주세요.";
  }

  if (!form.locationId) {
    errors.locationId =
      locations.length > 0
        ? "근무지를 선택해 주세요."
        : "근무지를 먼저 등록해 주세요.";
  } else if (!locations.some((location) => location.id === form.locationId)) {
    errors.locationId = "등록된 근무지 중에서 선택해 주세요.";
  }

  if (!form.weekday) {
    errors.weekday = "요일을 선택해 주세요.";
  }

  if (!form.startTime) {
    errors.startTime = "시작 시간을 입력해 주세요.";
  }

  if (!form.endTime) {
    errors.endTime = "종료 시간을 입력해 주세요.";
  }

  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    errors.endTime = "종료 시간은 시작 시간보다 뒤여야 합니다.";
  }

  if (hasOperationStart && !hasOperationEnd) {
    errors.operationEndDate = "운영 종료일을 입력해 주세요.";
  }

  if (!hasOperationStart && hasOperationEnd) {
    errors.operationStartDate = "운영 시작일을 입력해 주세요.";
  }

  if (hasOperationStart && hasOperationEnd) {
    const startDate = parseLocalDate(form.operationStartDate);
    const endDate = parseLocalDate(form.operationEndDate);

    if (!startDate || !endDate) {
      errors.operationStartDate = "운영 기간 날짜를 확인해 주세요.";
    } else if (endDate.time < startDate.time) {
      errors.operationEndDate = "운영 종료일은 시작일 이후여야 합니다.";
    } else if (startDate.weekday !== endDate.weekday) {
      errors.operationEndDate = "운영 종료일은 시작일과 같은 요일이어야 합니다.";
    } else if (
      form.weekday &&
      startDate.weekday !== form.weekday
    ) {
      errors.operationStartDate = "운영 시작일은 선택한 요일과 같아야 합니다.";
    }
  }

  return errors;
}

export function hasDutyFormErrors(errors: DutyFormErrors) {
  return Object.keys(errors).length > 0;
}

export function toCreateDutyInput(
  form: DutyFormState,
  locations: readonly DutyLocationOption[],
): CreateDutyInput {
  const name = normalizeDutyText(form.name);
  const location = locations.find((option) => option.id === form.locationId);

  if (!location || !form.weekday) {
    throw new Error("근무 필수값을 확인할 수 없습니다.");
  }

  return {
    name,
    nameKey: createDutyNameKey(name),
    tags: parseDutyTags(form.tagText),
    locationId: location.id,
    locationName: location.label,
    weekday: form.weekday,
    startTime: form.startTime,
    endTime: form.endTime,
    operationStartDate: form.operationStartDate || null,
    operationEndDate: form.operationEndDate || null,
  };
}

export function createDutyListRow(duty: StoredDuty): DutyListRow {
  const status = resolveDutyStatus(duty);
  const time = `${duty.startTime}~${duty.endTime}`;

  return {
    id: duty.id,
    name: duty.name,
    location: duty.locationName,
    weekday: weekdayLabels[duty.weekday],
    time,
    status,
    statusTone: getStatusTone(status),
    operationPeriod: formatOperationPeriod(duty),
    operationCountText: formatOperationCount(duty),
    appliedWorkerCount: duty.assignedWorkerCount,
    appliedWorkerCountText: `할당 조교 ${duty.assignedWorkerCount}명`,
    tags: duty.tags.map((label) => createDutyTag(label)),
    tone: getDutyTone(duty.name),
    assignedWorkers: duty.assignedWorkers,
    timeRows: [
      {
        id: duty.id,
        weekday: duty.weekday,
        weekdayLabel: weekdayLabels[duty.weekday],
        startTime: duty.startTime,
        endTime: duty.endTime,
        time,
      },
    ],
  };
}

function resolveDutyStatus(duty: StoredDuty): DutyStatus {
  if (duty.manualStatus === "inactive") {
    return "비활성";
  }

  if (!duty.operationStartDate || !duty.operationEndDate) {
    return "상시";
  }

  const today = getTodayDateKey();

  if (today < duty.operationStartDate) {
    return "예정";
  }

  if (today > duty.operationEndDate) {
    return "만료";
  }

  return "운영중";
}

function formatOperationPeriod(duty: StoredDuty) {
  if (!duty.operationStartDate || !duty.operationEndDate) {
    return "상시";
  }

  return `${formatDateKey(duty.operationStartDate)}~${formatDateKey(
    duty.operationEndDate,
  )}`;
}

function formatOperationCount(duty: StoredDuty) {
  if (!duty.operationStartDate || !duty.operationEndDate) {
    return "반복 운영";
  }

  const count = calculateDutyOperationCount(
    duty.operationStartDate,
    duty.operationEndDate,
  );

  if (!count) {
    return "총 1회";
  }

  return `총 ${count}회`;
}

export function getDutyOperationCountText(
  operationStartDate: string,
  operationEndDate: string,
) {
  const count = calculateDutyOperationCount(operationStartDate, operationEndDate);

  return count ? `총 ${count}회 운영` : null;
}

export function calculateDutyOperationCount(
  operationStartDate: string,
  operationEndDate: string,
) {
  const startDate = parseLocalDate(operationStartDate);
  const endDate = parseLocalDate(operationEndDate);

  if (!startDate || !endDate || endDate.time < startDate.time) {
    return null;
  }

  if (startDate.weekday !== endDate.weekday) {
    return null;
  }

  const days = Math.round((endDate.time - startDate.time) / 86_400_000);

  return Math.floor(days / 7) + 1;
}

function getStatusTone(status: DutyStatus): DutyTone {
  if (status === "운영중") {
    return "green";
  }

  if (status === "예정") {
    return "blue";
  }

  if (status === "만료") {
    return "red";
  }

  return "grey";
}

function createDutyTag(label: string): DutyTag {
  return {
    id: `duty-tag-${createDutyNameKey(label)}`,
    label,
    tone: getDutyTone(label),
  };
}

function parseDutyTags(value: string) {
  return value
    .split(",")
    .map((tag) => normalizeDutyText(tag))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeDutyText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createDutyNameKey(value: string) {
  return normalizeDutyText(value).toLocaleLowerCase("ko-KR");
}

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const weekday = weekdayByDateIndex[new Date(time).getUTCDay()];

  return { time, weekday };
}

function formatDateKey(value: string) {
  return value.replaceAll("-", ".");
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDutyTone(seed: string): DutyTone {
  const hash = Array.from(seed).reduce(
    (current, char) => current + char.charCodeAt(0),
    0,
  );

  return dutyTones[hash % dutyTones.length] ?? "green";
}
