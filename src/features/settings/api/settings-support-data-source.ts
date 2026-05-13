import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  settingsBillingFixture,
  type SettingsBillingFixture,
} from "../model/settings-billing-fixtures";
import {
  settingsNotificationsFixture,
  type SettingsNotificationRow,
  type SettingsNotificationsFixture,
} from "../model/settings-notifications-fixtures";
import {
  settingsRulesFixture,
  type SettingsRulesFixture,
} from "../model/settings-rules-fixtures";

export type SettingsRulesInput = {
  anomalyToleranceMinutes: number;
  payrollRoundingUnitWon: number;
  regularPaymentDay: number | null;
  workTimeRoundingUnitMinutes: number;
};

export type SettingsNotificationsInput = readonly SettingsNotificationRow[];

export type SettingsSupportDataSource = {
  cancelSubscription: () => Promise<SettingsBillingFixture>;
  getBilling: () => Promise<SettingsBillingFixture>;
  getNotifications: () => Promise<SettingsNotificationsFixture>;
  getRules: () => Promise<SettingsRulesFixture>;
  mode: "fixture" | "firestore";
  updateNotifications: (
    rows: SettingsNotificationsInput,
  ) => Promise<SettingsNotificationsFixture>;
  updatePlan: (planId: string) => Promise<SettingsBillingFixture>;
  updateRules: (input: SettingsRulesInput) => Promise<SettingsRulesFixture>;
};

export function createSettingsSupportDataSource(): SettingsSupportDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockSettingsSupportDataSource();
  }

  return createFirestoreSettingsSupportDataSource();
}

function createMockSettingsSupportDataSource(): SettingsSupportDataSource {
  let notifications: SettingsNotificationsFixture = settingsNotificationsFixture;
  let rules: SettingsRulesFixture = settingsRulesFixture;

  return {
    mode: "fixture",
    async cancelSubscription() {
      return settingsBillingFixture;
    },
    async getBilling() {
      return settingsBillingFixture;
    },
    async getNotifications() {
      return notifications;
    },
    async getRules() {
      return rules;
    },
    async updateNotifications(rows) {
      notifications = {
        ...notifications,
        rows,
      };

      return notifications;
    },
    async updateRules(input) {
      rules = mapRulesFixture(input);

      return rules;
    },
    async updatePlan(planId) {
      return {
        ...settingsBillingFixture,
        plans: settingsBillingFixture.plans.map((plan) => ({
          ...plan,
          actionLabel: plan.id === planId ? "현재 플랜" : plan.actionLabel,
          current: plan.id === planId,
          highlighted: plan.id === planId,
        })),
      };
    },
  };
}

