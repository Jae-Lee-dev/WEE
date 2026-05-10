import * as React from "react";
import { IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";

type SearchFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
>;

function SearchField({ className, ...props }: SearchFieldProps) {
  return (
    <div
      data-slot="search-field"
      className={cn(
        "group flex items-center gap-2 rounded-[6px] border border-gray-100 bg-white px-4 py-2.5 transition-colors duration-150 ease-out hover:border-gray-200 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100",
        className,
      )}
    >
      <input
        type="search"
        className="text-h-18-regular min-w-0 flex-1 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
        {...props}
      />
      <IconSearch className="size-6 shrink-0 text-gray-400 transition-colors duration-150 ease-out group-hover:text-gray-500 group-focus-within:text-green-400" />
    </div>
  );
}

export { SearchField };
