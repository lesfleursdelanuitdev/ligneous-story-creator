"use client";

import { useEffect, useState } from "react";

export const PICKER_DEBOUNCE_MS = 250;
export const MODAL_DEBOUNCE_MS = 280;
export const FULLTEXT_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
