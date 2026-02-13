import { useState } from 'react';
import { Modal } from './Modal';
import './PasswordModal.css';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  email: string;
  password: string;
}

export function PasswordModal({
  isOpen,
  onClose,
  restaurantName,
  email,
  password,
}: PasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small">
      <div className="password-modal">
        <div className="password-modal-header">
          <h2>Restaurant erfolgreich erstellt! 🎉</h2>
        </div>
        
        <div className="password-modal-body">
          <p className="password-modal-info">
            Das Restaurant <strong>{restaurantName}</strong> wurde erfolgreich erstellt.
            Bitte notieren Sie sich die Zugangsdaten:
          </p>

          <div className="password-credentials">
            <div className="credential-item">
              <label>E-Mail:</label>
              <div className="credential-value">
                <code>{email}</code>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(email);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title="E-Mail kopieren"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="credential-item">
              <label>Passwort:</label>
              <div className="credential-value">
                <code className="password-display">{password}</code>
                <button
                  type="button"
                  className="copy-button"
                  onClick={copyToClipboard}
                  title="Passwort kopieren"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>

          <div className="password-warning">
            <strong>⚠️ Wichtig:</strong> Dieses Passwort wird nur einmal angezeigt.
            Bitte speichern Sie es sicher oder senden Sie es dem Restaurant per E-Mail.
          </div>

          <div className="password-modal-footer">
            <button
              type="button"
              className="fb-button"
              onClick={onClose}
            >
              Verstanden
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

