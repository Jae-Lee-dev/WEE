import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  workerDetailProfile,
  type WorkerDetailProfile,
} from "../model/worker-detail-common-fixtures";
import {
  workerDetailBasicFixture,
  type BasicInfoRow,
  type WorkerDetailBasicFixture,
  type PayrollSettingRow,
} from "../model/worker-detail-basic-fixtures";

export type WorkerDetailBasicData = {
  fixture: WorkerDetailBasicFixture;
  profile: WorkerDetailProfile;
};

export type WorkerDetailBasicDataSource = {
  initialData?: WorkerDetailBasicData;
  getWorkerDetail: (workerId: string) => Promise<WorkerDetailBasicData>;
};

type PayrollSetting = {
  createdAt: Date | null;
  effectiveFrom: string;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  status: string;
  taxRatePercent: number | null;
  taxType: string;
  workerId: string;
};

type WorkerTagDocument = {
  id: string;
  label: string;
  status: string;
};

const fixtureWorkerDetailBasicData = {
  fixture: workerDetailBasicFixture,
  profile: workerDetailProfile,
} as const satisfies WorkerDetailBasicData;

export function createWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createFixtureWorkerDetailBasicDataSource();
  }

  return createFirestoreWorkerDetailBasicDataSource();
}

function createFixtureWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  return {
    initialData: fixtureWorkerDetailBasicData,
    async getWorkerDetail() {
      return fixtureWorkerDetailBasicData;
    },
  };
}

function createFirestoreWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  return {
    async getWorkerDetail(workerId) {
      const workspaceId = await requireActiveWorkspaceId();
      const [workerSnapshot, payrollSettingsSnapshot, workerTagsSnapshot] =
        await Promise.all([
          getDoc(doc(getFirebaseDb(), "workspaces", workspaceId, "workers", workerId)),
          getDocs(getPayrollSettingsCollection(workspaceId)),
          getDocs(getWorkerTagsCollection(workspaceId)),
        ]);

      if (!workerSnapshot.exists()) {
        throw new Error("조교 정보를 찾을 수 없습니다.");
      }

      const workerData = workerSnapshot.data();
      const workerTags = workerTagsSnapshot.docs
        .map(mapWorkerTagDocument)
        .filter((tag) => tag.status !== "deleted");
      const tagById = new Map(workerTags.map((tag) => [tag.id, tag]));
      const payrollSetting = payrollSettingsSnapshot.docs
        .map(mapPayrollSettingDocument)
        .filter(
          (setting): setting is PayrollSetting =>
            setting !== null && setting.workerId === workerId,
        )
        .sort(comparePayrollSettings)[0];

      return mapWorkerDetail(workerData, tagById, payrollSetting);
    },
  };
}

