import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import { resolveFirebaseStorageDownloadUrl } from "@/shared/api/firebase";
import {
  workerApplicationsFixtureData,
  type WorkerApplicationInfo,
  type WorkerApplicationsData,
  type WorkerApplicationRow,
  type WorkerApplicationTag,
} from "../model/worker-applications-fixtures";

export type WorkerApplicationsDataSource = {
  approveApplication: (
    input: ApproveWorkerApplicationInput,
  ) => Promise<WorkerApplicationsData>;
  countApplications: () => Promise<number>;
  initialData?: WorkerApplicationsData;
  initialApplicationCount?: number;
  listApplications: () => Promise<WorkerApplicationsData>;
  rejectApplication: (
    input: RejectWorkerApplicationInput,
  ) => Promise<WorkerApplicationsData>;
};

export type ApproveWorkerApplicationInput = {
  applicationId: string;
  membershipId?: string;
  workerId: string;
  workerContact: string;
  workerName: string;
  tagIds: readonly string[];
  newTagLabels: readonly string[];
  payrollType: "hourly" | "monthly";
  hourlyRate: number | null;
  monthlySalary: number | null;
  taxRatePercent: number | null;
};

export type RejectWorkerApplicationInput = {
  applicationId: string;
  membershipId?: string;
  rejectionReason: string;
  workerId: string;
};

type WorkerApplicationStatus = "pending" | "rejected";

const inlineWorkerTagColors = ["green", "blue", "orange", "red", "grey"] as const;

type FirestoreDocument = {
  data: DocumentData;
  id: string;
};

type WorkerApplicationModel = {
  row: WorkerApplicationRow;
  sortAt: Date | null;
  status: WorkerApplicationStatus;
  workerId: string;
};

type WorkerApplicationStatusModel = {
  status: WorkerApplicationStatus;
  workerId: string;
};

type WorkerTagModel = WorkerApplicationTag & {
  createdAt: Date | null;
  status: string;
};

export const workerApplicationsCountChangedEvent =
  "wee:worker-applications:count-changed";

export const emptyWorkerApplicationsData = {
  rows: [],
  tags: [],
} as const satisfies WorkerApplicationsData;

export function countWorkerApplicationRows(rows: readonly WorkerApplicationRow[]) {
  return rows.length;
}

export function createWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureWorkerApplicationsDataSource();
  }

  return createFirestoreWorkerApplicationsDataSource();
}

function createFixtureWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  let data: WorkerApplicationsData = workerApplicationsFixtureData;

  return {
    initialApplicationCount: countWorkerApplicationRows(data.rows),
    initialData: workerApplicationsFixtureData,
    async approveApplication(input) {
      data = {
        ...data,
        rows: data.rows.filter((row) => row.id !== input.applicationId),
      };

      return data;
    },
    async countApplications() {
      return countWorkerApplicationRows(data.rows);
    },
    async listApplications() {
      return data;
    },
    async rejectApplication(input) {
      const rejectionReason = input.rejectionReason.trim();

      data = {
        ...data,
        rows: data.rows.map((row) =>
          row.id === input.applicationId
            ? {
                ...row,
                info: {
                  ...(row.info ?? {
                    appliedAt: row.appliedAt,
                    bankbookStatus: "미확인",
                    requestedPay: "미입력",
                  }),
                  rejectionReason: rejectionReason || undefined,
                  statusText: "반려",
                },
                statusText: "반려",
              }
            : row,
        ),
      };

      return data;
    },
  };
}

function createFirestoreWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  async function listApplications() {
    const workspaceId = await requireActiveWorkspaceId();
    const [membershipsSnapshot, workersSnapshot, workerTagsSnapshot] =
      await Promise.all([
        getDocs(getWorkspaceCollection(workspaceId, "memberships")),
        getDocs(getWorkspaceCollection(workspaceId, "workers")),
        getDocs(getWorkspaceCollection(workspaceId, "workerTags")),
      ]);
    const workers = workersSnapshot.docs.map(mapDocument);
    const workerById = new Map(workers.map((worker) => [worker.id, worker]));
    const applicationByWorkerId = new Map<string, WorkerApplicationModel>();

    for (const membership of membershipsSnapshot.docs.map(mapDocument)) {
      const application = await mapApplicationMembership(membership, workerById);

      if (application) {
        applicationByWorkerId.set(application.workerId, application);
      }
    }

    for (const worker of workers) {
      if (applicationByWorkerId.has(worker.id)) {
        continue;
      }

      const application = await mapApplicationWorker(worker);

      if (application) {
        applicationByWorkerId.set(application.workerId, application);
      }
    }

    const rows = [...applicationByWorkerId.values()]
      .sort(compareApplications)
      .map((application) => application.row);
    const tags = workerTagsSnapshot.docs
      .map(mapWorkerTagDocument)
      .filter((tag) => tag.status === "active")
      .sort(compareWorkerTags)
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
      }));

    return { rows, tags };
  }

  return {
    async approveApplication(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const decidedBy = getFirebaseAuth().currentUser?.uid ?? null;
      const membershipRef = doc(
        db,
        "workspaces",
        workspaceId,
        "memberships",
        input.membershipId || input.applicationId || `membership_${input.workerId}`,
      );
      const workerRef = doc(db, "workspaces", workspaceId, "workers", input.workerId);
      const payrollRef = doc(
        db,
        "workspaces",
        workspaceId,
        "payrollSettings",
        `payroll_${input.workerId}`,
      );
      const [membershipSnapshot, workerSnapshot, payrollSnapshot] = await Promise.all([
        getDoc(membershipRef),
        getDoc(workerRef),
        getDoc(payrollRef),
      ]);
      const membershipData = membershipSnapshot.exists()
        ? membershipSnapshot.data()
        : undefined;
      const existingWorkerData = workerSnapshot.exists()
        ? workerSnapshot.data()
        : undefined;
      const newTagIds = input.newTagLabels.map((label) => createInlineTagId(label));
      const tagIds = [...new Set([...input.tagIds, ...newTagIds])];

      input.newTagLabels.forEach((label, index) => {
        const tagId = newTagIds[index];

        if (!tagId) {
          return;
        }

        batch.set(doc(db, "workspaces", workspaceId, "workerTags", tagId), {
          color: getRandomInlineWorkerTagColor(),
          createdAt: serverTimestamp(),
          createdBy: decidedBy,
          name: label,
          nameKey: createNameKey(label),
          status: "active",
          updatedAt: serverTimestamp(),
          usageCount: 1,
          workspaceId,
        });
      });

      input.tagIds.forEach((tagId) => {
        batch.set(
          doc(db, "workspaces", workspaceId, "workerTags", tagId),
          {
            updatedAt: serverTimestamp(),
            usageCount: increment(1),
          },
          { merge: true },
        );
      });

      batch.set(
        membershipRef,
        {
          approvedAt: serverTimestamp(),
          decidedAt: serverTimestamp(),
          decidedBy,
          rejectionReason: deleteField(),
          status: "approved",
          updatedAt: serverTimestamp(),
          workerId: input.workerId,
          workerName: input.workerName,
          workspaceId,
        },
        { merge: true },
      );
      if (workerSnapshot.exists()) {
        batch.update(workerRef, {
          approvedAt: serverTimestamp(),
          membershipStatus: "approved",
          rejectionReason: deleteField(),
          status: "active",
          tagIds,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(
          workerRef,
          createApprovedWorkerDocument({
            contact:
              normalizeOptionalString(input.workerContact) ||
              normalizeOptionalString(
                readPhoneLabel(membershipData, existingWorkerData),
              ) ||
              "",
            membershipData,
            membershipId: input.membershipId || input.applicationId,
            tagIds,
            workerData: existingWorkerData,
            workerId: input.workerId,
            workerName: input.workerName,
            workspaceId,
          }),
        );
      }
      const payrollSettingData = {
        effectiveFrom: getCurrentMonthStartDateKey(),
        hourlyRate: input.payrollType === "hourly" ? input.hourlyRate : null,
        monthlySalary:
          input.payrollType === "monthly" ? input.monthlySalary : null,
        payrollType: input.payrollType,
        status: "active",
        taxRatePercent: input.taxRatePercent,
        taxType: input.taxRatePercent == null ? "none" : "custom",
        updatedAt: serverTimestamp(),
        workerId: input.workerId,
        workerName: input.workerName,
        workspaceId,
      };

      if (payrollSnapshot.exists()) {
        batch.update(payrollRef, payrollSettingData);
      } else {
        batch.set(payrollRef, {
          ...payrollSettingData,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return listApplications();
    },
    async countApplications() {
      const workspaceId = await requireActiveWorkspaceId();
      const [membershipsSnapshot, workersSnapshot] = await Promise.all([
        getDocs(getWorkspaceCollection(workspaceId, "memberships")),
        getDocs(getWorkspaceCollection(workspaceId, "workers")),
      ]);
      const workers = workersSnapshot.docs.map(mapDocument);
      const workerById = new Map(workers.map((worker) => [worker.id, worker]));
      const applicationsByWorkerId = new Map<string, WorkerApplicationStatusModel>();

      for (const membership of membershipsSnapshot.docs.map(mapDocument)) {
        const workerId = readString(membership.data.workerId, "");
        const worker = workerById.get(workerId);
        const status = readApplicationStatus(membership.data, worker?.data);

        if (status) {
          applicationsByWorkerId.set(workerId, { status, workerId });
        }
      }

      for (const worker of workers) {
        if (applicationsByWorkerId.has(worker.id)) {
          continue;
        }

        const status = readApplicationStatus(worker.data);

        if (status) {
          applicationsByWorkerId.set(worker.id, {
            status,
            workerId: worker.id,
          });
        }
      }

      return applicationsByWorkerId.size;
    },
    listApplications,
    async rejectApplication(input) {
      const rejectionReason = input.rejectionReason.trim();
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const decidedBy = getFirebaseAuth().currentUser?.uid ?? null;
      const workerRef = doc(db, "workspaces", workspaceId, "workers", input.workerId);
      const workerSnapshot = await getDoc(workerRef);

      batch.set(
        doc(
          db,
          "workspaces",
          workspaceId,
          "memberships",
          input.membershipId || input.applicationId || `membership_${input.workerId}`,
        ),
        {
          decidedAt: serverTimestamp(),
          decidedBy,
          rejectionReason: rejectionReason || deleteField(),
          status: "rejected",
          updatedAt: serverTimestamp(),
          workerId: input.workerId,
          workspaceId,
        },
        { merge: true },
      );
      if (workerSnapshot.exists()) {
        batch.update(workerRef, {
          membershipStatus: "rejected",
          rejectionReason: deleteField(),
          status: "inactive",
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return listApplications();
    },
  };
}

function getWorkspaceCollection(workspaceId: string, collectionName: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, collectionName);
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseFixtureDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function createApprovedWorkerDocument({
  contact,
  membershipData,
  membershipId,
  tagIds,
  workerData,
  workerId,
  workerName,
  workspaceId,
}: {
  contact: string;
  membershipData: DocumentData | undefined;
  membershipId: string;
  tagIds: readonly string[];
  workerData: DocumentData | undefined;
  workerId: string;
  workerName: string;
  workspaceId: string;
}) {
  const account = readObject(membershipData?.account) ?? readObject(workerData?.account);
  const appliedAt =
    membershipData?.appliedAt ?? membershipData?.createdAt ?? workerData?.appliedAt;
  const bankbookDownloadUrl =
    normalizeOptionalString(membershipData?.bankbookDownloadUrl) ||
    normalizeOptionalString(workerData?.bankbookDownloadUrl);
  const bankbookStatus =
    normalizeOptionalString(membershipData?.bankbookStatus) ||
    normalizeOptionalString(workerData?.bankbookStatus);
  const workerUid =
    normalizeOptionalString(membershipData?.workerUid) ||
    normalizeOptionalString(workerData?.workerUid);

  return {
    ...(account ? { account } : {}),
    ...(appliedAt ? { appliedAt } : {}),
    approvedAt: serverTimestamp(),
    ...(bankbookDownloadUrl ? { bankbookDownloadUrl } : {}),
    ...(bankbookStatus ? { bankbookStatus } : {}),
    contact,
    createdAt: serverTimestamp(),
    membershipId,
    membershipStatus: "approved",
    name: workerName,
    nameKey: createNameKey(workerName),
    status: "active",
    tagIds,
    updatedAt: serverTimestamp(),
    workerId,
    ...(workerUid ? { workerUid } : {}),
    workspaceId,
  };
}

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FirestoreDocument {
  return {
    data: snapshot.data(),
    id: snapshot.id,
  };
}

async function mapApplicationMembership(
  membership: FirestoreDocument,
  workerById: ReadonlyMap<string, FirestoreDocument>,
): Promise<WorkerApplicationModel | null> {
  const workerId = readString(membership.data.workerId, "");
  const worker = workerById.get(workerId);
  const status = readApplicationStatus(membership.data, worker?.data);

  if (!status) {
    return null;
  }

  return createApplicationModel({
    id: membership.id || workerId,
    membershipData: membership.data,
    status,
    worker,
    workerId,
  });
}

async function mapApplicationWorker(
  worker: FirestoreDocument,
): Promise<WorkerApplicationModel | null> {
  const status = readApplicationStatus(worker.data);

  if (!status) {
    return null;
  }

  return createApplicationModel({
    id: worker.id,
    membershipData: undefined,
    status,
    worker,
    workerId: worker.id,
  });
}

async function createApplicationModel({
  id,
  membershipData,
  status,
  worker,
  workerId,
}: {
  id: string;
  membershipData: DocumentData | undefined;
  status: WorkerApplicationStatus;
  worker: FirestoreDocument | undefined;
  workerId: string;
}): Promise<WorkerApplicationModel> {
  const workerData = worker?.data;
  const appliedAt =
    readDate(membershipData?.appliedAt) ??
    readDate(membershipData?.createdAt) ??
    readDate(workerData?.appliedAt) ??
    readDate(workerData?.createdAt);
  const info = await createApplicationInfo({
    appliedAt,
    membershipData,
    status,
    workerData,
  });

  return {
    row: {
      id,
      membershipId: membershipData ? id : undefined,
      name:
        readString(membershipData?.workerName, "") ||
        readString(workerData?.name, "") ||
        readString(workerData?.displayName, "") ||
        "이름 없는 조교",
      phone: readPhoneLabel(membershipData, workerData),
      appliedAt: info.appliedAt,
      info,
      statusText: info.statusText,
      tagIds: [],
      workerId,
    },
    sortAt: appliedAt,
    status,
    workerId,
  };
}

async function createApplicationInfo({
  appliedAt,
  membershipData,
  status,
  workerData,
}: {
  appliedAt: Date | null;
  membershipData: DocumentData | undefined;
  status: WorkerApplicationStatus;
  workerData: DocumentData | undefined;
}): Promise<WorkerApplicationInfo> {
  const membershipRejectionReason = readString(
    membershipData?.rejectionReason,
    "",
  );
  const legacyWorkerRejectionReason = membershipData
    ? ""
    : readString(workerData?.rejectionReason, "");

  return {
    appliedAt: formatDateLabel(appliedAt, "-"),
    bankbookDownloadUrl:
      (await resolveFirebaseStorageDownloadUrl(
        readBankbookStoragePath(membershipData, workerData),
      )) ?? undefined,
    bankbookStatus: readBankbookStatus(membershipData, workerData),
    requestedPay: readRequestedPay(membershipData, workerData),
    rejectionReason:
      status === "rejected"
        ? membershipRejectionReason || legacyWorkerRejectionReason || undefined
        : undefined,
    statusText: readApplicationStatusLabel(status),
  };
}

function mapWorkerTagDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkerTagModel {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    label: readString(data.name, readString(data.label, "태그 없음")),
    createdAt: readDate(data.createdAt),
    status: readString(data.status, "active"),
  };
}

function readApplicationStatus(
  primaryData: DocumentData,
  fallbackData?: DocumentData,
): WorkerApplicationStatus | null {
  const statuses = [
    readString(primaryData.status, ""),
    readString(primaryData.membershipStatus, ""),
    readString(fallbackData?.membershipStatus, ""),
    readString(fallbackData?.status, ""),
  ];

  if (statuses.includes("pending") || statuses.includes("submitted")) {
    return "pending";
  }

  if (statuses.includes("rejected")) {
    return "rejected";
  }

  return null;
}

function readApplicationStatusLabel(status: WorkerApplicationStatus) {
  return status === "pending" ? "승인 대기" : "반려";
}

function readPhoneLabel(
  membershipData: DocumentData | undefined,
  workerData: DocumentData | undefined,
) {
  return (
    readString(workerData?.contact, "") ||
    readString(workerData?.phone, "") ||
    readString(membershipData?.contact, "") ||
    readString(membershipData?.phone, "") ||
    "-"
  );
}

function readBankbookStatus(
  membershipData: DocumentData | undefined,
  workerData: DocumentData | undefined,
) {
  const explicitStatus =
    readString(membershipData?.bankbookStatus, "") ||
    readString(workerData?.bankbookStatus, "");

  if (explicitStatus) {
    return explicitStatus;
  }

  if (readBankbookStoragePath(membershipData, workerData)) {
    return "업로드 완료";
  }

  return "미업로드";
}

function readBankbookStoragePath(
  membershipData: DocumentData | undefined,
  workerData: DocumentData | undefined,
) {
  const account = readObject(workerData?.account) ?? readObject(membershipData?.account);

  return (
    readString(account?.storagePath, "") ||
    readString(account?.bankbookStoragePath, "") ||
    readString(workerData?.bankbookStoragePath, "") ||
    readString(membershipData?.bankbookStoragePath, "") ||
    readString(workerData?.bankbookDownloadUrl, "") ||
    readString(membershipData?.bankbookDownloadUrl, "")
  );
}

function readRequestedPay(
  membershipData: DocumentData | undefined,
  workerData: DocumentData | undefined,
) {
  const explicitPay =
    readString(membershipData?.requestedPay, "") ||
    readString(membershipData?.requestedPayLabel, "") ||
    readString(workerData?.requestedPay, "") ||
    readString(workerData?.requestedPayLabel, "");

  if (explicitPay) {
    return explicitPay;
  }

  const requestedHourlyRate =
    readOptionalNumber(membershipData?.requestedHourlyRate) ??
    readOptionalNumber(workerData?.requestedHourlyRate);

  if (requestedHourlyRate !== null) {
    return `시급 ${formatWon(requestedHourlyRate)}`;
  }

  const requestedMonthlySalary =
    readOptionalNumber(membershipData?.requestedMonthlySalary) ??
    readOptionalNumber(workerData?.requestedMonthlySalary);

  if (requestedMonthlySalary !== null) {
    return `월급 ${formatWon(requestedMonthlySalary)}`;
  }

  return "미입력";
}

function compareApplications(
  left: WorkerApplicationModel,
  right: WorkerApplicationModel,
) {
  const statusCompare = getStatusRank(left.status) - getStatusRank(right.status);

  if (statusCompare !== 0) {
    return statusCompare;
  }

  return getDateTime(right.sortAt) - getDateTime(left.sortAt);
}

function getStatusRank(status: WorkerApplicationStatus) {
  return status === "pending" ? 0 : 1;
}

function compareWorkerTags(left: WorkerTagModel, right: WorkerTagModel) {
  return (
    getDateTime(left.createdAt) - getDateTime(right.createdAt) ||
    left.label.localeCompare(right.label, "ko-KR")
  );
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
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

function formatWon(value: number) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}

function getDateTime(date: Date | null) {
  return date?.getTime() ?? 0;
}

function createNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function createInlineTagId(label: string) {
  return `worker_tag_${createNameKey(label)
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "")}`;
}

function getRandomInlineWorkerTagColor() {
  return inlineWorkerTagColors[
    Math.floor(Math.random() * inlineWorkerTagColors.length)
  ];
}

function getCurrentMonthStartDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
