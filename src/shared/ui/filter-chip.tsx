import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const filterChipVariants = cva(
  "inline-flex h-[41px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-label-18 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        selected:
          "border-green-400 bg-green-400 text-white hover:border-green-450 hover:bg-green-450 active:border-green-500 active:bg-green-500 focus-visible:ring-green-200",
        neutral:
          "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 active:border-gray-300 active:bg-gray-100 active:text-gray-900 focus-visible:ring-gray-200",
        danger:
          "border-red-100 bg-white text-red-500 hover:border-red-500 hover:bg-red-50 active:border-red-500 active:bg-red-100 focus-visible:ring-red-100",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function FilterChip({
  className,
  variant = "neutral",
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof filterChipVariants>) {
  return (
    <button
      type={type}
      data-slot="filter-chip"
      data-variant={variant}
      className={cn(filterChipVariants({ variant }), className)}
      {...props}
    />
  );
}

export { FilterChip, filterChipVariants };
