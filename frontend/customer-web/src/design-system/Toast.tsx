import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import './Toast.css';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'top-center'
  | 'bottom-left' 
  | 'bottom-right' 
  | 'bottom-center';

export interface ToastProps {
  id?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function Toast({ 
  id,
  message, 
  variant = 'info', 
  duration = 4000, 
  onClose,
  action 
}: ToastProps) {
  const Icon = icons[variant];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  return (
    <motion.div
      id={id}
      className={clsx('toast', `toast--${variant}`)}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
    >
      <Icon size={20} className="toast-icon" />
      <span className="toast-message">{message}</span>
      {action && (
        <button
          className="toast-action"
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      )}
      <button 
        onClick={onClose} 
        className="toast-close" 
        aria-label="Close toast"
        type="button"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>;
  position?: ToastPosition;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, position = 'top-right', onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={clsx('toast-container', `toast-container--${position}`)}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onClose(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

