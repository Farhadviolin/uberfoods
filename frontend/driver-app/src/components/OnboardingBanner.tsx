import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'driver_onboarding_seen_v1';

export function OnboardingBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="onboarding-banner" role="status" aria-live="polite">
      <div>
        <h3>{t('onboarding.title')}</h3>
        <ul>
          <li>{t('onboarding.tip.status')}</li>
          <li>{t('onboarding.tip.push')}</li>
          <li>{t('onboarding.tip.ai')}</li>
          <li>{t('onboarding.tip.offline')}</li>
        </ul>
      </div>
      <button className="primary" onClick={dismiss}>
        {t('onboarding.cta')}
      </button>
    </div>
  );
}
