"use client";

import { useEffect, useState } from "react";

const defaultDebounceDelayMs = 300;

function normalizeDebounceDelay(delayMs: number) {
  return Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;
}

function useDebouncedValue<T>(
  value: T,
  delayMs = defaultDebounceDelayMs,
): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const normalizedDelayMs = normalizeDebounceDelay(delayMs);
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, normalizedDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

export { defaultDebounceDelayMs, useDebouncedValue };