function mapWorkerDetail(
  data: DocumentData,
  tagById: ReadonlyMap<string, WorkerTagDocument>,
  payrollSetting: PayrollSetting | undefined,
): WorkerDetailBasicData {
  const name = readString(data.name, readString(data.displayName, "이름 없는 조교"));
  const status = readWorkerStatus(data);
  const tagLabel = readWorkerTagLabel(data, tagById);
  const registeredAt = readRegisteredAtLabel(data);
  const phone = readString(data.contact, readString(data.phone, "-"));
  const email = readString(data.email, "-");
  const account = readAccountLabel(data.account);
  const paySummary = readProfilePaySummary(payrollSetting);
  const payrollRows = createPayrollRows(payrollSetting);

  return {
    fixture: {
      ...workerDetailBasicFixture,
      personalRows: [
        { id: "name", label: "이름", value: name },
        { id: "phone", label: "연락처", value: phone },
        {
          id: "status",
          label: "소속 상태",
          value: status,
          kind: "badge",
          tone: status === "활성" ? "green" : "grey",
        },
        {
          id: "tag",
          label: "근무자 태그",
          value: tagLabel,
          kind: "badge",
          tone: "grey",
        },
        { id: "registeredAt", label: "등록일", value: registeredAt },
        { id: "email", label: "이메일", value: email },
        { id: "account", label: "계좌", value: account },
      ] satisfies readonly BasicInfoRow[],
      payrollRows,
      editDialog: {
        ...workerDetailBasicFixture.editDialog,
        fields: [
          { id: "name", label: "이름", value: name, layout: "full" },
          { id: "phone", label: "연락처", value: phone, layout: "full" },
          {
            id: "registeredAt",
            label: "등록일",
            value: registeredAt,
            layout: "half",
          },
          { id: "status", label: "소속 상태", value: status, layout: "half" },
        ],
        tagValue: tagLabel,
      },
      deleteBlockedDialog: {
        ...workerDetailBasicFixture.deleteBlockedDialog,
        description: [
          `${name} 님은 다음 항목이 남아 있어 삭제할 수 없습니다.`,
          "하단 항목을 모두 처리한 뒤 다시 시도해 주세요.",
        ],
      },
    },
    profile: {
      name,
      tag: tagLabel,
      status,
      paySummary,
      registeredSummary: `${registeredAt} 등록`,
      monthlySummary: readString(data.monthlySummary, "당월 근무시간 집계 전"),
      deleteLabel: workerDetailProfile.deleteLabel,
    },
  };
}

function createPayrollRows(
  setting: PayrollSetting | undefined,
): readonly PayrollSettingRow[] {
  if (!setting) {
    return [
      { id: "payType", label: "급여 타입", value: "미설정" },
      { id: "rate", label: "단가", value: "급여 미설정" },
      { id: "tax", label: "세율", value: "미설정" },
      { id: "effectiveFrom", label: "적용 시작", value: "-" },
    ];
  }

  return [
    { id: "payType", label: "급여 타입", value: readPayrollTypeLabel(setting) },
    { id: "rate", label: "단가", value: readPayrollRateLabel(setting) },
    { id: "tax", label: "세율", value: readTaxLabel(setting) },
    {
      id: "effectiveFrom",
      label: "적용 시작",
      value: formatDateStringLabel(setting.effectiveFrom, "-"),
    },
  ];
}

function getPayrollSettingsCollection(workspaceId: string) {
  return collection(
    getFirebaseDb(),
    "workspaces",
    workspaceId,
    "payrollSettings",
  );
}

function getWorkerTagsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workerTags");
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseVisualMockDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function mapWorkerTagDocument(
  snapshot: QueryDocumentSnapshot<unknown, DocumentData>,
): WorkerTagDocument {
  const data = snapshot.data() as DocumentData;

  return {
    id: snapshot.id,
    label: readString(data.name, readString(data.label, "태그 없음")),
    status: readString(data.status, "active"),
  };
}

function mapPayrollSettingDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): PayrollSetting | null {
  const data = snapshot.data();
  const workerId = readString(data.workerId, "");

  if (!workerId) {
    return null;
  }

  return {
    createdAt: readDate(data.createdAt),
    effectiveFrom: readString(data.effectiveFrom, ""),
    hourlyRate:
      readOptionalNumber(data.hourlyRate) ??
      readOptionalNumber(data.baseHourlyRate) ??
      readOptionalNumber(data.hourlyWage),
    monthlySalary:
      readOptionalNumber(data.monthlySalary) ??
      readOptionalNumber(data.monthlyPay),
    payrollType: readString(data.payrollType, ""),
    status: readString(data.status, "active"),
    taxRatePercent: readOptionalNumber(data.taxRatePercent),
    taxType: readString(data.taxType, ""),
    workerId,
  };
}

function readWorkerStatus(data: DocumentData) {
  const status = readString(data.status, "");
  const membershipStatus = readString(data.membershipStatus, "");

  if (status === "active" || membershipStatus === "approved") {
    return "활성";
  }

  if (status === "pending" || membershipStatus === "pending") {
    return "대기";
  }

  return "비활성";
}

