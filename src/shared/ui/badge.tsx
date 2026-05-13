import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden border border-transparent whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-green-100 text-green-400",
        green: "bg-green-100 text-green-400",
        greenSolid: "bg-green-400 [color:#FEFEFE]",
        orange: "bg-orange-100 text-orange-400",
        red: "bg-red-50 text-red-500",
        blue: "bg-blue-50 text-blue-500",
        grey: "bg-gray-100 text-gray-600",
        outline: "border-gray-300 bg-white text-gray-800",
      },
      size: {
        M: "px-1.5 py-0.5 text-detail-16-semibold",
        L: "px-2.5 py-1 text-h-18-semibold",
        count:
          "h-6 min-w-6 px-2 py-0 text-detail-16-semibold tabular-nums [line-height:1]",
      },
      shape: {
        default: "rounded-[4px]",
        pill: "rounded-full",
      },
    },
    compoundVariants: [
      {
        size: "M",
        variant: "grey",
        className: "text-detail-16-regular",
      },
      {
        size: "count",
        variant: "grey",
        className: "text-detail-16-regular",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "M",
      shape: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  size = "M",
  shape = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
