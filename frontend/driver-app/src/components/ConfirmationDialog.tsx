import { ReactNode } from 'react';
import { Modal } from './Modal';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
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
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'info',
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small">
      <div className="confirmation-dialog">
        <h3 className="confirmation-dialog-title">{title}</h3>
        <div className="confirmation-dialog-message">{message}</div>
        <div className="confirmation-dialog-actions">
          <button
            className="confirmation-dialog-button confirmation-dialog-button-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-dialog-button confirmation-dialog-button-confirm confirmation-dialog-button-${variant}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Lädt...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

