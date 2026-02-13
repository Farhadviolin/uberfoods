import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useInfiniteScroll } from '../useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let mockIntersectionObserver: jest.Mock;
  let observeMock: jest.Mock;
  let disconnectMock: jest.Mock;

  beforeEach(() => {
    observeMock = jest.fn();
    disconnectMock = jest.fn();

    mockIntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: jest.fn(),
    }));

    // Mock IntersectionObserver globally
    global.IntersectionObserver = mockIntersectionObserver as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useInfiniteScroll(jest.fn()));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should call IntersectionObserver constructor', () => {
    const loadMore = jest.fn();
    renderHook(() => useInfiniteScroll(loadMore));

    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it('should call loadMore when intersection occurs', () => {
    const loadMore = jest.fn();
    renderHook(() => useInfiniteScroll(loadMore));

    // Get the callback passed to IntersectionObserver
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    // Simulate intersection
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('should not call loadMore when not intersecting', () => {
    const loadMore = jest.fn();
    renderHook(() => useInfiniteScroll(loadMore));

    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    act(() => {
      intersectionCallback([{ isIntersecting: false }]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('should not call loadMore when already loading', () => {
    const loadMore = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(loadMore));

    // Simulate loading state
    act(() => {
      result.current.setIsLoading(true);
    });

    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('should not call loadMore when no next page', () => {
    const loadMore = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(loadMore));

    // Set no next page
    act(() => {
      result.current.setHasNextPage(false);
    });

    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('should handle multiple intersection entries', () => {
    const loadMore = jest.fn();
    renderHook(() => useInfiniteScroll(loadMore));

    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    act(() => {
      intersectionCallback([
        { isIntersecting: false },
        { isIntersecting: true },
        { isIntersecting: false },
      ]);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('should handle error state', () => {
    const loadMore = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(loadMore));

    const error = new Error('Load failed');

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.error).toBe(error);
  });

  it('should handle loading state transitions', () => {
    const loadMore = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(loadMore));

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.setIsLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setIsLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle hasNextPage state transitions', () => {
    const loadMore = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(loadMore));

    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.setHasNextPage(false);
    });

    expect(result.current.hasNextPage).toBe(false);

    act(() => {
      result.current.setHasNextPage(true);
    });

    expect(result.current.hasNextPage).toBe(true);
  });

  it('should cleanup IntersectionObserver on unmount', () => {
    const loadMore = jest.fn();
    const { unmount } = renderHook(() => useInfiniteScroll(loadMore));

    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should accept custom IntersectionObserver options', () => {
    const loadMore = jest.fn();
    const options = {
      rootMargin: '100px',
      threshold: 0.5,
    };

    renderHook(() => useInfiniteScroll(loadMore, options));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      options
    );
  });

  it('should handle multiple rapid intersections gracefully', () => {
    const loadMore = jest.fn();
    renderHook(() => useInfiniteScroll(loadMore));

    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];

    // Rapid multiple intersections
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
      intersectionCallback([{ isIntersecting: true }]);
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(loadMore).toHaveBeenCalledTimes(3);
  });
});




