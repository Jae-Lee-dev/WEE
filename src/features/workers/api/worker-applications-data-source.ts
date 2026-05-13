import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  workerApplicationsFixtureData,
  type WorkerApplicationInfo,
  type WorkerApplicationsData,
  type WorkerApplicationRow,
  type WorkerApplicationTag,
} from "../model/worker-applications-fixtures";

export type WorkerApplicationsDataSource = {
  initialData?: WorkerApplicationsData;
  listApplications: () => Promise<WorkerApplicationsData>;
};

type WorkerApplicationStatus = "pending" | "rejected";

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

type WorkerTagModel = WorkerApplicationTag & {
  createdAt: Date | null;
  status: string;
};

export const emptyWorkerApplicationsData = {
  rows: [],
  tags: [],
} as const satisfies WorkerApplicationsData;

export function createWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureWorkerApplicationsDataSource();
  }

  return createFirestoreWorkerApplicationsDataSource();
}

function createFixtureWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  return {
    initialData: workerApplicationsFixtureData,
    async listApplications() {
      return workerApplicationsFixtureData;
    },
  };
}

function createFirestoreWorkerApplicationsDataSource(): WorkerApplicationsDataSource {
  return {
    async listApplications() {
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
        const application = mapApplicationMembership(membership, workerById);

        if (application) {
          applicationByWorkerId.set(application.workerId, application);
        }
      }

      for (const worker of workers) {
        if (applicationByWorkerId.has(worker.id)) {
          continue;
        }

        const application = mapApplicationWorker(worker);

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

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FirestoreDocument {
  return {
    data: snapshot.data(),
    id: snapshot.id,
  };
}

function mapApplicationMembership(
  membership: FirestoreDocument,
  workerById: ReadonlyMap<string, FirestoreDocument>,
): WorkerApplicationModel | null {
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

function mapApplicationWorker(
  worker: FirestoreDocument,
): WorkerApplicationModel | null {
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

function createApplicationModel({
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
}): WorkerApplicationModel {
  const workerData = worker?.data;
  const appliedAt =
    readDate(membershipData?.appliedAt) ??
    readDate(membershipData?.createdAt) ??
    readDate(workerData?.appliedAt) ??
    readDate(workerData?.createdAt);
  const info = createApplicationInfo({
    appliedAt,
    membershipData,
    status,
    workerData,
  });

  return {
    row: {
      id,
      name:
        readString(membershipData?.workerName, "") ||
        readString(workerData?.name, "") ||
        readString(workerData?.displayName, "") ||
        "이름 없는 조교",
      phone: readPhoneLabel(membershipData, workerData),
      appliedAt: info.appliedAt,
      info,
      statusText: info.statusText,
    },
    sortAt: appliedAt,
    status,
    workerId,
  };
}

function createApplicationInfo({
  appliedAt,
  membershipData,
  status,
  workerData,
}: {
  appliedAt: Date | null;
  membershipData: DocumentData | undefined;
  status: WorkerApplicationStatus;
  workerData: DocumentData | undefined;
}): WorkerApplicationInfo {
  return {
    appliedAt: formatDateLabel(appliedAt, "-"),
    bankbookStatus: readBankbookStatus(membershipData, workerData),
    requestedPay: readRequestedPay(membershipData, workerData),
    rejectionReason:
      status === "rejected"
        ? readString(
            membershipData?.rejectionReason,
            readString(workerData?.rejectionReason, ""),
          ) || undefined
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

  const account = readObject(workerData?.account) ?? readObject(membershipData?.account);

  if (
    readString(account?.storagePath, "") ||
    readString(account?.bankbookStoragePath, "") ||
    readString(workerData?.bankbookStoragePath, "") ||
    readString(membershipData?.bankbookStoragePath, "")
  ) {
    return "업로드 완료";
  }

  return "미업로드";
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
