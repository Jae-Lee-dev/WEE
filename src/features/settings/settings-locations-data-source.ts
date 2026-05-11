import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import {
  type CreateSettingsLocationInput,
  type SettingsLocation,
  type SettingsLocationCoordinate,
  type SettingsLocationGeocodingStatus,
  type SettingsLocationStatus,
} from "./settings-locations-model";

export type SettingsLocationsDataSource = {
  listLocations: () => Promise<readonly SettingsLocation[]>;
  createLocation: (
    input: CreateSettingsLocationInput,
  ) => Promise<SettingsLocation>;
};

export function createSettingsLocationsDataSource(): SettingsLocationsDataSource {
  return createFirestoreSettingsLocationsDataSource();
}

function createFirestoreSettingsLocationsDataSource(): SettingsLocationsDataSource {
  return {
    async listLocations() {
      const workspaceId = requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getLocationsCollection(workspaceId), orderBy("createdAt", "desc")),
      );

      return snapshot.docs.map((location) => mapLocationDocument(location));
    },

    async createLocation(input) {
      const workspaceId = requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const createdBy = getFirebaseAuth().currentUser?.uid ?? null;
      const document = {
        ...input,
        workspaceId,
        status: "active" satisfies SettingsLocationStatus,
        dutyCount: 0,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const locationRef = doc(getLocationsCollection(workspaceId));
      const batch = writeBatch(db);

      batch.set(locationRef, document);
      batch.update(getWorkspaceDocument(workspaceId), {
        "setup.locationCount": increment(1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      return {
        ...input,
        id: locationRef.id,
        status: "active",
        dutyCount: 0,
      };
    },
  };
}

function getLocationsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "locations");
}

function getWorkspaceDocument(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
}

function requireActiveWorkspaceId() {
  const workspaceId = readActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function mapLocationDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): SettingsLocation {
  const data = snapshot.data();
  const name = readString(data.name, "이름 없는 근무지");
  const roadAddress = readString(data.roadAddress, "");
  const detailAddress = readString(data.detailAddress, "");
  const addressText = readString(
    data.addressText,
    detailAddress ? `${roadAddress} ${detailAddress}` : roadAddress,
  );

  return {
    id: snapshot.id,
    name,
    nameKey: readString(data.nameKey, name.toLocaleLowerCase("ko-KR")),
    roadAddress,
    detailAddress,
    addressText,
    radiusMeters: readNumber(data.radiusMeters, 100),
    coordinate: readCoordinate(data.coordinate),
    geocodingStatus: readGeocodingStatus(data.geocodingStatus),
    status: readLocationStatus(data.status),
    dutyCount: readNumber(data.dutyCount, 0),
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readCoordinate(value: unknown): SettingsLocationCoordinate | null {
  if (
    value &&
    typeof value === "object" &&
    "lat" in value &&
    "lng" in value &&
    typeof value.lat === "number" &&
    typeof value.lng === "number"
  ) {
    return {
      lat: value.lat,
      lng: value.lng,
    };
  }

  return null;
}

function readGeocodingStatus(value: unknown): SettingsLocationGeocodingStatus {
  return value === "failed" ? "failed" : "resolved";
}

function readLocationStatus(value: unknown): SettingsLocationStatus {
  return value === "paused" ? "paused" : "active";
}
