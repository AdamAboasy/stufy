import { useEffect, useState, Dispatch, SetStateAction } from 'react';

const PREFIX = 'ssp_v1_';

/**
 * useState that survives page reloads (browser localStorage).
 * NOTE: this is per-browser storage, not a shared database.
 */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = PREFIX + key;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // corrupted or unavailable storage: fall back to the initial value
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // quota exceeded / private mode: keep working in memory
    }
  }, [storageKey, value]);

  return [value, setValue];
}
