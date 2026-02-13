import { useState, useEffect, useCallback } from 'react';
import { 
  responsiveBreakpoints, 
  DeviceType, 
  getDeviceType, 
  isMobile as checkIsMobile,
  isTablet as checkIsTablet,
  isDesktop as checkIsDesktop,
} from './responsive-tokens';

export interface ResponsiveState {
  deviceType: DeviceType;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isMobileOrTablet: boolean;
  breakpoints: typeof responsiveBreakpoints;
}

/**
 * Haupt-Hook für responsive Design
 * Gibt aktuelle Device-Informationen zurück
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        deviceType: 'desktop',
        width: 1920,
        height: 1080,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isMobileOrTablet: false,
        breakpoints: responsiveBreakpoints,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width);

    return {
      deviceType,
      width,
      height,
      isMobile: checkIsMobile(width),
      isTablet: checkIsTablet(width),
      isDesktop: checkIsDesktop(width),
      isMobileOrTablet: checkIsMobile(width) || checkIsTablet(width),
      breakpoints: responsiveBreakpoints,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSize = useCallback(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const deviceType = getDeviceType(width);

      setState({
        deviceType,
        width,
        height,
        isMobile: checkIsMobile(width),
        isTablet: checkIsTablet(width),
        isDesktop: checkIsDesktop(width),
        isMobileOrTablet: checkIsMobile(width) || checkIsTablet(width),
        breakpoints: responsiveBreakpoints,
      });
    }, []);

    // Initial update
    updateSize();

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateSize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

/**
 * Hook für Media Query Checks
 * @param query - CSS Media Query String (z.B. "(min-width: 768px)")
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // Initial check
    setMatches(mediaQuery.matches);

    // Handler für Änderungen
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Moderne Browser
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } 
    // Fallback für ältere Browser
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}

/**
 * Hook für spezifische Breakpoint-Checks
 */
export function useBreakpoint() {
  const { width, isMobile, isTablet, isDesktop } = useResponsive();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet: isMobile || isTablet,
    width,
    // Spezifische Breakpoint Checks
    isXs: width < 640,
    isSm: width >= 640 && width < 768,
    isMd: width >= 768 && width < 1024,
    isLg: width >= 1024 && width < 1280,
    isXl: width >= 1280 && width < 1536,
    is2Xl: width >= 1536,
  };
}

/**
 * Hook für responsive Values
 * Gibt unterschiedliche Werte basierend auf Device-Type zurück
 */
export function useResponsiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop: T;
}): T {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) return values.mobile;
  if (isTablet) return values.tablet ?? values.mobile;
  return values.desktop;
}

