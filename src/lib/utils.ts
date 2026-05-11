import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const weeTextTokens = [
  "h-32",
  "h-24",
  "h-20",
  "h-18-semibold",
  "h-18-regular",
  "h-16-semibold",
  "h-16-medium",
  "h-14-semibold",
  "h-14-regular",
  "h-12-medium",
  "body-16-medium",
  "body-16-regular",
  "body-14-medium",
  "body-14-regular",
  "detail-16-semibold",
  "detail-16-regular",
  "detail-12",
  "detail-11-medium",
  "detail-10",
  "label-18",
  "label-14-medium",
  "label-14-regular",
  "label-12-medium",
  "label-12-regular",
  "label-11",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...weeTextTokens],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
