import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "text-h-18-regular min-h-24 w-full min-w-0 resize-none rounded-[6px] border border-gray-100 bg-white px-4 py-3 text-gray-800 transition-colors duration-150 ease-out outline-none placeholder:text-gray-400 hover:border-gray-200 focus-visible:border-green-400 focus-visible:ring-2 focus-visible:ring-green-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-100",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
