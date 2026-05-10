export type SettingsLocationRow = {
  id: string;
  name: string;
  address: string;
  radius: string;
  dutyCount: string;
};

export const settingsLocationsFixture = {
  columns: [
    { id: "name", label: "근무지" },
    { id: "address", label: "주소" },
    { id: "radius", label: "반경" },
    { id: "dutyCount", label: "사용 근무" },
    { id: "actions", label: "상세" },
  ],
  rows: Array.from({ length: 14 }, (_, index) => ({
    id: `location-${index + 1}`,
    name: "대치 A 학원",
    address: "서울 강남구",
    radius: "100m",
    dutyCount: "5건",
  })),
  addButtonLabel: "근무지 추가",
  editButtonLabel: "수정",
  deleteButtonLabel: "삭제",
  dialog: {
    title: "근무지 추가",
    nameLabel: "근무지 이름",
    namePlaceholder: "예: 대치 A 학원",
    addressLabel: "주소",
    addressPlaceholder: "도로명 주소",
    radiusLabel: "출퇴근 허용 반경",
    radiusValue: "100",
    radiusUnit: "m",
    cancelLabel: "취소",
    addLabel: "추가",
  },
} as const satisfies {
  columns: readonly { id: string; label: string }[];
  rows: readonly SettingsLocationRow[];
  addButtonLabel: string;
  editButtonLabel: string;
  deleteButtonLabel: string;
  dialog: {
    title: string;
    nameLabel: string;
    namePlaceholder: string;
    addressLabel: string;
    addressPlaceholder: string;
    radiusLabel: string;
    radiusValue: string;
    radiusUnit: string;
    cancelLabel: string;
    addLabel: string;
  };
};
