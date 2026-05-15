"use client";

import {
  useEffect,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { toast, type ExternalToast } from "sonner";
import { cn } from "@/shared/lib/utils";

type WeeToastBaseOptions = Pick<
  ExternalToast,
  | "action"
  | "cancel"
  | "dismissible"
  | "duration"
  | "id"
  | "onAutoClose"
  | "onDismiss"
  | "position"
  | "testId"
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
} & Pick<WeeToastBaseOptions, "duration" | "id" | "position" | "testId">;

type WeeErrorToastOptions = {
  title?: ReactNode;
} & Pick<WeeToastBaseOptions, "duration" | "id" | "position" | "testId">;

const WEE_COMPACT_TOAST_ID = "wee-compact-toast";
const WEE_TOAST_DEFAULT_DURATION_MS = 5000;

type WeeToastSurfaceProps = ComponentPropsWithoutRef<"div">;

function WeeToastSurface({
  className,
  children,
  ...props
}: WeeToastSurfaceProps) {
  return (
    <div
      data-slot="wee-toast"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-green-400 px-4 py-2 text-white shadow-[0_0_7px_rgba(0,0,0,0.05)]",
        className,
      )}
      {...props}
    >
      <span className="relative whitespace-nowrap text-body-14-medium text-white">
        {children}
      </span>
    </div>
  );
}

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

function showWeeToast({
  tone = "neutral",
  title,
  description,
  ...options
}: WeeToastOptions) {
  const content = getToastContent({ title, description });

  if (tone === "neutral") {
    return toast(content, options);
  }

  return toast[tone](content, options);
}

function showWeeCompactToast({
  title,
  duration = WEE_TOAST_DEFAULT_DURATION_MS,
  ...options
}: WeeCompactToastOptions) {
  return toast.custom(
    () => <WeeToastSurface>{title}</WeeToastSurface>,
    {
      duration,
      id: WEE_COMPACT_TOAST_ID,
      position: "top-right",
      testId: "wee-toast",
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

function useWeeErrorToast(
  message: ReactNode | null | undefined,
  {
    duration,
    id,
    position,
    title = "불러오기 실패",
    testId = "wee-toast",
  }: WeeErrorToastOptions = {},
) {
  const weeToast = useWeeToast();

  useEffect(() => {
    if (!message) {
      return;
    }

    weeToast.error({
      title,
      description: message,
      duration,
      id,
      position,
      testId,
    });
  }, [duration, id, message, position, testId, title, weeToast]);
}

export {
  showWeeCompactToast,
  showWeeToast,
  useWeeErrorToast,
  useWeeToast,
  WeeToastSurface,
};
export type {
  WeeCompactToastOptions,
  WeeErrorToastOptions,
  WeeToastMessageOptions,
  WeeToastOptions,
  WeeToastTone,
};
