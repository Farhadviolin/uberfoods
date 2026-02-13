// Einheitliche Responsive Breakpoints für alle Apps
// Mobile First Approach

export const responsiveBreakpoints = {
  // Mobile First Approach
  mobile: '0px',        // 0-639px - Smartphones
  mobileLarge: '640px', // 640-767px - Large Smartphones
  tablet: '768px',      // 768-1023px - Tablets
  tabletLarge: '1024px', // 1024-1279px - Large Tablets / Small Laptops
  desktop: '1280px',    // 1280-1535px - Desktop
  desktopLarge: '1536px', // 1536px+ - Large Desktop
} as const;

// Device Types
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// Media Query Strings
export const mediaQueries = {
  mobile: `(max-width: ${parseInt(responsiveBreakpoints.tablet) - 1}px)`,
  mobileOnly: `(max-width: ${parseInt(responsiveBreakpoints.tablet) - 1}px)`,
  tablet: `(min-width: ${responsiveBreakpoints.tablet}) and (max-width: ${parseInt(responsiveBreakpoints.desktop) - 1}px)`,
  tabletUp: `(min-width: ${responsiveBreakpoints.tablet})`,
  desktop: `(min-width: ${responsiveBreakpoints.desktop})`,
  desktopLarge: `(min-width: ${responsiveBreakpoints.desktopLarge})`,
} as const;

// Responsive Spacing (passt sich automatisch an Device an)
export const responsiveSpacing = {
  mobile: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },
  tablet: {
    xs: '6px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  desktop: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    '2xl': '64px',
  },
} as const;

// Responsive Typography
export const responsiveTypography = {
  mobile: {
    h1: '24px',
    h2: '20px',
    h3: '18px',
    h4: '16px',
    body: '14px',
    small: '12px',
    tiny: '10px',
  },
  tablet: {
    h1: '32px',
    h2: '24px',
    h3: '20px',
    h4: '18px',
    body: '16px',
    small: '14px',
    tiny: '12px',
  },
  desktop: {
    h1: '48px',
    h2: '36px',
    h3: '24px',
    h4: '20px',
    body: '16px',
    small: '14px',
    tiny: '12px',
  },
} as const;

// Responsive Container Max Widths
export const responsiveContainers = {
  mobile: '100%',
  tablet: '768px',
  desktop: '1200px',
  desktopLarge: '1400px',
} as const;

// Responsive Grid Columns
export const responsiveGridColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  desktopLarge: 4,
} as const;

// Helper Functions
export function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function isMobile(width: number): boolean {
  return width < 768;
}

export function isTablet(width: number): boolean {
  return width >= 768 && width < 1024;
}

export function isDesktop(width: number): boolean {
  return width >= 1024;
}

