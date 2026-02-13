import React from 'react';
import { useResponsive } from './useResponsive';
import './responsive.css';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  fluid?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * ResponsiveContainer - Automatisch anpassender Container
 * 
 * @example
 * <ResponsiveContainer>
 *   <div>Content für alle Devices</div>
 * </ResponsiveContainer>
 * 
 * @example
 * <ResponsiveContainer
 *   mobile={<MobileView />}
 *   tablet={<TabletView />}
 *   desktop={<DesktopView />}
 * />
 */
export function ResponsiveContainer({ 
  children, 
  className = '',
  mobile,
  tablet,
  desktop,
  fluid = false,
  maxWidth = 'lg',
}: ResponsiveContainerProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Device-spezifische Views
  if (mobile && isMobile) {
    return (
      <div className={`responsive-container${fluid ? '-fluid' : ''} ${className}`}>
        {mobile}
      </div>
    );
  }
  
  if (tablet && isTablet) {
    return (
      <div className={`responsive-container${fluid ? '-fluid' : ''} ${className}`}>
        {tablet}
      </div>
    );
  }
  
  if (desktop && isDesktop) {
    return (
      <div className={`responsive-container${fluid ? '-fluid' : ''} ${className}`}>
        {desktop}
      </div>
    );
  }

  // Standard Container mit max-width
  const maxWidthClass = maxWidth !== 'full' ? `max-width-${maxWidth}` : '';
  const containerClass = fluid 
    ? 'responsive-container-fluid' 
    : `responsive-container ${maxWidthClass}`;

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

/**
 * ResponsiveGrid - Automatisch anpassendes Grid
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function ResponsiveGrid({ 
  children, 
  className = '',
  columns,
  gap = 'md',
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const gridStyle: React.CSSProperties = {};
  
  if (columns) {
    if (isMobile && columns.mobile) {
      gridStyle.gridTemplateColumns = `repeat(${columns.mobile}, 1fr)`;
    } else if (isTablet && columns.tablet) {
      gridStyle.gridTemplateColumns = `repeat(${columns.tablet}, 1fr)`;
    } else if (isDesktop && columns.desktop) {
      gridStyle.gridTemplateColumns = `repeat(${columns.desktop}, 1fr)`;
    }
  }

  return (
    <div 
      className={`responsive-grid responsive-gap-${gap} ${className}`.trim()}
      style={gridStyle}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveFlex - Automatisch anpassender Flex Container
 */
interface ResponsiveFlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'column' | 'auto';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
}

export function ResponsiveFlex({
  children,
  className = '',
  direction = 'auto',
  gap = 'md',
  align = 'start',
  justify = 'start',
  wrap = false,
}: ResponsiveFlexProps) {
  const flexClass = direction === 'auto' 
    ? 'responsive-flex' 
    : direction === 'row' 
      ? 'responsive-flex-row' 
      : 'responsive-flex-column';

  const style: React.CSSProperties = {
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : 'nowrap',
  };

  return (
    <div 
      className={`${flexClass} responsive-gap-${gap} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

