"use client";

import type { ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
  pageSize?: number;
  siblingCount?: number;
  totalItems?: number;
};

const paginationWindowPadding = 2;

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  itemLabel = "항목",
  pageSize,
  siblingCount = 1,
  totalItems,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = clamp(currentPage, 1, safeTotalPages);
  const pages = createPageItems(safeCurrentPage, safeTotalPages, siblingCount);
  const hasPrevious = safeCurrentPage > 1;
  const hasNext = safeCurrentPage < safeTotalPages;

  return (
    <nav
      aria-label="페이지네이션"
      className={cn(
        "flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-2.5",
        className,
      )}
    >
      <PaginationSummary
        currentPage={safeCurrentPage}
        itemLabel={itemLabel}
        pageSize={pageSize}
        totalItems={totalItems}
      />

      <div className="flex items-center gap-1.5">
        <PaginationIconButton
          ariaLabel="이전 페이지"
          disabled={!hasPrevious}
          onClick={() => onPageChange(safeCurrentPage - 1)}
        >
          <IconChevronLeft className="size-5" />
        </PaginationIconButton>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="flex size-8 items-center justify-center text-label-14-medium text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              aria-current={page === safeCurrentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
              className={cn(
                "flex size-8 items-center justify-center rounded-[8px] text-label-14-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
                page === safeCurrentPage
                  ? "bg-green-400 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {page}
            </button>
          ),
        )}

        <PaginationIconButton
          ariaLabel="다음 페이지"
          disabled={!hasNext}
          onClick={() => onPageChange(safeCurrentPage + 1)}
        >
          <IconChevronRight className="size-5" />
        </PaginationIconButton>
      </div>
    </nav>
  );
}

function PaginationSummary({
  currentPage,
  itemLabel,
  pageSize,
  totalItems,
}: {
  currentPage: number;
  itemLabel: string;
  pageSize?: number;
  totalItems?: number;
}) {
  if (!pageSize || totalItems === undefined) {
    return (
      <div className="text-body-14-regular text-gray-500">
        {currentPage}페이지
      </div>
    );
  }

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="text-body-14-regular text-gray-500">
      {start}-{end} / {totalItems}
      {itemLabel}
    </div>
  );
}

function PaginationIconButton({
  ariaLabel,
  children,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:text-gray-300"
    >
      {children}
    </button>
  );
}

function createPageItems(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
) {
  const visibleSlots = siblingCount * 2 + paginationWindowPadding * 2 + 1;

  if (totalPages <= visibleSlots) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 2);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages - 1);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, 3 + siblingCount * 2), "ellipsis", totalPages] as const;
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [
      1,
      "ellipsis",
      ...range(totalPages - (2 + siblingCount * 2), totalPages),
    ] as const;
  }

  return [
    1,
    "ellipsis",
    ...range(leftSibling, rightSibling),
    "ellipsis",
    totalPages,
  ] as const;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
