import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to set a timeout
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Hook to create a timeout that can be cleared
 */
export function useTimeoutFn(callback: () => void, delay: number | null): [() => void, () => void, boolean] {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);

  const clear = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
      setIsReady(false);
    }
  }, []);

  const set = useCallback(() => {
    clear();
    setIsReady(false);
    
    if (delay !== null) {
      timeoutId.current = setTimeout(() => {
        callback();
        setIsReady(true);
      }, delay);
    }
  }, [callback, delay, clear]);

  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return [set, clear, isReady];
}

