import './Avatar.css';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  shape?: 'circle' | 'square';
  className?: string;
}

export function Avatar({ src, alt, name, size = 'medium', shape = 'circle', className = '' }: AvatarProps) {
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`avatar avatar-${size} avatar-${shape} ${className}`}>
      {src ? (
        <img src={src} alt={alt || name} className="avatar-image" />
      ) : name ? (
        <span className="avatar-initials">{getInitials(name)}</span>
      ) : (
        <span className="avatar-placeholder">?</span>
      )}
    </div>
  );
}

