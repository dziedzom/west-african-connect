import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved";

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

  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("persistent-state:saved"));
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

/**
 * Tracks save status for any usePersistentState writes happening in the tree.
 * Shows "Saving…" briefly on each write, then "Saved".
 */
export function useSaveStatus(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onSaved = () => {
      setStatus("saving");
      if (savingTimer.current) clearTimeout(savingTimer.current);
      savingTimer.current = setTimeout(() => setStatus("saved"), 400);
    };
    window.addEventListener("persistent-state:saved", onSaved);
    return () => {
      window.removeEventListener("persistent-state:saved", onSaved);
      if (savingTimer.current) clearTimeout(savingTimer.current);
    };
  }, []);

  return status;
}
