import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';
import './Avatar.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarVariant = 'circle' | 'square' | 'rounded';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  variant?: AvatarVariant;
  src?: string;
  alt?: string;
  name?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  size = 'md',
  variant = 'circle',
  src,
  alt,
  name,
  icon,
  badge,
  className,
  ...props
}: AvatarProps) {
  const hasImage = !!src;
  const hasInitials = !!name && !hasImage;
  const hasIcon = !!icon && !hasImage && !hasInitials;
  const defaultIcon = !hasImage && !hasInitials && !hasIcon;

  return (
    <div
      className={clsx(
        'avatar',
        `avatar--${size}`,
        `avatar--${variant}`,
        {
          'avatar--with-badge': !!badge,
        },
        className
      )}
      {...props}
    >
      {hasImage && (
        <img src={src} alt={alt || name} className="avatar-image" />
      )}
      {hasInitials && (
        <span className="avatar-initials">{getInitials(name)}</span>
      )}
      {hasIcon && <span className="avatar-icon">{icon}</span>}
      {defaultIcon && (
        <User size={size === 'xs' ? 12 : size === 'sm' ? 16 : size === 'lg' ? 24 : size === 'xl' ? 32 : 20} className="avatar-default-icon" />
      )}
      {badge && <span className="avatar-badge">{badge}</span>}
    </div>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ children, max = 3, size = 'md', className, ...props }: AvatarGroupProps) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const visibleAvatars = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  return (
    <div className={clsx('avatar-group', `avatar-group--${size}`, className)} {...props}>
      {visibleAvatars.map((child, index) => (
        <div key={index} className="avatar-group-item" style={{ zIndex: max - index }}>
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="avatar-group-item avatar-group-remaining" style={{ zIndex: 0 }}>
          <Avatar size={size} name={`+${remainingCount}`} />
        </div>
      )}
    </div>
  );
}

