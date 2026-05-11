"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSettingsLocationsDataSource,
  type SettingsLocationsDataSource,
} from "./settings-locations-data-source";
import { settingsLocationsFixture } from "./settings-locations-fixtures";
import {
  type CreateSettingsLocationInput,
  formatRadiusMeters,
  getLocationGeocodingStatusLabel,
  getSettingsLocationFormErrors,
  hasSettingsLocationFormErrors,
  initialSettingsLocationForm,
  normalizeRadiusInput,
  toCreateSettingsLocationInput,
  type SettingsLocation,
  type SettingsLocationFormField,
  type SettingsLocationFormState,
} from "./settings-locations-model";

type SettingsLocationsScreenProps = {
  dataSource?: SettingsLocationsDataSource;
};

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleCreateLocation = async (input: CreateSettingsLocationInput) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const location = await dataSource.createLocation(input);

      setLocations((current) => [location, ...current]);
      setStatusMessage(`${location.name} 근무지를 등록했습니다.`);
      setDialogOpen(false);
    } catch {
      setErrorMessage("근무지를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="근무지 설정"
      className="mx-auto flex h-[calc(100vh-202px)] min-h-[620px] w-full max-w-[1580px] flex-col items-end gap-5 tracking-normal"
      data-testid="settings-locations-screen"
    >
      <div className="flex w-full items-center justify-end gap-4">
        {statusMessage ? (
          <div
            className="min-h-[42px] rounded-[8px] border border-green-100 bg-green-50 px-4 py-2.5 text-body-14-medium tracking-normal text-green-500"
            role="status"
          >
            {statusMessage}
          </div>
        ) : errorMessage ? (
          <div
            className="min-h-[42px] rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
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
            setDialogOpen(true);
          }}
          className="h-[42px] rounded-full px-4 text-h-18-regular font-normal tracking-normal"
        >
          {settingsLocationsFixture.addButtonLabel}
        </Button>
      </div>

      <LocationsTable loading={loading} locations={locations} />

      {dialogOpen ? (
        <LocationDialog
          locations={locations}
          onClose={() => {
            if (!saving) {
              setDialogOpen(false);
            }
          }}
          onCreateLocation={handleCreateLocation}
          saving={saving}
        />
      ) : null}
    </section>
  );
}

function LocationsTable({
  loading,
  locations,
}: {
  loading: boolean;
  locations: readonly SettingsLocation[];
}) {
  return (
    <section
      aria-label="근무지 목록"
      className="min-h-0 w-full flex-1 overflow-hidden rounded-[10px] border border-gray-100 bg-white py-5"
      data-testid="settings-locations-table"
    >
      <div
        className="grid h-[32px] grid-cols-[1fr_1.45fr_110px_120px_120px_180px] items-start border-b border-gray-300 px-5 text-h-18-regular text-gray-500"
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
        <div className="flex h-full min-h-[360px] items-center justify-center px-5 text-h-18-regular text-gray-500">
          {settingsLocationsFixture.loadingLabel}
        </div>
      ) : locations.length > 0 ? (
        <div role="rowgroup">
          {locations.map((row, index) => (
            <LocationTableRow key={row.id} first={index === 0} row={row} />
          ))}
        </div>
      ) : (
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-5 text-center">
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
}: {
  row: SettingsLocation;
  first: boolean;
}) {
  return (
    <div
      className="grid h-[61px] grid-cols-[1fr_1.45fr_110px_120px_120px_180px] items-center border-b border-gray-100 px-5 text-h-18-regular text-gray-800 last:border-b-0"
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
        {getLocationGeocodingStatusLabel(row.geocodingStatus)}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.dutyCount}건
      </div>
      <div className="flex justify-end gap-2.5" role="cell">
        <Button
          type="button"
          variant="secondary"
          className="h-[42px] rounded-full px-4 text-h-18-regular font-medium tracking-normal"
        >
          {settingsLocationsFixture.editButtonLabel}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-[42px] rounded-full px-4 text-h-18-regular font-medium tracking-normal text-red-500"
        >
          {settingsLocationsFixture.deleteButtonLabel}
        </Button>
      </div>
    </div>
  );
}