function readWorkerTagLabel(
  data: DocumentData,
  tagById: ReadonlyMap<string, WorkerTagDocument>,
) {
  const tagIds = readStringArray(data.tagIds);
  const tagFromId = tagIds
    .map((tagId) => tagById.get(tagId))
    .find((tag): tag is WorkerTagDocument => Boolean(tag));

  if (tagFromId) {
    return tagFromId.label;
  }

  const tags = readStringArray(data.tags);

  return tags[0] ?? readString(data.tagName, "미지정");
}

function readRegisteredAtLabel(data: DocumentData) {
  return formatDateLabel(
    readDate(data.approvedAt) ??
      readDate(data.registeredAt) ??
      readDate(data.createdAt) ??
      readDate(data.appliedAt),
    "-",
  );
}

function readAccountLabel(value: unknown) {
  if (!value || typeof value !== "object") {
    return "-";
  }

  const account = value as Record<string, unknown>;
  const bankName = readString(account.bankName, "");
  const number =
    readString(account.number, "") ||
    readString(account.accountNumber, "") ||
    readString(account.bankAccountNumber, "");
  const numberLast4 = readString(account.numberLast4, "");

  if (bankName && number) {
    return `${bankName} ${number}`;
  }

  if (bankName && numberLast4) {
    return `${bankName} ****${numberLast4}`;
  }

  return bankName || number || "-";
}

function readProfilePaySummary(setting: PayrollSetting | undefined) {
  if (!setting) {
    return "급여 미설정";
  }

  if (setting.payrollType === "monthly" || setting.monthlySalary !== null) {
    return setting.monthlySalary !== null
      ? `월급 ${formatWon(setting.monthlySalary)}`
      : "월급 미설정";
  }

  return setting.hourlyRate !== null
    ? `시급 ${formatWon(setting.hourlyRate)}`
    : "시급 미설정";
}

function readPayrollTypeLabel(setting: PayrollSetting) {
  return setting.payrollType === "monthly" || setting.monthlySalary !== null
    ? "월급"
    : "시급";
}

function readPayrollRateLabel(setting: PayrollSetting) {
  if (setting.payrollType === "monthly" || setting.monthlySalary !== null) {
    return setting.monthlySalary !== null
      ? `${formatWon(setting.monthlySalary)} / 월`
      : "월급 미설정";
  }

  return setting.hourlyRate !== null
    ? `${formatWon(setting.hourlyRate)} / 시간`
    : "시급 미설정";
}

function readTaxLabel(setting: PayrollSetting) {
  if (setting.taxRatePercent !== null) {
    return `${setting.taxRatePercent}%`;
  }

  return setting.taxType === "none" ? "비과세" : "미설정";
}

function comparePayrollSettings(left: PayrollSetting, right: PayrollSetting) {
  const leftActive = left.status === "active" ? 1 : 0;
  const rightActive = right.status === "active" ? 1 : 0;

  if (leftActive !== rightActive) {
    return rightActive - leftActive;
  }

  const effectiveFromCompare = right.effectiveFrom.localeCompare(
    left.effectiveFrom,
  );

  if (effectiveFromCompare !== 0) {
    return effectiveFromCompare;
  }

  return getDateTime(right.createdAt) - getDateTime(left.createdAt);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if ("toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    const nanoseconds =
      "nanoseconds" in value && typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : 0;

    return new Date(value.seconds * 1000 + Math.floor(nanoseconds / 1000000));
  }

  return null;
}

function formatDateLabel(date: Date | null, fallback: string) {
  if (!date) {
    return fallback;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  const year = partByType.get("year");
  const month = partByType.get("month");
  const day = partByType.get("day");

  return year && month && day ? `${year}.${month}.${day}` : fallback;
}

function formatDateStringLabel(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00+09:00`);

  return Number.isNaN(date.getTime()) ? value : formatDateLabel(date, fallback);
}

function formatWon(value: number) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}

function getDateTime(date: Date | null) {
  return date?.getTime() ?? 0;
}
