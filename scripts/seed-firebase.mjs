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
  --cleanup             Delete workspace seed-target collections before writing.
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
    overtime,
  );
  reconcileWorkRecordProcessingState({
    anomalies,
    corrections,
    overtime,
    workRecords: attendance.workRecords,
  });
  const bonusItems = createBonusItems(workspaceId, managerUid);
  const payroll = createPayrollDocuments(
    workspaceId,
    managerUid,
    workers.active,
    bonusItems,
    payrollSettings,
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
    settings: {
      anomalyToleranceMinutes: 5,
      payrollRoundingUnitWon: 1,
      regularPaymentDay: 5,
      workTimeRoundingUnitMinutes: 6,
    },
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
    "Cleanup removes all documents in seed-target workspace collections, including locations and duties, before writing a fresh linked seed graph.",
    "4월 paid worker-months have no source changes after paidAt.",
    "needsReconfirmation=true is manager-only; no worker reconfirmation notification is generated.",
    "workerPayStatements omit needsReconfirmation and manager-only calculation diffs.",
    "CorrectionRequest snapshots and record-change notification payloads use worker-safe WorkRecord snapshots.",
    "Seed includes REC flow examples for pure anomaly, correction, open anomaly+correction, closed anomaly+correction, overtime, overtime+anomaly, and overtime correction.",
    "Seed includes at least five cross-worker same-day overlapping WorkRecords for timeline layout testing.",
    "Seed has no same-worker same-day overlapping WorkRecords.",
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
      dutyCount: 9,
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
    usageCount: [7, 4, 2, 4, 3, 3][index],
    workspaceId,
  }));
}

function createWorkerTags(workspaceId, managerUid) {
  return [
    ["worker_tag_new", "신입", "green", 1],
    ["worker_tag_veteran", "베테랑", "grey", 2],
    ["worker_tag_grade12", "고3", "blue", 2],
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
  const pending = createAffiliationApplicationWorkers(workspaceId);
  const rejectedReason = "계좌 정보 확인 불가";
  const rejected = {
    ...worker("worker_oh_rejected", "worker-auth-oh", "오지훈", [], "2026-04-18T12:40:00+09:00"),
    membershipStatus: "rejected",
    status: "inactive",
    updatedAt: ts("2026-04-18T16:00:00+09:00"),
    workspaceId,
  };
  const all = active;
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
    ...pending.map((item) => pendingMembership(item, workspaceId)),
    {
      id: "membership_worker_oh_rejected",
      account: rejected.account,
      appliedAt: rejected.appliedAt,
      bankbookStatus: "업로드 완료",
      contact: rejected.contact,
      createdAt: rejected.appliedAt,
      decidedAt: ts("2026-04-18T16:00:00+09:00"),
      decidedBy: managerUid,
      rejectionReason: rejectedReason,
      status: "rejected",
      workerId: rejected.id,
      workerName: rejected.name,
      workerUid: rejected.workerUid,
      workspaceId,
    },
  ];

  return { active, all, memberships, pending, rejected };
}

function createAffiliationApplicationWorkers(workspaceId) {
  return [
    applicationWorker(
      "worker_yang_pending",
      "worker-auth-yang",
      "양도현",
      [],
      "2026-05-10T14:10:00+09:00",
      { requestedHourlyRate: 9800 },
    ),
    applicationWorker(
      "worker_han_pending",
      "worker-auth-han",
      "한지우",
      [],
      "2026-05-11T09:35:00+09:00",
      {
        bankbookDownloadUrl: "https://example.com/seed/worker-han-bankbook.png",
        requestedHourlyRate: 10500,
      },
    ),
    applicationWorker(
      "worker_seo_pending",
      "worker-auth-seo",
      "서민아",
      [],
      "2026-05-11T11:20:00+09:00",
      {
        bankbookMissing: true,
        requestedMonthlySalary: 1650000,
      },
    ),
    applicationWorker(
      "worker_lim_pending",
      "worker-auth-lim",
      "임태준",
      [],
      "2026-05-12T08:50:00+09:00",
      { requestedHourlyRate: 11200 },
    ),
  ].map((item) => ({
    ...item,
    membershipStatus: "pending",
    status: "pending",
    updatedAt: item.appliedAt,
    workspaceId,
  }));
}

function applicationWorker(id, workerUid, name, tagIds, appliedIso, options = {}) {
  const appliedAt = ts(appliedIso);
  const account = {
    bankName: "국민은행",
    holderName: name,
    numberLast4: id.endsWith("yang_pending")
      ? "1107"
      : id.length.toString().padStart(4, "0").slice(-4),
  };

  if (!options.bankbookMissing && !options.bankbookDownloadUrl) {
    account.storagePath = `seed/bankbooks/${id}.png`;
  }

  return {
    id,
    account,
    appliedAt,
    bankbookStatus: options.bankbookMissing ? "미업로드" : "업로드 완료",
    ...(options.bankbookDownloadUrl
      ? { bankbookDownloadUrl: options.bankbookDownloadUrl }
      : {}),
    ...(options.requestedHourlyRate
      ? { requestedHourlyRate: options.requestedHourlyRate }
      : {}),
    ...(options.requestedMonthlySalary
      ? { requestedMonthlySalary: options.requestedMonthlySalary }
      : {}),
    contact: `010-${id.length.toString().padStart(4, "0")}-2026`,
    createdAt: appliedAt,
    name,
    nameKey: name.toLocaleLowerCase("ko-KR"),
    ...(tagIds.length > 0 ? { tagIds } : {}),
    workerUid,
  };
}

function pendingMembership(worker, workspaceId) {
  return {
    id: membershipDocumentId(worker),
    account: worker.account,
    appliedAt: worker.appliedAt,
    ...(worker.bankbookDownloadUrl
      ? { bankbookDownloadUrl: worker.bankbookDownloadUrl }
      : {}),
    bankbookStatus: worker.bankbookStatus,
    contact: worker.contact,
    createdAt: worker.appliedAt,
    requestedHourlyRate: worker.requestedHourlyRate ?? null,
    requestedMonthlySalary: worker.requestedMonthlySalary ?? null,
    status: "pending",
    workerId: worker.id,
    workerName: worker.name,
    workerUid: worker.workerUid,
    workspaceId,
  };
}

function membershipDocumentId(worker) {
  return `membership_${worker.id}`;
}

function pendingMembershipNotificationId(worker) {
  if (worker.id === "worker_yang_pending") {
    return "ntf_manager_membership_pending";
  }

  return `ntf_manager_membership_pending_${pendingWorkerIdSuffix(worker)}`;
}

function pendingMembershipInboxId(worker) {
  if (worker.id === "worker_yang_pending") {
    return "inbox_membership_pending";
  }

  return `inbox_membership_pending_${pendingWorkerIdSuffix(worker)}`;
}

function pendingWorkerIdSuffix(worker) {
  return worker.id.replace(/^worker_/, "");
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
    ...(tagIds.length > 0 ? { tagIds } : {}),
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
    ["duty_overlap_tue_questions", "화", "19:30", "21:30", "loc_main", ["질문"], "화요 겹침 질문", "2026-04-14", "2026-05-26"],
    ["duty_overlap_thu_review", "목", "17:30", "19:30", "loc_main", ["질문", "보강"], "목요 겹침 리뷰", "2026-04-16", "2026-05-28"],
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
    { dutyId: "duty_overlap_tue_questions", workerId: "worker_lee" },
    { dutyId: "duty_admin_wed", workerId: "worker_lee" },
    { dutyId: "duty_overlap_thu_review", workerId: "worker_lee" },
    { dutyId: "duty_exam_fri", workerId: "worker_lee" },
    { dutyId: "duty_sun_exam_expired", workerId: "worker_lee" },
    { dutyId: "duty_question_tue", workerId: "worker_park" },
    { dutyId: "duty_grading_wed", workerId: "worker_park" },
    { dutyId: "duty_question_thu", workerId: "worker_park" },
    { dutyId: "duty_sat_grading", workerId: "worker_park" },
    { dutyId: "duty_late_mon", workerId: "worker_choi" },
    { dutyId: "duty_overlap_tue_questions", workerId: "worker_choi" },
    { dutyId: "duty_overlap_thu_review", workerId: "worker_choi" },
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

  attendanceLogs.push(
    ...createStandaloneOvertimeAttendanceLogs(workspaceId, workerById),
  );

  return { attendanceLogs, workRecords };
}

