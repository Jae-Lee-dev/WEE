#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { resolve } from "node:path";

const seedVersion = "wee-srs-seed-v1";
const defaultBatchId = "wee-srs-v1-2026-05-12";
const seedGeneratedAt = ts("2026-05-12T09:00:00+09:00");
const firestoreDatabase = "(default)";
const seedPeriod = {
  startDate: "2026-04-13",
  endDate: "2026-05-11",
};

const workspaceCollections = [
  "notificationSettings",
  "subscriptions",
  "billing",
  "locations",
  "dutyTags",
  "workerTags",
  "workers",
  "memberships",
  "payrollSettings",
  "duties",
  "scheduleRequests",
  "scheduleVersions",
  "attendanceLogs",
  "workRecords",
  "anomalyFlags",
  "anomalyResolutions",
  "overtimeWorks",
  "correctionRequests",
  "bonusItems",
  "payStatements",
  "workerPayStatements",
  "handoverDocuments",
  "aiAnalysisRuns",
  "notifications",
  "operationalInboxItems",
  "payrollWorkerMonthRows",
  "seedRuns",
];

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  requireOption(options.workspaceId, "--workspace-id");
  requireOption(options.managerUid, "--manager-uid");

  const seed = createSeedPlan(options);
  validateSeedPlan(seed.writes);

  const summary = summarizeWrites(seed.writes);

  printSummary(options, summary, seed.assertions);

  if (options.dryRun) {
    console.log("\nDry run only. Add --confirm to write these documents.");
    return;
  }

  if (!process.env.FIRESTORE_EMULATOR_HOST && !options.allowProduction) {
    throw new Error(
      "Refusing to write to a non-emulator Firestore without --allow-production.",
    );
  }

  const firestore = await createFirestoreClient(options);

  await validateWorkspace(firestore, options);

  let deletedCount = 0;

  if (options.cleanup) {
    deletedCount = await cleanupSeededDocuments(firestore, options);
  }

  await commitWrites(firestore, seed.writes);

  console.log(
    `\nSeed write complete. upserted=${seed.writes.length}, deleted=${deletedCount}, batchId=${options.batchId}`,
  );
}

function parseArgs(argv) {
  const options = {
    allowProduction: false,
    batchId: defaultBatchId,
    cleanup: false,
    dryRun: true,
    help: false,
    managerUid: "",
    projectId: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "",
    serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
    workspaceId: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--confirm") {
      options.dryRun = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--cleanup") {
      options.cleanup = true;
    } else if (arg === "--allow-production") {
      options.allowProduction = true;
    } else if (arg === "--workspace-id") {
      options.workspaceId = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--manager-uid") {
      options.managerUid = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--project-id") {
      options.projectId = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--service-account") {
      options.serviceAccount = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--batch-id") {
      options.batchId = readArgValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (process.env.FIRESTORE_EMULATOR_HOST && !options.projectId) {
    options.projectId = "wee-seed-emulator";
  }

  return options;
}

function readArgValue(argv, index, arg) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
}

function requireOption(value, label) {
  if (!value) {
    throw new Error(`${label} is required. Run pnpm seed:firebase -- --help.`);
  }
}

function printHelp() {
  console.log(`
Usage:
  pnpm seed:firebase -- --workspace-id <workspaceId> --manager-uid <uid> [options]

Options:
  --dry-run             Print the planned write summary only. Default.
  --confirm             Write to Firestore.
  --cleanup             Delete previous documents with the same seed.batchId before writing.
  --allow-production    Required for writes when FIRESTORE_EMULATOR_HOST is not set.
  --project-id <id>     Firebase project id. Defaults to GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT.
  --service-account <p> Service account JSON path. Defaults to GOOGLE_APPLICATION_CREDENTIALS.
  --batch-id <id>       Deterministic seed batch id. Default: ${defaultBatchId}

Examples:
  pnpm seed:firebase -- --workspace-id demo_ws --manager-uid manager_123
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm seed:firebase -- --workspace-id demo_ws --manager-uid manager_123 --confirm --cleanup
  pnpm seed:firebase -- --project-id project-wee-de9b0 --workspace-id <id> --manager-uid <uid> --service-account ./service-account.json --confirm --allow-production
`);
}

async function createFirestoreClient(options) {
  const serviceAccount = options.serviceAccount
    ? JSON.parse(readFileSync(resolve(options.serviceAccount), "utf8"))
    : null;
  const projectId = options.projectId || serviceAccount?.project_id;

  if (!projectId) {
    throw new Error(
      "--project-id is required unless GCLOUD_PROJECT, GOOGLE_CLOUD_PROJECT, or FIRESTORE_EMULATOR_HOST is set.",
    );
  }

  return {
    baseUrl: process.env.FIRESTORE_EMULATOR_HOST
      ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1`
      : "https://firestore.googleapis.com/v1",
    projectId,
    token: await createAccessToken({ serviceAccount }),
  };
}

async function createAccessToken({ serviceAccount }) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return "";
  }

  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
    return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  }

  if (!serviceAccount) {
    throw new Error(
      "A write run needs --service-account, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_OAUTH_ACCESS_TOKEN.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsigned);
  signer.end();

  const assertion = `${unsigned}.${base64url(signer.sign(serviceAccount.private_key))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

async function validateWorkspace(firestore, options) {
  const response = await firestoreRequest(
    firestore,
    documentResourceName(firestore.projectId, `workspaces/${options.workspaceId}`),
    { allowNotFound: true },
  );

  if (!response) {
    throw new Error(
      `workspaces/${options.workspaceId} does not exist. Create/select the workspace before running this seed.`,
    );
  }

  const workspaceManagerUid = response.fields?.managerUid?.stringValue ?? null;

  if (workspaceManagerUid && workspaceManagerUid !== options.managerUid) {
    throw new Error(
      `Workspace managerUid mismatch. workspace=${workspaceManagerUid}, input=${options.managerUid}`,
    );
  }
}

async function cleanupSeededDocuments(firestore, options) {
  let deletedCount = 0;

  for (const collectionName of workspaceCollections) {
    const response = await firestoreRequest(
      firestore,
      `${documentResourceName(firestore.projectId, `workspaces/${options.workspaceId}`)}:runQuery`,
      {
        body: {
          structuredQuery: {
            from: [{ collectionId: collectionName }],
            where: {
              fieldFilter: {
                field: { fieldPath: "seed.batchId" },
                op: "EQUAL",
                value: { stringValue: options.batchId },
              },
            },
          },
        },
        method: "POST",
      },
    );
    const refs = response
      .map((item) => item.document?.name)
      .filter((name) => typeof name === "string");

    deletedCount += refs.length;
    await commitDeletes(firestore, refs);
  }

  return deletedCount;
}

async function commitDeletes(firestore, refs) {
  for (let index = 0; index < refs.length; index += 450) {
    await commitFirestoreWrites(
      firestore,
      refs.slice(index, index + 450).map((name) => ({ delete: name })),
    );
  }
}

async function commitWrites(firestore, writes) {
  for (let index = 0; index < writes.length; index += 450) {
    await commitFirestoreWrites(
      firestore,
      writes.slice(index, index + 450).map((write) => toFirestoreWrite(firestore, write)),
    );
  }
}

async function commitFirestoreWrites(firestore, writes) {
  if (!writes.length) {
    return;
  }

  await firestoreRequest(
    firestore,
    `${documentsRoot(firestore.projectId)}:commit`,
    {
      body: { writes },
      method: "POST",
    },
  );
}

function toFirestoreWrite(firestore, write) {
  const update = {
    fields: encodeFields(write.data),
    name: documentResourceName(firestore.projectId, write.path),
  };
  const restWrite = { update };

  if (write.merge) {
    restWrite.updateMask = {
      fieldPaths: collectFieldPaths(write.data),
    };
  }

  return restWrite;
}

async function firestoreRequest(firestore, resourceName, options = {}) {
  const url = resourceName.startsWith("http")
    ? resourceName
    : `${firestore.baseUrl}/${resourceName}`;
  const response = await fetch(url, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(firestore.token ? { Authorization: `Bearer ${firestore.token}` } : {}),
    },
    method: options.method ?? "GET",
  });

  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Firestore request failed (${response.status}): ${text}`);
  }

  return body;
}

function documentsRoot(projectId) {
  return `projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(firestoreDatabase)}/documents`;
}

function documentResourceName(projectId, path) {
  return `${documentsRoot(projectId)}/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function encodeFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeValue(value)]),
  );
}

function encodeValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => encodeValue(item)),
      },
    };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: encodeFields(value),
      },
    };
  }

  throw new Error(`Unsupported Firestore value: ${String(value)}`);
}

