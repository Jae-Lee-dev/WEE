import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  writeBatch,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import { resolveFirebaseStorageDownloadUrl } from "@/shared/api/firebase";
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
  bankbookDownloadUrl: string | null;
  editValues: WorkerDetailBasicEditValues;
  fixture: WorkerDetailBasicFixture;
  profile: WorkerDetailProfile;
  tagOptions: readonly WorkerDetailTagOption[];
};

export type WorkerDetailPayrollType = "hourly" | "monthly";
export type WorkerDetailStatusValue = "active" | "inactive";
export type WorkerDetailTaxType = "custom" | "none";

export type WorkerDetailTagOption = {
  id: string;
  label: string;
};

export type WorkerDetailBasicEditValues = {
  contact: string;
  effectiveFrom: string;
  hourlyRate: number | null;
  monthlySalary: number | null;
  name: string;
  payrollType: WorkerDetailPayrollType;
  status: WorkerDetailStatusValue;
  tagIds: readonly string[];
  taxRatePercent: number | null;
  taxType: WorkerDetailTaxType;
};

export type WorkerDetailBasicSaveInput = WorkerDetailBasicEditValues;

export type WorkerDetailBasicDataSource = {
  initialData?: WorkerDetailBasicData;
  getWorkerDetail: (workerId: string) => Promise<WorkerDetailBasicData>;
  updateWorkerDetail: (
    workerId: string,
    input: WorkerDetailBasicSaveInput,
  ) => Promise<WorkerDetailBasicData>;
};

type PayrollSetting = {
  createdAt: Date | null;
  effectiveFrom: string;
  hourlyRate: number | null;
  id: string;
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
  bankbookDownloadUrl: "https://example.com/worker-kim-seoyeon-bankbook.png",
  editValues: {
    contact: "010-1200-3400",
    effectiveFrom: "2026-04-01",
    hourlyRate: 10000,
    monthlySalary: null,
    name: "김서연",
    payrollType: "hourly",
    status: "active",
    tagIds: ["veteran"],
    taxRatePercent: 3.3,
    taxType: "custom",
  },
  fixture: workerDetailBasicFixture,
  profile: workerDetailProfile,
  tagOptions: [{ id: "veteran", label: "베테랑" }],
} as const satisfies WorkerDetailBasicData;

export function createWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createFixtureWorkerDetailBasicDataSource();
  }

  return createFirestoreWorkerDetailBasicDataSource();
}

function createFixtureWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  let data: WorkerDetailBasicData = fixtureWorkerDetailBasicData;

  return {
    initialData: data,
    async getWorkerDetail() {
      return data;
    },
    async updateWorkerDetail(_workerId, input) {
      data = createWorkerDetailDataFromValues({
        bankbookDownloadUrl: data.bankbookDownloadUrl,
        input,
        tagOptions: data.tagOptions,
      });

      return data;
    },
  };
}

