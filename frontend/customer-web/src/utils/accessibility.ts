/**
 * Accessibility Utilities
 * 
 * Hilfsfunktionen für bessere Barrierefreiheit
 */

/**
 * Keyboard Event Handler für Buttons
 * Ermöglicht Aktivierung mit Enter und Space
 */
export function handleKeyboardButton(
  event: React.KeyboardEvent,
  onClick: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
}

/**
 * Keyboard Event Handler für Links
 * Ermöglicht Aktivierung mit Enter
 */
export function handleKeyboardLink(
  event: React.KeyboardEvent,
  onClick: () => void
): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    onClick();
  }
}

/**
 * Focus-Management: Setzt Focus auf erstes fokussierbares Element
 */
export function focusFirstElement(container: HTMLElement | null): void {
  if (!container) return;
  
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  const firstFocusable = container.querySelector<HTMLElement>(focusableSelectors);
  firstFocusable?.focus();
}

/**
 * Focus-Management: Setzt Focus auf letztes fokussierbares Element
 */
export function focusLastElement(container: HTMLElement | null): void {
  if (!container) return;
  
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
  const lastElement = focusableElements[focusableElements.length - 1];
  lastElement?.focus();
}

/**
 * Trap Focus innerhalb eines Containers (für Modals)
 */
export function trapFocus(event: KeyboardEvent, container: HTMLElement | null): void {
  if (!container || event.key !== 'Tab') return;
  
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.shiftKey) {
    // Shift + Tab: Wenn auf erstem Element, springe zum letzten
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab: Wenn auf letztem Element, springe zum ersten
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Erstellt ARIA-Live-Region für Screen Reader Announcements
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Entferne nach Announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

