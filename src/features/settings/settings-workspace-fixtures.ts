export type SettingsWorkspaceInfoRow = {
  id: string;
  label: string;
  value: string;
};

export type SettingsWorkspaceField = {
  id: string;
  label: string;
  value: string;
};

export const settingsWorkspaceFixture = {
  rows: [
    { id: "workspace-name", label: "사업장 이름", value: "김쌤 수학학원" },
    { id: "invite-code", label: "참여 코드", value: "WEE-ABC123" },
    { id: "manager", label: "관리자", value: "김준희" },
    { id: "business-number", label: "사업자등록번호", value: "123-45-67890" },
    { id: "owner-name", label: "대표자명", value: "김준희" },
    { id: "phone", label: "연락처", value: "02-1234-5678" },
  ],
  dialog: {
    title: "사업장 정보 수정",
    fields: [
      { id: "workspace-name", label: "사업장 이름", value: "김쌤 수학학원" },
      { id: "business-number", label: "사업자등록번호", value: "123-45-67890" },
      { id: "phone", label: "연락처", value: "02-1234-5678" },
    ],
    cancelLabel: "취소",
    saveLabel: "저장",
  },
} as const satisfies {
  rows: readonly SettingsWorkspaceInfoRow[];
  dialog: {
    title: string;
    fields: readonly SettingsWorkspaceField[];
    cancelLabel: string;
    saveLabel: string;
  };
};
