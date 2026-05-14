export type SettingsLocationStatus = "active" | "paused" | "deleted";

export type SettingsLocationGeocodingStatus = "resolved" | "failed";

export type SettingsLocationCoordinate = {
  lat: number;
  lng: number;
};

export type SettingsLocation = {
  id: string;
  name: string;
  nameKey: string;
  roadAddress: string;
  addressText: string;
  radiusMeters: number;
  coordinate: SettingsLocationCoordinate | null;
  geocodingStatus: SettingsLocationGeocodingStatus;
  status: SettingsLocationStatus;
  dutyCount: number;
};

export type SettingsLocationFormState = {
  name: string;
  roadAddress: string;
  radiusMeters: string;
};

export type SettingsLocationFormField = keyof SettingsLocationFormState;

export type SettingsLocationFormErrors = Partial<
  Record<SettingsLocationFormField, string>
>;

export type CreateSettingsLocationInput = {
  name: string;
  nameKey: string;
  roadAddress: string;
  addressText: string;
  radiusMeters: number;
  coordinate: SettingsLocationCoordinate;
  geocodingStatus: Extract<SettingsLocationGeocodingStatus, "resolved">;
};

export type UpdateSettingsLocationInput = CreateSettingsLocationInput;

export const defaultLocationRadiusMeters = 100;

export const initialSettingsLocationForm: SettingsLocationFormState = {
  name: "",
  roadAddress: "",
  radiusMeters: String(defaultLocationRadiusMeters),
};

export function getSettingsLocationFormErrors(
  form: SettingsLocationFormState,
  locations: readonly SettingsLocation[],
  currentLocationId?: string,
): SettingsLocationFormErrors {
  const errors: SettingsLocationFormErrors = {};
  const name = normalizeLocationText(form.name);
  const roadAddress = normalizeLocationText(form.roadAddress);
  const radiusMeters = parseRadiusMeters(form.radiusMeters);

  if (!name) {
    errors.name = "근무지 이름을 입력해 주세요.";
  } else if (
    locations.some(
      (location) =>
        location.id !== currentLocationId &&
        location.nameKey === createLocationNameKey(name),
    )
  ) {
    errors.name = "동일한 이름의 근무지가 이미 있습니다.";
  }

  if (!roadAddress) {
    errors.roadAddress = "주소 검색 결과를 선택해 주세요.";
  }

  if (radiusMeters === null) {
    errors.radiusMeters = "출퇴근 허용 반경을 m 단위 숫자로 입력해 주세요.";
  }

  return errors;
}

export function hasSettingsLocationFormErrors(
  errors: SettingsLocationFormErrors,
) {
  return Object.keys(errors).length > 0;
}

export function toCreateSettingsLocationInput(
  form: SettingsLocationFormState,
  coordinate: SettingsLocationCoordinate,
): CreateSettingsLocationInput {
  const name = normalizeLocationText(form.name);
  const roadAddress = normalizeLocationText(form.roadAddress);
  const radiusMeters =
    parseRadiusMeters(form.radiusMeters) ?? defaultLocationRadiusMeters;

  return {
    name,
    nameKey: createLocationNameKey(name),
    roadAddress,
    addressText: roadAddress,
    radiusMeters,
    coordinate,
    geocodingStatus: "resolved",
  };
}

export function toSettingsLocationFormState(
  location: SettingsLocation,
): SettingsLocationFormState {
  return {
    name: location.name,
    roadAddress: location.roadAddress,
    radiusMeters: String(location.radiusMeters),
  };
}

export function normalizeRadiusInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function formatRadiusMeters(radiusMeters: number) {
  return `${radiusMeters}m`;
}

export function getLocationStatusLabel(status: SettingsLocationStatus) {
  if (status === "active") {
    return "운영중";
  }

  if (status === "paused") {
    return "중지";
  }

  return "삭제됨";
}

export function getLocationGeocodingStatusLabel(
  status: SettingsLocationGeocodingStatus,
) {
  if (status === "resolved") {
    return "좌표 확인";
  }

  return "확인 필요";
}

function parseRadiusMeters(value: string) {
  const normalized = normalizeRadiusInput(value);

  if (!normalized) {
    return null;
  }

  const radiusMeters = Number(normalized);

  if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) {
    return null;
  }

  return radiusMeters;
}

export function normalizeLocationText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createLocationNameKey(name: string) {
  return normalizeLocationText(name).toLocaleLowerCase("ko-KR");
}

export function createDemoLocationCoordinate(
  seed: string,
): SettingsLocationCoordinate {
  const hash = Array.from(seed).reduce(
    (current, char) => (current * 31 + char.charCodeAt(0)) % 1_000_000,
    17,
  );
  const latOffset = ((hash % 900) - 450) / 100_000;
  const lngOffset = ((Math.floor(hash / 997) % 900) - 450) / 100_000;

  return {
    lat: roundCoordinate(37.4979 + latOffset),
    lng: roundCoordinate(127.0276 + lngOffset),
  };
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
