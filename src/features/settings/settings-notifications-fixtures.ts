export type SettingsNotificationRow = {
  id: string;
  item: string;
  webChecked: boolean;
  kakaoChecked: boolean;
};

export type SettingsNotificationsFixture = {
  columns: readonly {
    id: "item" | "web" | "kakao";
    label: string;
  }[];
  rows: readonly SettingsNotificationRow[];
};

export const settingsNotificationsFixture = {
  columns: [
    { id: "item", label: "항목" },
    { id: "web", label: "웹" },
    { id: "kakao", label: "카카오" },
  ],
  rows: [
    {
      id: "affiliation-application-received",
      item: "소속 신청 접수",
      webChecked: true,
      kakaoChecked: true,
    },
    {
      id: "affiliation-application-accepted",
      item: "소속 신청 접수",
      webChecked: true,
      kakaoChecked: true,
    },
    {
      id: "overtime-application",
      item: "추가근무 신청",
      webChecked: true,
      kakaoChecked: true,
    },
    {
      id: "correction-received",
      item: "이의신청 접수",
      webChecked: true,
      kakaoChecked: true,
    },
  ],
} as const satisfies SettingsNotificationsFixture;
