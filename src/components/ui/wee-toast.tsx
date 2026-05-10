"use client";

import { useMemo, type ReactNode } from "react";
import { toast, type ExternalToast } from "sonner";

type WeeToastBaseOptions = Pick<
  ExternalToast,
  "action" | "cancel" | "dismissible" | "duration" | "id" | "onAutoClose" | "onDismiss"
>;

type WeeToastTone = "success" | "info" | "warning" | "error" | "neutral";

type WeeToastMessageOptions = {
  title: ReactNode;
  description?: ReactNode;
} & WeeToastBaseOptions;

type WeeToastOptions = WeeToastMessageOptions & {
  tone?: WeeToastTone;
};

type WeeCompactToastOptions = {
  title: ReactNode;
} & Pick<WeeToastBaseOptions, "duration" | "id">;

function getToastContent({ title, description }: WeeToastMessageOptions) {
  if (!description) {
    return title;
  }

  return (
    <div className="grid gap-1">
      <div className="text-body-14-medium text-gray-900">{title}</div>
      <div className="text-body-13 text-gray-500">{description}</div>
    </div>
  );
}

function showWeeToast({ tone = "neutral", title, description, ...options }: WeeToastOptions) {
  const content = getToastContent({ title, description });

  if (tone === "neutral") {
    return toast(content, options);
  }

  return toast[tone](content, options);
}

function showWeeCompactToast({ title, duration = 2200, ...options }: WeeCompactToastOptions) {
  return toast.custom(
    () => (
      <div className="rounded-full bg-gray-500 px-4 py-2 text-body-14-medium text-white shadow-[0_0_7px_rgba(0,0,0,0.05)]">
        {title}
      </div>
    ),
    {
      duration,
      ...options,
    }
  );
}

function useWeeToast() {
  return useMemo(
    () => ({
      show: showWeeToast,
      compact: showWeeCompactToast,
      success: (options: WeeToastMessageOptions) =>
        showWeeToast({ ...options, tone: "success" }),
      info: (options: WeeToastMessageOptions) =>
        showWeeToast({ ...options, tone: "info" }),
      warning: (options: WeeToastMessageOptions) =>
        showWeeToast({ ...options, tone: "warning" }),
      error: (options: WeeToastMessageOptions) =>
        showWeeToast({ ...options, tone: "error" }),
      neutral: (options: WeeToastMessageOptions) =>
        showWeeToast({ ...options, tone: "neutral" }),
    }),
    []
  );
}

export { showWeeCompactToast, showWeeToast, useWeeToast };
export type { WeeCompactToastOptions, WeeToastMessageOptions, WeeToastOptions, WeeToastTone };
