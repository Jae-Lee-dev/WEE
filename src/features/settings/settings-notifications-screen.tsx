import { IconCheck } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  settingsNotificationsFixture,
  type SettingsNotificationRow,
} from "./settings-notifications-fixtures";

export function SettingsNotificationsScreen() {
  return (
    <section
      aria-label="알림"
      className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-[10px] border border-gray-100 bg-white py-4 tracking-normal"
      data-testid="settings-notifications-screen"
    >
      <div
        className="grid h-[36px] grid-cols-[1fr_200px_200px] items-start border-b border-gray-300 px-4 text-h-18-regular font-medium text-gray-500"
        role="row"
      >
        {settingsNotificationsFixture.columns.map((column) => (
          <div key={column.id} role="columnheader">
            {column.label}
          </div>
        ))}
      </div>

      <div role="rowgroup">
        {settingsNotificationsFixture.rows.map((row, index) => (
          <SettingsNotificationTableRow
            key={row.id}
            row={row}
            last={index === settingsNotificationsFixture.rows.length - 1}
          />
        ))}
      </div>
    </section>
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
