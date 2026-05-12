"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCheck } from "@/components/icons";
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
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <section
      aria-label="알림"
      className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-[10px] border border-gray-100 bg-white py-4 tracking-normal"
      data-testid="settings-notifications-screen"
    >
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
                row={row}
                last={index === fixture.rows.length - 1}
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
  row,
  last,
}: {
  row: SettingsNotificationRow;
  last: boolean;
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
        <StaticCheckbox checked={row.webChecked} tone="web" />
      </div>
      <div role="cell">
        <StaticCheckbox checked={row.kakaoChecked} tone="kakao" />
      </div>
    </div>
  );
}

function StaticCheckbox({
  checked,
  tone,
}: {
  checked: boolean;
  tone: "web" | "kakao";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 items-center justify-center rounded-[2px] text-white",
        tone === "web" ? "bg-green-400" : "bg-gray-200",
      )}
      data-checked={checked}
    >
      {checked ? <IconCheck className="size-3" /> : null}
    </span>
  );
}
