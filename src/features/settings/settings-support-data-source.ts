import { doc, getDoc } from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import {
  settingsBillingFixture,
  type SettingsBillingFixture,
} from "./settings-billing-fixtures";
import {
  settingsNotificationsFixture,
  type SettingsNotificationsFixture,
} from "./settings-notifications-fixtures";
import {
  settingsRulesFixture,
  type SettingsRulesFixture,
} from "./settings-rules-fixtures";

export type SettingsSupportDataSource = {
  getBilling: () => Promise<SettingsBillingFixture>;
  getNotifications: () => Promise<SettingsNotificationsFixture>;
  getRules: () => Promise<SettingsRulesFixture>;
};

export function createSettingsSupportDataSource(): SettingsSupportDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockSettingsSupportDataSource();
  }

  return createFirestoreSettingsSupportDataSource();
}

function createMockSettingsSupportDataSource(): SettingsSupportDataSource {
  return {
    async getBilling() {
      return settingsBillingFixture;
    },
    async getNotifications() {
      return settingsNotificationsFixture;
    },
    async getRules() {
      return settingsRulesFixture;
    },
  };
}

function createFirestoreSettingsSupportDataSource(): SettingsSupportDataSource {
  return {
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
    },

    async getRules() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDoc(getWorkspaceDocument(workspaceId));
      const data = snapshot.data() ?? {};
      const settings = readRecord(data.settings);
      const tolerance = readNumber(
        settings?.anomalyToleranceMinutes ?? data.anomalyToleranceMinutes,
        5,
      );
      const workRounding = readNumber(
        settings?.workTimeRoundingUnitMinutes ?? data.workTimeRoundingUnitMinutes,
        6,
      );
      const payRounding = readNumber(
        settings?.payrollRoundingUnitWon ?? data.payrollRoundingUnitWon,
        1,
      );
      const payRoundingLabel = formatPayRounding(payRounding);

      return {
        ...settingsRulesFixture,
        dialog: {
          ...settingsRulesFixture.dialog,
          fields: settingsRulesFixture.dialog.fields.map((field) => {
            if (field.id === "time-tolerance") {
              return { ...field, value: String(tolerance) };
            }
            if (field.id === "work-rounding") {
              return { ...field, value: String(workRounding) };
            }
            if (field.id === "pay-rounding") {
              return { ...field, value: payRoundingLabel };
            }

            return field;
          }),
        },
        rules: settingsRulesFixture.rules.map((rule) => {
          if (rule.id === "time-tolerance") {
            return { ...rule, value: `${tolerance}분` };
          }
          if (rule.id === "work-rounding") {
            return { ...rule, value: `${workRounding}분 단위` };
          }
          if (rule.id === "pay-rounding") {
            return { ...rule, value: payRoundingLabel };
          }

          return rule;
        }),
      };
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

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number;
function readNumber(value: unknown, fallback: null): number | null;
function readNumber(value: unknown, fallback: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
