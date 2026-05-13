import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-transparent bg-clip-padding text-h-18-semibold font-semibold tracking-tight transition-colors duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-green-400 text-white hover:bg-green-450 active:bg-green-500 focus-visible:ring-green-200",
        primary:
          "bg-green-400 text-white hover:bg-green-450 active:bg-green-500 focus-visible:ring-green-200",
        secondary:
          "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-200",
        outline:
          "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-200",
        danger:
          "border-red-500 bg-white text-red-500 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-100",
        destructive:
          "border-red-500 bg-white text-red-500 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-100",
        ghost:
          "border-transparent bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:ring-green-200",
        link: "border-transparent bg-transparent px-0 text-green-400 underline-offset-4 hover:underline active:text-green-500 focus-visible:ring-green-200",
      },
      size: {
        default: "gap-2 px-6 py-3",
        sm: "gap-1.5 rounded-[8px] px-4 py-2 text-h-16-semibold",
        lg: "gap-2.5 px-7 py-4 text-h-20",
        icon: "size-10 p-0",
        "icon-sm": "size-8 rounded-[8px] p-0",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
