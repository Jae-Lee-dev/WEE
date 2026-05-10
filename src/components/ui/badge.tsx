import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-transparent whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-green-100 text-green-400",
        green: "bg-green-100 text-green-400",
        orange: "bg-orange-100 text-orange-400",
        red: "bg-red-50 text-red-500",
        blue: "bg-blue-50 text-blue-500",
        grey: "bg-gray-100 text-gray-600",
        outline: "border-gray-300 bg-white text-gray-800",
      },
      size: {
        M: "px-1.5 py-0.5 text-detail-16-semibold",
        L: "px-2.5 py-1 text-h-18-semibold",
      },
      interactive: {
        true: "cursor-pointer transition-[background-color,border-color,color,filter] duration-150 ease-out",
        false: "",
      },
    },
    compoundVariants: [
      {
        interactive: true,
        variant: ["default", "green"],
        className: "hover:bg-green-200 active:bg-green-300 active:text-green-500",
      },
      {
        interactive: true,
        variant: "orange",
        className: "hover:bg-orange-100 hover:brightness-95 active:brightness-90",
      },
      {
        interactive: true,
        variant: "red",
        className: "hover:bg-red-100 active:bg-red-100",
      },
      {
        interactive: true,
        variant: "blue",
        className: "hover:bg-blue-50 hover:brightness-95 active:brightness-90",
      },
      {
        interactive: true,
        variant: "grey",
        className: "hover:bg-gray-200 active:bg-gray-200",
      },
      {
        interactive: true,
        variant: "outline",
        className: "hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100",
      },
      {
        size: "M",
        variant: "grey",
        className: "text-detail-16-regular",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "M",
      interactive: false,
    },
  }
);

function Badge({
  className,
  variant = "default",
  size = "M",
  interactive = false,
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
      className={cn(badgeVariants({ variant, size, interactive }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
