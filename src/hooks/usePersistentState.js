import { useEffect, useState } from 'react';
import { loadData, saveData } from '../utils/storage';

/** useState that is automatically saved to (and restored from) localStorage. */
export default function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
    return loadData(key, fallback);
  });

  useEffect(() => {
    saveData(key, value);
  }, [key, value]);

  return [value, setValue];
}