function createFirestoreSettingsSupportDataSource(): SettingsSupportDataSource {
  return {
    mode: "firestore",
    async cancelSubscription() {
      const workspaceId = await requireActiveWorkspaceId();

      await Promise.all([
        updateDoc(getWorkspaceDocument(workspaceId), {
          billingStatus: "cancelled",
          plan: "starter",
          updatedAt: serverTimestamp(),
        }),
        setDoc(
          getWorkspaceChildDocument(workspaceId, "subscriptions", "current"),
          {
            billingStatus: "cancelled",
            cancelledAt: serverTimestamp(),
            plan: "starter",
            status: "cancelled",
            updatedAt: serverTimestamp(),
            workspaceId,
          },
          { merge: true },
        ),
      ]);

      return createFirestoreSettingsSupportDataSource().getBilling();
    },
    async getBilling() {
      const workspaceId = await requireActiveWorkspaceId();
      const [workspaceSnapshot, subscriptionSnapshot, billingSnapshot] =
        await Promise.all([
          getDoc(getWorkspaceDocument(workspaceId)),
          getDoc(getWorkspaceChildDocument(workspaceId, "subscriptions", "current")),
          getDoc(getWorkspaceChildDocument(workspaceId, "billing", "current")),
        ]);
      const workspace = workspaceSnapshot.data() ?? {};
      const subscription = subscriptionSnapshot.data() ?? {};
      const billing = billingSnapshot.data() ?? {};
      const plan = readPlan(subscription.plan ?? workspace.plan);
      const amountDue = readNumber(billing.amountDue, null);
      const activeWorkerCount = readNumber(
        subscription.activeWorkerCount ?? billing.activeWorkerCount,
        null,
      );

      return {
        ...settingsBillingFixture,
        plans: settingsBillingFixture.plans.map((item) => ({
          ...item,
          actionLabel: item.id === plan ? "현재 플랜" : item.actionLabel,
          current: item.id === plan,
          description:
            item.id === plan && (amountDue != null || activeWorkerCount != null)
              ? [
                  ...item.description.slice(0, 1),
                  [
                    activeWorkerCount != null
                      ? `활성 조교 ${activeWorkerCount}명`
                      : null,
                    amountDue != null ? `이번 달 ${formatWon(amountDue)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ]
              : item.description,
          highlighted: item.id === plan,
        })),
      };
    },

    async getNotifications() {
      const workspaceId = await requireActiveWorkspaceId();

      return readNotificationsFixture(workspaceId);
    },

    async getRules() {
      const workspaceId = await requireActiveWorkspaceId();
      const input = await readWorkspaceRulesInput(workspaceId);

      return mapRulesFixture(input);
    },

    async updateNotifications(rows) {
      const workspaceId = await requireActiveWorkspaceId();
      const notificationRef = getWorkspaceChildDocument(
        workspaceId,
        "notificationSettings",
        "default",
      );

      await setDoc(
        notificationRef,
        {
          kakaoAlimtalk: Object.fromEntries(
            rows.map((row) => [row.id, row.kakaoChecked]),
          ),
          kakaoAlimtalkEnabled: rows.some((row) => row.kakaoChecked),
          managerWeb: Object.fromEntries(rows.map((row) => [row.id, row.webChecked])),
          managerWebEnabled: rows.some((row) => row.webChecked),
          updatedAt: serverTimestamp(),
          workspaceId,
        },
        { merge: true },
      );

      return readNotificationsFixture(workspaceId);
    },

    async updateRules(input) {
      const workspaceId = await requireActiveWorkspaceId();

      await updateDoc(getWorkspaceDocument(workspaceId), {
        settings: {
          anomalyToleranceMinutes: input.anomalyToleranceMinutes,
          payrollRoundingUnitWon: input.payrollRoundingUnitWon,
          regularPaymentDay: input.regularPaymentDay,
          workTimeRoundingUnitMinutes: input.workTimeRoundingUnitMinutes,
        },
        updatedAt: serverTimestamp(),
      });

      return mapRulesFixture(await readWorkspaceRulesInput(workspaceId));
    },
    async updatePlan(planId) {
      const workspaceId = await requireActiveWorkspaceId();

      await Promise.all([
        updateDoc(getWorkspaceDocument(workspaceId), {
          billingStatus: "active",
          plan: planId,
          updatedAt: serverTimestamp(),
        }),
        setDoc(
          getWorkspaceChildDocument(workspaceId, "subscriptions", "current"),
          {
            billingStatus: "active",
            plan: planId,
            status: "active",
            updatedAt: serverTimestamp(),
            workspaceId,
          },
          { merge: true },
        ),
      ]);

      return createFirestoreSettingsSupportDataSource().getBilling();
    },
  };
}

function getWorkspaceDocument(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
}

function getWorkspaceChildDocument(
  workspaceId: string,
  collectionName: string,
  documentId: string,
) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, collectionName, documentId);
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

async function readNotificationsFixture(
  workspaceId: string,
): Promise<SettingsNotificationsFixture> {
  const snapshot = await getDoc(
    getWorkspaceChildDocument(workspaceId, "notificationSettings", "default"),
  );
  const data = snapshot.data() ?? {};
  const managerWebEnabled = readBoolean(data.managerWebEnabled, true);
  const kakaoAlimtalkEnabled = readBoolean(data.kakaoAlimtalkEnabled, true);
  const perEventWeb = readRecord(data.managerWeb);
  const perEventKakao = readRecord(data.kakaoAlimtalk);

  return {
    ...settingsNotificationsFixture,
    rows: settingsNotificationsFixture.rows.map((row) => ({
      ...row,
      kakaoChecked: readBoolean(perEventKakao?.[row.id], kakaoAlimtalkEnabled),
      webChecked: readBoolean(perEventWeb?.[row.id], managerWebEnabled),
    })),
  };
}

async function readWorkspaceRulesInput(
  workspaceId: string,
): Promise<SettingsRulesInput> {
  const snapshot = await getDoc(getWorkspaceDocument(workspaceId));
  const data = snapshot.data() ?? {};
  const settings = readRecord(data.settings);

  return {
    anomalyToleranceMinutes: readBoundedInteger(
      settings?.anomalyToleranceMinutes ?? data.anomalyToleranceMinutes,
      5,
      0,
      120,
    ),
    payrollRoundingUnitWon: readPayRoundingUnit(
      settings?.payrollRoundingUnitWon ?? data.payrollRoundingUnitWon,
    ),
    regularPaymentDay: readNullableBoundedInteger(
      settings?.regularPaymentDay ?? data.regularPaymentDay,
      1,
      31,
    ),
    workTimeRoundingUnitMinutes: readBoundedInteger(
      settings?.workTimeRoundingUnitMinutes ?? data.workTimeRoundingUnitMinutes,
      6,
      1,
      60,
    ),
  };
}

function mapRulesFixture(input: SettingsRulesInput): SettingsRulesFixture {
  const regularPaymentDayLabel =
    input.regularPaymentDay == null ? "미설정" : `매월 ${input.regularPaymentDay}일`;

  return {
    ...settingsRulesFixture,
    dialog: {
      ...settingsRulesFixture.dialog,
      fields: settingsRulesFixture.dialog.fields.map((field) => {
        if (field.id === "time-tolerance") {
          return { ...field, value: String(input.anomalyToleranceMinutes) };
        }
        if (field.id === "work-rounding") {
          return { ...field, value: String(input.workTimeRoundingUnitMinutes) };
        }
        if (field.id === "pay-rounding") {
          return { ...field, value: String(input.payrollRoundingUnitWon) };
        }
        if (field.id === "regular-payment-day") {
          return { ...field, value: input.regularPaymentDay?.toString() ?? "" };
        }

        return field;
      }),
    },
    rules: settingsRulesFixture.rules.map((rule) => {
      if (rule.id === "time-tolerance") {
        return { ...rule, value: `${input.anomalyToleranceMinutes}분` };
      }
      if (rule.id === "work-rounding") {
        return { ...rule, value: `${input.workTimeRoundingUnitMinutes}분 단위` };
      }
      if (rule.id === "pay-rounding") {
        return { ...rule, value: formatPayRounding(input.payrollRoundingUnitWon) };
      }
      if (rule.id === "regular-payment-day") {
        return { ...rule, value: regularPaymentDayLabel };
      }

      return rule;
    }),
  };
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number;
function readNumber(value: unknown, fallback: null): number | null;
function readNumber(value: unknown, fallback: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return clampInteger(readNumber(value, fallback), min, max);
}

function readNullableBoundedInteger(value: unknown, min: number, max: number) {
  if (value == null) {
    return null;
  }

  return clampInteger(readNumber(value, min), min, max);
}

function readPayRoundingUnit(value: unknown) {
  const unit = readNumber(value, 1);

  return unit === 10 || unit === 100 ? unit : 1;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

function readPlan(value: unknown) {
  return value === "standard" ? "standard" : "starter";
}

function readRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function formatPayRounding(value: number) {
  if (value === 10) {
    return "십의 자리 올림";
  }

  if (value === 100) {
    return "백의 자리 올림";
  }

  return "원 단위";
}

function formatWon(value: number) {
  return `₩${value.toLocaleString("ko-KR")}`;
}
