"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/shared/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center text-gray-500 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-[10px] bg-gray-100 p-1",
        line: "h-[34px] items-end gap-8 border-b border-gray-200 bg-transparent",
        segment: "rounded-[10px] border border-gray-200 bg-white p-1",
        filter:
          "gap-1.5 rounded-full border border-gray-200 bg-white p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

const tabsTriggerVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-[8px] px-3 py-1.5 text-body-14-medium text-gray-600 hover:bg-white hover:text-gray-900 data-active:bg-white data-active:text-gray-900 data-active:shadow-sm",
        line:
          "h-[34px] items-start border-b-2 border-transparent text-h-18-semibold text-gray-500 hover:border-gray-200 hover:text-gray-800 active:text-gray-900 data-active:border-green-400 data-active:text-green-400 data-active:hover:border-green-450 data-active:hover:text-green-450 data-active:active:border-green-500 data-active:active:text-green-500",
        segment:
          "relative z-10 flex-1 rounded-[10px] bg-transparent px-4 py-3 text-h-18-semibold text-gray-700 hover:bg-transparent hover:text-gray-900 active:bg-transparent active:text-gray-900 data-active:bg-transparent data-active:text-gray-700 data-active:hover:bg-transparent data-active:hover:text-gray-900 data-active:active:bg-transparent data-active:active:text-gray-900",
        filter:
          "relative z-10 rounded-full bg-transparent px-2.5 py-1 text-label-18 text-gray-500 hover:bg-transparent hover:text-gray-700 active:bg-transparent active:text-gray-700 data-active:bg-transparent data-active:text-gray-500 data-active:hover:bg-transparent data-active:hover:text-gray-700 data-active:active:bg-transparent data-active:active:text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsTrigger({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-variant={variant}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
};
