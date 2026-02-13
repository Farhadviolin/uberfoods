// Design System Tokens - Weltklasse Admin Panel
export const tokens = {
  colors: {
    // Primary Colors
    primary: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#1877F2', // Main brand color
      600: '#1565C0',
      700: '#0D47A1',
      800: '#0277BD',
      900: '#01579B',
    },
    // Semantic Colors
    success: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      500: '#28a745',
      600: '#218838',
      700: '#1e7e34',
    },
    warning: {
      50: '#FFF3E0',
      100: '#FFE0B2',
      500: '#ffc107',
      600: '#ffb300',
    },
    error: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      500: '#dc3545',
      600: '#c82333',
    },
    info: {
      50: '#E0F7FA',
      100: '#B2EBF2',
      500: '#17a2b8',
    },
    // Neutral Colors
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    // Background Colors
    background: {
      default: '#FFFFFF',
      paper: '#F9FAFB',
      elevated: '#FFFFFF',
      surface: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    // Border Colors
    border: {
      default: '#E0E0E0',
      light: '#F5F5F5',
      dark: '#BDBDBD',
      focus: '#1877F2',
      error: '#dc3545',
      success: '#28a745',
    },
    // Focus Colors
    focus: {
      ring: 'rgba(24, 119, 242, 0.1)',
      ringError: 'rgba(220, 53, 69, 0.1)',
      ringSuccess: 'rgba(40, 167, 69, 0.1)',
    },
    // Hover Colors
    hover: {
      primary: 'rgba(24, 119, 242, 0.1)',
      secondary: '#E4E6EB',
      error: 'rgba(220, 53, 69, 0.1)',
      success: 'rgba(40, 167, 69, 0.1)',
    },
    // Active Colors
    active: {
      primary: '#1565C0',
      secondary: '#BDBDBD',
    },
    // Text Colors
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
      inverse: '#FFFFFF',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '80px',
    '5xl': '96px',
    '6xl': '128px',
    // Fractional spacing
    '0.5': '2px',
    '1.5': '6px',
    '2.5': '10px',
    '3.5': '14px',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'Menlo, Monaco, "Courier New", monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
      '6xl': '60px',
      '7xl': '72px',
      '8xl': '96px',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
    textTransform: {
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      capitalize: 'capitalize',
      none: 'none',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px',
  },
  borderWidth: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
    slower: '500ms ease-in-out',
    fastest: '100ms ease-in-out',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
      slower: 500,
    },
    spring: {
      tension: 300,
      friction: 30,
    },
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 1080,
  },
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Dark Mode Tokens - Admin Panel Style (vereinfacht)
export const darkTokens = {
  ...tokens,
  colors: {
    ...tokens.colors,
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      elevated: '#2D2D2D',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      disabled: '#666666',
      inverse: '#212121',
    },
  },
};

// Legacy export für Kompatibilität
export const designTokens = tokens;
export const darkModeColors = darkTokens.colors;