function createStandaloneOvertimeAttendanceLogs(workspaceId, workerById) {
  const rows = [
    {
      id: "att_ot_kim_20260428_question_extension",
      checkInIso: "2026-04-28T20:55:00+09:00",
      checkOutIso: "2026-04-28T21:36:00+09:00",
      date: "2026-04-28",
      locationId: "loc_annex",
      locationName: "별관 자습실",
      workerId: "worker_kim",
    },
    {
      id: "att_ot_lee_20260422_admin_wrapup",
      checkInIso: "2026-04-22T18:00:00+09:00",
      checkOutIso: "2026-04-22T18:42:00+09:00",
      date: "2026-04-22",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_lee",
    },
    {
      id: "att_ot_park_20260502_grading_extension",
      checkInIso: "2026-05-02T16:00:00+09:00",
      checkOutIso: "2026-05-02T16:34:00+09:00",
      date: "2026-05-02",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_park",
    },
    {
      id: "att_ot_choi_20260418_exam_wrapup",
      checkInIso: "2026-04-18T19:00:00+09:00",
      checkOutIso: "2026-04-18T19:32:00+09:00",
      date: "2026-04-18",
      locationId: "loc_exam",
      locationName: "시험대비 교실",
      workerId: "worker_choi",
    },
    {
      id: "att_ot_jung_20260429_night_questions",
      checkInIso: "2026-04-29T22:00:00+09:00",
      checkOutIso: "2026-04-29T22:48:00+09:00",
      date: "2026-04-29",
      locationId: "loc_exam",
      locationName: "시험대비 교실",
      workerId: "worker_jung",
    },
    {
      id: "att_ot_kim_20260508_makeup_review",
      checkInIso: "2026-05-08T18:20:00+09:00",
      checkOutIso: "2026-05-08T19:12:00+09:00",
      date: "2026-05-08",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_kim",
    },
    {
      id: "att_ot_lee_20260506_admin_wrapup",
      checkInIso: "2026-05-06T18:00:00+09:00",
      checkOutIso: "2026-05-06T18:55:00+09:00",
      date: "2026-05-06",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_lee",
    },
    {
      id: "att_ot_park_20260507_parent_call",
      checkInIso: "2026-05-07T18:00:00+09:00",
      checkOutIso: "2026-05-07T18:48:00+09:00",
      date: "2026-05-07",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_park",
    },
    {
      id: "att_ot_jung_20260506_night_followup",
      checkInIso: "2026-05-06T22:00:00+09:00",
      checkOutIso: "2026-05-06T22:36:00+09:00",
      date: "2026-05-06",
      locationId: "loc_exam",
      locationName: "시험대비 교실",
      workerId: "worker_jung",
    },
    {
      id: "att_ot_lee_20260429_admin_late",
      checkInIso: "2026-04-29T18:00:00+09:00",
      checkOutIso: "2026-04-29T18:38:00+09:00",
      date: "2026-04-29",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_lee",
    },
    {
      id: "att_ot_park_20260430_parent_brief",
      checkInIso: "2026-04-30T18:00:00+09:00",
      checkOutIso: "2026-04-30T18:44:00+09:00",
      date: "2026-04-30",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_park",
    },
    {
      id: "att_ot_lee_20260504_self_followup",
      checkInIso: "2026-05-04T20:00:00+09:00",
      checkOutIso: "2026-05-04T20:30:00+09:00",
      date: "2026-05-04",
      locationId: "loc_annex",
      locationName: "별관 자습실",
      workerId: "worker_lee",
    },
    {
      id: "att_ot_jung_20260501_grading_followup",
      checkInIso: "2026-05-01T20:00:00+09:00",
      checkOutIso: "2026-05-01T20:28:00+09:00",
      date: "2026-05-01",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_jung",
    },
    {
      id: "att_ot_kim_20260505_self_wrapup",
      checkInIso: "2026-05-05T21:00:00+09:00",
      checkOutIso: "2026-05-05T21:26:00+09:00",
      date: "2026-05-05",
      locationId: "loc_annex",
      locationName: "별관 자습실",
      workerId: "worker_kim",
    },
    {
      id: "att_ot_park_20260425_grading_wrapup",
      checkInIso: "2026-04-25T16:00:00+09:00",
      checkOutIso: "2026-04-25T16:31:00+09:00",
      date: "2026-04-25",
      locationId: "loc_main",
      locationName: "본원 3층",
      workerId: "worker_park",
    },
  ];

  return rows.map((row) => {
    const worker = workerById[row.workerId];
    const locationSeed = { locationId: row.locationId };
    const checkInAt = ts(row.checkInIso);
    const checkOutAt = row.checkOutIso ? ts(row.checkOutIso) : null;

    return {
      id: row.id,
      anomalyType: "none",
      checkInAt,
      checkInLocation: locationForScenario(locationSeed, "in", { type: "normal" }),
      checkOutAt,
      checkOutLocation: checkOutAt
        ? locationForScenario(locationSeed, "out", { type: "normal" })
        : null,
      createdAt: shiftTimestamp(checkInAt, -2 * 60 * 1000),
      date: row.date,
      dutyId: null,
      dutyName: "추가근무",
      locationId: row.locationId,
      locationName: row.locationName,
      source: "worker_app",
      status: "matched",
      workerId: row.workerId,
      workerName: worker.name,
      workspaceId,
    };
  });
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
    "worker_kim|2026-04-28|duty_self_tue": {
      anomalyType: "location_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: -2,
      startOffsetMinutes: 1,
      status: "anomaly_unresolved",
      type: "location_mismatch",
    },
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
    "worker_lee|2026-05-11|duty_self_mon": {
      anomalyType: "time_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: 0,
      startOffsetMinutes: 17,
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
    "worker_park|2026-05-07|duty_question_thu": {
      anomalyType: "time_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: 0,
      startOffsetMinutes: 14,
      status: "anomaly_unresolved",
      type: "time_mismatch",
    },
    "worker_choi|2026-05-01|duty_exam_fri": {
      anomalyType: "location_unknown",
      checkoutMissing: false,
      endOffsetMinutes: 3,
      startOffsetMinutes: 0,
      status: "anomaly_unresolved",
      type: "location_unknown",
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
    "worker_jung|2026-05-06|duty_night_wed": {
      anomalyType: "missing_checkout",
      checkoutMissing: true,
      endOffsetMinutes: null,
      startOffsetMinutes: 0,
      status: "anomaly_unresolved",
      type: "missing_checkout",
    },
    "worker_jung|2026-05-07|duty_night_thu": {
      anomalyType: "location_mismatch",
      checkoutMissing: false,
      endOffsetMinutes: -4,
      startOffsetMinutes: 2,
      status: "anomaly_unresolved",
      type: "location_mismatch",
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
  const resolutions = resolvedFlags.map((flag) => {
    const config = getResolvedAnomalyResolutionConfig(flag);

    return {
      id: `resolution_${flag.workRecordId}`,
      anomalyFlagId: flag.id,
      createdAt: shiftTimestamp(flag.createdAt, config.offsetMinutes * 60 * 1000),
      decidedBy: managerUid,
      decision: config.decision,
      managerNote: config.managerNote,
      payrollEffect: config.payrollEffect,
      status: "completed",
      workRecordId: flag.workRecordId,
      workerId: flag.workerId,
      workspaceId,
    };
  });

  return { flags, resolutions };
}

function getResolvedAnomalyResolutionConfig(flag) {
  const configs = {
    wr_worker_choi_20260508_duty_exam_fri: {
      decision: "mark_normal",
      managerNote: "퇴근 위치 수집 실패로 확인되어 근무기록은 유지",
      offsetMinutes: 90,
      payrollEffect: "unchanged",
    },
    wr_worker_lee_20260420_duty_self_mon: {
      decision: "modify_record",
      managerNote: "정시 도착 확인 후 시작 시간을 보정",
      offsetMinutes: 60,
      payrollEffect: "applied",
    },
    wr_worker_lee_20260427_duty_self_mon: {
      decision: "mark_normal",
      managerNote: "앱 체크인 지연으로 확인되어 근무기록은 유지",
      offsetMinutes: 75,
      payrollEffect: "unchanged",
    },
    wr_worker_lee_20260511_duty_self_mon: {
      decision: "mark_normal",
      managerNote: "앱 체크인 기록 기준으로 지각 확정 후 플래그 종료",
      offsetMinutes: 45,
      payrollEffect: "unchanged",
    },
  };

  return configs[flag.workRecordId] ?? {
    decision: "mark_normal",
    managerNote: "관리자 확인 후 이상 플래그 종료",
    offsetMinutes: 60,
    payrollEffect: "unchanged",
  };
}

function createOvertimeWorks(workspaceId, managerUid, workRecords, attendanceLogs) {
  const byRecord = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const attendanceById = Object.fromEntries(
    attendanceLogs.map((log) => [log.id, log]),
  );
  const rows = [
    {
      id: "ot_kim_20260428_submitted",
      amount: null,
      attendanceLogId: "att_ot_kim_20260428_question_extension",
      extraEndIso: "2026-04-28T21:30:00+09:00",
      extraStartIso: "2026-04-28T21:00:00+09:00",
      payrollEffect: null,
      payrollPayMode: null,
      payrollStatus: "pending",
      reason: "자습실 질문 응대 연장",
      status: "submitted",
      submittedIso: "2026-04-28T21:25:00+09:00",
      workRecordId: "wr_worker_kim_20260428_duty_self_tue",
    },
    {
      id: "ot_park_20260507_submitted",
      amount: null,
      attendanceLogId: "att_ot_park_20260507_parent_call",
      extraEndIso: "2026-05-07T18:40:00+09:00",
      extraStartIso: "2026-05-07T18:00:00+09:00",
      payrollEffect: null,
      payrollPayMode: null,
      payrollStatus: "pending",
      reason: "보강 후 학부모 상담 대응",
      status: "submitted",
      submittedIso: "2026-05-07T18:42:00+09:00",
      workRecordId: "wr_worker_park_20260507_duty_question_thu",
    },
    {
      id: "ot_lee_20260422_approved",
      amount: 8000,
      attendanceLogId: "att_ot_lee_20260422_admin_wrapup",
      extraEndIso: "2026-04-22T18:30:00+09:00",
      extraStartIso: "2026-04-22T18:00:00+09:00",
      payrollEffect: "immediate",
      payrollPayMode: "fixed",
      payrollStatus: "confirmed",
      reason: "행정 마감 정리",
      status: "approved",
      submittedIso: "2026-04-22T18:20:00+09:00",
      workRecordId: "wr_worker_lee_20260422_duty_admin_wed",
    },
    {
      id: "ot_jung_20260506_submitted",
      amount: null,
      attendanceLogId: "att_ot_jung_20260506_night_followup",
      extraEndIso: "2026-05-06T22:30:00+09:00",
      extraStartIso: "2026-05-06T22:00:00+09:00",
      payrollEffect: null,
      payrollPayMode: null,
      payrollStatus: "pending",
      reason: "야간 질문 응대 연장",
      status: "submitted",
      submittedIso: "2026-05-06T22:20:00+09:00",
      workRecordId: "wr_worker_jung_20260506_duty_night_wed",
    },
    {
      id: "ot_park_20260502_rejected",
      amount: null,
      attendanceLogId: "att_ot_park_20260502_grading_extension",
      extraEndIso: "2026-05-02T16:30:00+09:00",
      extraStartIso: "2026-05-02T16:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "채점 마무리 시간 요청",
      rejectedReason: "사전 승인 범위를 초과하지 않음",
      status: "rejected",
      submittedIso: "2026-05-02T16:15:00+09:00",
      workRecordId: "wr_worker_park_20260502_duty_sat_grading",
    },
    {
      id: "ot_choi_20260418_withdrawn",
      amount: null,
      attendanceLogId: "att_ot_choi_20260418_exam_wrapup",
      extraEndIso: "2026-04-18T19:30:00+09:00",
      extraStartIso: "2026-04-18T19:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "시험지 정리 지원",
      status: "withdrawn",
      submittedIso: "2026-04-18T19:15:00+09:00",
      workRecordId: "wr_worker_choi_20260418_duty_sat_exam",
    },
    {
      id: "ot_jung_20260429_held",
      amount: 12000,
      attendanceLogId: "att_ot_jung_20260429_night_questions",
      extraEndIso: "2026-04-29T22:45:00+09:00",
      extraStartIso: "2026-04-29T22:00:00+09:00",
      payrollEffect: "hold",
      payrollPayMode: "fixed",
      payrollStatus: "held",
      reason: "야간 질의응답 연장",
      status: "approved",
      submittedIso: "2026-04-29T22:15:00+09:00",
      workRecordId: "wr_worker_jung_20260429_duty_night_wed",
    },
    {
      id: "ot_lee_20260429_held",
      amount: 7000,
      attendanceLogId: "att_ot_lee_20260429_admin_late",
      extraEndIso: "2026-04-29T18:35:00+09:00",
      extraStartIso: "2026-04-29T18:00:00+09:00",
      payrollEffect: "hold",
      payrollPayMode: "fixed",
      payrollStatus: "held",
      reason: "월말 출결 자료 보정",
      status: "approved",
      submittedIso: "2026-04-29T18:25:00+09:00",
      workRecordId: "wr_worker_lee_20260429_duty_admin_wed",
    },
    {
      id: "ot_park_20260430_held",
      amount: 9000,
      attendanceLogId: "att_ot_park_20260430_parent_brief",
      extraEndIso: "2026-04-30T18:40:00+09:00",
      extraStartIso: "2026-04-30T18:00:00+09:00",
      payrollEffect: "hold",
      payrollPayMode: "fixed",
      payrollStatus: "held",
      reason: "학부모 상담 내용 정리",
      status: "approved",
      submittedIso: "2026-04-30T18:28:00+09:00",
      workRecordId: "wr_worker_park_20260430_duty_question_thu",
    },
    {
      id: "ot_kim_20260508_approved",
      amount: 10000,
      attendanceLogId: "att_ot_kim_20260508_makeup_review",
      extraEndIso: "2026-05-08T19:10:00+09:00",
      extraStartIso: "2026-05-08T18:20:00+09:00",
      payrollEffect: "immediate",
      payrollPayMode: "fixed",
      payrollStatus: "confirmed",
      reason: "보강 복습 자료 정리",
      status: "approved",
      submittedIso: "2026-05-08T19:00:00+09:00",
      workRecordId: null,
    },
    {
      id: "ot_lee_20260506_approved",
      amount: 9000,
      attendanceLogId: "att_ot_lee_20260506_admin_wrapup",
      extraEndIso: "2026-05-06T18:45:00+09:00",
      extraStartIso: "2026-05-06T18:00:00+09:00",
      payrollEffect: "immediate",
      payrollPayMode: "fixed",
      payrollStatus: "confirmed",
      reason: "출결 자료 마감",
      status: "approved",
      submittedIso: "2026-05-06T18:30:00+09:00",
      workRecordId: "wr_worker_lee_20260506_duty_admin_wed",
    },
    {
      id: "ot_lee_20260504_rejected",
      amount: null,
      attendanceLogId: "att_ot_lee_20260504_self_followup",
      extraEndIso: "2026-05-04T20:25:00+09:00",
      extraStartIso: "2026-05-04T20:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "자습실 정리 요청",
      rejectedReason: "근무 종료 후 자율 정리로 확인",
      status: "rejected",
      submittedIso: "2026-05-04T20:10:00+09:00",
      workRecordId: "wr_worker_lee_20260504_duty_self_mon",
    },
    {
      id: "ot_jung_20260501_rejected",
      amount: null,
      attendanceLogId: "att_ot_jung_20260501_grading_followup",
      extraEndIso: "2026-05-01T20:25:00+09:00",
      extraStartIso: "2026-05-01T20:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "채점 마무리 지원",
      rejectedReason: "기존 근무시간 내 처리로 확인",
      status: "rejected",
      submittedIso: "2026-05-01T20:12:00+09:00",
      workRecordId: "wr_worker_jung_20260501_duty_grading_fri",
    },
    {
      id: "ot_kim_20260505_withdrawn",
      amount: null,
      attendanceLogId: "att_ot_kim_20260505_self_wrapup",
      extraEndIso: "2026-05-05T21:20:00+09:00",
      extraStartIso: "2026-05-05T21:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "자습실 마감 정리",
      status: "withdrawn",
      submittedIso: "2026-05-05T21:08:00+09:00",
      workRecordId: "wr_worker_kim_20260505_duty_self_tue",
    },
    {
      id: "ot_park_20260425_withdrawn",
      amount: null,
      attendanceLogId: "att_ot_park_20260425_grading_wrapup",
      extraEndIso: "2026-04-25T16:25:00+09:00",
      extraStartIso: "2026-04-25T16:00:00+09:00",
      payrollEffect: "none",
      payrollPayMode: null,
      payrollStatus: "none",
      reason: "채점 정리 지원",
      status: "withdrawn",
      submittedIso: "2026-04-25T16:08:00+09:00",
      workRecordId: "wr_worker_park_20260425_duty_sat_grading",
    },
  ];

  return rows.map((row) => {
    const record = row.workRecordId ? byRecord[row.workRecordId] : null;
    const attendance = attendanceById[row.attendanceLogId];
    const workerId = record?.workerId ?? attendance.workerId;
    const workerName = record?.workerName ?? attendance.workerName;
    const submittedAt = ts(row.submittedIso);

    return {
      id: row.id,
      amount: row.amount,
      approvedAt: row.status === "approved" ? shiftTimestamp(submittedAt, 2 * 60 * 60 * 1000) : null,
      attendanceLogId: row.attendanceLogId,
      createdAt: submittedAt,
      decidedBy: row.status === "approved" || row.status === "rejected" ? managerUid : null,
      extraEndAt: ts(row.extraEndIso),
      extraStartAt: ts(row.extraStartIso),
      managerNote: row.status === "approved" ? "추가근무 시간과 사유 확인" : null,
      monthKey: row.extraStartIso.slice(0, 7),
      payrollEffect: row.payrollEffect,
      payrollPayMode: row.payrollPayMode,
      payrollStatus: row.payrollStatus,
      reason: row.reason,
      rejectedReason: row.rejectedReason ?? null,
      status: row.status,
      submittedAt,
      updatedAt: row.status === "submitted" ? submittedAt : shiftTimestamp(submittedAt, 2 * 60 * 60 * 1000),
      workRecordId: row.workRecordId,
      workerId,
      workerName,
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

function createCorrectionRequests(workspaceId, managerUid, recordChanges, workRecords, overtimeWorks) {
  const changeById = Object.fromEntries(recordChanges.map((change) => [change.id, change]));
  const byRecord = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const byOvertime = Object.fromEntries(overtimeWorks.map((work) => [work.id, work]));
  const requests = [];
  const addRequest = ({
    afterSnapshot,
    beforeSnapshot,
    id,
    managerNote,
    overtimeWorkId = null,
    payrollEffect = null,
    payrollStatus = "none",
    reason = "실제 근무 시간과 다르게 반영된 것 같습니다.",
    record,
    rejectedReason,
    source = "calendar",
    sourceNotificationId = null,
    status,
    submittedIso,
    withdrawnReason,
  }) => {
    const submittedAt = ts(submittedIso);
    const decided = status === "approved" || status === "rejected";

    requests.push({
      id,
      afterSnapshot,
      beforeSnapshot,
      createdAt: submittedAt,
      decidedAt: decided ? shiftTimestamp(submittedAt, 24 * 60 * 60 * 1000) : null,
      decidedBy: decided ? managerUid : null,
      managerNote: managerNote ?? (status === "approved" ? "조교 설명 확인 후 승인" : status === "rejected" ? "출퇴근 원장과 불일치" : null),
      monthKey: record.monthKey,
      ...(overtimeWorkId ? { overtimeWorkId } : {}),
      payrollEffect,
      payrollStatus,
      reason,
      ...(rejectedReason ? { rejectedReason } : {}),
      source,
      sourceNotificationId,
      status,
      submittedAt,
      ...(withdrawnReason
        ? {
            withdrawnAt: shiftTimestamp(submittedAt, 2 * 60 * 60 * 1000),
            withdrawnReason,
          }
        : {}),
      workRecordId: record.id,
      workerId: record.workerId,
      workerName: record.workerName,
      workspaceId,
    });
  };
  const addChangeRequest = ({
    changeId,
    id,
    reason,
    requestedAfterSnapshot,
    payrollEffect = null,
    payrollStatus = "none",
    status,
    submittedIso,
  }) => {
    const change = changeById[changeId];
    const record = byRecord[change.workRecordId];
    const correctionReason = reason ?? "관리자 변경 내용과 실제 근무 시간이 다릅니다.";
    const beforeSnapshot = change.afterSnapshot;
    const afterSnapshot = requestedAfterSnapshot
      ? requestedAfterSnapshot(change, record, correctionReason)
      : {
          ...change.afterSnapshot,
          changeReason: correctionReason,
        };

    addRequest({
      afterSnapshot,
      beforeSnapshot,
      id,
      payrollEffect,
      payrollStatus,
      record,
      reason: correctionReason,
      source: "record_change_notification",
      sourceNotificationId: change.notification.id,
      status,
      submittedIso,
    });
  };
  const addRegularRequest = ({
    endDeltaMinutes = 10,
    id,
    managerNote,
    payrollEffect = null,
    payrollStatus = "none",
    reason,
    rejectedReason,
    recordId,
    startDeltaMinutes = 0,
    status,
    submittedIso,
    withdrawnReason,
  }) => {
    const record = byRecord[recordId];
    const beforeSnapshot = workerSafeSnapshotFromRecord(record);
    const afterSnapshot = {
      ...beforeSnapshot,
      changeReason: reason,
      changeType: "modified",
      effectiveStartAt: shiftTimestamp(record.effectiveStartAt, startDeltaMinutes * 60 * 1000),
      effectiveEndAt: shiftTimestamp(record.effectiveEndAt, endDeltaMinutes * 60 * 1000),
    };

    addRequest({
      afterSnapshot,
      beforeSnapshot,
      id,
      managerNote,
      payrollEffect,
      payrollStatus,
      reason,
      record,
      rejectedReason,
      status,
      submittedIso,
      withdrawnReason,
    });
  };
  const addOvertimeCorrectionRequest = ({
    endDeltaMinutes = 10,
    id,
    overtimeId,
    submittedIso,
  }) => {
    const overtime = byOvertime[overtimeId];
    const record = byRecord[overtime.workRecordId];
    const beforeSnapshot = {
      ...workerSafeSnapshotFromRecord(record),
      extraEndAt: overtime.extraEndAt,
      extraStartAt: overtime.extraStartAt,
      overtimeWorkId: overtime.id,
      targetType: "overtime",
    };
    const afterSnapshot = {
      ...beforeSnapshot,
      changeReason: "추가근무 요청 시간 정정",
      changeType: "modified",
      extraEndAt: shiftTimestamp(overtime.extraEndAt, endDeltaMinutes * 60 * 1000),
    };

    addRequest({
      afterSnapshot,
      beforeSnapshot,
      id,
      overtimeWorkId: overtime.id,
      payrollStatus: "none",
      reason: "추가근무 시간이 실제보다 짧게 반영된 것 같습니다.",
      record,
      source: "overtime_detail",
      status: "submitted",
      submittedIso,
    });
  };

  addChangeRequest({
    changeId: "change_kim_20260504",
    id: "cr_kim_20260504_submitted",
    reason: "보강 후 정리 시간이 실제보다 짧게 반영되었습니다.",
    requestedAfterSnapshot: (change, _record, reason) => ({
      ...change.afterSnapshot,
      changeReason: reason,
      changeType: "modified",
      effectiveEndAt: shiftTimestamp(change.afterSnapshot.effectiveEndAt, 10 * 60 * 1000),
    }),
    status: "submitted",
    submittedIso: "2026-05-06T18:00:00+09:00",
  });
  addChangeRequest({
    changeId: "change_park_20260423",
    id: "cr_park_20260423_approved",
    payrollEffect: "applied",
    payrollStatus: "applied",
    reason: "질문 응대 종료 시간이 누락되어 정정 요청합니다.",
    status: "approved",
    submittedIso: "2026-04-24T11:20:00+09:00",
  });
  addChangeRequest({
    changeId: "change_jung_20260424",
    id: "cr_jung_20260424_submitted",
    reason: "삭제된 근무는 실제로 진행했고 예정 종료 시간까지 근무했습니다.",
    requestedAfterSnapshot: (change, record, reason) => ({
      ...change.beforeSnapshot,
      changeReason: reason,
      changeType: "modified",
      effectiveEndAt: record.plannedEndAt,
      effectiveStartAt: record.plannedStartAt,
    }),
    status: "submitted",
    submittedIso: "2026-04-25T08:30:00+09:00",
  });
  addRegularRequest({
    id: "cr_lee_20260506_rejected",
    managerNote: "출퇴근 원장과 CCTV 확인 시간이 달라 반려",
    reason: "행정 마감 정리 시간이 10분 누락되었습니다.",
    rejectedReason: "출퇴근 기록상 추가 근무가 확인되지 않았습니다.",
    recordId: "wr_worker_lee_20260506_duty_admin_wed",
    status: "rejected",
    submittedIso: "2026-05-07T09:00:00+09:00",
  });
  addRegularRequest({
    id: "cr_choi_20260508_withdrawn",
    reason: "시험대비 정리 시간이 10분 더 있었습니다.",
    recordId: "wr_worker_choi_20260508_duty_exam_fri",
    status: "withdrawn",
    submittedIso: "2026-05-09T10:10:00+09:00",
    withdrawnReason: "조교가 위치 이상 처리 내역 확인 후 신청을 철회했습니다.",
  });
  addRegularRequest({
    id: "cr_lee_20260504_submitted",
    reason: "자습 감독 종료 시간이 실제보다 짧게 반영되었습니다.",
    recordId: "wr_worker_lee_20260504_duty_self_mon",
    status: "submitted",
    submittedIso: "2026-05-05T09:20:00+09:00",
  });
  addRegularRequest({
    id: "cr_park_20260505_submitted",
    reason: "질문 응대 정리 시간이 누락되었습니다.",
    recordId: "wr_worker_park_20260505_duty_question_tue",
    status: "submitted",
    submittedIso: "2026-05-06T09:40:00+09:00",
  });
  addRegularRequest({
    id: "cr_kim_20260505_anomaly_submitted",
    reason: "퇴근 미기록이지만 실제 근무 종료 시간이 있습니다.",
    recordId: "wr_worker_kim_20260505_duty_self_tue",
    status: "submitted",
    submittedIso: "2026-05-06T10:05:00+09:00",
  });
  addRegularRequest({
    id: "cr_lee_20260511_anomaly_submitted",
    endDeltaMinutes: 0,
    reason: "출근 시간이 늦게 기록되었지만 정시에 도착했습니다.",
    recordId: "wr_worker_lee_20260511_duty_self_mon",
    startDeltaMinutes: -17,
    status: "submitted",
    submittedIso: "2026-05-12T08:50:00+09:00",
  });
  addRegularRequest({
    id: "cr_lee_20260421_approved",
    payrollEffect: "applied",
    payrollStatus: "applied",
    reason: "질문 응대 종료 시간을 추가 반영했습니다.",
    recordId: "wr_worker_lee_20260421_duty_overlap_tue_questions",
    status: "approved",
    submittedIso: "2026-04-22T10:10:00+09:00",
  });
  addRegularRequest({
    id: "cr_park_20260422_approved",
    payrollEffect: "applied",
    payrollStatus: "applied",
    reason: "채점 종료 시간을 확인해 반영했습니다.",
    recordId: "wr_worker_park_20260422_duty_grading_wed",
    status: "approved",
    submittedIso: "2026-04-23T10:15:00+09:00",
  });
  addRegularRequest({
    id: "cr_lee_20260428_rejected",
    managerNote: "출퇴근 로그와 강의실 확인 결과 추가 시간이 확인되지 않음",
    reason: "질문 응대 종료 시간이 10분 누락되었습니다.",
    rejectedReason: "출퇴근 기록상 추가 시간이 확인되지 않았습니다.",
    recordId: "wr_worker_lee_20260428_duty_overlap_tue_questions",
    status: "rejected",
    submittedIso: "2026-04-29T09:15:00+09:00",
  });
  addRegularRequest({
    id: "cr_jung_20260507_rejected",
    managerNote: "CCTV 확인 결과 예정 시간과 동일",
    reason: "야간 자습 마감 정리 시간이 10분 더 있었습니다.",
    rejectedReason: "CCTV 확인 결과 예정 시간과 동일합니다.",
    recordId: "wr_worker_jung_20260507_duty_night_thu",
    status: "rejected",
    submittedIso: "2026-05-08T09:35:00+09:00",
  });
  addRegularRequest({
    id: "cr_park_20260430_withdrawn",
    reason: "질문 응대 종료 시간이 10분 누락되었습니다.",
    recordId: "wr_worker_park_20260430_duty_question_thu",
    status: "withdrawn",
    submittedIso: "2026-05-01T10:00:00+09:00",
    withdrawnReason: "조교가 정정 신청을 취소했습니다.",
  });
  addRegularRequest({
    id: "cr_jung_20260508_withdrawn",
    reason: "채점 마무리 시간이 10분 더 있었습니다.",
    recordId: "wr_worker_jung_20260508_duty_grading_fri",
    status: "withdrawn",
    submittedIso: "2026-05-09T10:00:00+09:00",
    withdrawnReason: "신청 사유 재확인 후 철회했습니다.",
  });
  addOvertimeCorrectionRequest({
    id: "cr_ot_lee_20260422_submitted",
    overtimeId: "ot_lee_20260422_approved",
    submittedIso: "2026-04-23T09:30:00+09:00",
  });
  addOvertimeCorrectionRequest({
    endDeltaMinutes: 15,
    id: "cr_ot_jung_20260429_submitted",
    overtimeId: "ot_jung_20260429_held",
    submittedIso: "2026-04-30T09:30:00+09:00",
  });
  addOvertimeCorrectionRequest({
    id: "cr_ot_lee_20260506_submitted",
    overtimeId: "ot_lee_20260506_approved",
    submittedIso: "2026-05-07T09:25:00+09:00",
  });

  return requests;
}

function reconcileWorkRecordProcessingState({
  anomalies,
  corrections,
  overtime,
  workRecords,
}) {
  const recordsById = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const submittedCorrectionRecordIds = new Set(
    corrections
      .filter((request) => request.status === "submitted")
      .map((request) => request.workRecordId),
  );
  const submittedOvertimeRecordIds = new Set(
    overtime
      .filter((work) => work.status === "submitted" && work.workRecordId)
      .map((work) => work.workRecordId),
  );

  for (const record of workRecords) {
    record.hasPendingCorrection = submittedCorrectionRecordIds.has(record.id);
    record.hasPendingOvertime = submittedOvertimeRecordIds.has(record.id);
  }

  for (const resolution of anomalies.resolutions) {
    const record = recordsById[resolution.workRecordId];

    if (!record) {
      continue;
    }

    if (resolution.decision === "modify_record") {
      applyResolvedAnomalyRecordPatch(record, resolution);
    }

    record.hasUnresolvedAnomaly = false;
    record.managerOnly = {
      ...record.managerOnly,
      anomalyResolutionId: resolution.id,
      payrollApplication: resolution.payrollEffect,
      reviewedBy: resolution.decidedBy,
    };
    record.status = "resolved";
    record.updatedAt = resolution.createdAt;
    syncWorkerSafeSnapshotFromRecord(record, {
      changeReason: resolution.managerNote,
      changeType: resolution.decision === "modify_record" ? "modified" : null,
    });
  }

  for (const request of corrections) {
    if (request.status !== "approved" || isOvertimeCorrectionRequest(request)) {
      continue;
    }

    const record = recordsById[request.workRecordId];

    if (!record) {
      continue;
    }

    if (request.afterSnapshot.effectiveStartAt) {
      record.effectiveStartAt = request.afterSnapshot.effectiveStartAt;
    }

    if (request.afterSnapshot.effectiveEndAt) {
      record.effectiveEndAt = request.afterSnapshot.effectiveEndAt;
    }

    record.hasPendingCorrection = false;
    record.managerOnly = {
      ...record.managerOnly,
      correctionRequestId: request.id,
      payrollApplication: request.payrollEffect || request.payrollStatus,
      reviewedBy: request.decidedBy,
    };
    record.status = "resolved";
    record.updatedAt = request.decidedAt ?? request.submittedAt;
    syncWorkerSafeSnapshotFromRecord(record, {
      changeReason: request.reason,
      changeType: "modified",
    });
  }
}

function applyResolvedAnomalyRecordPatch(record) {
  if (record.anomalyType !== "time_mismatch") {
    return;
  }

  if (record.plannedStartAt) {
    record.effectiveStartAt = record.plannedStartAt;
  }

  if (record.plannedEndAt && !record.effectiveEndAt) {
    record.effectiveEndAt = record.plannedEndAt;
  }
}

function syncWorkerSafeSnapshotFromRecord(record, options = {}) {
  record.workerSafeSnapshot = {
    ...record.workerSafeSnapshot,
    changeReason:
      options.changeReason ?? record.workerSafeSnapshot?.changeReason ?? null,
    changeType:
      options.changeType ?? record.workerSafeSnapshot?.changeType ?? null,
    effectiveEndAt: record.effectiveEndAt,
    effectiveStartAt: record.effectiveStartAt,
  };
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

function createPayrollDocuments(
  workspaceId,
  managerUid,
  activeWorkers,
  bonusItems,
  payrollSettings,
) {
  const paidAt = ts("2026-05-05T11:00:00+09:00");
  const confirmedAt = ts("2026-05-02T14:00:00+09:00");
  const calculationRules = {
    payrollRoundingUnitWon: 1,
    regularPaymentDay: 5,
    workTimeRoundingUnitMinutes: 6,
  };
  const configs = [
    ["worker_kim", "paid", false, 438900, paidAt],
    ["worker_choi", "paid", false, 1814200, paidAt],
    ["worker_lee", "processing", true, 392100, null],
    ["worker_park", "processing", false, 338600, null],
  ];
  const byWorker = Object.fromEntries(activeWorkers.map((worker) => [worker.id, worker]));
  const settingsByWorker = Object.fromEntries(
    payrollSettings.map((setting) => [setting.workerId, setting]),
  );
  const managerStatements = configs.map(([workerId, status, needsReconfirmation, finalAmount, statusAt]) => {
    const worker = byWorker[workerId];
    const payrollSetting = settingsByWorker[workerId];
    const workerBonusItems = bonusItems.filter(
      (item) =>
        item.workerId === workerId &&
        item.monthKey === "2026-04" &&
        item.payrollStatus === "confirmed",
    );

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
        basePay: workerId === "worker_choi" ? 1850000 : Math.max(finalAmount - (workerId === "worker_kim" ? 10000 : 0), 0),
        bonusItemCount: workerBonusItems.length,
        bonusItemIds: workerBonusItems.map((item) => item.id),
        calculationRules,
        finalAmount,
        overtimePay: workerId === "worker_kim" ? 10000 : 0,
        payrollSetting: payrollSetting
          ? {
              effectiveFrom: payrollSetting.effectiveFrom,
              hourlyRate: payrollSetting.hourlyRate ?? null,
              monthlySalary: payrollSetting.monthlySalary ?? null,
              payrollType: payrollSetting.payrollType,
              taxRatePercent: payrollSetting.taxRatePercent ?? null,
              workerId,
            }
          : null,
        payrollType: workerId === "worker_choi" ? "monthly" : "hourly",
        postTaxAdjustment: workerBonusItems
          .filter((item) => item.taxScope === "post_tax")
          .reduce((total, item) => total + item.amount, 0),
        preTaxAdjustment: workerBonusItems
          .filter((item) => item.taxScope !== "post_tax")
          .reduce((total, item) => total + item.amount, 0),
        taxAmount: Math.round(finalAmount * 0.033),
        totalWorkMinutes: workerId === "worker_choi" ? 0 : 2400,
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
  const lateEvidence = workRecords
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
          evidenceWorkRecordIds: lateEvidence,
          severity: "medium",
          summary: "화요일 자습감독 근무에서 반복 지각 패턴이 관찰됨",
          targetWorkerId: "worker_lee",
          targetWorkRecordIds: lateEvidence,
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

function findCrossWorkerOverlappingWorkRecordIds(workRecords) {
  const ids = new Set();
  const groups = groupWorkRecordsByDate(workRecords);

  for (const records of Object.values(groups)) {
    const sorted = [...records].sort(compareWorkRecordsByTime);

    for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
        const left = sorted[leftIndex];
        const right = sorted[rightIndex];

        if (left.workerId !== right.workerId && workRecordsOverlap(left, right)) {
          ids.add(left.id);
          ids.add(right.id);
        }
      }
    }
  }

  return [...ids].sort((leftId, rightId) => {
    const left = workRecords.find((record) => record.id === leftId);
    const right = workRecords.find((record) => record.id === rightId);

    return compareWorkRecordsByTime(left, right);
  });
}

function findSameWorkerOverlappingWorkRecordPairs(workRecords) {
  const pairs = [];
  const groups = groupWorkRecordsByWorkerDate(workRecords);

  for (const records of Object.values(groups)) {
    const sorted = [...records].sort(compareWorkRecordsByTime);

    for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
        const left = sorted[leftIndex];
        const right = sorted[rightIndex];

        if (workRecordsOverlap(left, right)) {
          pairs.push([left.id, right.id]);
        }
      }
    }
  }

  return pairs;
}

function groupWorkRecordsByDate(workRecords) {
  const groups = {};

  for (const record of workRecords) {
    const date = record.dateKey ?? record.date;

    groups[date] ??= [];
    groups[date].push(record);
  }

  return groups;
}

function groupWorkRecordsByWorkerDate(workRecords) {
  const groups = {};

  for (const record of workRecords) {
    const date = record.dateKey ?? record.date;
    const key = `${record.workerId}|${date}`;

    groups[key] ??= [];
    groups[key].push(record);
  }

  return groups;
}

function workRecordsOverlap(left, right) {
  const leftStart = getWorkRecordStartMillis(left);
  const leftEnd = getWorkRecordEndMillis(left);
  const rightStart = getWorkRecordStartMillis(right);
  const rightEnd = getWorkRecordEndMillis(right);

  return leftStart < rightEnd && rightStart < leftEnd;
}

function compareWorkRecordsByTime(left, right) {
  return (
    (left?.dateKey ?? left?.date ?? "").localeCompare(right?.dateKey ?? right?.date ?? "") ||
    getWorkRecordStartMillis(left) - getWorkRecordStartMillis(right) ||
    getWorkRecordEndMillis(left) - getWorkRecordEndMillis(right) ||
    (left?.id ?? "").localeCompare(right?.id ?? "")
  );
}

function getWorkRecordStartMillis(record) {
  return millis(record.effectiveStartAt ?? record.plannedStartAt);
}

function getWorkRecordEndMillis(record) {
  return millis(record.effectiveEndAt ?? record.plannedEndAt);
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

  for (const worker of workers.pending) {
    const membershipId = membershipDocumentId(worker);

    add(
      pendingMembershipNotificationId(worker),
      "manager",
      managerUid,
      "web",
      "membership_submitted",
      isoPlus(worker.appliedAt, 60 * 1000),
      "membership",
      membershipId,
      { targetFocusId: membershipId, targetScreen: "WKR-01" },
    );
  }

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
      add(`ntf_manager_overtime_${work.id}`, "manager", managerUid, "web", "overtime_submitted", isoPlus(work.submittedAt, 60 * 1000), "overtimeWork", work.id, { targetScreen: "REC-01", targetFocusId: work.workRecordId ?? work.id });
    }

    if (work.status === "approved" || work.status === "rejected") {
      add(`ntf_worker_overtime_${work.id}`, "worker", work.workerId, "fcm", work.status === "approved" ? "overtime_approved" : "overtime_rejected", isoPlus(work.updatedAt, 60 * 1000), "overtimeWork", work.id, { payrollEffect: work.payrollEffect, targetFocusId: work.workRecordId ?? work.id });
    }
  }

  for (const request of corrections) {
    if (request.status === "submitted") {
      add(`ntf_manager_correction_${request.id}`, "manager", managerUid, "web", "correction_submitted", isoPlus(request.submittedAt, 60 * 1000), "correctionRequest", request.id, { targetScreen: "REC-01", targetFocusId: request.workRecordId });
    }

    if (request.status === "approved" || request.status === "rejected") {
      add(`ntf_worker_correction_${request.id}`, "worker", request.workerId, "fcm", request.status === "approved" ? "correction_approved" : "correction_rejected", isoPlus(request.decidedAt, 60 * 1000), "correctionRequest", request.id, { targetScreen: "worker_work_record_detail" });
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
  const submittedCorrectionRecordIds = new Set(
    corrections
      .filter((request) => request.status === "submitted")
      .map((request) => request.workRecordId),
  );
  const submittedOvertimeRecordIds = new Set(
    overtime
      .filter((work) => work.status === "submitted" && work.workRecordId)
      .map((work) => work.workRecordId),
  );
  const pendingMembershipInboxItems = workers.pending.map((worker) => {
    const membershipId = membershipDocumentId(worker);

    return inbox(
      pendingMembershipInboxId(worker),
      "membership_pending",
      "membership",
      membershipId,
      "submitted",
      isoPlus(worker.appliedAt, 0),
      worker.id,
      worker.name,
      "WKR-01",
      membershipId,
    );
  });
  const operationalInboxItems = [
    ...pendingMembershipInboxItems,
    inbox("inbox_schedule_pending", "schedule_pending", "scheduleRequest", "schedule_change_worker_park_pending", "submitted", "2026-05-09T20:10:00+09:00", "worker_park", "박정훈", "SCH-01", "schedule_change_worker_park_pending"),
    ...overtime
      .filter((work) => work.status === "submitted")
      .map((work) =>
        inbox(
          `inbox_overtime_pending_${work.id.replace(/^ot_/, "")}`,
          "overtime_pending",
          "overtimeWork",
          work.id,
          "submitted",
          work.submittedAt.toISOString(),
          work.workerId,
          work.workerName,
          "REC-01",
          work.workRecordId ?? work.id,
        ),
      ),
    ...corrections
      .filter((request) => request.status === "submitted")
      .map((request) =>
        inbox(
          `inbox_correction_pending_${request.id.replace(/^cr_/, "")}`,
          "correction_pending",
          "correctionRequest",
          request.id,
          "submitted",
          request.submittedAt.toISOString(),
          request.workerId,
          request.workerName,
          "REC-01",
          request.workRecordId,
        ),
      ),
    ...anomalies.flags
      .filter(
        (flag) =>
          flag.status === "unresolved" &&
          !submittedCorrectionRecordIds.has(flag.workRecordId) &&
          !submittedOvertimeRecordIds.has(flag.workRecordId),
      )
      .map((flag) =>
        inbox(
          `inbox_anomaly_unresolved_${flag.id.replace(/^flag_/, "")}`,
          "anomaly_unresolved",
          "anomalyFlag",
          flag.id,
          "unresolved",
          flag.createdAt.toISOString(),
          flag.workerId,
          flag.workerName,
          "REC-01",
          flag.workRecordId,
        ),
      ),
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
  const anomalyFlags = docs.filter((doc) => doc.collectionName === "anomalyFlags");
  const anomalyResolutions = docs.filter((doc) => doc.collectionName === "anomalyResolutions");
  const operationalInboxItems = docs.filter((doc) => doc.collectionName === "operationalInboxItems");
  const overtimeWorks = docs.filter((doc) => doc.collectionName === "overtimeWorks");
  const payrollRows = docs.filter((doc) => doc.collectionName === "payrollWorkerMonthRows");
  const correctionRequests = docs.filter((doc) => doc.collectionName === "correctionRequests");
  const workRecords = docs.filter((doc) => doc.collectionName === "workRecords");
  const attendanceById = new Map(
    docs
      .filter((doc) => doc.collectionName === "attendanceLogs")
      .map((doc) => [doc.id, doc]),
  );
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

  assertAtLeast(overtimeWorks.length, 15, "overtime seed rows");

  for (const work of overtimeWorks) {
    if (!work.attendanceLogId || !attendanceById.has(work.attendanceLogId)) {
      throw new Error(`overtimeWork ${work.id} must reference an attendanceLogId.`);
    }

    if (!work.extraStartAt || !work.extraEndAt || millis(work.extraEndAt) <= millis(work.extraStartAt)) {
      throw new Error(`overtimeWork ${work.id} has an invalid extra time range.`);
    }
  }

  assertRecordFlowCoverage({
    anomalyFlags,
    correctionRequests,
    overtimeWorks,
  });
  assertRecordProcessingContext({
    anomalyFlags,
    anomalyResolutions,
    correctionRequests,
    operationalInboxItems,
    overtimeWorks,
    workRecords,
  });

  const sameWorkerOverlapPairs = findSameWorkerOverlappingWorkRecordPairs(workRecords);

  if (sameWorkerOverlapPairs.length > 0) {
    throw new Error(
      `seed must not contain same-worker overlapping WorkRecords: ${sameWorkerOverlapPairs
        .map((pair) => pair.join(" + "))
        .join(", ")}`,
    );
  }

  const crossWorkerOverlappingWorkRecordIds = findCrossWorkerOverlappingWorkRecordIds(workRecords);

  if (crossWorkerOverlappingWorkRecordIds.length < 5) {
    throw new Error(
      `expected at least 5 cross-worker overlapping work record ids, got ${crossWorkerOverlappingWorkRecordIds.length}`,
    );
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

  assertActivityTimestampsNotFuture(docs);
  assertNotificationChronology({
    correctionRequests,
    notifications,
    overtimeWorks,
  });
}

function assertRecordFlowCoverage({ anomalyFlags, correctionRequests, overtimeWorks }) {
  const unresolvedAnomalyRecordIds = new Set(
    anomalyFlags
      .filter((flag) => flag.status === "unresolved" && flag.workRecordId)
      .map((flag) => flag.workRecordId),
  );
  const resolvedAnomalyRecordIds = new Set(
    anomalyFlags
      .filter((flag) => flag.status === "resolved" && flag.workRecordId)
      .map((flag) => flag.workRecordId),
  );
  const anomalyRecordIds = new Set([
    ...unresolvedAnomalyRecordIds,
    ...resolvedAnomalyRecordIds,
  ]);
  const submittedCorrectionRequests = correctionRequests.filter(
    (request) => request.status === "submitted",
  );
  const submittedCorrectionRecordIds = new Set(
    submittedCorrectionRequests.map((request) => request.workRecordId),
  );
  const submittedOvertimeWorks = overtimeWorks.filter(
    (work) => work.status === "submitted",
  );
  const submittedOvertimeRecordIds = new Set(
    submittedOvertimeWorks.map((work) => work.workRecordId).filter(Boolean),
  );
  const pureAnomalyFlags = anomalyFlags.filter(
    (flag) =>
      flag.status === "unresolved" &&
      flag.workRecordId &&
      !submittedCorrectionRecordIds.has(flag.workRecordId) &&
      !submittedOvertimeRecordIds.has(flag.workRecordId),
  );
  const submittedRegularCorrections = submittedCorrectionRequests.filter(
    (request) =>
      !isOvertimeCorrectionRequest(request) &&
      !anomalyRecordIds.has(request.workRecordId),
  );
  const submittedOpenAnomalyCorrections = submittedCorrectionRequests.filter(
    (request) =>
      !isOvertimeCorrectionRequest(request) &&
      unresolvedAnomalyRecordIds.has(request.workRecordId),
  );
  const submittedClosedAnomalyCorrections = submittedCorrectionRequests.filter(
    (request) =>
      !isOvertimeCorrectionRequest(request) &&
      resolvedAnomalyRecordIds.has(request.workRecordId),
  );
  const submittedAnomalyCorrections = [
    ...submittedOpenAnomalyCorrections,
    ...submittedClosedAnomalyCorrections,
  ];
  const submittedOvertimeCorrections = submittedCorrectionRequests.filter(
    isOvertimeCorrectionRequest,
  );
  const submittedOvertimeWithAnomaly = submittedOvertimeWorks.filter(
    (work) => unresolvedAnomalyRecordIds.has(work.workRecordId),
  );

  assertAtLeast(pureAnomalyFlags.length, 3, "pure unresolved anomaly records");
  assertAtLeast(
    submittedRegularCorrections.length,
    3,
    "submitted regular correction requests",
  );
  assertAtLeast(
    submittedAnomalyCorrections.length,
    3,
    "submitted correction records with anomaly context",
  );
  assertAtLeast(
    submittedOpenAnomalyCorrections.length,
    2,
    "submitted correction records with open anomaly context",
  );
  assertAtLeast(
    submittedClosedAnomalyCorrections.length,
    1,
    "submitted correction records with closed anomaly context",
  );
  assertAtLeast(
    submittedOvertimeWorks.length,
    3,
    "submitted overtime works",
  );
  assertAtLeast(
    submittedOvertimeWithAnomaly.length,
    3,
    "submitted overtime+anomaly records",
  );
  assertAtLeast(
    submittedOvertimeCorrections.length,
    3,
    "submitted overtime correction requests",
  );
  assertAtLeast(
    overtimeWorks.filter((work) => work.status === "approved" && work.payrollStatus === "confirmed").length,
    3,
    "approved confirmed overtime works",
  );
  assertAtLeast(
    overtimeWorks.filter((work) => work.status === "approved" && work.payrollStatus === "held").length,
    3,
    "approved held overtime works",
  );
  assertAtLeast(
    overtimeWorks.filter((work) => work.status === "rejected").length,
    3,
    "rejected overtime works",
  );
  assertAtLeast(
    overtimeWorks.filter((work) => work.status === "withdrawn").length,
    3,
    "withdrawn overtime works",
  );

  for (const status of ["submitted", "approved", "rejected", "withdrawn"]) {
    assertAtLeast(
      correctionRequests.filter((request) => request.status === status).length,
      3,
      `${status} correction requests`,
    );
  }
}

function assertRecordProcessingContext({
  anomalyFlags,
  anomalyResolutions,
  correctionRequests,
  operationalInboxItems,
  overtimeWorks,
  workRecords,
}) {
  const recordsById = Object.fromEntries(workRecords.map((record) => [record.id, record]));
  const submittedCorrectionRecordIds = new Set(
    correctionRequests
      .filter((request) => request.status === "submitted")
      .map((request) => request.workRecordId),
  );
  const submittedOvertimeRecordIds = new Set(
    overtimeWorks
      .filter((work) => work.status === "submitted" && work.workRecordId)
      .map((work) => work.workRecordId),
  );
  const resolutionByFlagId = new Map(
    anomalyResolutions.map((resolution) => [resolution.anomalyFlagId, resolution]),
  );

  for (const recordId of submittedCorrectionRecordIds) {
    const record = recordsById[recordId];

    if (!record?.hasPendingCorrection) {
      throw new Error(`workRecord ${recordId} must mark hasPendingCorrection=true.`);
    }
  }

  for (const recordId of submittedOvertimeRecordIds) {
    const record = recordsById[recordId];

    if (!record?.hasPendingOvertime) {
      throw new Error(`workRecord ${recordId} must mark hasPendingOvertime=true.`);
    }
  }

  for (const flag of anomalyFlags) {
    const record = recordsById[flag.workRecordId];

    if (!record) {
      throw new Error(`anomalyFlag ${flag.id} references missing workRecord ${flag.workRecordId}.`);
    }

    if (flag.status === "resolved") {
      const resolution = resolutionByFlagId.get(flag.id);

      if (!resolution) {
        throw new Error(`resolved anomalyFlag ${flag.id} is missing a resolution.`);
      }

      if (record.hasUnresolvedAnomaly) {
        throw new Error(`workRecord ${record.id} has a resolved flag but still marks hasUnresolvedAnomaly=true.`);
      }

      if (record.managerOnly?.anomalyResolutionId !== resolution.id) {
        throw new Error(`workRecord ${record.id} does not link resolved anomaly ${resolution.id}.`);
      }
    }

    if (flag.status === "unresolved" && !record.hasUnresolvedAnomaly) {
      throw new Error(`workRecord ${record.id} must keep hasUnresolvedAnomaly=true for unresolved anomaly ${flag.id}.`);
    }
  }

  for (const request of correctionRequests) {
    const record = recordsById[request.workRecordId];

    if (!record) {
      throw new Error(`correctionRequest ${request.id} references missing workRecord ${request.workRecordId}.`);
    }

    if (
      request.status === "submitted" &&
      !isOvertimeCorrectionRequest(request) &&
      correctionRequestHasSameRequestedRegularTime(request)
    ) {
      throw new Error(`submitted correctionRequest ${request.id} must request a changed regular work time.`);
    }

    if (request.status === "approved" && !isOvertimeCorrectionRequest(request)) {
      if (
        request.afterSnapshot.effectiveStartAt &&
        !sameTimestamp(record.effectiveStartAt, request.afterSnapshot.effectiveStartAt)
      ) {
        throw new Error(`approved correctionRequest ${request.id} start time is not applied to workRecord ${record.id}.`);
      }

      if (
        request.afterSnapshot.effectiveEndAt &&
        !sameTimestamp(record.effectiveEndAt, request.afterSnapshot.effectiveEndAt)
      ) {
        throw new Error(`approved correctionRequest ${request.id} end time is not applied to workRecord ${record.id}.`);
      }

      if (record.managerOnly?.correctionRequestId !== request.id) {
        throw new Error(`approved correctionRequest ${request.id} is not linked from workRecord ${record.id}.`);
      }
    }
  }

  assertRepresentativeRecordInboxItems({
    anomalyFlags,
    operationalInboxItems,
    submittedCorrectionRecordIds,
    submittedOvertimeRecordIds,
  });
}

function correctionRequestHasSameRequestedRegularTime(request) {
  return (
    sameTimestamp(
      request.beforeSnapshot?.effectiveStartAt,
      request.afterSnapshot?.effectiveStartAt,
    ) &&
    sameTimestamp(
      request.beforeSnapshot?.effectiveEndAt,
      request.afterSnapshot?.effectiveEndAt,
    )
  );
}

function assertRepresentativeRecordInboxItems({
  anomalyFlags,
  operationalInboxItems,
  submittedCorrectionRecordIds,
  submittedOvertimeRecordIds,
}) {
  const recordInboxItems = operationalInboxItems.filter(
    (item) => item.targetScreen === "REC-01" && item.targetFocusId,
  );
  const inboxItemsByFocusId = new Map();

  for (const item of recordInboxItems) {
    inboxItemsByFocusId.set(item.targetFocusId, [
      ...(inboxItemsByFocusId.get(item.targetFocusId) ?? []),
      item,
    ]);
  }

  for (const [focusId, items] of inboxItemsByFocusId) {
    if (items.length > 1) {
      throw new Error(
        `REC inbox must have one representative item per work record: ${focusId} has ${items
          .map((item) => `${item.itemType}/${item.sourceId}`)
          .join(", ")}`,
      );
    }
  }

  for (const flag of anomalyFlags.filter((item) => item.status === "unresolved")) {
    const hasHigherPriorityAction =
      submittedCorrectionRecordIds.has(flag.workRecordId) ||
      submittedOvertimeRecordIds.has(flag.workRecordId);
    const hasAnomalyInbox = recordInboxItems.some(
      (item) => item.itemType === "anomaly_unresolved" && item.sourceId === flag.id,
    );

    if (hasHigherPriorityAction && hasAnomalyInbox) {
      throw new Error(`anomalyFlag ${flag.id} must not create a duplicate inbox item when a higher-priority action exists.`);
    }

    if (!hasHigherPriorityAction && !hasAnomalyInbox) {
      throw new Error(`unresolved anomalyFlag ${flag.id} must create an anomaly inbox item.`);
    }
  }
}

function assertActivityTimestampsNotFuture(docs) {
  const activityFields = [
    "approvedAt",
    "changedAt",
    "createdAt",
    "decidedAt",
    "sortAt",
    "submittedAt",
    "updatedAt",
    "withdrawnAt",
  ];

  for (const doc of docs) {
    for (const field of activityFields) {
      if (doc[field] && millis(doc[field]) > millis(seedGeneratedAt)) {
        throw new Error(`${doc.collectionName}/${doc.id} has future ${field}.`);
      }
    }
  }
}

function assertNotificationChronology({
  correctionRequests,
  notifications,
  overtimeWorks,
}) {
  const correctionsById = Object.fromEntries(
    correctionRequests.map((request) => [request.id, request]),
  );
  const overtimeById = Object.fromEntries(
    overtimeWorks.map((work) => [work.id, work]),
  );

  for (const notification of notifications) {
    if (notification.relatedEntityType === "correctionRequest") {
      const request = correctionsById[notification.relatedEntityId];
      const baseAt = notification.eventType === "correction_submitted"
        ? request?.submittedAt
        : request?.decidedAt;

      assertNotificationNotBeforeBase(notification, baseAt);
    }

    if (notification.relatedEntityType === "overtimeWork") {
      const work = overtimeById[notification.relatedEntityId];
      const baseAt = notification.eventType === "overtime_submitted"
        ? work?.submittedAt
        : work?.updatedAt;

      assertNotificationNotBeforeBase(notification, baseAt);
    }
  }
}

function assertNotificationNotBeforeBase(notification, baseAt) {
  if (baseAt && millis(notification.createdAt) < millis(baseAt)) {
    throw new Error(
      `notification ${notification.id} is earlier than its related event.`,
    );
  }
}

function sameTimestamp(left, right) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return millis(left) === millis(right);
}

function isOvertimeCorrectionRequest(request) {
  const snapshots = [request.beforeSnapshot, request.afterSnapshot];

  return Boolean(
    request.overtimeWorkId ||
      snapshots.some((snapshot) =>
        Boolean(
          snapshot?.overtimeWorkId ||
            snapshot?.overtimeId ||
            snapshot?.extraStartAt ||
            snapshot?.extraEndAt ||
            `${snapshot?.targetType ?? ""} ${snapshot?.recordType ?? ""}`
              .toLowerCase()
              .includes("overtime"),
        ),
      ),
  );
}

function assertAtLeast(actual, expected, label) {
  if (actual < expected) {
    throw new Error(`expected at least ${expected} ${label}, got ${actual}`);
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
