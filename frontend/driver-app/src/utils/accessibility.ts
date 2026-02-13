/**
 * Accessibility Utilities
 * For improving accessibility
 */

/**
 * Focuses an element with keyboard navigation support
 */
export function focusElement(element: HTMLElement | null): void {
  if (!element) return;

  // Check if element is focusable
  if (
    element.tabIndex >= 0 ||
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLAnchorElement
  ) {
    element.focus();
  } else {
    // Make element focusable temporarily
    const originalTabIndex = element.tabIndex;
    element.tabIndex = 0;
    element.focus();
    element.tabIndex = originalTabIndex;
  }
}

/**
 * Traps focus within a container
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTab);
  };
}

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Gets the next focusable element
 */
export function getNextFocusableElement(currentElement: HTMLElement): HTMLElement | null {
  const focusableElements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.disabled && el.offsetParent !== null);

  const currentIndex = focusableElements.indexOf(currentElement);
  return focusableElements[currentIndex + 1] || focusableElements[0] || null;
}

/**
 * Gets the previous focusable element
 */
export function getPreviousFocusableElement(currentElement: HTMLElement): HTMLElement | null {
  const focusableElements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.disabled && el.offsetParent !== null);

  const currentIndex = focusableElements.indexOf(currentElement);
  return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1] || null;
}

