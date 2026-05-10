import type { InputHTMLAttributes, Ref } from "react";
import { IconSearch } from "@/components/icons";

type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  ref?: Ref<HTMLInputElement>;
};

export function SearchField({
  className = "",
  ref,
  ...rest
}: SearchFieldProps) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-[6px] border border-gray-100 bg-white px-4 py-2.5 transition-colors duration-150 ease-out hover:border-gray-200 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 ${className}`}
    >
      <input
        ref={ref}
        type="search"
        className="text-h-18-regular flex-1 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
        {...rest}
      />
      <IconSearch className="size-6 shrink-0 text-gray-400 transition-colors duration-150 ease-out group-hover:text-gray-500 group-focus-within:text-green-400" />
    </div>
  );
}
