import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const setLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const current = (i18n.language || 'de').slice(0, 2);

  return (
    <div className="language-switcher" aria-label="Sprache wählen">
      <button
        type="button"
        className={current === 'de' ? 'active' : ''}
        onClick={() => setLanguage('de')}
        aria-pressed={current === 'de'}
      >
        DE
      </button>
      <button
        type="button"
        className={current === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
    </div>
  );
}
