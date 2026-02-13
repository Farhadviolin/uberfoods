// Design System Tokens für Restaurant Web
export const tokens = {
  colors: {
    // Primary Colors
    primary: {
      50: "#E3F2FD",
      100: "#BBDEFB",
      200: "#90CAF9",
      300: "#64B5F6",
      400: "#42A5F5",
      500: "#1877F2", // Main brand color
      600: "#1565C0",
      700: "#0D47A1",
      800: "#0277BD",
      900: "#01579B",
    },
    // Semantic Colors
    success: {
      50: "#E8F5E9",
      100: "#C8E6C9",
      500: "#28a745",
      600: "#218838",
      700: "#1e7e34",
    },
    warning: {
      50: "#FFF3E0",
      100: "#FFE0B2",
      500: "#ffc107",
      600: "#ffb300",
    },
    error: {
      50: "#FFEBEE",
      100: "#FFCDD2",
      500: "#dc3545",
      600: "#c82333",
    },
    info: {
      50: "#E0F7FA",
      100: "#B2EBF2",
      500: "#17a2b8",
    },
    // Neutral Colors
    gray: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#9E9E9E",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
    // Background Colors
    background: {
      default: "#FFFFFF",
      paper: "#F9FAFB",
      elevated: "#FFFFFF",
    },
    // Text Colors
    text: {
      primary: "#212121",
      secondary: "#757575",
      disabled: "#BDBDBD",
      inverse: "#FFFFFF",
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'Menlo, Monaco, "Courier New", monospace',
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
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
    none: "0",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Dark Mode Tokens
export const darkTokens = {
  ...tokens,
  colors: {
    ...tokens.colors,
    background: {
      default: "#121212",
      paper: "#1E1E1E",
      elevated: "#2D2D2D",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B0B0B0",
      disabled: "#666666",
      inverse: "#212121",
    },
    border: {
      primary: "#333333",
      secondary: "#404040",
    },
  },
};
