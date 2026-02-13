import './Divider.css';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  spacing?: 'none' | 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  variant = 'solid',
  spacing = 'medium',
  label,
  className = '',
}: DividerProps) {
  if (label && orientation === 'horizontal') {
    return (
      <div className={`divider divider-with-label divider-${spacing} ${className}`}>
        <span className="divider-line divider-${variant}" />
        <span className="divider-label">{label}</span>
        <span className="divider-line divider-${variant}" />
      </div>
    );
  }

  return (
    <div
      className={`divider divider-${orientation} divider-${variant} divider-${spacing} ${className}`}
      role="separator"
    />
  );
}

