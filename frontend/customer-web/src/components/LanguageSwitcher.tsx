import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { handleKeyboardButton } from '../utils/accessibility';
import './LanguageSwitcher.css';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'de', name: t('languageSwitcher.german'), flag: '🇩🇪' },
    { code: 'en', name: t('languageSwitcher.english'), flag: '🇬🇧' },
  ];

  const currentLanguage =
    languages.find(lang => lang.code === (i18n?.language || 'de')) || languages[0];

  const switchLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className="language-switcher">
      <button
        className="language-switcher-button"
        onClick={() => {
          const nextLang = currentLanguage.code === 'de' ? 'en' : 'de';
          switchLanguage(nextLang);
        }}
        onKeyDown={(e) => handleKeyboardButton(e, () => {
          const nextLang = currentLanguage.code === 'de' ? 'en' : 'de';
          switchLanguage(nextLang);
        })}
        aria-label={`${t('accessibility.switchLanguage')}. ${t('accessibility.currentLanguage', { language: currentLanguage.name })}`}
        title={`${t('accessibility.switchLanguage')} (${currentLanguage.name})`}
      >
        <Globe size={20} />
        <span className="language-flag">{currentLanguage.flag}</span>
        <span className="language-code">{currentLanguage.code.toUpperCase()}</span>
      </button>
    </div>
  );
}

