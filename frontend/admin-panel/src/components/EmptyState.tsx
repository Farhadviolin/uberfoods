import React, { memo } from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = memo(function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="empty-state-title">{title}</h3>}
      <p className="empty-state-message text-muted">{message}</p>
      {action && (
        <button type="button" className="btn primary" onClick={action.onClick} aria-label={action.label}>
          {action.label}
        </button>
      )}
    </div>
  );
});
