import {
  createDemoLocationCoordinate,
  defaultLocationRadiusMeters,
  type SettingsLocation,
} from "./settings-locations-model";

export const settingsLocationsFixture = {
  columns: [
    { id: "name", label: "근무지" },
    { id: "address", label: "주소" },
    { id: "radius", label: "반경" },
    { id: "geo", label: "위치" },
    { id: "dutyCount", label: "사용 근무" },
    { id: "actions", label: "상세" },
  ],
  rows: [
    createLocationSeed({
      id: "location-daechi-a",
      name: "대치 A 학원",
      roadAddress: "서울 강남구 테헤란로 412",
      detailAddress: "3층",
      dutyCount: 5,
    }),
    createLocationSeed({
      id: "location-gangnam-b",
      name: "강남 B 학원",
      roadAddress: "서울 강남구 강남대로 328",
      detailAddress: "2층",
      dutyCount: 3,
      radiusMeters: 120,
    }),
    createLocationSeed({
      id: "location-jamsil-c",
      name: "잠실 C 학원",
      roadAddress: "서울 송파구 올림픽로 240",
      detailAddress: "",
      dutyCount: 4,
    }),
    createLocationSeed({
      id: "location-songpa-e",
      name: "송파 E 학원",
      roadAddress: "서울 송파구 송파대로 345",
      detailAddress: "5층",
      dutyCount: 2,
      radiusMeters: 80,
    }),
    createLocationSeed({
      id: "location-seocho-b",
      name: "서초 B 학원",
      roadAddress: "서울 서초구 서초대로 396",
      detailAddress: "",
      dutyCount: 1,
    }),
  ],
  addButtonLabel: "근무지 추가",
  editButtonLabel: "수정",
  deleteButtonLabel: "삭제",
  emptyTitle: "등록된 근무지가 없습니다.",
  emptyDescription: "첫 근무지를 추가하면 근무 개설에서 바로 선택할 수 있습니다.",
  loadingLabel: "근무지 목록을 불러오는 중",
  dialog: {
    createTitle: "근무지 추가",
    editTitle: "근무지 수정",
    description: "조교가 실제 출퇴근하는 장소와 허용 반경을 등록합니다.",
    nameLabel: "근무지 이름",
    namePlaceholder: "예: 대치 A 학원",
    roadAddressLabel: "도로명 주소",
    roadAddressPlaceholder: "서울 강남구 테헤란로 412",
    detailAddressLabel: "상세 주소",
    detailAddressPlaceholder: "층, 호수 등",
    radiusLabel: "출퇴근 허용 반경",
    radiusUnit: "m",
    cancelLabel: "취소",
    addLabel: "근무지 저장",
    saveLabel: "변경 저장",
  },
  deleteDialog: {
    title: "근무지를 삭제할까요?",
    blockedTitle: "사용 중인 근무지는 삭제할 수 없습니다.",
    description:
      "삭제한 근무지는 목록과 근무 개설 선택지에서 숨겨지고 기존 근무기록의 참조는 보존됩니다.",
    blockedDescription:
      "이 근무지를 사용하는 근무가 있습니다. 근무를 먼저 정리한 뒤 다시 삭제해 주세요.",
    cancelLabel: "취소",
    confirmLabel: "삭제",
    closeLabel: "확인",
  },
} as const satisfies {
  columns: readonly { id: string; label: string }[];
  rows: readonly SettingsLocation[];
  addButtonLabel: string;
  editButtonLabel: string;
  deleteButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingLabel: string;
  dialog: {
    createTitle: string;
    editTitle: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    roadAddressLabel: string;
    roadAddressPlaceholder: string;
    detailAddressLabel: string;
    detailAddressPlaceholder: string;
    radiusLabel: string;
    radiusUnit: string;
    cancelLabel: string;
    addLabel: string;
    saveLabel: string;
  };
  deleteDialog: {
    title: string;
    blockedTitle: string;
    description: string;
    blockedDescription: string;
    cancelLabel: string;
    confirmLabel: string;
    closeLabel: string;
  };
};

function createLocationSeed({
  id,
  name,
  roadAddress,
  detailAddress,
  dutyCount,
  radiusMeters = defaultLocationRadiusMeters,
}: {
  id: string;
  name: string;
  roadAddress: string;
  detailAddress: string;
  dutyCount: number;
  radiusMeters?: number;
}): SettingsLocation {
  const addressText = detailAddress
    ? `${roadAddress} ${detailAddress}`
    : roadAddress;

  return {
    id,
    name,
    nameKey: name.toLocaleLowerCase("ko-KR"),
    roadAddress,
    detailAddress,
    addressText,
    radiusMeters,
    coordinate: createDemoLocationCoordinate(`${name} ${addressText}`),
    geocodingStatus: "resolved",
    status: "active",
    dutyCount,
  };
}
