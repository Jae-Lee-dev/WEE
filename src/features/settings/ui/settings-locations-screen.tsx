"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  getKakaoMapJavaScriptKey,
  loadKakaoMapsSdk,
  type KakaoCircle,
  type KakaoGeocoderResult,
  type KakaoMap,
  type KakaoMapsSdk,
  type KakaoMarker,
  type KakaoPlaceSearchResult,
} from "@/shared/lib/kakao-maps";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { SearchField } from "@/shared/ui/search-field";
import {
  createSettingsLocationsDataSource,
  type SettingsLocationsDataSource,
} from "../api/settings-locations-data-source";
import { settingsLocationsFixture } from "../model/settings-locations-fixtures";
import {
  type CreateSettingsLocationInput,
  defaultLocationRadiusMeters,
  formatRadiusMeters,
  getSettingsLocationFormErrors,
  hasSettingsLocationFormErrors,
  initialSettingsLocationForm,
  normalizeLocationText,
  normalizeRadiusInput,
  toCreateSettingsLocationInput,
  toSettingsLocationFormState,
  type SettingsLocation,
  type SettingsLocationCoordinate,
  type SettingsLocationFormField,
  type SettingsLocationFormState,
} from "../model/settings-locations-model";

type SettingsLocationsScreenProps = {
  dataSource?: SettingsLocationsDataSource;
};

type LocationLookupState = {
  message: string;
  status: "idle" | "loading" | "resolved" | "failed" | "unavailable";
};

type ResolvedLocationCoordinate = {
  address: string;
  coordinate: SettingsLocationCoordinate;
};

type LocationAddressSearchResult = {
  address: string;
  coordinate: SettingsLocationCoordinate;
  id: string;
  subtitle: string;
  title: string;
};

const kakaoMapJavaScriptKey =
  getKakaoMapJavaScriptKey();

const defaultMapCoordinate = {
  lat: 37.4979,
  lng: 127.0276,
} satisfies SettingsLocationCoordinate;

