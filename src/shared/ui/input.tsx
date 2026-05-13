import * as React from "react";

import { cn } from "@/shared/lib/utils";
import type { ControlSize } from "@/shared/ui/control-size";

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: ControlSize | React.ComponentProps<"input">["size"];
};

const inputSizeClassName: Record<ControlSize, string> = {
  sm: "h-9 min-h-9 px-2 py-0 text-label-14-medium",
  default: "h-[42px] min-h-[42px] px-4 py-0 text-h-18-regular",
  lg: "h-11 min-h-11 px-4 py-0 text-h-18-regular",
};

function Input({ className, size = "default", type, ...props }: InputProps) {
  const controlSize = isControlSize(size) ? size : "default";
  const nativeSize = typeof size === "number" ? size : undefined;

  return (
    <input
      type={type}
      size={nativeSize}
      data-slot="input"
      data-size={controlSize}
      className={cn(
        "w-full min-w-0 rounded-[6px] border border-gray-100 bg-white text-gray-800 transition-colors duration-150 ease-out outline-none placeholder:text-gray-400 hover:border-gray-200 focus-visible:border-green-400 focus-visible:ring-2 focus-visible:ring-green-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-100",
        inputSizeClassName[controlSize],
        className
      )}
      {...props}
    />
  );
}

function isControlSize(size: InputProps["size"]): size is ControlSize {
  return size === "sm" || size === "default" || size === "lg";
}

export { Input };
export type { InputProps };
