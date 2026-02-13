import '@testing-library/jest-dom';
import React from 'react';

// Mock i18next-browser-languagedetector BEVOR i18n/config geladen wird
jest.mock('i18next-browser-languagedetector', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    use: jest.fn().mockReturnThis(),
  }),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(public callback: IntersectionObserverCallback) {}
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(): void {}
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

// Mock import.meta
(global as any).import = {
  meta: {
    env: {
      MODE: 'test',
      VITE_API_BASE_URL: 'http://localhost:3000/api',
      VITE_WS_URL: 'ws://localhost:3000',
      VITE_STRIPE_PUBLISHABLE_KEY: 'STRIPE_PUBLISHABLE_KEY_PLACEHOLDER',
      VITE_SENTRY_DSN: '',
      VITE_ENABLE_SOCIAL: 'true',
      VITE_MAPS_API_KEY: '',
      VITE_PAYPAL_CLIENT_ID: '',
    }
  }
};

// Also set it directly on global
(global as any).importMeta = (global as any).import.meta;

global.ResizeObserver = MockResizeObserver;

// Mock i18next-browser-languagedetector für Tests
jest.mock('i18next-browser-languagedetector', () => {
  const mockDetector = jest.fn().mockReturnValue({
    use: jest.fn().mockReturnThis(),
  });
  return {
    __esModule: true,
    default: mockDetector,
  };
});

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: jest.fn(),
    inView: true,
    entry: undefined,
  }),
}));

// Mock Stripe libs to avoid parsing issues in tests
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({}),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useStripe: () => ({ confirmCardPayment: jest.fn() }),
  useElements: () => ({}),
  CardElement: () => React.createElement('div', null, 'CardElement'),
}));

// Mock useTranslation to provide predictable strings in Tests
jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: any) => {
        const map: Record<string, string> = {
          'errorBoundary.title': 'Something went wrong',
          'errorBoundary.message': 'An unexpected error occurred',
          'errorBoundary.reloadPage': 'Reload page',
          'errorBoundary.goHome': 'Go home',
          'toast.close': 'Close',
          'languageSwitcher.german': 'German',
          'languageSwitcher.english': 'English',
          'accessibility.switchLanguage': 'Switch language',
          'accessibility.currentLanguage': 'Current language',
          'megaSearch.placeholder': 'Search for restaurants, dishes, cuisines...',
          'megaSearch.title': 'Search',
          'megaSearch.popularSearches': 'Popular searches:',
          'megaSearch.recentSearches': 'Recent searches:',
          'megaSearch.noResults': 'No results found for "{{query}}"',
          'megaSearch.searching': 'Searching...',
          'megaSearch.resultsCount': 'About {{count}} results',
          'gamification.title': 'Gamification',
          'gamification.points': 'Points',
          'gamification.level': 'Level',
          'gamification.achievements': 'Achievements',
          'gamification.rewards': 'Rewards',
          'gamification.loading': 'Loading gamification data...',
          'cart.title': 'Your Cart',
          'cart.empty': 'Your cart is empty',
          'cart.checkout': 'Checkout',
          'payment.title': 'Payment',
          'payment.processing': 'Processing payment...',
          'favorites.title': 'Your Favorites',
          'favorites.empty': 'No favorites yet',
          'restaurants.title': 'Restaurants',
          'loading': 'Loading...',
        };

        let result = map[key] || key;

        // Handle interpolation
        if (options) {
          Object.keys(options).forEach(optionKey => {
            result = result.replace(new RegExp(`{{${optionKey}}}`, 'g'), options[optionKey]);
          });
        }

        return result;
      },
      i18n: {
        language: 'en',
        changeLanguage: jest.fn().mockResolvedValue(undefined),
      },
    }),
    Trans: ({ i18nKey, children }: any) => children ?? i18nKey,
    I18nextProvider: ({ children }: any) => children
  };
});

