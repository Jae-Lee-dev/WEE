"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createSettingsSupportDataSource } from "./settings-support-data-source";
import {
  settingsNotificationsFixture,
  type SettingsNotificationsFixture,
  type SettingsNotificationRow,
} from "./settings-notifications-fixtures";

export function SettingsNotificationsScreen() {
  const dataSource = useMemo(() => createSettingsSupportDataSource(), []);
  const [fixture, setFixture] = useState<SettingsNotificationsFixture>(
    settingsNotificationsFixture,
  );
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [saving, setSaving] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    dataSource
      .getNotifications()
      .then((nextFixture) => {
        if (!cancelled) {
          setFixture(nextFixture);
          setErrorMessage("");
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "알림 설정을 불러오지 못했습니다.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  async function handleToggle(
    rowId: string,
    channel: "web" | "kakao",
    checked: boolean,
  ) {
    const previousFixture = fixture;
    const nextRows = fixture.rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            kakaoChecked: channel === "kakao" ? checked : row.kakaoChecked,
            webChecked: channel === "web" ? checked : row.webChecked,
          }
        : row,
    );

    setSaving(true);
    setActionErrorMessage("");
    setStatusMessage("");
    setFixture((current) => ({
      ...current,
      rows: nextRows,
    }));

    try {
      const nextFixture = await dataSource.updateNotifications(nextRows);

      setFixture(nextFixture);
      setStatusMessage("알림 설정을 저장했습니다.");
    } catch (error: unknown) {
      setFixture(previousFixture);
      setActionErrorMessage(
        error instanceof Error ? error.message : "알림 설정을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="알림"
      className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-[10px] border border-gray-100 bg-white py-4 tracking-normal"
      data-testid="settings-notifications-screen"
    >
      {statusMessage ? (
        <div
          className="mx-4 mb-3 rounded-[8px] border border-green-100 bg-green-50 px-4 py-3 text-body-14-regular text-green-500"
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}
      {actionErrorMessage ? (
        <div
          className="mx-4 mb-3 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-body-14-regular text-red-500"
          role="alert"
        >
          {actionErrorMessage}
        </div>
      ) : null}
      {loading || errorMessage ? (
        <SettingsNotificationsState
          label={errorMessage || "알림 설정을 불러오는 중입니다."}
          role={errorMessage ? "alert" : "status"}
        />
      ) : (
        <>
          <div
            className="grid h-[36px] grid-cols-[1fr_200px_200px] items-start border-b border-gray-300 px-4 text-h-18-regular font-medium text-gray-500"
            role="row"
          >
            {fixture.columns.map((column) => (
              <div key={column.id} role="columnheader">
                {column.label}
              </div>
            ))}
          </div>

          <div role="rowgroup">
            {fixture.rows.map((row, index) => (
              <SettingsNotificationTableRow
                key={row.id}
                disabled={saving}
                row={row}
                last={index === fixture.rows.length - 1}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SettingsNotificationsState({
  label,
  role,
}: {
  label: string;
  role: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[300px] items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function SettingsNotificationTableRow({
  disabled,
  row,
  last,
  onToggle,
}: {
  disabled: boolean;
  row: SettingsNotificationRow;
  last: boolean;
  onToggle: (
    rowId: string,
    channel: "web" | "kakao",
    checked: boolean,
  ) => void;
}) {
  return (
    <div
      className={cn(
        "grid h-[45px] grid-cols-[1fr_200px_200px] items-center px-4 text-h-18-regular text-gray-900",
        last ? "border-b-0" : "border-b border-gray-100",
      )}
      role="row"
    >
      <div role="cell">{row.item}</div>
      <div role="cell">
        <NotificationCheckbox
          checked={row.webChecked}
          disabled={disabled}
          label={`${row.item} 웹 알림`}
          onChange={(checked) => onToggle(row.id, "web", checked)}
        />
      </div>
      <div role="cell">
        <NotificationCheckbox
          checked={row.kakaoChecked}
          disabled={disabled}
          label={`${row.item} 카카오 알림`}
          onChange={(checked) => onToggle(row.id, "kakao", checked)}
        />
      </div>
    </div>
  );
}

function NotificationCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      className="size-4 rounded-[2px]"
      disabled={disabled}
      onCheckedChange={(nextChecked) => onChange(nextChecked === true)}
    />
  );
}
