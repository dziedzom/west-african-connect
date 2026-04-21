import { useEffect, useState } from "react";

/**
 * Like useState, but persists value to localStorage under `key`.
 * Survives page refreshes — handy for long-form bid inputs.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota or serialization errors — ignore
    }
  }, [key, value]);

  const reset = () => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
    setValue(initial);
  };

  return [value, setValue, reset] as const;
}