function collectFieldPaths(data, prefix = "") {
  const paths = [];

  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(value) && Object.keys(value).length > 0) {
      paths.push(...collectFieldPaths(value, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

function isPlainObject(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date);
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function createSeedPlan(options) {
  const workspaceId = options.workspaceId;
  const managerUid = options.managerUid;
  const seedMeta = {
    batchId: options.batchId,
    generatedAt: seedGeneratedAt,
    period: seedPeriod,
    version: seedVersion,
  };
  const writes = [];
  const assertions = [];

  const add = (path, data, merge = true) => {
    writes.push({
      data: {
        ...data,
        seed: seedMeta,
      },
      merge,
      path,
    });
  };
  const addWorkspace = (data) => {
    writes.push({
      data: {
        ...data,
        seedLastApplied: seedMeta,
      },
      merge: true,
      path: `workspaces/${workspaceId}`,
    });
  };
  const ws = (collectionName, id) => `workspaces/${workspaceId}/${collectionName}/${id}`;

  const locations = createLocations(workspaceId, managerUid);
  const dutyTags = createDutyTags(workspaceId, managerUid);
  const workerTags = createWorkerTags(workspaceId, managerUid);
  const workers = createWorkers(workspaceId, managerUid);
  const payrollSettings = createPayrollSettings(workspaceId, workers.active);
  const duties = createDuties(workspaceId, managerUid, locations);
  const schedule = createSchedule(workspaceId, managerUid, workers.active, duties);
  const attendance = createAttendanceAndWorkRecords(
    workspaceId,
    managerUid,
    workers.active,
    duties,
    schedule.activeSlots,
  );
  const anomalies = createAnomalies(workspaceId, managerUid, attendance.workRecords);
  const overtime = createOvertimeWorks(
    workspaceId,
    managerUid,
    attendance.workRecords,
    attendance.attendanceLogs,
  );
  const recordChanges = createRecordChangeEvents(
    workspaceId,
    managerUid,
    attendance.workRecords,
  );
  const corrections = createCorrectionRequests(
    workspaceId,
    managerUid,
    recordChanges,
    attendance.workRecords,
  );
  const bonusItems = createBonusItems(workspaceId, managerUid);
  const payroll = createPayrollDocuments(
    workspaceId,
    managerUid,
    workers.active,
    bonusItems,
  );
  const handover = createHandoverDocuments(workspaceId, managerUid);
  const aiRuns = createAiRuns(workspaceId, managerUid, attendance.workRecords);
  const notifications = createNotifications({
    anomalies,
    corrections,
    handover,
    managerUid,
    overtime,
    payroll,
    recordChanges,
    schedule,
    workers,
    workspaceId,
  });
  const projections = createProjections({
    anomalies,
    corrections,
    overtime,
    payroll,
    recordChanges,
    workers,
    workspaceId,
  });

  addWorkspace({
    billingStatus: "active",
    plan: "standard",
    setup: {
      completedAt: ts("2026-04-13T10:00:00+09:00"),
      dutyCount: duties.length,
      locationCount: locations.length,
    },
    status: "active",
    updatedAt: seedGeneratedAt,
  });
  add(ws("notificationSettings", "default"), {
    kakaoAlimtalkEnabled: true,
    managerWebEnabled: true,
    updatedAt: ts("2026-04-13T10:05:00+09:00"),
    workspaceId,
    workerFcmEnabled: true,
  });
  add(ws("subscriptions", "current"), {
    activeWorkerCount: workers.active.length,
    billingStatus: "active",
    currentPeriodEnd: ts("2026-06-01T00:00:00+09:00"),
    currentPeriodStart: ts("2026-05-01T00:00:00+09:00"),
    plan: "standard",
    status: "active",
    workspaceId,
  });
  add(ws("billing", "current"), {
    activeWorkerCount: workers.active.length,
    amountDue: 89000,
    billingMonth: "2026-05",
    paymentMethodStatus: "active",
    workspaceId,
  });

  for (const location of locations) {
    add(ws("locations", location.id), location);
  }

  for (const tag of dutyTags) {
    add(ws("dutyTags", tag.id), tag);
  }

  for (const tag of workerTags) {
    add(ws("workerTags", tag.id), tag);
  }

  for (const worker of workers.all) {
    add(ws("workers", worker.id), worker);
  }

  for (const membership of workers.memberships) {
    add(ws("memberships", membership.id), membership);
  }

  for (const payrollSetting of payrollSettings) {
    add(ws("payrollSettings", payrollSetting.id), payrollSetting);
  }

  for (const duty of duties) {
    add(ws("duties", duty.id), duty);
  }

  for (const request of schedule.requests) {
    add(ws("scheduleRequests", request.id), request);
  }

  for (const version of schedule.versions) {
    add(ws("scheduleVersions", version.id), version);
  }

  for (const log of attendance.attendanceLogs) {
    add(ws("attendanceLogs", log.id), log);
  }

  for (const record of attendance.workRecords) {
    add(ws("workRecords", record.id), record);
  }

  for (const flag of anomalies.flags) {
    add(ws("anomalyFlags", flag.id), flag);
  }

  for (const resolution of anomalies.resolutions) {
    add(ws("anomalyResolutions", resolution.id), resolution);
  }

  for (const change of recordChanges) {
    add(ws("notifications", change.notification.id), change.notification);
  }

  for (const work of overtime) {
    add(ws("overtimeWorks", work.id), work);
  }

  for (const request of corrections) {
    add(ws("correctionRequests", request.id), request);
  }

  for (const item of bonusItems) {
    add(ws("bonusItems", item.id), item);
  }

  for (const statement of payroll.managerStatements) {
    add(ws("payStatements", statement.id), statement);
  }

  for (const statement of payroll.workerStatements) {
    add(ws("workerPayStatements", statement.id), statement);
  }

  for (const doc of handover) {
    add(ws("handoverDocuments", doc.id), doc);
  }

  for (const run of aiRuns) {
    add(ws("aiAnalysisRuns", run.id), run);
  }

  for (const notification of notifications) {
    add(ws("notifications", notification.id), notification);
  }

  for (const item of projections.operationalInboxItems) {
    add(ws("operationalInboxItems", item.id), item);
  }

  for (const row of projections.payrollWorkerMonthRows) {
    add(ws("payrollWorkerMonthRows", row.id), row);
  }

  add(ws("seedRuns", options.batchId), {
    batchId: options.batchId,
    completedAt: seedGeneratedAt,
    counts: summarizeWrites(writes).byCollection,
    dryRunDefault: true,
    managerUid,
    planDocument: "docs/wee-firebase-seed-data-plan.md",
    seedVersion,
    workspaceId,
  });

  assertions.push(
    "Admin/import/service-account REST path required; this seed writes historical timestamps and collections not allowed by current client rules.",
    "4월 paid worker-months have no source changes after paidAt.",
    "needsReconfirmation=true is manager-only; no worker reconfirmation notification is generated.",
    "workerPayStatements omit needsReconfirmation and manager-only calculation diffs.",
    "CorrectionRequest snapshots and record-change notification payloads use worker-safe WorkRecord snapshots.",
    "Unconfirmed worker-months have payrollWorkerMonthRows but no PayStatement document.",
  );

  return { assertions, writes };
}

function createLocations(workspaceId, managerUid) {
  return [
    {
      id: "loc_main",
      addressText: "서울 강남구 도곡로 408",
      coordinate: { lat: 37.4981, lng: 127.0588 },
      createdAt: ts("2026-04-13T09:10:00+09:00"),
      createdBy: managerUid,
      dutyCount: 7,
      geocodingStatus: "resolved",
      name: "본원 3층",
      nameKey: "본원 3층".toLocaleLowerCase("ko-KR"),
      radiusMeters: 80,
      roadAddress: "서울 강남구 도곡로 408",
      status: "active",
      updatedAt: seedGeneratedAt,
      workspaceId,
    },
    {
      id: "loc_annex",
      addressText: "서울 강남구 삼성로 155",
      coordinate: { lat: 37.4943, lng: 127.0621 },
      createdAt: ts("2026-04-13T09:20:00+09:00"),
      createdBy: managerUid,
      dutyCount: 6,
      geocodingStatus: "resolved",
      name: "별관 자습실",
      nameKey: "별관 자습실".toLocaleLowerCase("ko-KR"),
      radiusMeters: 70,
      roadAddress: "서울 강남구 삼성로 155",
      status: "active",
      updatedAt: seedGeneratedAt,
      workspaceId,
    },
    {
      id: "loc_exam",
      addressText: "서울 강남구 선릉로 62길 9",
      coordinate: { lat: 37.5018, lng: 127.0502 },
      createdAt: ts("2026-04-13T09:30:00+09:00"),
      createdBy: managerUid,
      dutyCount: 7,
      geocodingStatus: "resolved",
      name: "시험대비 교실",
      nameKey: "시험대비 교실".toLocaleLowerCase("ko-KR"),
      radiusMeters: 60,
      roadAddress: "서울 강남구 선릉로 62길 9",
      status: "active",
      updatedAt: seedGeneratedAt,
      workspaceId,
    },
  ];
}

function createDutyTags(workspaceId, managerUid) {
  return [
    ["duty_tag_question", "질문"],
    ["duty_tag_grading", "채점"],
    ["duty_tag_admin", "행정"],
    ["duty_tag_self_study", "자습감독"],
    ["duty_tag_makeup", "보강"],
    ["duty_tag_exam", "시험대비"],
  ].map(([id, name], index) => ({
    id,
    color: ["green", "blue", "grey", "orange", "pink", "red"][index],
    createdAt: ts(`2026-04-13T09:${40 + index}:00+09:00`),
    createdBy: managerUid,
    name,
    nameKey: name.toLocaleLowerCase("ko-KR"),
    status: "active",
    updatedAt: seedGeneratedAt,
    usageCount: [5, 4, 2, 4, 2, 3][index],
    workspaceId,
  }));
}

function createWorkerTags(workspaceId, managerUid) {
  return [
    ["worker_tag_new", "신입", "green", 1],
    ["worker_tag_veteran", "베테랑", "grey", 2],
    ["worker_tag_grade12", "고3", "blue", 3],
    ["worker_tag_watch", "유의대상", "red", 1],
    ["worker_tag_weekend", "주말", "orange", 2],
  ].map(([id, name, color, usageCount], index) => ({
    id,
    color,
    createdAt: ts(`2026-04-13T09:${50 + index}:00+09:00`),
    createdBy: managerUid,
    name,
    nameKey: name.toLocaleLowerCase("ko-KR"),
    status: "active",
    updatedAt: seedGeneratedAt,
    usageCount,
    workspaceId,
  }));
}

function createWorkers(workspaceId, managerUid) {
  const active = [
    worker("worker_kim", "worker-auth-kim", "김서연", ["worker_tag_veteran", "worker_tag_grade12"], "2026-04-14T10:30:00+09:00"),
    worker("worker_lee", "worker-auth-lee", "이민지", ["worker_tag_watch"], "2026-04-14T11:20:00+09:00"),
    worker("worker_park", "worker-auth-park", "박정훈", ["worker_tag_new"], "2026-04-15T09:10:00+09:00"),
    worker("worker_choi", "worker-auth-choi", "최유진", ["worker_tag_veteran", "worker_tag_weekend"], "2026-04-15T13:20:00+09:00"),
    worker("worker_jung", "worker-auth-jung", "정하윤", ["worker_tag_weekend", "worker_tag_grade12"], "2026-04-16T15:00:00+09:00"),
  ].map((item) => ({
    ...item,
    membershipStatus: "approved",
    status: "active",
    updatedAt: seedGeneratedAt,
    workspaceId,
  }));
  const pending = {
    ...worker("worker_yang_pending", "worker-auth-yang", "양도현", ["worker_tag_new"], "2026-05-10T14:10:00+09:00"),
    membershipStatus: "pending",
    status: "pending",
    updatedAt: ts("2026-05-10T14:10:00+09:00"),
    workspaceId,
  };
  const rejected = {
    ...worker("worker_oh_rejected", "worker-auth-oh", "오지훈", ["worker_tag_watch"], "2026-04-18T12:40:00+09:00"),
    membershipStatus: "rejected",
    rejectionReason: "계좌 정보 확인 불가",
    status: "inactive",
    updatedAt: ts("2026-04-18T16:00:00+09:00"),
    workspaceId,
  };
  const all = [...active, pending, rejected];
  const memberships = [
    ...active.map((item) => ({
      id: `membership_${item.id}`,
      approvedAt: item.approvedAt,
      createdAt: item.appliedAt,
      decidedAt: item.approvedAt,
      decidedBy: managerUid,
      status: "approved",
      workerId: item.id,
      workerName: item.name,
      workerUid: item.workerUid,
      workspaceId,
    })),
    {
      id: "membership_worker_yang_pending",
      appliedAt: pending.appliedAt,
      createdAt: pending.appliedAt,
      status: "pending",
      workerId: pending.id,
      workerName: pending.name,
      workerUid: pending.workerUid,
      workspaceId,
    },
    {
      id: "membership_worker_oh_rejected",
      appliedAt: rejected.appliedAt,
      createdAt: rejected.appliedAt,
      decidedAt: ts("2026-04-18T16:00:00+09:00"),
      decidedBy: managerUid,
      rejectionReason: rejected.rejectionReason,
      status: "rejected",
      workerId: rejected.id,
      workerName: rejected.name,
      workerUid: rejected.workerUid,
      workspaceId,
    },
  ];

  return { active, all, memberships, pending, rejected };
}

function worker(id, workerUid, name, tagIds, approvedIso) {
  const appliedAt = shiftTimestamp(ts(approvedIso), -2 * 60 * 60 * 1000);

  return {
    id,
    account: {
      bankName: "국민은행",
      holderName: name,
      numberLast4: id.endsWith("kim") ? "0214" : "1107",
      storagePath: `seed/bankbooks/${id}.png`,
    },
    appliedAt,
    approvedAt: ts(approvedIso),
    contact: `010-${id.length.toString().padStart(4, "0")}-2026`,
    createdAt: appliedAt,
    name,
    nameKey: name.toLocaleLowerCase("ko-KR"),
    tagIds,
    workerUid,
  };
}

function createPayrollSettings(workspaceId, activeWorkers) {
  const rates = {
    worker_choi: { monthlySalary: 1850000, payrollType: "monthly", taxType: "custom", taxRatePercent: 3.3 },
    worker_jung: { monthlySalary: 1700000, payrollType: "monthly", taxType: "custom", taxRatePercent: 3.3 },
    worker_kim: { hourlyRate: 10000, payrollType: "hourly", taxType: "custom", taxRatePercent: 3.3 },
    worker_lee: { hourlyRate: 9200, payrollType: "hourly", taxType: "custom", taxRatePercent: 3.3 },
    worker_park: { hourlyRate: 8500, payrollType: "hourly", taxType: "custom", taxRatePercent: 3.3 },
  };

  return activeWorkers.map((item) => ({
    id: `payroll_${item.id}`,
    createdAt: item.approvedAt,
    effectiveFrom: dateKey(item.approvedAt),
    status: "active",
    updatedAt: seedGeneratedAt,
    workerId: item.id,
    workerName: item.name,
    workspaceId,
    ...rates[item.id],
  }));
}

function createDuties(workspaceId, managerUid, locations) {
  const byId = Object.fromEntries(locations.map((location) => [location.id, location]));
  const rows = [
    ["duty_math_mon", "월", "16:00", "18:00", "loc_main", ["질문", "채점"], "수학 질문 월", "2026-04-13", "2026-06-29"],
    ["duty_self_mon", "월", "18:00", "20:00", "loc_annex", ["자습감독"], "자습감독 월", "2026-04-13", "2026-06-29"],
    ["duty_late_mon", "월", "20:00", "22:00", "loc_exam", ["시험대비"], "시험대비 월", "2026-04-13", "2026-05-25"],
    ["duty_question_tue", "화", "16:00", "18:00", "loc_main", ["질문"], "화요 질문", "2026-04-14", "2026-06-30"],
    ["duty_self_tue", "화", "18:00", "21:00", "loc_annex", ["자습감독"], "화요 자습", "2026-04-14", "2026-06-30"],
    ["duty_night_tue", "화", "20:00", "22:00", "loc_exam", ["시험대비"], "화요 야간", "2026-04-14", "2026-05-26"],
    ["duty_admin_wed", "수", "16:00", "18:00", "loc_main", ["행정"], "수요 행정", "2026-04-15", "2026-07-01"],
    ["duty_grading_wed", "수", "18:00", "20:00", "loc_annex", ["채점"], "수요 채점", "2026-04-15", "2026-07-01"],
    ["duty_night_wed", "수", "20:00", "22:00", "loc_exam", ["질문"], "수요 야간 질문", "2026-04-15", "2026-05-27"],
    ["duty_question_thu", "목", "16:00", "18:00", "loc_main", ["질문"], "목요 질문", "2026-04-16", "2026-07-02"],
    ["duty_makeup_thu", "목", "18:00", "20:00", "loc_exam", ["보강"], "목요 보강", "2026-04-16", "2026-05-28"],
    ["duty_night_thu", "목", "20:00", "22:00", "loc_annex", ["자습감독"], "목요 야간 자습", "2026-04-16", "2026-05-28"],
    ["duty_exam_fri", "금", "16:00", "18:00", "loc_exam", ["시험대비"], "금요 시험대비", "2026-04-17", "2026-05-08"],
    ["duty_grading_fri", "금", "18:00", "20:00", "loc_main", ["채점"], "금요 채점", "2026-04-17", "2026-07-03"],
    ["duty_sat_morning", "토", "10:00", "13:00", "loc_annex", ["자습감독"], "토요 오전", "2026-04-18", "2026-06-27"],
    ["duty_sat_grading", "토", "13:00", "16:00", "loc_main", ["채점"], "토요 채점", "2026-04-18", "2026-06-27"],
    ["duty_sat_exam", "토", "16:00", "19:00", "loc_exam", ["시험대비"], "토요 시험반", "2026-04-18", "2026-06-27"],
    ["duty_sun_expired", "일", "10:00", "13:00", "loc_annex", ["보강"], "일요 보강 종료반", "2026-04-19", "2026-04-26"],
    ["duty_sun_exam_expired", "일", "14:00", "17:00", "loc_exam", ["시험대비"], "일요 시험 종료반", "2026-04-19", "2026-04-26"],
    ["duty_upcoming_mon", "월", "14:00", "16:00", "loc_main", ["보강"], "예정 보강반", "2026-05-18", "2026-06-29"],
  ];
  const assignmentCounts = countAssignments();

  return rows.map((row, index) => {
    const [id, weekday, startTime, endTime, locationId, tags, name, operationStartDate, operationEndDate] = row;
    const location = byId[locationId];

    return {
      id,
      assignedWorkerCount: assignmentCounts[id] ?? 0,
      createdAt: ts(`2026-04-13T1${index % 10}:00:00+09:00`),
      createdBy: managerUid,
      endTime,
      locationId,
      locationName: location.name,
      manualStatus: "active",
      name,
      nameKey: name.toLocaleLowerCase("ko-KR"),
      operationEndDate,
      operationStartDate,
      startTime,
      tags,
      updatedAt: seedGeneratedAt,
      weekday,
      workspaceId,
    };
  });
}

function countAssignments() {
  const counts = {};

  for (const slot of createSlotTemplates()) {
    counts[slot.dutyId] = (counts[slot.dutyId] ?? 0) + 1;
  }

  return counts;
}

function createSchedule(workspaceId, managerUid, activeWorkers, duties) {
  const slots = createSlotTemplates();
  const requests = [];
  const versions = [];
  const dutyById = Object.fromEntries(duties.map((duty) => [duty.id, duty]));

  for (const worker of activeWorkers) {
    const workerSlots = slots
      .filter((slot) => slot.workerId === worker.id)
      .map((slot) => ({
        ...slot,
        dutyName: dutyById[slot.dutyId].name,
        locationId: dutyById[slot.dutyId].locationId,
        locationName: dutyById[slot.dutyId].locationName,
        startTime: dutyById[slot.dutyId].startTime,
        endTime: dutyById[slot.dutyId].endTime,
        weekday: dutyById[slot.dutyId].weekday,
      }));

    requests.push({
      id: `schedule_initial_${worker.id}`,
      approvedAt: ts("2026-04-13T18:00:00+09:00"),
      createdAt: ts("2026-04-13T14:00:00+09:00"),
      decidedBy: managerUid,
      requestType: "initial",
      slots: workerSlots,
      status: "approved",
      submittedAt: ts("2026-04-13T14:00:00+09:00"),
      workerId: worker.id,
      workerName: worker.name,
      workspaceId,
    });
    versions.push({
      id: `schedule_version_${worker.id}_initial`,
      activeFrom: "2026-04-13",
      activeTo: null,
      approvedAt: ts("2026-04-13T18:00:00+09:00"),
      createdAt: ts("2026-04-13T18:00:00+09:00"),
      origin: "worker_request",
      requestId: `schedule_initial_${worker.id}`,
      slots: workerSlots,
      status: "active",
      versionNo: 1,
      workerId: worker.id,
      workerName: worker.name,
      workspaceId,
    });
  }

  requests.push({
    id: "schedule_change_worker_park_pending",
    createdAt: ts("2026-05-09T20:10:00+09:00"),
    requestType: "change",
    requestedActiveFrom: "2026-05-18",
    slots: slots.filter((slot) => slot.workerId === "worker_park"),
    status: "submitted",
    submittedAt: ts("2026-05-09T20:10:00+09:00"),
    workerId: "worker_park",
    workerName: "박정훈",
    workspaceId,
  });
  requests.push({
    id: "schedule_change_worker_choi_rejected",
    createdAt: ts("2026-04-25T09:00:00+09:00"),
    decidedAt: ts("2026-04-25T12:30:00+09:00"),
    decidedBy: managerUid,
    rejectionReason: "시험대비 기간 배치 유지 필요",
    requestType: "change",
    status: "rejected",
    submittedAt: ts("2026-04-25T09:00:00+09:00"),
    workerId: "worker_choi",
    workerName: "최유진",
    workspaceId,
  });
  versions.push({
    id: "schedule_version_worker_lee_manager_change",
    activeFrom: "2026-05-04",
    activeTo: null,
    createdAt: ts("2026-05-03T15:00:00+09:00"),
    createdBy: managerUid,
    origin: "manager_edit",
    previousVersionId: "schedule_version_worker_lee_initial",
    reason: "시험대비 교실 지원 추가",
    slots: [
      ...slots.filter((slot) => slot.workerId === "worker_lee"),
      { dutyId: "duty_makeup_thu", workerId: "worker_lee" },
    ],
    status: "active",
    versionNo: 2,
    workerId: "worker_lee",
    workerName: "이민지",
    workspaceId,
  });

  return { activeSlots: slots, requests, versions };
}

function createSlotTemplates() {
  return [
    { dutyId: "duty_math_mon", workerId: "worker_kim" },
    { dutyId: "duty_self_tue", workerId: "worker_kim" },
    { dutyId: "duty_makeup_thu", workerId: "worker_kim" },
    { dutyId: "duty_sat_morning", workerId: "worker_kim" },
    { dutyId: "duty_self_mon", workerId: "worker_lee" },
    { dutyId: "duty_admin_wed", workerId: "worker_lee" },
    { dutyId: "duty_exam_fri", workerId: "worker_lee" },
    { dutyId: "duty_sun_exam_expired", workerId: "worker_lee" },
    { dutyId: "duty_question_tue", workerId: "worker_park" },
    { dutyId: "duty_grading_wed", workerId: "worker_park" },
    { dutyId: "duty_question_thu", workerId: "worker_park" },
    { dutyId: "duty_sat_grading", workerId: "worker_park" },
    { dutyId: "duty_late_mon", workerId: "worker_choi" },
    { dutyId: "duty_exam_fri", workerId: "worker_choi" },
    { dutyId: "duty_sat_exam", workerId: "worker_choi" },
    { dutyId: "duty_sun_expired", workerId: "worker_choi" },
    { dutyId: "duty_night_tue", workerId: "worker_jung" },
    { dutyId: "duty_night_wed", workerId: "worker_jung" },
    { dutyId: "duty_night_thu", workerId: "worker_jung" },
    { dutyId: "duty_grading_fri", workerId: "worker_jung" },
  ];
}

function createAttendanceAndWorkRecords(workspaceId, managerUid, workers, duties, slots) {
  const dutyById = Object.fromEntries(duties.map((duty) => [duty.id, duty]));
  const workerById = Object.fromEntries(workers.map((worker) => [worker.id, worker]));
  const dates = datesBetween("2026-04-13", "2026-05-11");
  const attendanceLogs = [];
  const workRecords = [];

  for (const date of dates) {
    const dayLabel = weekdayLabels[toDate(`${date}T00:00:00+09:00`).getDay()];

    for (const slot of slots) {
      const duty = dutyById[slot.dutyId];

      if (duty.weekday !== dayLabel || date < duty.operationStartDate || date > duty.operationEndDate) {
        continue;
      }

      const worker = workerById[slot.workerId];
      const scenario = resolveRecordScenario(worker.id, date, duty.id);
      const recordId = `wr_${worker.id}_${date.replaceAll("-", "")}_${duty.id}`;
      const attendanceId = scenario.type === "absence_candidate" ? null : `att_${recordId}`;
      const plannedStartAt = ts(`${date}T${duty.startTime}:00+09:00`);
      const plannedEndAt = ts(`${date}T${duty.endTime}:00+09:00`);
      const actualStartAt = scenario.startOffsetMinutes == null
        ? null
        : shiftTimestamp(plannedStartAt, scenario.startOffsetMinutes * 60 * 1000);
      const actualEndAt = scenario.checkoutMissing
        ? null
        : shiftTimestamp(plannedEndAt, scenario.endOffsetMinutes * 60 * 1000);
      const recordCreatedAt = scenario.type === "absence_candidate"
        ? ts(`${date}T23:30:00+09:00`)
        : shiftTimestamp(plannedEndAt, 10 * 60 * 1000);
      const status = scenario.status;
      const effectiveStartAt = scenario.effectiveStartAt ?? actualStartAt ?? plannedStartAt;
      const effectiveEndAt = scenario.effectiveEndAt ?? actualEndAt ?? plannedEndAt;

      if (attendanceId) {
        attendanceLogs.push({
          id: attendanceId,
          anomalyType: scenario.anomalyType,
          checkInAt: actualStartAt,
          checkInLocation: locationForScenario(duty, "in", scenario),
          checkOutAt: actualEndAt,
          checkOutLocation: actualEndAt ? locationForScenario(duty, "out", scenario) : null,
          createdAt: shiftTimestamp(plannedStartAt, -3 * 60 * 1000),
          date,
          dutyId: duty.id,
          dutyName: duty.name,
          locationId: duty.locationId,
          locationName: duty.locationName,
          source: "worker_app",
          status: scenario.type === "normal" ? "matched" : "needs_review",
          workerId: worker.id,
          workerName: worker.name,
          workspaceId,
        });
      }

      workRecords.push({
        id: recordId,
        anomalyType: scenario.anomalyType,
        attendanceLogId: attendanceId,
        createdAt: recordCreatedAt,
        date,
        dateKey: date,
        dutyId: duty.id,
        dutyName: duty.name,
        effectiveEndAt,
        effectiveStartAt,
        hasPendingCorrection: false,
        hasPendingOvertime: false,
        hasUnresolvedAnomaly: scenario.status === "anomaly_unresolved",
        locationId: duty.locationId,
        locationName: duty.locationName,
        managerOnly: {
          anomalyResolutionId: null,
          payrollApplication: "none",
          reviewedBy: scenario.status === "resolved" ? managerUid : null,
        },
        monthKey: date.slice(0, 7),
        plannedEndAt,
        plannedStartAt,
        scheduleVersionId: `schedule_version_${worker.id}_initial`,
        status,
        updatedAt: recordCreatedAt,
        workerId: worker.id,
        workerName: worker.name,
        workerSafeSnapshot: workerSafeSnapshot({
          changeReason: scenario.changeReason ?? null,
          changeType: scenario.changeType ?? null,
          date,
          duty,
          effectiveEndAt,
          effectiveStartAt,
          recordId,
        }),
        workspaceId,
      });
    }
  }

  return { attendanceLogs, workRecords };
}

function resolveRecordScenario(workerId, date, dutyId) {
  const normal = {
    anomalyType: "none",
    checkoutMissing: false,
    endOffsetMinutes: 0,
    startOffsetMinutes: 0,
    status: "completed",
    type: "normal",
  };
  const scenarios = {
    "worker_kim|2026-05-05|duty_self_tue": {
      anomalyType: "missing_checkout",
      checkoutMissing: true,
      endOffsetMinutes: null,
      startOffsetMinutes: 1,
      status: "anomaly_unresolved",
      type: "missing_checkout",
    },
    "worker_kim|2026-05-07|duty_makeup_thu": {
      anomalyType: "location_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: -3,
      startOffsetMinutes: 2,
      status: "anomaly_unresolved",
      type: "location_mismatch",
    },
    "worker_lee|2026-04-20|duty_self_mon": {
      anomalyType: "time_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: 0,
      startOffsetMinutes: 13,
      status: "resolved",
      type: "time_mismatch",
    },
    "worker_lee|2026-04-27|duty_self_mon": {
      anomalyType: "time_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: 0,
      startOffsetMinutes: 16,
      status: "resolved",
      type: "time_mismatch",
    },
    "worker_park|2026-05-06|duty_grading_wed": {
      anomalyType: "absence_candidate",
      checkoutMissing: false,
      endOffsetMinutes: null,
      startOffsetMinutes: null,
      status: "anomaly_unresolved",
      type: "absence_candidate",
    },
    "worker_choi|2026-05-08|duty_exam_fri": {
      anomalyType: "location_unknown",
      checkoutMissing: false,
      endOffsetMinutes: 4,
      startOffsetMinutes: 0,
      status: "resolved",
      type: "location_unknown",
    },
    "worker_jung|2026-04-24|duty_grading_fri": {
      anomalyType: "time_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: -15,
      startOffsetMinutes: 0,
      status: "anomaly_unresolved",
      type: "time_mismatch",
    },
  };

  return scenarios[`${workerId}|${date}|${dutyId}`] ?? normal;
}

function locationForScenario(duty, direction, scenario) {
  if (scenario.type === "location_unknown" && direction === "out") {
    return null;
  }

  if (scenario.type === "location_mismatch" && direction === "out") {
    return {
      lat: 37.5191,
      lng: 127.0282,
      radiusMeters: 800,
      result: "outside_radius",
    };
  }

  return {
    lat: duty.locationId === "loc_annex" ? 37.4943 : duty.locationId === "loc_exam" ? 37.5018 : 37.4981,
    lng: duty.locationId === "loc_annex" ? 127.0621 : duty.locationId === "loc_exam" ? 127.0502 : 127.0588,
    radiusMeters: 20,
    result: "inside_radius",
  };
}

function createAnomalies(workspaceId, managerUid, workRecords) {
  const flagged = workRecords.filter((record) => record.anomalyType !== "none");
  const flags = flagged.map((record) => ({
    id: `flag_${record.id}`,
    anomalyType: record.anomalyType,
    createdAt: record.createdAt,
    dateKey: record.dateKey,
    dutyId: record.dutyId,
    dutyName: record.dutyName,
    evidence: {
      attendanceLogId: record.attendanceLogId,
      plannedEndAt: record.plannedEndAt,
      plannedStartAt: record.plannedStartAt,
    },
    managerOnly: true,
    monthKey: record.monthKey,
    severity: record.anomalyType === "absence_candidate" ? "high" : "medium",
    status: record.status === "resolved" ? "resolved" : "unresolved",
    workRecordId: record.id,
    workerId: record.workerId,
    workerName: record.workerName,
    workspaceId,
  }));
  const resolvedFlags = flags.filter((flag) => flag.status === "resolved");
  const resolutions = resolvedFlags.map((flag, index) => ({
    id: `resolution_${flag.workRecordId}`,
    anomalyFlagId: flag.id,
    createdAt: shiftTimestamp(flag.createdAt, (index + 1) * 60 * 60 * 1000),
    decidedBy: managerUid,
    decision: index % 2 === 0 ? "modify_record" : "mark_normal",
    managerNote: index % 2 === 0 ? "실제 출근 확인 후 시간 보정" : "GPS 실패로 정상 처리",
    payrollEffect: index % 2 === 0 ? "immediate" : "none",
    status: "completed",
    workRecordId: flag.workRecordId,
    workerId: flag.workerId,
    workspaceId,
  }));

  return { flags, resolutions };
}

function createOvertimeWorks(workspaceId, managerUid, workRecords, attendanceLogs) {
  const byRecord = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const attendanceByRecord = Object.fromEntries(
    attendanceLogs.map((log) => [log.id.replace(/^att_/, ""), log]),
  );
  const rows = [
    ["ot_kim_20260505_submitted", "wr_worker_kim_20260505_duty_self_tue", "submitted", null, "confirmed", "2026-05-05T21:20:00+09:00"],
    ["ot_lee_20260422_approved", "wr_worker_lee_20260422_duty_admin_wed", "approved", "confirmed", "confirmed", "2026-04-22T18:20:00+09:00"],
    ["ot_park_20260502_rejected", "wr_worker_park_20260502_duty_sat_grading", "rejected", null, "none", "2026-05-02T16:15:00+09:00"],
    ["ot_choi_20260418_withdrawn", "wr_worker_choi_20260418_duty_sat_exam", "withdrawn", null, "none", "2026-04-18T19:15:00+09:00"],
    ["ot_jung_20260429_held", "wr_worker_jung_20260429_duty_night_wed", "approved", "held", "held", "2026-04-29T22:15:00+09:00"],
    ["ot_kim_20260425_approved", "wr_worker_kim_20260425_duty_sat_morning", "approved", "confirmed", "confirmed", "2026-04-25T13:20:00+09:00"],
    ["ot_lee_20260506_approved", "wr_worker_lee_20260506_duty_admin_wed", "approved", "confirmed", "confirmed", "2026-05-06T18:30:00+09:00"],
  ];

  return rows.map(([id, workRecordId, status, payrollEffect, payrollStatus, submittedIso], index) => {
    const record = byRecord[workRecordId];

    return {
      id,
      approvedAt: status === "approved" ? shiftTimestamp(ts(submittedIso), 2 * 60 * 60 * 1000) : null,
      attendanceLogId: attendanceByRecord[workRecordId]?.id ?? null,
      createdAt: ts(submittedIso),
      decidedBy: status === "approved" || status === "rejected" ? managerUid : null,
      extraEndAt: shiftTimestamp(record.plannedEndAt, (index + 1) * 30 * 60 * 1000),
      extraStartAt: record.plannedEndAt,
      monthKey: record.monthKey,
      payrollEffect,
      payrollStatus,
      reason: "질문 응대 연장",
      rejectedReason: status === "rejected" ? "사전 승인 범위를 초과하지 않음" : null,
      status,
      submittedAt: ts(submittedIso),
      workRecordId,
      workerId: record.workerId,
      workerName: record.workerName,
      workspaceId,
    };
  });
}

function createRecordChangeEvents(workspaceId, managerUid, workRecords) {
  const targets = [
    ["change_kim_20260504", "wr_worker_kim_20260504_duty_math_mon", "modified", "보강 종료 후 정리 시간 반영", 15],
    ["change_park_20260423", "wr_worker_park_20260423_duty_question_thu", "modified", "실제 퇴근 확인", 10],
    ["change_jung_20260424", "wr_worker_jung_20260424_duty_grading_fri", "deleted", "해당 근무는 착오 등록", 0],
  ];
  const byId = Object.fromEntries(workRecords.map((record) => [record.id, record]));

  return targets.map(([id, workRecordId, changeType, reason, endDeltaMinutes], index) => {
    const record = byId[workRecordId];
    const afterEndAt = changeType === "deleted" ? null : shiftTimestamp(record.effectiveEndAt, endDeltaMinutes * 60 * 1000);
    const beforeSnapshot = workerSafeSnapshotFromRecord(record);
    const afterSnapshot = {
      ...beforeSnapshot,
      changeReason: reason,
      changeType,
      effectiveEndAt: afterEndAt,
    };

    return {
      id,
      afterSnapshot,
      beforeSnapshot,
      changedAt: ts(`2026-05-0${Math.min(index + 6, 9)}T13:00:00+09:00`),
      changedBy: managerUid,
      changeReason: reason,
      changeType,
      notification: {
        id: `ntf_worker_record_change_${id}`,
        channel: "fcm",
        createdAt: ts(`2026-05-0${Math.min(index + 6, 9)}T13:01:00+09:00`),
        eventType: "work_record_changed",
        payload: {
          afterSnapshot,
          beforeSnapshot,
          targetFocusId: workRecordId,
          targetScreen: "worker_work_record_detail",
          workRecordId,
        },
        readAt: null,
        recipientId: record.workerId,
        recipientRole: "worker",
        relatedEntityId: workRecordId,
        relatedEntityType: "workRecord",
        workspaceId,
      },
      workRecordId,
      workerId: record.workerId,
      workspaceId,
    };
  });
}

function createCorrectionRequests(workspaceId, managerUid, recordChanges, workRecords) {
  const changeById = Object.fromEntries(recordChanges.map((change) => [change.id, change]));
  const byRecord = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const rows = [
    ["cr_kim_20260504_submitted", "change_kim_20260504", "submitted", null, "none", "2026-05-06T18:00:00+09:00"],
    ["cr_park_20260423_approved", "change_park_20260423", "approved", "immediate", "applied", "2026-04-24T11:20:00+09:00"],
    ["cr_jung_20260424_submitted", "change_jung_20260424", "submitted", null, "held", "2026-04-25T08:30:00+09:00"],
    ["cr_lee_20260506_rejected", null, "rejected", null, "none", "2026-05-07T09:00:00+09:00"],
    ["cr_choi_20260508_withdrawn", null, "withdrawn", null, "none", "2026-05-09T10:10:00+09:00"],
  ];

  return rows.map(([id, changeId, status, payrollEffect, payrollStatus, submittedIso]) => {
    const change = changeId ? changeById[changeId] : null;
    const fallbackRecord = id.includes("lee")
      ? byRecord.wr_worker_lee_20260506_duty_admin_wed
      : byRecord.wr_worker_choi_20260508_duty_exam_fri;
    const record = change ? byRecord[change.workRecordId] : fallbackRecord;

    return {
      id,
      afterSnapshot: change?.afterSnapshot ?? workerSafeSnapshotFromRecord(record),
      beforeSnapshot: change?.beforeSnapshot ?? workerSafeSnapshotFromRecord(record),
      createdAt: ts(submittedIso),
      decidedAt: status === "approved" || status === "rejected" ? shiftTimestamp(ts(submittedIso), 24 * 60 * 60 * 1000) : null,
      decidedBy: status === "approved" || status === "rejected" ? managerUid : null,
      managerNote: status === "approved" ? "조교 설명 확인 후 승인" : status === "rejected" ? "출퇴근 원장과 불일치" : null,
      monthKey: record.monthKey,
      payrollEffect,
      payrollStatus,
      reason: "실제 근무 시간과 다르게 반영된 것 같습니다.",
      source: change ? "record_change_notification" : "calendar",
      sourceNotificationId: change ? change.notification.id : null,
      status,
      submittedAt: ts(submittedIso),
      workRecordId: record.id,
      workerId: record.workerId,
      workerName: record.workerName,
      workspaceId,
    };
  });
}

function createBonusItems(workspaceId, managerUid) {
  return [
    bonus("bonus_kim_apr_training", "worker_kim", "김서연", "2026-04", 25000, "pre_tax", "신입 교육 지원", "2026-04-28T12:00:00+09:00", "confirmed"),
    bonus("bonus_lee_apr_reconfirm", "worker_lee", "이민지", "2026-04", 18000, "pre_tax", "시험대비 추가 보정", "2026-05-04T10:00:00+09:00", "confirmed"),
    bonus("bonus_park_apr_meal", "worker_park", "박정훈", "2026-04", 12000, "post_tax", "식대 보전", "2026-04-29T10:00:00+09:00", "confirmed"),
    bonus("bonus_choi_apr_fixed", "worker_choi", "최유진", "2026-04", -30000, "post_tax", "결근 차감", "2026-04-30T16:00:00+09:00", "confirmed"),
    bonus("bonus_jung_apr_hold", "worker_jung", "정하윤", "2026-04", -20000, "post_tax", "확인 필요 차감", "2026-04-30T17:00:00+09:00", "held"),
    bonus("bonus_kim_may_pending", "worker_kim", "김서연", "2026-05", 15000, "pre_tax", "대체 근무 보정", "2026-05-08T12:00:00+09:00", "held"),
  ].map((item) => ({
    ...item,
    createdBy: managerUid,
    updatedAt: item.createdAt,
    workspaceId,
  }));
}

function bonus(id, workerId, workerName, monthKey, amount, taxScope, label, createdIso, payrollStatus) {
  return {
    id,
    amount,
    createdAt: ts(createdIso),
    label,
    monthKey,
    payrollStatus,
    taxScope,
    workerId,
    workerName,
  };
}

function createPayrollDocuments(workspaceId, managerUid, activeWorkers, bonusItems) {
  const paidAt = ts("2026-05-05T11:00:00+09:00");
  const confirmedAt = ts("2026-05-02T14:00:00+09:00");
  const configs = [
    ["worker_kim", "paid", false, 438900, paidAt],
    ["worker_choi", "paid", false, 1814200, paidAt],
    ["worker_lee", "processing", true, 392100, null],
    ["worker_park", "processing", false, 338600, null],
  ];
  const byWorker = Object.fromEntries(activeWorkers.map((worker) => [worker.id, worker]));
  const managerStatements = configs.map(([workerId, status, needsReconfirmation, finalAmount, statusAt]) => {
    const worker = byWorker[workerId];

    return {
      id: `pay_202604_${workerId}`,
      confirmedAt,
      confirmedBy: managerUid,
      currentCalculationSummary: needsReconfirmation
        ? { finalAmount: finalAmount + 18000, sourceChangedAt: ts("2026-05-04T10:00:00+09:00") }
        : { finalAmount, sourceChangedAt: null },
      managerOnly: {
        diffReason: needsReconfirmation ? "확정 후 BonusItem 추가" : null,
        needsReconfirmation,
      },
      monthKey: "2026-04",
      paidAt: status === "paid" ? statusAt : null,
      scheduledPaymentDate: "2026-05-05",
      snapshot: {
        bonusItemIds: bonusItems
          .filter((item) => item.workerId === workerId && item.monthKey === "2026-04" && item.payrollStatus === "confirmed")
          .map((item) => item.id),
        finalAmount,
        overtimePay: workerId === "worker_kim" ? 10000 : 0,
        payrollType: workerId === "worker_choi" ? "monthly" : "hourly",
        taxAmount: Math.round(finalAmount * 0.033),
      },
      status,
      workerId,
      workerName: worker.name,
      workspaceId,
    };
  });
  const workerStatements = managerStatements.map((statement) => ({
    id: `${statement.id}_worker`,
    confirmedAt: statement.confirmedAt,
    monthKey: statement.monthKey,
    paidAt: statement.paidAt,
    scheduledPaymentDate: statement.scheduledPaymentDate,
    snapshot: statement.snapshot,
    status: statement.status,
    workerId: statement.workerId,
    workerName: statement.workerName,
    workspaceId,
  }));

  return { managerStatements, workerStatements };
}

function createHandoverDocuments(workspaceId, managerUid) {
  return [
    {
      id: "handover_20260506_operations",
      createdAt: ts("2026-05-06T09:00:00+09:00"),
      createdBy: managerUid,
      notifyWorkers: true,
      publishedAt: ts("2026-05-06T09:30:00+09:00"),
      publishedContent: [
        "## 시험대비 주간 운영",
        "### 출결 확인",
        "- 퇴근 미처리 알림은 당일 23:30 이후 확인합니다.",
        "- 위치 이상은 REC-01에서 근무기록 기준으로 처리합니다.",
        "### 질문 응대",
        "- 고3 질문은 본원 3층에서 우선 처리합니다.",
      ].join("\n"),
      status: "published",
      updatedAt: ts("2026-05-06T09:30:00+09:00"),
      workspaceId,
    },
  ];
}

function createAiRuns(workspaceId, managerUid, workRecords) {
  const evidence = workRecords
    .filter((record) => record.workerId === "worker_lee" && record.anomalyType === "time_mismatch")
    .map((record) => record.id);

  return [
    {
      id: "ai_run_20260509_repeated_late",
      completedAt: ts("2026-05-09T11:05:00+09:00"),
      createdAt: ts("2026-05-09T11:00:00+09:00"),
      createdBy: managerUid,
      inputSummary: {
        periodEnd: "2026-05-08",
        periodStart: "2026-04-13",
        workRecordCount: workRecords.length,
      },
      candidates: [
        {
          id: "candidate_worker_lee_tuesday_late",
          evidenceWorkRecordIds: evidence,
          severity: "medium",
          summary: "화요일 자습감독 근무에서 반복 지각 패턴이 관찰됨",
          targetWorkerId: "worker_lee",
          targetWorkRecordIds: evidence,
        },
      ],
      status: "completed",
      visibleTo: "manager",
      workspaceId,
    },
    {
      id: "ai_run_20260510_insufficient",
      completedAt: ts("2026-05-10T10:02:00+09:00"),
      createdAt: ts("2026-05-10T10:00:00+09:00"),
      createdBy: managerUid,
      reason: "선택 기간 내 비교 가능한 근무기록 부족",
      status: "insufficient_data",
      visibleTo: "manager",
      workspaceId,
    },
  ];
}

function createNotifications(context) {
  const { corrections, handover, managerUid, overtime, payroll, recordChanges, workers, workspaceId } = context;
  const notifications = [];
  const add = (id, recipientRole, recipientId, channel, eventType, createdAt, relatedEntityType, relatedEntityId, payload = {}) => {
    notifications.push({
      id,
      channel,
      createdAt: ts(createdAt),
      deliveryStatus: channel === "kakao_alimtalk" ? "queued" : "stored",
      eventType,
      payload,
      readAt: null,
      recipientId,
      recipientRole,
      relatedEntityId,
      relatedEntityType,
      workspaceId,
    });
  };

  add("ntf_manager_membership_pending", "manager", managerUid, "web", "membership_submitted", "2026-05-10T14:11:00+09:00", "membership", "membership_worker_yang_pending", { targetScreen: "WKR-01" });
  add("ntf_worker_membership_approved_kim", "worker", "worker_kim", "fcm", "membership_approved", "2026-04-14T10:31:00+09:00", "membership", "membership_worker_kim", { targetScreen: "worker_home" });
  add("ntf_worker_membership_rejected_oh", "worker", "worker_oh_rejected", "fcm", "membership_rejected", "2026-04-18T16:01:00+09:00", "membership", "membership_worker_oh_rejected", { reason: "계좌 정보 확인 불가" });
  add("ntf_manager_schedule_submitted_park", "manager", managerUid, "web", "schedule_submitted", "2026-05-09T20:11:00+09:00", "scheduleRequest", "schedule_change_worker_park_pending", { targetScreen: "SCH-01" });
  add("ntf_worker_schedule_approved_kim", "worker", "worker_kim", "fcm", "schedule_approved", "2026-04-13T18:01:00+09:00", "scheduleRequest", "schedule_initial_worker_kim", { targetScreen: "worker_schedule" });
  add("ntf_worker_schedule_rejected_choi", "worker", "worker_choi", "fcm", "schedule_rejected", "2026-04-25T12:31:00+09:00", "scheduleRequest", "schedule_change_worker_choi_rejected", { reason: "시험대비 기간 배치 유지 필요" });
  add("ntf_worker_schedule_changed_lee", "worker", "worker_lee", "fcm", "schedule_changed_by_manager", "2026-05-03T15:01:00+09:00", "scheduleVersion", "schedule_version_worker_lee_manager_change", { targetScreen: "worker_schedule" });
  add("ntf_worker_duty_expiring_choi", "worker", "worker_choi", "fcm", "duty_ending", "2026-04-25T09:00:00+09:00", "duty", "duty_sun_expired", { targetScreen: "worker_schedule" });
  add("ntf_worker_missing_checkout_kim", "worker", "worker_kim", "fcm", "missing_checkout", "2026-05-05T23:31:00+09:00", "workRecord", "wr_worker_kim_20260505_duty_self_tue", { targetScreen: "worker_work_record_detail" });

  for (const work of overtime) {
    if (work.status === "submitted") {
      add(`ntf_manager_overtime_${work.id}`, "manager", managerUid, "web", "overtime_submitted", isoPlus(work.submittedAt, 60), "overtimeWork", work.id, { targetScreen: "REC-01", targetFocusId: work.workRecordId });
    }

    if (work.status === "approved" || work.status === "rejected") {
      add(`ntf_worker_overtime_${work.id}`, "worker", work.workerId, "fcm", work.status === "approved" ? "overtime_approved" : "overtime_rejected", "2026-05-06T19:00:00+09:00", "overtimeWork", work.id, { payrollEffect: work.payrollEffect });
    }
  }

  for (const request of corrections) {
    if (request.status === "submitted") {
      add(`ntf_manager_correction_${request.id}`, "manager", managerUid, "web", "correction_submitted", isoPlus(request.submittedAt, 60), "correctionRequest", request.id, { targetScreen: "REC-01", targetFocusId: request.workRecordId });
    }

    if (request.status === "approved" || request.status === "rejected") {
      add(`ntf_worker_correction_${request.id}`, "worker", request.workerId, "fcm", request.status === "approved" ? "correction_approved" : "correction_rejected", "2026-04-25T11:00:00+09:00", "correctionRequest", request.id, { targetScreen: "worker_work_record_detail" });
    }
  }

  add("ntf_worker_payroll_setting_changed_jung", "worker", "worker_jung", "fcm", "payroll_setting_changed", "2026-04-20T10:00:00+09:00", "payrollSetting", "payroll_worker_jung", { targetScreen: "worker_payroll" });

  for (const statement of payroll.managerStatements) {
    add(`ntf_worker_pay_confirmed_${statement.workerId}`, "worker", statement.workerId, "fcm", "pay_confirmed", "2026-05-02T14:05:00+09:00", "payStatement", statement.id, { monthKey: "2026-04", targetScreen: "worker_pay_statement" });

    if (statement.status === "paid") {
      add(`ntf_worker_pay_paid_${statement.workerId}`, "worker", statement.workerId, "fcm", "pay_paid", "2026-05-05T11:05:00+09:00", "payStatement", statement.id, { monthKey: "2026-04", targetScreen: "worker_pay_statement" });
    }
  }

  for (const worker of workers.active) {
    add(`ntf_worker_handover_${worker.id}`, "worker", worker.id, "fcm", "handover_published", "2026-05-06T09:31:00+09:00", "handoverDocument", handover[0].id, { targetScreen: "worker_handover" });
  }

  return notifications.filter(
    (notification) => !recordChanges.some((change) => change.notification.id === notification.id),
  );
}

function createProjections(context) {
  const { anomalies, corrections, overtime, payroll, recordChanges, workers, workspaceId } = context;
  const workerById = Object.fromEntries(workers.active.map((worker) => [worker.id, worker]));
  const operationalInboxItems = [
    inbox("inbox_membership_pending", "membership_pending", "membership", "membership_worker_yang_pending", "submitted", "2026-05-10T14:10:00+09:00", "worker_yang_pending", "양도현", "WKR-01", "membership_worker_yang_pending"),
    inbox("inbox_schedule_pending", "schedule_pending", "scheduleRequest", "schedule_change_worker_park_pending", "submitted", "2026-05-09T20:10:00+09:00", "worker_park", "박정훈", "SCH-01", "schedule_change_worker_park_pending"),
    inbox("inbox_overtime_pending", "overtime_pending", "overtimeWork", "ot_kim_20260505_submitted", "submitted", "2026-05-05T21:20:00+09:00", "worker_kim", "김서연", "REC-01", "wr_worker_kim_20260505_duty_self_tue"),
    inbox("inbox_correction_pending", "correction_pending", "correctionRequest", "cr_kim_20260504_submitted", "submitted", "2026-05-06T18:00:00+09:00", "worker_kim", "김서연", "REC-01", "wr_worker_kim_20260504_duty_math_mon"),
    inbox("inbox_anomaly_unresolved", "anomaly_unresolved", "anomalyFlag", "flag_wr_worker_kim_20260505_duty_self_tue", "unresolved", "2026-05-05T23:30:00+09:00", "worker_kim", "김서연", "REC-01", "wr_worker_kim_20260505_duty_self_tue"),
    inbox("inbox_payroll_reconfirmation", "payroll_reconfirmation", "payStatement", "pay_202604_worker_lee", "needs_reconfirmation", "2026-05-04T10:00:00+09:00", "worker_lee", "이민지", "PAY-01", "pay_202604_worker_lee"),
  ].map((item) => ({ ...item, workspaceId }));
  const payrollWorkerMonthRows = [];

  for (const worker of workers.active) {
    const aprilStatement = payroll.managerStatements.find((statement) => statement.workerId === worker.id);
    const aprilStatus = aprilStatement?.managerOnly.needsReconfirmation
      ? "needs_reconfirmation"
      : aprilStatement?.status ?? "unconfirmed";

    payrollWorkerMonthRows.push({
      id: `pwm_202604_${worker.id}`,
      currentCalculationSummary: {
        finalAmount: aprilStatement?.currentCalculationSummary.finalAmount ?? null,
        hasBlockers: worker.id === "worker_jung",
      },
      monthKey: "2026-04",
      payStatementId: aprilStatement?.id ?? null,
      rowStatus: aprilStatus,
      sortKeys: {
        payrollType: worker.id === "worker_choi" || worker.id === "worker_jung" ? "monthly" : "hourly",
        workerName: worker.name,
      },
      workerId: worker.id,
      workerNameSnapshot: worker.name,
      workspaceId,
    });
    payrollWorkerMonthRows.push({
      id: `pwm_202605_${worker.id}`,
      currentCalculationSummary: {
        finalAmount: null,
        hasBlockers: worker.id === "worker_kim",
      },
      monthKey: "2026-05",
      payStatementId: null,
      rowStatus: "unconfirmed",
      sortKeys: {
        payrollType: worker.id === "worker_choi" || worker.id === "worker_jung" ? "monthly" : "hourly",
        workerName: worker.name,
      },
      workerId: worker.id,
      workerNameSnapshot: worker.name,
      workspaceId,
    });
  }

  return {
    operationalInboxItems,
    payrollWorkerMonthRows,
    wkr05PendingRows: [
      ...anomalies.flags.filter((flag) => flag.workerId === "worker_kim" && flag.status === "unresolved"),
      ...overtime.filter((work) => work.workerId === "worker_kim" && work.status === "submitted"),
      ...corrections.filter((request) => request.workerId === "worker_kim" && request.status === "submitted"),
      ...recordChanges.filter((change) => change.workerId === "worker_kim"),
    ].map((item) => ({
      ...item,
      workerName: workerById.worker_kim.name,
    })),
  };
}

function inbox(id, itemType, sourceType, sourceId, status, sortIso, workerId, workerName, targetScreen, targetFocusId) {
  return {
    id,
    itemType,
    sortAt: ts(sortIso),
    sourceId,
    sourceType,
    status,
    targetFocusId,
    targetScreen,
    workerId,
    workerNameSnapshot: workerName,
  };
}

function workerSafeSnapshotFromRecord(record) {
  return {
    changeReason: record.workerSafeSnapshot.changeReason,
    changeType: record.workerSafeSnapshot.changeType,
    date: record.date,
    dutyName: record.dutyName,
    effectiveEndAt: record.effectiveEndAt,
    effectiveStartAt: record.effectiveStartAt,
    locationName: record.locationName,
    plannedEndAt: record.plannedEndAt,
    plannedStartAt: record.plannedStartAt,
    workRecordId: record.id,
  };
}

function workerSafeSnapshot({ changeReason, changeType, date, duty, effectiveEndAt, effectiveStartAt, recordId }) {
  return {
    changeReason,
    changeType,
    date,
    dutyName: duty.name,
    effectiveEndAt,
    effectiveStartAt,
    locationName: duty.locationName,
    plannedEndAt: ts(`${date}T${duty.endTime}:00+09:00`),
    plannedStartAt: ts(`${date}T${duty.startTime}:00+09:00`),
    workRecordId: recordId,
  };
}

function summarizeWrites(writes) {
  const byCollection = {};

  for (const write of writes) {
    const parts = write.path.split("/");
    const collectionName = parts.length >= 4 ? parts[2] : parts[0];

    byCollection[collectionName] = (byCollection[collectionName] ?? 0) + 1;
  }

  return {
    byCollection,
    total: writes.length,
  };
}

function validateSeedPlan(writes) {
  const docs = writes.map((write) => ({
    collectionName: collectionNameFromPath(write.path),
    id: write.path.split("/").at(-1),
    path: write.path,
    ...write.data,
  }));
  const managerStatements = docs.filter((doc) => doc.collectionName === "payStatements");
  const workerStatements = docs.filter((doc) => doc.collectionName === "workerPayStatements");
  const notifications = docs.filter((doc) => doc.collectionName === "notifications");
  const payrollRows = docs.filter((doc) => doc.collectionName === "payrollWorkerMonthRows");
  const correctionRequests = docs.filter((doc) => doc.collectionName === "correctionRequests");
  const forbiddenWorkerKeys = [
    "anomalyFlags",
    "managerOnly",
    "needsReconfirmation",
    "payrollApplication",
    "payrollEffect",
    "unresolved",
  ];

  for (const statement of workerStatements) {
    for (const key of ["managerOnly", "needsReconfirmation", "currentCalculationSummary"]) {
      if (key in statement) {
        throw new Error(`workerPayStatement ${statement.id} leaks manager-only key: ${key}`);
      }
    }
  }

  for (const request of correctionRequests) {
    assertWorkerSafeSnapshot(request.beforeSnapshot, `correction ${request.id} beforeSnapshot`, forbiddenWorkerKeys);
    assertWorkerSafeSnapshot(request.afterSnapshot, `correction ${request.id} afterSnapshot`, forbiddenWorkerKeys);
  }

  for (const notification of notifications.filter((item) => item.eventType === "work_record_changed")) {
    assertWorkerSafeSnapshot(notification.payload?.beforeSnapshot, `notification ${notification.id} beforeSnapshot`, forbiddenWorkerKeys);
    assertWorkerSafeSnapshot(notification.payload?.afterSnapshot, `notification ${notification.id} afterSnapshot`, forbiddenWorkerKeys);
  }

  for (const statement of managerStatements.filter((item) => item.status === "paid")) {
    assertNoPaidMonthSourceChangeAfterPaidAt(statement, docs);
  }

  for (const row of payrollRows.filter((item) => item.rowStatus === "unconfirmed")) {
    if (managerStatements.some((statement) => statement.workerId === row.workerId && statement.monthKey === row.monthKey)) {
      throw new Error(`unconfirmed payroll row has a PayStatement document: ${row.id}`);
    }
  }

  if (notifications.some((item) => item.eventType === "pay_reconfirmed")) {
    throw new Error("pay_reconfirmed worker notification must not exist without a real reconfirm action.");
  }
}

function collectionNameFromPath(path) {
  const parts = path.split("/");

  return parts.length >= 4 ? parts[2] : parts[0];
}

function assertWorkerSafeSnapshot(snapshot, label, forbiddenKeys) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error(`${label} is missing.`);
  }

  for (const key of forbiddenKeys) {
    if (key in snapshot) {
      throw new Error(`${label} leaks manager-only key: ${key}`);
    }
  }
}

function assertNoPaidMonthSourceChangeAfterPaidAt(statement, docs) {
  const sourceCollections = [
    "anomalyResolutions",
    "bonusItems",
    "correctionRequests",
    "overtimeWorks",
    "workRecords",
  ];

  for (const doc of docs) {
    if (
      !sourceCollections.includes(doc.collectionName) ||
      doc.workerId !== statement.workerId ||
      doc.monthKey !== statement.monthKey
    ) {
      continue;
    }

    const changedAt = doc.updatedAt ?? doc.decidedAt ?? doc.approvedAt ?? doc.createdAt;

    if (changedAt && millis(changedAt) > millis(statement.paidAt)) {
      throw new Error(
        `paid worker-month ${statement.workerId}/${statement.monthKey} has source change after paidAt: ${doc.path}`,
      );
    }
  }
}

function printSummary(options, summary, assertions) {
  console.log("Wee Firebase seed plan");
  console.log(`  workspaceId: ${options.workspaceId}`);
  console.log(`  managerUid:  ${options.managerUid}`);
  console.log(`  projectId:   ${options.projectId || "(not set)"}`);
  console.log(`  batchId:     ${options.batchId}`);
  console.log(`  mode:        ${options.dryRun ? "dry-run" : "write"}`);
  console.log(`  cleanup:     ${options.cleanup ? "yes" : "no"}`);
  console.log(`  documents:   ${summary.total}`);
  console.log("\nDocuments by collection:");

  for (const [collectionName, count] of Object.entries(summary.byCollection).sort()) {
    console.log(`  ${collectionName.padEnd(24)} ${count}`);
  }

  console.log("\nBuilt-in assertions:");

  for (const assertion of assertions) {
    console.log(`  - ${assertion}`);
  }
}

function ts(iso) {
  return toDate(iso);
}

function toDate(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }

  return date;
}

function shiftTimestamp(timestamp, milliseconds) {
  return new Date(millis(timestamp) + milliseconds);
}

function isoPlus(timestamp, milliseconds) {
  return new Date(millis(timestamp) + milliseconds).toISOString();
}

function dateKey(timestamp) {
  return new Date(millis(timestamp) + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function millis(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  throw new Error(`Expected Date value, got ${typeof value}`);
}

function datesBetween(startDate, endDate) {
  const dates = [];
  let cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${value}`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}
