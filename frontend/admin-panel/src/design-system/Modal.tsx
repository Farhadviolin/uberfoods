import React, { forwardRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { createVariants } from './utils';

const modalVariants = createVariants(
  'fixed inset-0 z-modal flex items-center justify-center p-4',
  {
    size: {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full',
    },
  }
);

const backdropVariants = createVariants(
  'fixed inset-0 z-modal bg-black/50 backdrop-blur-sm transition-opacity duration-300',
  {}
);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={backdropVariants({})}>
      <div
        className="fixed inset-0"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      <div
        className={modalVariants({ size })}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          {(title || description) && (
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div>
                {title && (
                  <h2
                    id="modal-title"
                    className="text-lg font-semibold text-neutral-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 text-sm text-neutral-600"
                  >
                    {description}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal sub-components
export const ModalHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between p-6 border-b border-neutral-200 ${className || ''}`}
    {...props}
  />
));

ModalHeader.displayName = 'ModalHeader';

export const ModalContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 ${className || ''}`}
    {...props}
  />
));

ModalContent.displayName = 'ModalContent';

export const ModalFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50 ${className || ''}`}
    {...props}
  />
));

ModalFooter.displayName = 'ModalFooter';








