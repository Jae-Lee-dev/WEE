"use client";

import { IconNotice } from "@/components/icons";

export function HeaderNotificationSlot() {
  return (
    <button
      type="button"
      aria-label="알림"
      data-admin-shell-slot="notification"
      className="relative flex size-10 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <IconNotice hasNotice className="size-6" />
    </button>
  );
}

