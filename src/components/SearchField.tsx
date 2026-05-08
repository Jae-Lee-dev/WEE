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
      className={`flex items-center gap-2 rounded-[6px] border border-gray-100 bg-white px-4 py-2.5 ${className}`}
    >
      <input
        ref={ref}
        type="search"
        className="text-h-18-regular flex-1 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
        {...rest}
      />
      <IconSearch className="size-6 shrink-0 text-gray-400" />
    </div>
  );
}
