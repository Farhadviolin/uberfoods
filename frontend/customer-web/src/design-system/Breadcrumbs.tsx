import { ReactNode, HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';
import './Breadcrumbs.css';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  showHomeIcon?: boolean;
  maxItems?: number;
  className?: string;
}

export function Breadcrumbs({
  items,
  separator = <ChevronRight size={16} />,
  showHomeIcon = true,
  maxItems,
  className,
  ...props
}: BreadcrumbsProps) {
  const displayItems = maxItems && items.length > maxItems
    ? [
        items[0],
        { label: '...', href: undefined },
        ...items.slice(-(maxItems - 1))
      ]
    : items;

  return (
    <nav className={clsx('breadcrumbs', className)} aria-label="Breadcrumb" {...props}>
      <ol className="breadcrumbs-list">
        {showHomeIcon && (
          <li className="breadcrumbs-item">
            <Link to="/" className="breadcrumbs-link breadcrumbs-link--home" aria-label="Home">
              <Home size={16} />
            </Link>
          </li>
        )}
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={index} className="breadcrumbs-item">
              {index > 0 && !showHomeIcon && index === 1 ? null : index > 0 && (
                <span className="breadcrumbs-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="breadcrumbs-current" aria-current="page">
                  {item.icon && <span className="breadcrumbs-icon">{item.icon}</span>}
                  {item.label}
                </span>
              ) : isEllipsis ? (
                <span className="breadcrumbs-ellipsis">{item.label}</span>
              ) : (
                <Link to={item.href || '#'} className="breadcrumbs-link">
                  {item.icon && <span className="breadcrumbs-icon">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

