import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

export function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>🍕 UberFoods</h3>
          <p>{t('footer.tagline')}</p>
        </div>

        <div className="footer-section">
          <h4>{t('footer.legal')}</h4>
          <nav className="footer-nav">
            <Link to="/legal/impressum">{t('footer.imprint')}</Link>
            <Link to="/legal/datenschutz">{t('footer.privacy')}</Link>
            <Link to="/legal/agb">{t('footer.terms')}</Link>
            <Link to="/legal/widerruf">{t('footer.cancellation')}</Link>
          </nav>
        </div>

        <div className="footer-section">
          <h4>{t('footer.support')}</h4>
          <nav className="footer-nav">
            <Link to="/support">{t('sidebar.support')}</Link>
            <Link to="/faq">{t('faq.title')}</Link>
            <Link to="/settings">{t('sidebar.settings')}</Link>
            <Link to="/promotions">{t('sidebar.promotions')}</Link>
            <Link to="/apply">{t('footer.partner')}</Link>
          </nav>
        </div>

        <div className="footer-section">
          <h4>{t('footer.contact')}</h4>
          <p>Email: info@uberfoods.com</p>
          <p>Tel: +43 123 456 789</p>
        </div>

        <div className="footer-section">
          <h4>{t('footer.followUs')}</h4>
          <div className="social-links">
            <a href="#" aria-label={t('footer.facebook')}>📘</a>
            <a href="#" aria-label={t('footer.instagram')}>📷</a>
            <a href="#" aria-label={t('footer.twitter')}>🐦</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} UberFoods. {t('footer.allRightsReserved')}.</p>
      </div>
    </footer>
  );
}
