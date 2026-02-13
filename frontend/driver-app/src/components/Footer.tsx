import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="driver-footer">
      <div className="driver-footer-content">
        <div className="driver-footer-section">
          <h4>Rechtliches</h4>
          <nav className="driver-footer-nav">
            <Link to="/legal/impressum">Impressum</Link>
            <Link to="/legal/datenschutz">Datenschutz</Link>
            <Link to="/legal/agb">AGB</Link>
            <Link to="/legal/widerruf">Widerruf</Link>
          </nav>
        </div>
        <div className="driver-footer-section">
          <p>&copy; {new Date().getFullYear()} UberFoods</p>
        </div>
      </div>
    </footer>
  );
}

