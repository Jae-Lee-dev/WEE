type Option<T extends string> = { value: T; label: string };

type SegmentProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Segment<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentProps<T>) {
  return (
    <div
      className={`inline-flex items-center rounded-[10px] border border-gray-200 p-1 ${className}`}
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
            className={`text-h-18-semibold flex-1 rounded-[10px] px-4 py-3 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1 ${
              active
                ? "bg-green-400 text-white hover:bg-green-500 active:bg-green-500"
                : "bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
