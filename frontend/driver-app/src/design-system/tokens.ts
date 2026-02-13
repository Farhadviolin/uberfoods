// Design Tokens - Premium Design System - World Class
export const designTokens = {
  colors: {
    // Primary Colors - Food Theme (Orange/Red)
    primary: {
      50: '#FFF3E0',
      100: '#FFE0B2',
      200: '#FFCC80',
      300: '#FFB74D',
      400: '#FFA726',
      500: '#FF9800', // Main Brand Color - Food Orange
      600: '#FB8C00',
      700: '#F57C00',
      800: '#EF6C00',
      900: '#E65100',
    },
    // Secondary Colors - Complementary Red
    secondary: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#F44336', // Accent Red
      600: '#E53935',
      700: '#D32F2F',
      800: '#C62828',
      900: '#B71C1C',
    },
    // Accent Colors - Food Theme
    accent: {
      orange: '#FF9800',
      red: '#F44336',
      yellow: '#FFC107',
      green: '#4CAF50',
      blue: '#2196F3',
    },
    // Neutral Colors
    neutral: {
      50: '#F0F2F5',
      100: '#E4E6EB',
      200: '#D8DADF',
      300: '#CCD0D5',
      400: '#BCC0C4',
      500: '#8A8D91',
      600: '#65676B',
      700: '#424242',
      800: '#1C1E21',
      900: '#050505',
    },
    // Semantic Colors
    success: {
      50: '#E8F5E9',
      500: '#4CAF50',
      600: '#43A047',
      700: '#388E3C',
    },
    error: {
      50: '#FFEBEE',
      500: '#F44336',
      600: '#E53935',
      700: '#D32F2F',
    },
    warning: {
      50: '#FFF3E0',
      500: '#FF9800',
      600: '#FB8C00',
      700: '#F57C00',
    },
    info: {
      50: '#E3F2FD',
      500: '#2196F3',
      600: '#1E88E5',
      700: '#1976D2',
    },
  },
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      display: '"Poppins", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
      '7xl': '4.5rem',   // 72px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.375rem', // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Dark Mode Colors
export const darkModeColors = {
  background: {
    primary: '#1C1E21',
    secondary: '#242526',
    tertiary: '#2E3032',
  },
  text: {
    primary: '#E4E6EB',
    secondary: '#BCC0C4',
    tertiary: '#8A8D91',
  },
  border: {
    primary: '#3A3B3C',
    secondary: '#2E3032',
  },
} as const;

