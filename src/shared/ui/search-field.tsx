"use client";

import * as React from "react";
import { IconSearch } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

type SearchFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  debounceMs?: number;
  onDebouncedValueChange?: (value: string) => void;
};

type SearchFieldValue =
  | React.InputHTMLAttributes<HTMLInputElement>["defaultValue"]
  | React.InputHTMLAttributes<HTMLInputElement>["value"];

function normalizeSearchFieldValue(value: SearchFieldValue) {
  if (Array.isArray(value)) return value.join(" ");
  if (value == null) return "";
  return String(value);
}

function SearchField({
  className,
  debounceMs,
  defaultValue,
  onChange,
  onDebouncedValueChange,
  value,
  ...props
}: SearchFieldProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    normalizeSearchFieldValue(defaultValue),
  );
  const searchValue = isControlled
    ? normalizeSearchFieldValue(value)
    : uncontrolledValue;
  const debouncedSearchValue = useDebouncedValue(searchValue, debounceMs);
  const onDebouncedValueChangeRef = React.useRef(onDebouncedValueChange);
  const hasMountedRef = React.useRef(false);

  React.useEffect(() => {
    onDebouncedValueChangeRef.current = onDebouncedValueChange;
  }, [onDebouncedValueChange]);

  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    onDebouncedValueChangeRef.current?.(debouncedSearchValue);
  }, [debouncedSearchValue]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledValue(event.target.value);
      }

      onChange?.(event);
    },
    [isControlled, onChange],
  );

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
        value={value}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={handleChange}
        {...props}
      />
      <IconSearch className="size-6 shrink-0 text-gray-400 transition-colors duration-150 ease-out group-hover:text-gray-500 group-focus-within:text-green-400" />
    </div>
  );
}

export { SearchField };
