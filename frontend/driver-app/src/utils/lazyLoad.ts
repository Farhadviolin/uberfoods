import React from 'react';

/**
 * Lazy Loading Utilities
 * For code splitting and lazy component loading
 */

/**
 * Creates a lazy-loaded component with error boundary
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFn);

  return (props: React.ComponentPropsWithoutRef<T>) => {
    const Fallback = fallback || React.createElement('div', null, 'Loading...');
    return React.createElement(
      React.Suspense,
      { fallback: Fallback },
      React.createElement(LazyComponent, props)
    );
  };
}

/**
 * Preloads a component for faster subsequent loads
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch((err) => {
    console.warn('Failed to preload component:', err);
  });
}

/**
 * Batch preloads multiple components
 */
export function preloadComponents(importFns: Array<() => Promise<any>>): Promise<void[]> {
  return Promise.all(importFns.map((fn) => {
    return new Promise<void>((resolve) => {
      preloadComponent(fn);
      resolve();
    });
  }));
}

