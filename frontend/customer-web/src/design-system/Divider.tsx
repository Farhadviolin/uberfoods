import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import './Divider.css';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  variant?: DividerVariant;
  orientation?: DividerOrientation;
  text?: ReactNode;
  className?: string;
}

export function Divider({
  variant = 'solid',
  orientation = 'horizontal',
  text,
  className,
  ...props
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <span
        className={clsx('divider', 'divider--vertical', `divider--${variant}`, className)}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  if (text) {
    return (
      <div className={clsx('divider-wrapper', className)} {...props}>
        <hr className={clsx('divider', 'divider--horizontal', `divider--${variant}`, 'divider--with-text')} />
        <span className="divider-text">{text}</span>
        <hr className={clsx('divider', 'divider--horizontal', `divider--${variant}`, 'divider--with-text')} />
      </div>
    );
  }

  return (
    <hr
      className={clsx('divider', 'divider--horizontal', `divider--${variant}`, className)}
      role="separator"
      aria-orientation="horizontal"
      {...props}
    />
  );
}