export function SettingsLocationsScreen({
  dataSource: dataSourceProp,
}: SettingsLocationsScreenProps = {}) {
  const fallbackDataSource = useMemo(
    () => createSettingsLocationsDataSource(),
    [],
  );
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [locations, setLocations] = useState<readonly SettingsLocation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<SettingsLocation | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<SettingsLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let active = true;

    void dataSource
      .listLocations()
      .then((nextLocations) => {
        if (!active) {
          return;
        }

        setLocations(nextLocations);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("근무지 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const handleSaveLocation = async (
    input: CreateSettingsLocationInput,
    currentLocation?: SettingsLocation,
  ) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (currentLocation) {
        const location = await dataSource.updateLocation(currentLocation, input);

        setLocations((current) =>
          current.map((row) => (row.id === location.id ? location : row)),
        );
        setStatusMessage(`${location.name} 근무지를 수정했습니다.`);
        setEditingLocation(null);
      } else {
        const location = await dataSource.createLocation(input);

        setLocations((current) => [location, ...current]);
        setStatusMessage(`${location.name} 근무지를 등록했습니다.`);
      }

      setDialogOpen(false);
    } catch {
      setErrorMessage("근무지를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (location: SettingsLocation) => {
    setDeleting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await dataSource.deleteLocation(location);

      setLocations((current) =>
        current.filter((row) => row.id !== location.id),
      );
      setStatusMessage(`${location.name} 근무지를 삭제했습니다.`);
      setDeleteCandidate(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "근무지를 삭제하지 못했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label="근무지 설정"
      className="mx-auto flex h-[calc(100vh-144px)] min-h-[520px] w-full max-w-[1480px] flex-col items-end gap-4 tracking-normal"
      data-testid="settings-locations-screen"
    >
      <div className="flex w-full items-center justify-end gap-4">
        {statusMessage ? (
          <div
            className="min-h-9 rounded-[8px] border border-green-100 bg-green-50 px-4 py-2.5 text-body-14-medium tracking-normal text-green-500"
            role="status"
          >
            {statusMessage}
          </div>
        ) : errorMessage ? (
          <div
            className="min-h-9 rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          data-testid="settings-locations-add-trigger"
          onClick={() => {
            setStatusMessage("");
            setEditingLocation(null);
            setDialogOpen(true);
          }}
          className="h-9 rounded-full px-4 text-h-18-regular font-normal tracking-normal"
        >
          {settingsLocationsFixture.addButtonLabel}
        </Button>
      </div>

      <LocationsTable
        loading={loading}
        locations={locations}
        onDeleteLocation={(location) => {
          setStatusMessage("");
          setDeleteCandidate(location);
        }}
        onEditLocation={(location) => {
          setStatusMessage("");
          setEditingLocation(location);
          setDialogOpen(true);
        }}
      />

      {dialogOpen ? (
        <LocationDialog
          location={editingLocation}
          locations={locations}
          onClose={() => {
            if (!saving) {
              setDialogOpen(false);
              setEditingLocation(null);
            }
          }}
          onSaveLocation={handleSaveLocation}
          saving={saving}
        />
      ) : null}

      {deleteCandidate ? (
        <DeleteLocationDialog
          deleting={deleting}
          location={deleteCandidate}
          onClose={() => {
            if (!deleting) {
              setDeleteCandidate(null);
            }
          }}
          onConfirm={handleDeleteLocation}
        />
      ) : null}
    </section>
  );
}

function LocationsTable({
  loading,
  locations,
  onDeleteLocation,
  onEditLocation,
}: {
  loading: boolean;
  locations: readonly SettingsLocation[];
  onDeleteLocation: (location: SettingsLocation) => void;
  onEditLocation: (location: SettingsLocation) => void;
}) {
  return (
    <section
      aria-label="근무지 목록"
      className="min-h-0 w-full flex-1 overflow-hidden rounded-[10px] border border-gray-100 bg-white py-4"
      data-testid="settings-locations-table"
    >
      <div
        className="grid h-[32px] grid-cols-[1fr_1.65fr_110px_120px_180px] items-start border-b border-gray-300 px-4 text-h-18-regular text-gray-500"
        role="row"
      >
        {settingsLocationsFixture.columns.map((column) => (
          <div
            key={column.id}
            className={column.id === "actions" ? "opacity-0" : undefined}
            role="columnheader"
          >
            {column.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex h-full min-h-[360px] items-center justify-center px-4 text-h-18-regular text-gray-500">
          {settingsLocationsFixture.loadingLabel}
        </div>
      ) : locations.length > 0 ? (
        <div role="rowgroup">
          {locations.map((row, index) => (
            <LocationTableRow
              key={row.id}
              first={index === 0}
              onDelete={onDeleteLocation}
              onEdit={onEditLocation}
              row={row}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-4 text-center">
          <h2 className="text-h-20 tracking-normal text-gray-900">
            {settingsLocationsFixture.emptyTitle}
          </h2>
          <p className="mt-2 text-body-14-regular tracking-normal text-gray-500">
            {settingsLocationsFixture.emptyDescription}
          </p>
        </div>
      )}
    </section>
  );
}

function LocationTableRow({
  row,
  first,
  onDelete,
  onEdit,
}: {
  row: SettingsLocation;
  first: boolean;
  onDelete: (location: SettingsLocation) => void;
  onEdit: (location: SettingsLocation) => void;
}) {
  return (
    <div
      className="grid h-11 grid-cols-[1fr_1.65fr_110px_120px_180px] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-800 last:border-b-0"
      role="row"
      data-testid={first ? "settings-locations-first-row" : undefined}
    >
      <div className="min-w-0 truncate" role="cell">
        {row.name}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.addressText}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {formatRadiusMeters(row.radiusMeters)}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.dutyCount}건
      </div>
      <div className="flex justify-end gap-2.5" role="cell">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onEdit(row)}
          className="h-9 rounded-full px-4 text-h-18-regular font-medium tracking-normal"
        >
          {settingsLocationsFixture.editButtonLabel}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => onDelete(row)}
          className="h-9 rounded-full px-4 text-h-18-regular font-medium tracking-normal text-red-500"
        >
          {settingsLocationsFixture.deleteButtonLabel}
        </Button>
      </div>
    </div>
  );
}

function LocationDialog({
  location,
  locations,
  onClose,
  onSaveLocation,
  saving,
}: {
  location: SettingsLocation | null;
  locations: readonly SettingsLocation[];
  onClose: () => void;
  onSaveLocation: (
    input: CreateSettingsLocationInput,
    currentLocation?: SettingsLocation,
  ) => Promise<void>;
  saving: boolean;
}) {
  const { dialog } = settingsLocationsFixture;
  const [form, setForm] = useState<SettingsLocationFormState>(
    location
      ? toSettingsLocationFormState(location)
      : initialSettingsLocationForm,
  );
  const [addressQuery, setAddressQuery] = useState(
    location?.roadAddress ?? initialSettingsLocationForm.roadAddress,
  );
  const [addressSearchResults, setAddressSearchResults] = useState<
    readonly LocationAddressSearchResult[]
  >([]);
  const addressSearchRequestRef = useRef(0);
  const [submitted, setSubmitted] = useState(false);
  const [resolvedLocation, setResolvedLocation] =
    useState<ResolvedLocationCoordinate | null>(() =>
      location?.coordinate
        ? {
            address: normalizeLocationText(location.roadAddress),
            coordinate: location.coordinate,
          }
        : null,
    );
  const [lookupState, setLookupState] = useState<LocationLookupState>(() =>
    location?.coordinate
      ? { message: "위치 확인 완료", status: "resolved" }
      : { message: "주소를 입력하면 위치를 확인합니다.", status: "idle" },
  );
  const errors = getSettingsLocationFormErrors(form, locations, location?.id);
  const normalizedRoadAddress = normalizeLocationText(form.roadAddress);
  const resolvedCoordinate =
    resolvedLocation?.address === normalizedRoadAddress
      ? resolvedLocation.coordinate
      : null;
  const hasAddressSearchResults = addressSearchResults.length > 0;
  const radiusMeters =
    Number(normalizeRadiusInput(form.radiusMeters)) ||
    defaultLocationRadiusMeters;
  const saveButtonLabel =
    lookupState.status === "loading"
      ? "주소 확인 중"
      : saving
        ? "저장 중"
        : location
          ? dialog.saveLabel
          : dialog.addLabel;

  const handleFieldChange =
    (field: SettingsLocationFormField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        field === "radiusMeters"
          ? normalizeRadiusInput(event.target.value)
          : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: nextValue,
      }));
    };

  const handleAddressQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    const nextAddress = normalizeLocationText(nextQuery);

    setAddressQuery(nextQuery);
    setAddressSearchResults([]);
    addressSearchRequestRef.current += 1;

    if (!nextAddress) {
      setResolvedLocation(null);
      setForm((current) => ({ ...current, roadAddress: "" }));
      setLookupState((current) =>
        current.status === "unavailable"
          ? current
          : {
              message: "주소를 검색해 주세요.",
              status: "idle",
            },
      );
      return;
    }

    if (resolvedLocation?.address === nextAddress) {
      setForm((current) => ({ ...current, roadAddress: nextAddress }));
      setLookupState({
        message: "위치 확인 완료",
        status: "resolved",
      });
      return;
    }

    setResolvedLocation(null);
    setForm((current) => ({ ...current, roadAddress: "" }));
    setLookupState((current) =>
      current.status === "unavailable"
        ? current
        : {
            message: "주소 검색 대기",
            status: "idle",
          },
    );
  };

  const handleAddressSearch = useCallback(
    (query: string) => {
      const normalizedQuery = normalizeLocationText(query);

      if (!normalizedQuery || resolvedLocation?.address === normalizedQuery) {
        return;
      }

      if (!kakaoMapJavaScriptKey) {
        setLookupState({
          message: "카카오 지도 키를 확인해 주세요.",
          status: "unavailable",
        });
        setAddressSearchResults([]);
        return;
      }

      addressSearchRequestRef.current += 1;
      const requestId = addressSearchRequestRef.current;
      const isActiveSearch = () => requestId === addressSearchRequestRef.current;

      setLookupState({
        message: "주소 검색 중",
        status: "loading",
      });
      setAddressSearchResults([]);

      void loadKakaoMapsSdk(kakaoMapJavaScriptKey)
        .then((sdk) => {
          if (!isActiveSearch()) {
            return;
          }

          const places = new sdk.services.Places();

          places.keywordSearch(
            normalizedQuery,
            (placeResults, placeStatus) => {
              if (!isActiveSearch()) {
                return;
              }

              const nextPlaceResults =
                placeStatus === sdk.services.Status.OK
                  ? placeResults
                      .map(mapPlaceSearchResult)
                      .filter(isLocationAddressSearchResult)
                  : [];

              if (nextPlaceResults.length > 0) {
                setAddressSearchResults(
                  dedupeAddressSearchResults(nextPlaceResults).slice(0, 5),
                );
                setLookupState({
                  message: "검색 결과에서 위치를 선택해 주세요.",
                  status: "idle",
                });
                return;
              }

              const geocoder = new sdk.services.Geocoder();

              geocoder.addressSearch(
                normalizedQuery,
                (addressResults, addressStatus) => {
                  if (!isActiveSearch()) {
                    return;
                  }

                  const nextAddressResults =
                    addressStatus === sdk.services.Status.OK
                      ? addressResults
                          .map(mapGeocoderSearchResult)
                          .filter(isLocationAddressSearchResult)
                      : [];

                  if (nextAddressResults.length === 0) {
                    setLookupState({
                      message: "검색 결과가 없습니다.",
                      status: "failed",
                    });
                    setAddressSearchResults([]);
                    return;
                  }

                  setAddressSearchResults(
                    dedupeAddressSearchResults(nextAddressResults).slice(0, 5),
                  );
                  setLookupState({
                    message: "검색 결과에서 위치를 선택해 주세요.",
                    status: "idle",
                  });
                },
                { size: 5 },
              );
            },
            { size: 5 },
          );
        })
        .catch(() => {
          if (!isActiveSearch()) {
            return;
          }

          setLookupState({
            message: "주소 검색을 사용할 수 없습니다.",
            status: "unavailable",
          });
          setAddressSearchResults([]);
        });
    },
    [resolvedLocation?.address],
  );

  const handleLookupStateChange = useCallback((state: LocationLookupState) => {
    setLookupState(state);
  }, []);

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented || event.key !== "Enter") {
      return;
    }

    if (event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  };

  const handleAddressSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleAddressSearch(addressQuery);
  };

  const handleAddressResultSelect = useCallback(
    (result: LocationAddressSearchResult) => {
      setAddressQuery(result.address);
      setAddressSearchResults([]);
      setForm((current) => ({
        ...current,
        roadAddress: result.address,
      }));
      setResolvedLocation({
        address: result.address,
        coordinate: result.coordinate,
      });
      setLookupState({
        message: "위치 확인 완료",
        status: "resolved",
      });
    },
    [],
  );

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasSettingsLocationFormErrors(errors)) {
      return;
    }

    if (!resolvedCoordinate) {
      setLookupState((current) =>
        current.status === "loading"
          ? current
          : {
              message:
                current.status === "unavailable"
                  ? current.message
                  : "주소 위치를 확인한 뒤 저장해 주세요.",
              status: current.status === "unavailable" ? "unavailable" : "failed",
            },
      );
      return;
    }

    void onSaveLocation(
      toCreateSettingsLocationInput(form, resolvedCoordinate),
      location ?? undefined,
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="settings-location-dialog"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] flex-col overflow-hidden rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0 sm:max-w-[620px]"
      >
        <form
          noValidate
          onKeyDown={handleFormKeyDown}
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="gap-0">
            <DialogTitle
              id="settings-location-dialog-title"
              className="text-h-20 font-semibold tracking-normal text-gray-900"
            >
              {location ? dialog.editTitle : dialog.createTitle}
            </DialogTitle>
            <DialogDescription className="mt-2 text-body-14-regular tracking-normal text-gray-500">
              {dialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <LocationDialogField
              error={submitted ? errors.name : undefined}
              label={dialog.nameLabel}
              name="name"
              onChange={handleFieldChange("name")}
              placeholder={dialog.namePlaceholder}
              value={form.name}
              disabled={saving}
            />

            <LocationAddressSearchField
              error={submitted ? errors.roadAddress : undefined}
              hasResults={hasAddressSearchResults}
              label={dialog.roadAddressLabel}
              onChange={handleAddressQueryChange}
              onDebouncedSearch={handleAddressSearch}
              onKeyDown={handleAddressSearchKeyDown}
              onSelectResult={handleAddressResultSelect}
              placeholder={dialog.roadAddressPlaceholder}
              results={addressSearchResults}
              saving={saving}
              value={addressQuery}
            />

            <LocationRadiusField
              error={submitted ? errors.radiusMeters : undefined}
              onChange={handleFieldChange("radiusMeters")}
              saving={saving}
              value={form.radiusMeters}
            />

            <KakaoRadiusMap
              coordinate={resolvedCoordinate}
              lookupState={lookupState}
              onLookupStateChange={handleLookupStateChange}
              radiusMeters={radiusMeters}
            />
            {submitted && !resolvedCoordinate ? (
              <p className="mt-2 text-label-12-medium text-red-500">
                {lookupState.status === "loading"
                  ? "주소 위치를 확인 중입니다."
                  : lookupState.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="-mx-0 -mb-0 mt-6 flex-row justify-end gap-2.5 rounded-none border-t border-gray-100 bg-transparent p-0 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal"
            >
              {dialog.cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={saving || lookupState.status === "loading"}
              className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal text-white"
            >
              {saveButtonLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLocationDialog({
  deleting,
  location,
  onClose,
  onConfirm,
}: {
  deleting: boolean;
  location: SettingsLocation;
  onClose: () => void;
  onConfirm: (location: SettingsLocation) => Promise<void>;
}) {
  const { deleteDialog } = settingsLocationsFixture;
  const blocked = location.dutyCount > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-labelledby="settings-location-delete-dialog-title"
        className="w-[calc(100vw-32px)] max-w-[480px] rounded-[8px] bg-white px-6 py-6 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0 sm:max-w-[480px]"
      >
        <DialogTitle
          id="settings-location-delete-dialog-title"
          className="text-h-20 text-gray-900"
        >
          {blocked ? deleteDialog.blockedTitle : deleteDialog.title}
        </DialogTitle>
        <p className="mt-3 text-body-14-regular tracking-normal text-gray-500">
          {blocked
            ? `${deleteDialog.blockedDescription} 현재 사용 근무 ${location.dutyCount}건`
            : deleteDialog.description}
        </p>
        <DialogFooter className="-mx-0 -mb-0 mt-8 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          {blocked ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
            >
              {deleteDialog.closeLabel}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={deleting}
                className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
              >
                {deleteDialog.cancelLabel}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={() => {
                  void onConfirm(location);
                }}
                className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal text-red-500"
              >
                {deleting ? "삭제 중" : deleteDialog.confirmLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialogField({
  error,
  label,
  name,
  ...props
}: {
  error?: string;
  label: string;
  name: SettingsLocationFormField;
} & Omit<ComponentProps<"input">, "name">) {
  const inputId = `settings-location-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <label className="mt-6 block">
      <span className="text-h-18-semibold text-gray-900">{label}</span>
      <Input
        id={inputId}
        name={name}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        size="lg"
        className="mt-3 h-11 rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular text-gray-800"
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-label-12-medium text-red-500">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function LocationAddressSearchField({
  error,
  hasResults,
  label,
  onChange,
  onDebouncedSearch,
  onKeyDown,
  onSelectResult,
  placeholder,
  results,
  saving,
  value,
}: {
  error?: string;
  hasResults: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDebouncedSearch: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelectResult: (result: LocationAddressSearchResult) => void;
  placeholder: string;
  results: readonly LocationAddressSearchResult[];
  saving: boolean;
  value: string;
}) {
  const inputId = "settings-location-roadAddress";
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;

  return (
    <div className="mt-6">
      <span id={labelId} className="text-h-18-semibold text-gray-900">
        {label}
      </span>
      <SearchField
        id={inputId}
        name="roadAddress"
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        aria-labelledby={labelId}
        autoComplete="off"
        className="mt-3 h-11 rounded-[8px] border-gray-200 bg-gray-50 py-0"
        debounceMs={350}
        disabled={saving}
        onChange={onChange}
        onDebouncedValueChange={onDebouncedSearch}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        value={value}
      />
      {hasResults ? (
        <div
          className="mt-2 max-h-[184px] overflow-y-auto rounded-[8px] border border-gray-100 bg-white shadow-[0px_8px_22px_rgba(17,24,39,0.08)]"
          data-testid="settings-location-address-results"
        >
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              className="block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:bg-green-50 focus-visible:outline-none"
              data-testid="settings-location-address-result"
              onClick={() => onSelectResult(result)}
            >
              <span className="block truncate text-h-16-semibold tracking-normal text-gray-900">
                {result.title}
              </span>
              <span className="mt-1 block truncate text-body-14-regular tracking-normal text-gray-500">
                {result.subtitle}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-label-12-medium text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LocationRadiusField({
  error,
  onChange,
  saving,
  value,
}: {
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  value: string;
}) {
  const { dialog } = settingsLocationsFixture;

  return (
    <label className="mt-6 block">
      <span className="text-h-18-semibold text-gray-900">
        {dialog.radiusLabel}
      </span>
      <span className="mt-3 flex items-center gap-2.5">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="10"
          value={value}
          onChange={onChange}
          disabled={saving}
          aria-describedby="settings-location-radius-unit"
          aria-invalid={Boolean(error)}
          size="lg"
          className="h-11 w-60 rounded-[8px] border-gray-200 bg-gray-50 px-4 text-right text-h-18-regular text-gray-800"
        />
        <span
          id="settings-location-radius-unit"
          className="text-h-18-semibold text-gray-900"
        >
          {dialog.radiusUnit}
        </span>
      </span>
      {error ? (
        <p className="mt-2 text-label-12-medium text-red-500">{error}</p>
      ) : null}
    </label>
  );
}

function KakaoRadiusMap({
  coordinate,
  lookupState,
  onLookupStateChange,
  radiusMeters,
}: {
  coordinate: SettingsLocationCoordinate | null;
  lookupState: LocationLookupState;
  onLookupStateChange: (state: LocationLookupState) => void;
  radiusMeters: number;
}) {
  const visibleLookupMessage =
    lookupState.status === "unavailable" ? lookupState.message : null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<KakaoMapsSdk | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const circleRef = useRef<KakaoCircle | null>(null);
  const [sdkStatus, setSdkStatus] = useState<
    "idle" | "loading" | "ready" | "failed" | "missing-key"
  >(kakaoMapJavaScriptKey ? "loading" : "missing-key");

  useEffect(() => {
    if (!kakaoMapJavaScriptKey) {
      onLookupStateChange({
        message: "카카오 지도 키를 확인해 주세요.",
        status: "unavailable",
      });
      return;
    }

    let active = true;

    void loadKakaoMapsSdk(kakaoMapJavaScriptKey)
      .then((sdk) => {
        if (!active) {
          return;
        }

        sdkRef.current = sdk;
        setSdkStatus("ready");
        if (coordinate) {
          onLookupStateChange({
            message: "위치 확인 완료",
            status: "resolved",
          });
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSdkStatus("failed");
        onLookupStateChange({
          message: "카카오 지도를 불러오지 못했습니다.",
          status: "unavailable",
        });
      });

    return () => {
      active = false;
    };
  }, [coordinate, onLookupStateChange]);

  useEffect(() => {
    const sdk = sdkRef.current;
    const container = mapContainerRef.current;

    if (!sdk || !container || sdkStatus !== "ready") {
      return;
    }

    const center = toKakaoLatLng(sdk, coordinate ?? defaultMapCoordinate);

    if (!mapRef.current) {
      mapRef.current = new sdk.Map(container, {
        center,
        level: coordinate ? 3 : 5,
      });
    }

    const map = mapRef.current;

    window.requestAnimationFrame(() => {
      map.relayout();
      map.setCenter(center);
      map.setLevel(coordinate ? 3 : 5);
    });
  }, [coordinate, sdkStatus]);

  useEffect(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;

    if (!sdk || !map || sdkStatus !== "ready") {
      return;
    }

    if (!coordinate) {
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      return;
    }

    const center = toKakaoLatLng(sdk, coordinate);

    if (!markerRef.current) {
      markerRef.current = new sdk.Marker({
        map,
        position: center,
      });
    } else {
      markerRef.current.setPosition(center);
      markerRef.current.setMap(map);
    }

    if (!circleRef.current) {
      circleRef.current = new sdk.Circle({
        center,
        fillColor: "#83daa6",
        fillOpacity: 0.32,
        map,
        radius: radiusMeters,
        strokeColor: "#30c179",
        strokeOpacity: 0.95,
        strokeWeight: 2,
      });
    } else {
      circleRef.current.setOptions({
        center,
        radius: radiusMeters,
      });
      circleRef.current.setMap(map);
    }

    map.setCenter(center);
  }, [coordinate, radiusMeters, sdkStatus]);

  return (
    <div className="mt-8">
      <div
        role="img"
        aria-label="출퇴근 허용 반경 지도"
        className="relative h-64 w-full overflow-hidden rounded-[8px] border border-gray-100 bg-gray-50"
        data-testid="settings-location-map"
      >
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          aria-hidden={sdkStatus !== "ready"}
        />
      </div>
      {visibleLookupMessage ? (
        <p
          className="mt-2 text-label-12-medium text-red-500"
          data-testid="settings-location-map-status"
        >
          {visibleLookupMessage}
        </p>
      ) : null}
    </div>
  );
}

function toKakaoLatLng(
  sdk: KakaoMapsSdk,
  coordinate: SettingsLocationCoordinate,
) {
  return new sdk.LatLng(coordinate.lat, coordinate.lng);
}

function mapPlaceSearchResult(
  result: KakaoPlaceSearchResult,
): LocationAddressSearchResult | null {
  const coordinate = readKakaoSearchCoordinate(result);
  const address = normalizeLocationText(
    result.road_address_name || result.address_name,
  );
  const title = normalizeLocationText(result.place_name || address);

  if (!coordinate || !address || !title) {
    return null;
  }

  return {
    address,
    coordinate,
    id: `place-${result.id || `${result.x}-${result.y}`}`,
    subtitle: address,
    title,
  };
}

function mapGeocoderSearchResult(
  result: KakaoGeocoderResult,
): LocationAddressSearchResult | null {
  const coordinate = readKakaoSearchCoordinate(result);
  const roadAddress = normalizeLocationText(
    result.road_address?.address_name || result.address_name,
  );
  const address = normalizeLocationText(result.address_name || roadAddress);

  if (!coordinate || !roadAddress) {
    return null;
  }

  return {
    address: roadAddress,
    coordinate,
    id: `address-${result.x}-${result.y}-${roadAddress}`,
    subtitle: address === roadAddress ? "주소" : address,
    title: roadAddress,
  };
}

function isLocationAddressSearchResult(
  value: LocationAddressSearchResult | null,
): value is LocationAddressSearchResult {
  return value !== null;
}

function dedupeAddressSearchResults(
  results: readonly LocationAddressSearchResult[],
) {
  const resultByKey = new Map<string, LocationAddressSearchResult>();

  for (const result of results) {
    const key = `${result.address}:${result.coordinate.lat}:${result.coordinate.lng}`;

    if (!resultByKey.has(key)) {
      resultByKey.set(key, result);
    }
  }

  return Array.from(resultByKey.values());
}

function readKakaoSearchCoordinate(result: { x: string; y: string }) {
  const coordinate = {
    lat: Number(result.y),
    lng: Number(result.x),
  };

  if (
    !Number.isFinite(coordinate.lat) ||
    !Number.isFinite(coordinate.lng)
  ) {
    return null;
  }

  return coordinate satisfies SettingsLocationCoordinate;
}
