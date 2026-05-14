"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type DetailStateHeaderProps = {
  actions?: ReactNode;
  backLabel: string;
  onBack: () => void;
  title: string;
};

function DetailStateHeader({
  actions,
  backLabel,
  onBack,
  title,
}: DetailStateHeaderProps) {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4">
      <nav aria-label="상세 위치" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-h-16-medium text-gray-500">
          <li className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="block max-w-[220px] truncate rounded-[6px] px-1 py-1 text-left transition-colors duration-150 ease-out hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
            >
              {backLabel}
            </button>
          </li>
          <li className="flex min-w-0 items-center gap-1">
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-gray-300"
              strokeWidth={2}
            />
            <h1
              aria-current="page"
              className="truncate text-h-18-semibold text-gray-900"
            >
              {title}
            </h1>
          </li>
        </ol>
      </nav>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

export { DetailStateHeader };
