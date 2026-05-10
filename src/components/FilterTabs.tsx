type Option<T extends string> = { value: T; label: string };

type FilterTabsProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: FilterTabsProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white p-1 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`text-label-18 rounded-full px-2.5 py-1 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1 ${
              active
                ? "bg-green-400 text-white hover:bg-green-500 active:bg-green-500"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
