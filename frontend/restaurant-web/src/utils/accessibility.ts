import React from 'react';

/**
 * Accessibility utilities for consistent A11y support
 */

/**
 * Generate accessible button props
 */
export function getAccessibleButtonProps(
  label: string,
  description?: string,
): {
  "aria-label": string;
  "aria-describedby"?: string;
  role?: string;
} {
  const props: {
    "aria-label": string;
    "aria-describedby"?: string;
    role?: string;
  } = {
    "aria-label": label,
  };

  if (description) {
    props["aria-describedby"] =
      `button-desc-${label.replace(/\s+/g, "-").toLowerCase()}`;
  }

  return props;
}

/**
 * Generate accessible input props
 */
export function getAccessibleInputProps(
  label: string,
  required?: boolean,
  error?: string,
): {
  "aria-label": string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
} {
  const props: {
    "aria-label": string;
    "aria-required"?: boolean;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  } = {
    "aria-label": label,
  };

  if (required) {
    props["aria-required"] = true;
  }

  if (error) {
    props["aria-invalid"] = true;
    props["aria-describedby"] =
      `error-${label.replace(/\s+/g, "-").toLowerCase()}`;
  }

  return props;
}

/**
 * Keyboard navigation helpers
 */
export function handleKeyDown(
  event: React.KeyboardEvent,
  onEnter?: () => void,
  onEscape?: () => void,
) {
  if (event.key === "Enter" && onEnter) {
    event.preventDefault();
    onEnter();
  } else if (event.key === "Escape" && onEscape) {
    event.preventDefault();
    onEscape();
  }
}

/**
 * Focus management
 */
export function focusElement(selector: string) {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.focus();
  }
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
) {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
