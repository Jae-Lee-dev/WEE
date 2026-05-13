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
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  type CreateSettingsLocationInput,
  type SettingsLocation,
  type SettingsLocationCoordinate,
  type SettingsLocationGeocodingStatus,
  type SettingsLocationStatus,
  type UpdateSettingsLocationInput,
} from "../model/settings-locations-model";
import { settingsLocationsFixture } from "../model/settings-locations-fixtures";

export type SettingsLocationsDataSource = {
  listLocations: () => Promise<readonly SettingsLocation[]>;
  createLocation: (
    input: CreateSettingsLocationInput,
  ) => Promise<SettingsLocation>;
  updateLocation: (
    location: SettingsLocation,
    input: UpdateSettingsLocationInput,
  ) => Promise<SettingsLocation>;
  deleteLocation: (location: SettingsLocation) => Promise<void>;
};

export function createSettingsLocationsDataSource(): SettingsLocationsDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockSettingsLocationsDataSource();
  }

  return createFirestoreSettingsLocationsDataSource();
}

function createFirestoreSettingsLocationsDataSource(): SettingsLocationsDataSource {
  return {
    async listLocations() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getLocationsCollection(workspaceId), orderBy("createdAt", "desc")),
      );

      return snapshot.docs
        .map((location) => mapLocationDocument(location))
        .filter((location) => location.status !== "deleted");
    },

    async createLocation(input) {
      const workspaceId = await requireActiveWorkspaceId();
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

    async updateLocation(location, input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const locationRef = getLocationDocument(workspaceId, location.id);
      const batch = writeBatch(db);

      batch.update(locationRef, {
        ...input,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      return {
        ...location,
        ...input,
      };
    },

    async deleteLocation(location) {
      if (location.dutyCount > 0) {
        throw new Error("근무에 사용 중인 근무지는 삭제할 수 없습니다.");
      }

      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);

      batch.update(getLocationDocument(workspaceId, location.id), {
        deletedAt: serverTimestamp(),
        status: "deleted" satisfies SettingsLocationStatus,
        updatedAt: serverTimestamp(),
      });
      batch.update(getWorkspaceDocument(workspaceId), {
        "setup.locationCount": increment(-1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    },
  };
}

function createMockSettingsLocationsDataSource(): SettingsLocationsDataSource {
  let locations = [...settingsLocationsFixture.rows];
  let nextIndex = 1;

  return {
    async listLocations() {
      return locations.filter((location) => location.status !== "deleted");
    },

    async createLocation(input) {
      const location = {
        ...input,
        dutyCount: 0,
        id: `location-local-${nextIndex}`,
        status: "active" as const,
      };

      nextIndex += 1;
      locations = [location, ...locations];

      return location;
    },

    async updateLocation(location, input) {
      const updatedLocation = {
        ...location,
        ...input,
      };

      locations = locations.map((current) =>
        current.id === location.id ? updatedLocation : current,
      );

      return updatedLocation;
    },

    async deleteLocation(location) {
      if (location.dutyCount > 0) {
        throw new Error("근무에 사용 중인 근무지는 삭제할 수 없습니다.");
      }

      locations = locations.filter((current) => current.id !== location.id);
    },
  };
}

function getLocationsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "locations");
}

function getLocationDocument(workspaceId: string, locationId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, "locations", locationId);
}

function getWorkspaceDocument(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
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

function mapLocationDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): SettingsLocation {
  const data = snapshot.data();
  const name = readString(data.name, "이름 없는 근무지");
  const roadAddress = readString(data.roadAddress, "");
  const addressText = readString(data.addressText, roadAddress);

  return {
    id: snapshot.id,
    name,
    nameKey: readString(data.nameKey, name.toLocaleLowerCase("ko-KR")),
    roadAddress,
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
  if (value === "paused" || value === "deleted") {
    return value;
  }

  return "active";
}
