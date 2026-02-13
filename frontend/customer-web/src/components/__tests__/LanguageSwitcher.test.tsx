import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock i18n für Tests
const mockI18n = i18n.createInstance();
mockI18n.init({
  resources: {
    de: { 
      translation: {
        languageSwitcher: { german: 'Deutsch', english: 'English' },
        accessibility: { switchLanguage: 'Sprache wechseln', currentLanguage: 'Aktuelle Sprache: {{language}}' }
      }
    },
    en: { 
      translation: {
        languageSwitcher: { german: 'Deutsch', english: 'English' },
        accessibility: { switchLanguage: 'Switch language', currentLanguage: 'Current language: {{language}}' }
      }
    },
  },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Mock changeLanguage
mockI18n.changeLanguage = jest.fn().mockResolvedValue(mockI18n);

// Mock useTranslation to return our mock i18n
jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    i18n: mockI18n,
    t: (key: string, options?: any) => {
      const keys = key.split('.');
      let value: any = mockI18n.getResourceBundle(mockI18n.language, 'translation');
      for (const k of keys) {
        value = value?.[k];
      }
      if (typeof value === 'string' && options) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, key) => options[key] || '');
      }
      return value || key;
    },
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders language switcher button', () => {
    render(
      <I18nextProvider i18n={mockI18n}>
        <LanguageSwitcher />
      </I18nextProvider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays current language', () => {
    render(
      <I18nextProvider i18n={mockI18n}>
        <LanguageSwitcher />
      </I18nextProvider>
    );

    expect(screen.getByText('DE')).toBeInTheDocument();
  });

  it('switches language on click', () => {
    render(
      <I18nextProvider i18n={mockI18n}>
        <LanguageSwitcher />
      </I18nextProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockI18n.changeLanguage).toHaveBeenCalled();
  });

  it('has accessible aria-label', () => {
    render(
      <I18nextProvider i18n={mockI18n}>
        <LanguageSwitcher />
      </I18nextProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });
});





