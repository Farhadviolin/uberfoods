// Facebook Design System - Einheitlich für alle Apps
// Basierend auf Facebook's offiziellem Design

export const facebookTokens = {
  colors: {
    // Facebook Primary Blue
    primary: {
      50: '#E7F3FF',
      100: '#BBDDFB',
      200: '#8FC7F8',
      300: '#63B1F5',
      400: '#3B9BF2',
      500: '#1877F2', // Facebook Blue
      600: '#166FE5',
      700: '#1565C0',
      800: '#0D4A8C',
      900: '#052E5A',
    },
    // Facebook Background Colors
    background: {
      primary: '#FFFFFF',      // White cards
      secondary: '#F0F2F5',    // Main background
      tertiary: '#E4E6EB',     // Hover states
      elevated: '#FFFFFF',     // Elevated surfaces
    },
    // Facebook Text Colors
    text: {
      primary: '#050505',      // Main text
      secondary: '#65676B',    // Secondary text
      tertiary: '#8A8D91',     // Tertiary text
      disabled: '#BCC0C4',     // Disabled text
      inverse: '#FFFFFF',      // White text on dark
    },
    // Facebook Border Colors
    border: {
      primary: '#E4E6EB',      // Main borders
      secondary: '#CCD0D5',    // Secondary borders
      tertiary: '#BCC0C4',     // Tertiary borders
    },
    // Semantic Colors (Facebook Style)
    success: {
      50: '#E8F5E9',
      500: '#42B72A',          // Facebook Green
      600: '#36A420',
      700: '#2D8A1A',
    },
    error: {
      50: '#FFEBEE',
      500: '#E41E3F',          // Facebook Red
      600: '#C91E37',
      700: '#B01E2F',
    },
    warning: {
      50: '#FFF3E0',
      500: '#F7B928',          // Facebook Yellow
      600: '#E5A823',
      700: '#D4961E',
    },
    info: {
      50: '#E3F2FD',
      500: '#1877F2',          // Facebook Blue
      600: '#166FE5',
      700: '#1565C0',
    },
  },
  // Dark Mode Colors (Facebook Dark Mode)
  dark: {
    background: {
      primary: '#242526',      // Dark cards
      secondary: '#18191A',    // Main dark background
      tertiary: '#3A3B3C',     // Hover states
      elevated: '#242526',     // Elevated surfaces
    },
    text: {
      primary: '#E4E6EB',      // Main text
      secondary: '#B0B3B8',    // Secondary text
      tertiary: '#8A8D91',     // Tertiary text
      disabled: '#65676B',     // Disabled text
      inverse: '#050505',      // Dark text on light
    },
    border: {
      primary: '#3A3B3C',      // Main borders
      secondary: '#2E3032',    // Secondary borders
      tertiary: '#18191A',     // Tertiary borders
    },
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'Menlo, Monaco, "Courier New", monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '15px',            // Facebook base
      lg: '17px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    base: '6px',               // Facebook default
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    base: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.1)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1050,
    tooltip: 1070,
  },
} as const;

