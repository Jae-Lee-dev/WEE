"use client";

import Link from "next/link";
import { useState } from "react";
import { IconNotice } from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { headerNotifications } from "../model/header-notification-fixtures";

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
  "text-detail-16-semibold tracking-normal";

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
        className="relative flex size-9 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <IconNotice
          hasNotice
          className="size-5 text-gray-600 [--notice-dot:var(--color-green-400)]"
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
      className="fixed right-4 top-[56px] z-50 w-[420px] overflow-hidden rounded-[8px] bg-white pt-4 shadow-[0px_0px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="px-3.5">
        <h2 className="text-h-18-semibold text-gray-900">확인 필요</h2>
      </div>
      <div className="mt-2.5 border-t border-gray-200">
        {headerNotifications.map((notification, index) => (
          <Link
            key={notification.id}
            href={notification.href}
            className={cn(
              "flex min-h-[76px] gap-3.5 border-b border-gray-200 px-3.5 pt-4",
              index < headerNotifications.length - 1 && "bg-gray-50",
              "transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
            )}
          >
            <div className="w-[56px] shrink-0">
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
              <p className="truncate text-h-16-semibold text-gray-900">
                {notification.title}
              </p>
              <p className="mt-1 text-h-14-regular text-gray-400">
                {notification.date}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
