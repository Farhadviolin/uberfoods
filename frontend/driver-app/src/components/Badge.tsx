import './Badge.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'medium', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${dot ? 'badge-dot' : ''} ${className}`}>
      {dot && <span className="badge-dot-icon" />}
      {children}
    </span>
  );
}

