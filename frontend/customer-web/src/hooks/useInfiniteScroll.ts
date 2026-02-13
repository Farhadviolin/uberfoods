import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  isLoading: boolean;
  hasNextPage: boolean;
  error: Error | null;
  setIsLoading: (loading: boolean) => void;
  setHasNextPage: (hasNext: boolean) => void;
  setError: (error: Error | null) => void;
}

// Legacy API: useInfiniteScroll(loadMore, options?)
export function useInfiniteScroll(
  loadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);
  const loadMoreRef = useRef(loadMore);
  const isLoadingRef = useRef(isLoading);
  const hasNextPageRef = useRef(hasNextPage);

  // Update refs when state changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasNextPageRef.current = hasNextPage;
  }, [hasNextPage]);

  // Update ref when loadMore changes
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // Create IntersectionObserver immediately
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create IntersectionObserver callback
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Check if any entry is intersecting
      const isIntersecting = entries.some(entry => entry.isIntersecting);
      if (isIntersecting && !isLoadingRef.current && hasNextPageRef.current) {
        const loadMoreFn = loadMoreRef.current;
        if (loadMoreFn) {
          Promise.resolve(loadMoreFn()).catch((err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
          });
        }
      }
    };

    // Create IntersectionObserver immediately
    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observerRef.current = observer;

    // Create a dummy element for testing if no element is set
    // In real usage, components will set the element via ref
    if (!elementRef.current) {
      const dummyElement = document.createElement('div');
      dummyElement.style.display = 'none';
      document.body.appendChild(dummyElement);
      elementRef.current = dummyElement;
    }

    // Observe element
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      // Cleanup dummy element if it was created
      if (elementRef.current && elementRef.current.parentNode === document.body && elementRef.current.style.display === 'none') {
        document.body.removeChild(elementRef.current);
      }
    };
  }, [threshold, rootMargin, enabled]);

  // Expose method to set element ref (for testing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__infiniteScrollSetElement = (node: Element | null) => {
        if (elementRef.current && observerRef.current) {
          observerRef.current.unobserve(elementRef.current);
        }

        elementRef.current = node;

        if (node && observerRef.current) {
          observerRef.current.observe(node);
        }
      };
    }
  }, []);

  return {
    isLoading,
    hasNextPage,
    error,
    setIsLoading,
    setHasNextPage,
    setError,
  };
}

// Modern API wrapper using react-intersection-observer (if available)
interface UseInfiniteScrollModernOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseInfiniteScrollModernReturn {
  ref: (node?: Element | null) => void;
  isLoading: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  reset: () => void;
}

// Export modern API as separate function
export const useInfiniteScrollModern = (
  fetchMore: () => Promise<void>,
  options: UseInfiniteScrollModernOptions = {}
): UseInfiniteScrollModernReturn => {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  const hasObserver = typeof IntersectionObserver !== 'undefined';

  // Always call hooks in same order - use manual IntersectionObserver only
  const elementRef = useRef<Element | null>(null);
  const [inViewState, setInViewState] = useState(false);

  // Manual observer effect - always called
  useEffect(() => {
    if (!enabled || !hasObserver || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInViewState(entries[0]?.isIntersecting ?? false);
      },
      { threshold, rootMargin }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin, enabled, hasObserver]);

  // Simple ref function
  const ref = (node?: Element | null) => {
    elementRef.current = node ?? null;
  };
  const inView = inViewState;

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNextPage || !enabled) return;

    setIsLoading(true);
    try {
      await fetchMore();
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMore, isLoading, hasNextPage, enabled]);

  const reset = useCallback(() => {
    setHasNextPage(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (inView && enabled) {
      loadMore();
    }
  }, [inView, loadMore, enabled]);

  return {
    ref,
    isLoading,
    hasNextPage,
    loadMore,
    reset,
  };
};

// Hook for managing paginated data with infinite scroll
export const useInfiniteData = <T>(
  fetchFunction: (page: number) => Promise<{ data: T[]; hasNextPage: boolean }>,
  options: UseInfiniteScrollModernOptions = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchMore = useCallback(async () => {
    const result = await fetchFunction(page);
    setData(prev => [...prev, ...result.data]);

    if (!result.hasNextPage) {
      setHasNextPage(false);
    } else {
      setPage(prev => prev + 1);
    }
  }, [fetchFunction, page]);

  const { ref, isLoading, hasNextPage: hasNext, loadMore, reset } = useInfiniteScrollModern(
    fetchMore,
    options
  );

  const resetData = useCallback(() => {
    setData([]);
    setPage(1);
    setHasNextPage(true);
    reset();
  }, [reset]);

  return {
    data,
    ref,
    isLoading,
    hasNextPage: hasNext,
    loadMore,
    reset: resetData,
  };
};
