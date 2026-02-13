import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from '../components/Toast';
import { logger } from '../utils/logger';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random(); // Eindeutige ID verhindert doppelte Keys
    setToasts(prev => [...prev, { id, message, type }]);
  }, []); // Stabile Funktion - verhindert Re-Renders

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing to prevent hook order issues
    // This prevents "Rendered fewer hooks than expected" errors
    logger.warn('useToast must be used within a ToastProvider, returning defaults');
    return {
      showToast: (message: string, type: ToastType) => {
        // Fallback: Use console for development
        if (type === 'error') {
          logger.error(`[Toast] ${message}`);
        } else if (type === 'success') {
          logger.info(`[Toast] ${message}`);
        } else {
          logger.info(`[Toast] ${message}`);
        }
      },
    };
  }
  return context;
}

