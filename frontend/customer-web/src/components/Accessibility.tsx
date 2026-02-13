import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

export const SkipToContent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="skip-to-content"
      onFocus={(e) => e.target.style.display = 'block'}
      onBlur={(e) => e.target.style.display = 'none'}
    >
      {t('accessibility.skipToContent')}
    </a>
  );
};

export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

export const FocusTrap: React.FC<{ children: React.ReactNode; isActive: boolean }> = ({
  children,
  isActive
}) => {
  const trapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isActive || !trapRef.current) return;

    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Handle escape - could emit an event or call a callback
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Focus first element
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive]);

  return (
    <div ref={trapRef} className={isActive ? 'focus-trap-active' : ''}>
      {children}
    </div>
  );
};

export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}> = ({ children, onClick, disabled, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    className="accessible-button"
  >
    {children}
  </button>
);

export const AccessibleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap isActive={isOpen}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="accessible-modal-overlay"
        onClick={onClose}
      >
        <div
          className="accessible-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="accessible-modal-header">
            <h2 id="modal-title">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="accessible-modal-close"
            >
              ×
            </button>
          </header>
          <div className="accessible-modal-body">
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

export const LiveRegion: React.FC<{ message: string; priority?: 'polite' | 'assertive' }> = ({
  message,
  priority = 'polite'
}) => {
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    if (message) {
      setAnnouncement(message);
      // Clear after announcement
      const timeout = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [message]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

<style>{`
  .skip-to-content {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 1000;
    transition: top 0.3s;
  }

  .skip-to-content:focus {
    top: 6px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .accessible-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .accessible-modal-content {
    background: white;
    border-radius: 8px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
  }

  .accessible-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }

  .accessible-modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .accessible-modal-body {
    padding: 1rem;
  }

  .accessible-button {
    /* Ensure minimum touch target */
    min-height: 44px;
    min-width: 44px;
    padding: 0.5rem 1rem;
  }

  .accessible-button:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
`}</style>
