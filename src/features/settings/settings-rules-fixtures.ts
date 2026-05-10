export type SettingsRule = {
  id: string;
  label: string;
  value: string;
};

export type SettingsRuleField = {
  id: string;
  label: string;
  value: string;
  suffix?: string;
  kind: "number" | "select";
};

export type SettingsRulesFixture = {
  rules: readonly SettingsRule[];
  dialog: {
    title: string;
    fields: readonly SettingsRuleField[];
    cancelLabel: string;
    saveLabel: string;
  };
  editLabel: string;
};

export const settingsRulesFixture = {
  rules: [
    { id: "time-tolerance", label: "시간 허용 오차", value: "5분" },
    { id: "work-rounding", label: "근무시간 올림", value: "6분 단위" },
    { id: "pay-rounding", label: "급여 올림", value: "원 단위" },
  ],
  dialog: {
    title: "운영 설정",
    fields: [
      {
        id: "time-tolerance",
        label: "시간 이상 허용 오차",
        value: "5",
        suffix: "분",
        kind: "number",
      },
      {
        id: "work-rounding",
        label: "근무 시간 올림 단위",
        value: "6",
        suffix: "분",
        kind: "number",
      },
      {
        id: "pay-rounding",
        label: "급여 올림 단위",
        value: "원 단위",
        kind: "select",
      },
    ],
    cancelLabel: "취소",
    saveLabel: "저장",
  },
  editLabel: "변경하기",
} as const satisfies SettingsRulesFixture;