function LocationDialog({
  locations,
  onClose,
  onCreateLocation,
  saving,
}: {
  locations: readonly SettingsLocation[];
  onClose: () => void;
  onCreateLocation: (input: CreateSettingsLocationInput) => Promise<void>;
  saving: boolean;
}) {
  const { dialog } = settingsLocationsFixture;
  const [form, setForm] = useState<SettingsLocationFormState>(
    initialSettingsLocationForm,
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = getSettingsLocationFormErrors(form, locations);

  const handleFieldChange =
    (field: SettingsLocationFormField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]:
          field === "radiusMeters"
            ? normalizeRadiusInput(event.target.value)
            : event.target.value,
      }));
    };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasSettingsLocationFormErrors(errors)) {
      return;
    }

    void onCreateLocation(toCreateSettingsLocationInput(form));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-location-dialog-title"
        className="flex h-[900px] w-[680px] flex-col rounded-[8px] bg-white px-10 py-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="settings-location-dialog"
        noValidate
        onSubmit={handleSave}
      >
        <div>
          <h2
            id="settings-location-dialog-title"
            className="text-h-20 text-gray-900"
          >
            {dialog.title}
          </h2>
          <p className="mt-2 text-body-14-regular tracking-normal text-gray-500">
            {dialog.description}
          </p>
        </div>

        <LocationDialogField
          error={submitted ? errors.name : undefined}
          label={dialog.nameLabel}
          name="name"
          onChange={handleFieldChange("name")}
          placeholder={dialog.namePlaceholder}
          value={form.name}
          disabled={saving}
        />

        <LocationDialogField
          error={submitted ? errors.roadAddress : undefined}
          label={dialog.roadAddressLabel}
          name="roadAddress"
          onChange={handleFieldChange("roadAddress")}
          placeholder={dialog.roadAddressPlaceholder}
          value={form.roadAddress}
          disabled={saving}
        />

        <LocationDialogField
          label={dialog.detailAddressLabel}
          name="detailAddress"
          onChange={handleFieldChange("detailAddress")}
          placeholder={dialog.detailAddressPlaceholder}
          value={form.detailAddress}
          disabled={saving}
        />

        <LocationRadiusField
          error={submitted ? errors.radiusMeters : undefined}
          onChange={handleFieldChange("radiusMeters")}
          saving={saving}
          value={form.radiusMeters}
        />

        <StaticRadiusMap />

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
          >
            {dialog.cancelLabel}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {saving ? "저장 중" : dialog.addLabel}
          </Button>
        </div>
      </form>
    </div>
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
        className="mt-3 h-[49px] rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular text-gray-800"
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
          className="h-[49px] w-60 rounded-[8px] border-gray-200 bg-gray-50 px-4 text-right text-h-18-regular text-gray-800"
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

function StaticRadiusMap() {
  return (
    <svg
      role="img"
      aria-label="출퇴근 허용 반경 지도"
      className="mt-8 h-64 w-full overflow-hidden rounded-[8px] bg-blue-50"
      data-testid="settings-location-map"
      viewBox="0 0 600 260"
    >
      <rect width="600" height="260" fill="#eff6ff" />
      <path d="M0 210L140 186L280 210L600 190V260H0Z" fill="#e9fdf1" />
      <path d="M70 -20C96 54 128 110 166 162C200 208 222 236 246 290" stroke="#d1d5db" strokeWidth="28" />
      <path d="M72 -20C98 54 130 110 168 162C202 208 224 236 248 290" stroke="#fefefe" strokeWidth="22" />
      <path d="M-20 80C88 96 184 112 282 124C396 138 482 128 620 102" stroke="#d1d5db" strokeWidth="30" />
      <path d="M-20 84C88 100 184 116 282 128C396 142 482 132 620 106" stroke="#fefefe" strokeWidth="24" />
      <path d="M-20 190C92 178 182 176 282 164C390 151 500 138 620 132" stroke="#d1d5db" strokeWidth="32" />
      <path d="M-20 194C92 182 182 180 282 168C390 155 500 142 620 136" stroke="#fefefe" strokeWidth="26" />
      <circle
        cx="360"
        cy="146"
        r="82"
        fill="#83daa6"
        fillOpacity="0.32"
        stroke="#30c179"
        strokeWidth="2"
      />
      <circle cx="360" cy="146" r="17" fill="#3b82f6" />
      <circle cx="360" cy="146" r="8" fill="#fefefe" />
      <text
        x="390"
        y="154"
        fill="#3b82f6"
        fontFamily="Pretendard Variable, Pretendard, sans-serif"
        fontSize="18"
        fontWeight="600"
      >
        근무지
      </text>
    </svg>
  );
}
