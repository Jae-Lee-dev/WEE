"use client";

import { useState } from "react";
import { IconNotice } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { dashboardNotifications } from "@/features/dashboard/dashboard-fixtures";
import { cn } from "@/lib/utils";

const notificationToneClassNames = {
  green: "green",
  blue: "blue",
  orange: "orange",
  red: "red",
} as const;

const notificationToneStyleMap = {
  green: { color: "var(--color-green-400)" },
  blue: { color: "var(--color-blue-500)" },
  orange: { color: "var(--color-orange-400)" },
  red: { color: "var(--color-red-500)" },
} as const;

const notificationBadgeClassName =
  "[font-size:16px] font-semibold leading-[1.4] tracking-[-0.02em]";

export function HeaderNotificationSlot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="알림"
        aria-expanded={open}
        data-admin-shell-slot="notification"
        data-testid="header-notification-trigger"
        onClick={() => setOpen((current) => !current)}
        className="relative flex size-10 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <IconNotice
          hasNotice
          className="size-6 text-gray-600 [--notice-dot:var(--color-green-400)]"
        />
      </button>

      {open ? <NotificationPanel /> : null}
    </div>
  );
}

function NotificationPanel() {
  return (
    <aside
      aria-label="확인 필요 알림"
      data-testid="header-notification-panel"
      className="fixed right-5 top-[65px] z-50 w-[480px] overflow-hidden rounded-[10px] bg-white pt-5 shadow-[0px_0px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="px-4">
        <h2 className="text-h-20 text-gray-900">확인 필요</h2>
      </div>
      <div className="mt-3 border-t border-gray-200">
        {dashboardNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className={cn(
              "flex min-h-[94px] gap-[18px] border-b border-gray-200 px-4 pt-5",
              index < dashboardNotifications.length - 1 && "bg-gray-50",
            )}
          >
            <div className="w-[70px] shrink-0">
              <Badge
                variant={notificationToneClassNames[notification.tone]}
                size="M"
                className={notificationBadgeClassName}
                style={notificationToneStyleMap[notification.tone]}
              >
                {notification.label}
              </Badge>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-h-18-semibold text-gray-900">
                {notification.title}
              </p>
              <p className="mt-1 text-h-18-regular text-gray-400">
                {notification.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
