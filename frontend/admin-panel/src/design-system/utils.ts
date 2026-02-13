import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Create a variant function for component styling
 * Simplified version of class-variance-authority
 */
export function createVariants<T extends Record<string, any>>(
  base: string,
  variants: T
) {
  return function(props: {
    [K in keyof T]?: keyof T[K] | null;
  } & { className?: string }) {
    const classes: string[] = [base];

    for (const [key, value] of Object.entries(props)) {
      if (key === 'className') continue;

      const variantKey = key as keyof T;
      const variantValue = value as keyof T[keyof T];

      if (variants[variantKey]?.[variantValue]) {
        classes.push(variants[variantKey][variantValue] as string);
      }
    }

    if (props.className) {
      classes.push(props.className);
    }

    return cn(...classes);
  };
}












