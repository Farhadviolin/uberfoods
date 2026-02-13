import { useState, useEffect } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Hook to track scroll position
 */
export function useScrollPosition(element?: HTMLElement | null): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });

  useEffect(() => {
    const target = element || window;
    
    const handleScroll = () => {
      if (element) {
        setScrollPosition({
          x: element.scrollLeft,
          y: element.scrollTop,
        });
      } else {
        setScrollPosition({
          x: window.scrollX || window.pageXOffset,
          y: window.scrollY || window.pageYOffset,
        });
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [element]);

  return scrollPosition;
}

