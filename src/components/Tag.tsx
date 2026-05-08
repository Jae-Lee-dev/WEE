import type { ReactNode } from "react";

type TagVariant = "green" | "orange" | "red" | "blue" | "grey" | "outline";
type TagSize = "M" | "L";

type TagProps = {
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
  children: ReactNode;
};

const colorStyles: Record<TagVariant, string> = {
  green: "bg-green-100 text-green-400",
  orange: "bg-orange-100 text-orange-400",
  red: "bg-red-50 text-red-500",
  blue: "bg-blue-50 text-blue-500",
  grey: "bg-gray-100 text-gray-600",
  outline: "bg-white text-gray-800 border border-gray-300",
};

// Tag M: 16px. Grey is Regular weight per Figma; others SemiBold.
// Tag L: 18px SemiBold across all variants.
const sizeBoxStyles: Record<TagSize, string> = {
  M: "px-1.5 py-0.5 rounded-[4px]",
  L: "px-2.5 py-1 rounded-[4px]",
};

const sizeTextStyles: Record<TagSize, Record<TagVariant, string>> = {
  M: {
    green: "text-detail-16-semibold",
    orange: "text-detail-16-semibold",
    red: "text-detail-16-semibold",
    blue: "text-detail-16-semibold",
    grey: "text-detail-16-regular",
    outline: "text-detail-16-semibold",
  },
  L: {
    green: "text-h-18-semibold",
    orange: "text-h-18-semibold",
    red: "text-h-18-semibold",
    blue: "text-h-18-semibold",
    grey: "text-h-18-semibold",
    outline: "text-h-18-semibold",
  },
};

export function Tag({
  variant = "green",
  size = "M",
  className = "",
  children,
}: TagProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${sizeBoxStyles[size]} ${colorStyles[variant]} ${sizeTextStyles[size][variant]} ${className}`}
    >
      {children}
    </span>
  );
}
