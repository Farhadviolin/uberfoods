import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'info',
  isLoading = false,
}: ConfirmationDialogProps) {
  const { t } = useTranslation();
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      closeOnOverlayClick={!isLoading}
    >
      <div className="confirmation-dialog">
        <div className={`confirmation-icon confirmation-${variant}`}>
          {variant === 'danger' && '⚠️'}
          {variant === 'warning' && '⚠️'}
          {variant === 'info' && 'ℹ️'}
        </div>
        <h3 className="confirmation-title">{title}</h3>
        <p className="confirmation-message">{message}</p>
        <div className="confirmation-actions">
          <button
            className="confirmation-button confirmation-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText || t('confirmationDialog.cancel')}
          </button>
          <button
            className={`confirmation-button confirmation-confirm confirmation-${variant}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t('confirmationDialog.processing') : (confirmText || t('confirmationDialog.confirm'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