function createFirestoreWorkerDetailBasicDataSource(): WorkerDetailBasicDataSource {
  const dataSource: WorkerDetailBasicDataSource = {
    async getWorkerDetail(workerId) {
      const { payrollSetting, tagOptions, tagById, workerData } =
        await readWorkerDetailDocuments(workerId);

      return mapWorkerDetail({
        bankbookDownloadUrl: await resolveWorkerBankbookDownloadUrl(workerData),
        data: workerData,
        payrollSetting,
        tagById,
        tagOptions,
      });
    },
    async updateWorkerDetail(workerId, input) {
      const workspaceId = await requireActiveWorkspaceId();
      const { payrollSetting } = await readWorkerDetailDocuments(workerId);
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const name = input.name.trim();
      const contact = input.contact.trim();
      const workerRef = doc(db, "workspaces", workspaceId, "workers", workerId);

      batch.update(workerRef, {
        contact,
        name,
        nameKey: name.toLocaleLowerCase("ko-KR"),
        status: input.status,
        tagIds: [...input.tagIds],
        updatedAt: serverTimestamp(),
      });

      const payrollRef = payrollSetting
        ? doc(db, "workspaces", workspaceId, "payrollSettings", payrollSetting.id)
        : doc(getPayrollSettingsCollection(workspaceId), `payroll_${workerId}`);
      const payrollUpdate = {
        effectiveFrom: input.effectiveFrom,
        hourlyRate: input.payrollType === "hourly" ? input.hourlyRate : null,
        monthlySalary:
          input.payrollType === "monthly" ? input.monthlySalary : null,
        payrollType: input.payrollType,
        status: "active",
        taxRatePercent:
          input.taxType === "custom" ? input.taxRatePercent : null,
        taxType: input.taxType,
        updatedAt: serverTimestamp(),
        workerId,
        workerName: name,
        workspaceId,
      };

      if (payrollSetting) {
        batch.update(payrollRef, payrollUpdate);
      } else {
        batch.set(payrollRef, {
          ...payrollUpdate,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return dataSource.getWorkerDetail(workerId);
    },
  };

  return dataSource;
}

async function readWorkerDetailDocuments(workerId: string) {
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
  const tagOptions = workerTags
    .filter((tag) => tag.status === "active")
    .sort((left, right) => left.label.localeCompare(right.label, "ko-KR"))
    .map((tag) => ({ id: tag.id, label: tag.label }));

  return {
    payrollSetting,
    tagById,
    tagOptions,
    workerData: workerSnapshot.data(),
  };
}

function mapWorkerDetail({
  bankbookDownloadUrl,
  data,
  payrollSetting,
  tagById,
  tagOptions,
}: {
  bankbookDownloadUrl: string | null;
  data: DocumentData;
  payrollSetting: PayrollSetting | undefined;
  tagById: ReadonlyMap<string, WorkerTagDocument>;
  tagOptions: readonly WorkerDetailTagOption[];
}): WorkerDetailBasicData {
  const name = readString(data.name, readString(data.displayName, "이름 없는 조교"));
  const status = readWorkerStatusLabel(data);
  const statusValue = readWorkerStatusValue(data);
  const tagLabel = readWorkerTagLabel(data, tagById);
  const registeredAt = readRegisteredAtLabel(data);
  const phone = readString(data.contact, readString(data.phone, "-"));
  const email = readString(data.email, "-");
  const account = readAccountLabel(data.account);
  const paySummary = readProfilePaySummary(payrollSetting);
  const payrollRows = createPayrollRows(payrollSetting);

  return {
    bankbookDownloadUrl,
    editValues: createEditValues({
      contact: phone === "-" ? "" : phone,
      data,
      name,
      payrollSetting,
      status: statusValue,
    }),
    fixture: createDetailFixture({
      account,
      email,
      name,
      phone,
      payrollRows,
      registeredAt,
      status,
      tagLabel,
    }),
    profile: createDetailProfile({
      data,
      name,
      paySummary,
      registeredAt,
      status,
      tagLabel,
    }),
    tagOptions,
  };
}

function createDetailFixture({
  account,
  email,
  name,
  phone,
  payrollRows,
  registeredAt,
  status,
  tagLabel,
}: {
  account: string;
  email: string;
  name: string;
  phone: string;
  payrollRows: readonly PayrollSettingRow[];
  registeredAt: string;
  status: string;
  tagLabel: string;
}): WorkerDetailBasicFixture {
  return {
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
      fields: workerDetailBasicFixture.editDialog.fields.map((field) => {
        switch (field.id) {
          case "name":
            return { ...field, value: name };
          case "phone":
            return { ...field, value: phone };
          case "registeredAt":
            return { ...field, value: registeredAt };
          case "status":
            return { ...field, value: status };
          default:
            return field;
        }
      }),
      tagValue: tagLabel,
    },
    deleteBlockedDialog: {
      ...workerDetailBasicFixture.deleteBlockedDialog,
      description: [
        `${name} 님은 다음 항목이 남아 있어 삭제할 수 없습니다.`,
        "하단 항목을 모두 처리한 뒤 다시 시도해 주세요.",
      ],
    },
  };
}

function createDetailProfile({
  data,
  name,
  paySummary,
  registeredAt,
  status,
  tagLabel,
}: {
  data: DocumentData;
  name: string;
  paySummary: string;
  registeredAt: string;
  status: string;
  tagLabel: string;
}): WorkerDetailProfile {
  return {
    name,
    tag: tagLabel,
    status,
    paySummary,
    registeredSummary: `${registeredAt} 등록`,
    monthlySummary: readString(data.monthlySummary, "당월 근무시간 집계 전"),
    deleteLabel: workerDetailProfile.deleteLabel,
  };
}

function createEditValues({
  contact,
  data,
  name,
  payrollSetting,
  status,
}: {
  contact: string;
  data: DocumentData;
  name: string;
  payrollSetting: PayrollSetting | undefined;
  status: WorkerDetailStatusValue;
}): WorkerDetailBasicEditValues {
  const payrollType = readPayrollTypeValue(payrollSetting);

  return {
    contact,
    effectiveFrom:
      payrollSetting?.effectiveFrom || getCurrentKoreanMonthStartDateKey(),
    hourlyRate: payrollSetting?.hourlyRate ?? (payrollType === "hourly" ? 10000 : null),
    monthlySalary:
      payrollSetting?.monthlySalary ?? (payrollType === "monthly" ? 1000000 : null),
    name,
    payrollType,
    status,
    tagIds: readStringArray(data.tagIds),
    taxRatePercent: payrollSetting?.taxRatePercent ?? 3.3,
    taxType: payrollSetting?.taxType === "none" ? "none" : "custom",
  };
}

function createWorkerDetailDataFromValues({
  bankbookDownloadUrl,
  input,
  tagOptions,
}: {
  bankbookDownloadUrl: string | null;
  input: WorkerDetailBasicEditValues;
  tagOptions: readonly WorkerDetailTagOption[];
}): WorkerDetailBasicData {
  const status = input.status === "active" ? "활성" : "비활성";
  const tagById = new Map(
    tagOptions.map((tag) => [
      tag.id,
      { id: tag.id, label: tag.label, status: "active" },
    ]),
  );
  const tagLabel = input.tagIds
    .map((tagId) => tagById.get(tagId)?.label)
    .filter((label): label is string => Boolean(label))
    .join(", ") || "미지정";
  const payrollRows = createPayrollRows({
    createdAt: new Date(),
    effectiveFrom: input.effectiveFrom,
    hourlyRate: input.payrollType === "hourly" ? input.hourlyRate : null,
    id: "fixture-payroll",
    monthlySalary: input.payrollType === "monthly" ? input.monthlySalary : null,
    payrollType: input.payrollType,
    status: "active",
    taxRatePercent: input.taxType === "custom" ? input.taxRatePercent : null,
    taxType: input.taxType,
    workerId: "fixture-worker",
  });
  const paySummary = readProfilePaySummary({
    createdAt: new Date(),
    effectiveFrom: input.effectiveFrom,
    hourlyRate: input.payrollType === "hourly" ? input.hourlyRate : null,
    id: "fixture-payroll",
    monthlySalary: input.payrollType === "monthly" ? input.monthlySalary : null,
    payrollType: input.payrollType,
    status: "active",
    taxRatePercent: input.taxType === "custom" ? input.taxRatePercent : null,
    taxType: input.taxType,
    workerId: "fixture-worker",
  });
  const fixture = createDetailFixture({
    account: workerDetailBasicFixture.personalRows.find((row) => row.id === "account")
      ?.value ?? "-",
    email: workerDetailBasicFixture.personalRows.find((row) => row.id === "email")
      ?.value ?? "-",
    name: input.name,
    phone: input.contact || "-",
    payrollRows,
    registeredAt:
      workerDetailBasicFixture.personalRows.find((row) => row.id === "registeredAt")
        ?.value ?? "-",
    status,
    tagLabel,
  });

  return {
    bankbookDownloadUrl,
    editValues: { ...input, tagIds: [...input.tagIds] },
    fixture,
    profile: {
      name: input.name,
      tag: tagLabel,
      status,
      paySummary,
      registeredSummary: `${fixture.personalRows.find((row) => row.id === "registeredAt")?.value ?? "-"} 등록`,
      monthlySummary: workerDetailProfile.monthlySummary,
      deleteLabel: workerDetailProfile.deleteLabel,
    },
    tagOptions,
  };
}

function createPayrollRows(
  setting: PayrollSetting | undefined,
): readonly PayrollSettingRow[] {
  if (!setting) {
    return [
      { id: "payType", label: "급여 타입", value: "미설정" },
      { id: "rate", label: "단가", value: "급여 미설정" },
      { id: "tax", label: "원천징수", value: "미설정" },
      { id: "effectiveFrom", label: "적용 시작", value: "-" },
    ];
  }

  return [
    { id: "payType", label: "급여 타입", value: readPayrollTypeLabel(setting) },
    { id: "rate", label: "단가", value: readPayrollRateLabel(setting) },
    { id: "tax", label: "원천징수", value: readTaxLabel(setting) },
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
    id: snapshot.id,
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

function readWorkerStatusLabel(data: DocumentData) {
  return readWorkerStatusValue(data) === "active" ? "활성" : "비활성";
}

function readWorkerStatusValue(data: DocumentData): WorkerDetailStatusValue {
  const status = readString(data.status, "");
  const membershipStatus = readString(data.membershipStatus, "");
  const inactiveStatuses = new Set([
    "deleted",
    "inactive",
    "pending",
    "rejected",
    "suspended",
  ]);

  if (inactiveStatuses.has(status) || inactiveStatuses.has(membershipStatus)) {
    return "inactive";
  }

  return "active";
}

function readPayrollTypeValue(
  setting: PayrollSetting | undefined,
): WorkerDetailPayrollType {
  if (!setting) {
    return "hourly";
  }

  return setting.payrollType === "monthly" || setting.monthlySalary !== null
    ? "monthly"
    : "hourly";
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

async function resolveWorkerBankbookDownloadUrl(data: DocumentData) {
  return resolveFirebaseStorageDownloadUrl(readBankbookStoragePath(data));
}

function readBankbookStoragePath(data: DocumentData) {
  const account = readObject(data.account);

  return (
    readString(account?.storagePath, "") ||
    readString(account?.bankbookStoragePath, "") ||
    readString(data.bankbookStoragePath, "") ||
    readString(data.bankbookDownloadUrl, "")
  );
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
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
  if (setting.taxType === "none") {
    return "없음";
  }

  if (setting.taxRatePercent !== null) {
    return `${setting.taxRatePercent}%`;
  }

  return setting.taxType === "custom" ? "3.3%" : "미설정";
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

function getCurrentKoreanMonthStartDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(new Date());
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  const year = partByType.get("year") ?? "2026";
  const month = partByType.get("month") ?? "01";

  return `${year}-${month}-01`;
}

function formatWon(value: number) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}

function getDateTime(date: Date | null) {
  return date?.getTime() ?? 0;
}
