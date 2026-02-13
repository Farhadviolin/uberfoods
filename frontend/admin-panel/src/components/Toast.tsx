import { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Toast.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ message, type, onClose, duration = 4000 }, ref) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
      <motion.div
        ref={ref}
        className={`toast toast-${type}`}
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={{ scale: 1.02 }}
      >
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
        <button onClick={onClose} className="toast-close" aria-label="Schließen">
          ×
        </button>
      </motion.div>
    );
  }
);

Toast.displayName = 'Toast';

