import { useEffect, useRef, useState } from 'react';

interface KeyboardShortcutsConfig {
  onDashboard?: () => void;
  onOrders?: () => void;
  onFavorites?: () => void;
  onProfile?: () => void;
  onAddresses?: () => void;
  onMealPlanner?: () => void;
  onRestaurants?: () => void;
  onToggleTheme?: () => void;
  onCommandPalette?: () => void;
}

interface KeyboardShortcutsOptions {
  target?: HTMLElement | Document | Window;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

// Legacy API: Config object with callback names
export function useKeyboardShortcuts(
  config: KeyboardShortcutsConfig,
  enabled?: boolean
): { isActive: boolean };

// New API: Shortcut map with options
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  options?: KeyboardShortcutsOptions
): { isActive: boolean; activeShortcuts: string[] };

export function useKeyboardShortcuts(
  shortcutsOrConfig: ShortcutMap | KeyboardShortcutsConfig,
  optionsOrEnabled?: KeyboardShortcutsOptions | boolean
): { isActive: boolean; activeShortcuts?: string[] } {
  // Detect API type
  const isLegacyAPI =
    typeof optionsOrEnabled === 'boolean' ||
    (optionsOrEnabled && 'onDashboard' in (shortcutsOrConfig as KeyboardShortcutsConfig));

  // Always call hooks at the top level
  const [isActive, setIsActive] = useState(
    typeof optionsOrEnabled === 'boolean'
      ? optionsOrEnabled
      : (optionsOrEnabled as KeyboardShortcutsOptions)?.enabled ?? true
  );
  const shortcutsRef = useRef<ShortcutMap | null>(null);
  const configRef = useRef<KeyboardShortcutsConfig | null>(null);
  const optionsRef = useRef<KeyboardShortcutsOptions | null>(null);

  // Legacy API setup
  const config = isLegacyAPI ? shortcutsOrConfig as KeyboardShortcutsConfig : null;
  const legacyEnabled = isLegacyAPI && typeof optionsOrEnabled === 'boolean' ? optionsOrEnabled : true;

  // New API setup
  const shortcuts = !isLegacyAPI ? shortcutsOrConfig as ShortcutMap : null;
  const options = !isLegacyAPI ? (optionsOrEnabled || {}) as KeyboardShortcutsOptions : null;
  const {
    target = window,
    enabled = true,
  } = options || {};

  // Set refs based on API type
  if (isLegacyAPI && config) {
    configRef.current = config;
  } else if (shortcuts) {
    shortcutsRef.current = shortcuts;
    optionsRef.current = options;
  }

  // Legacy API keyboard handler effect
  useEffect(() => {
    if (!isLegacyAPI || !legacyEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (isInputFocused()) return;

      const currentConfig = configRef.current;
      if (!currentConfig) return;

      // Check for Cmd+K / Ctrl+K (Command Palette)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        currentConfig.onCommandPalette?.();
        return;
      }

      // Ignore if modifier keys are pressed (except for Cmd+K)
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          currentConfig.onDashboard?.();
          break;
        case 'o':
          e.preventDefault();
          currentConfig.onOrders?.();
          break;
        case 'f':
          e.preventDefault();
          currentConfig.onFavorites?.();
          break;
        case 'p':
          e.preventDefault();
          currentConfig.onProfile?.();
          break;
        case 'a':
          e.preventDefault();
          currentConfig.onAddresses?.();
          break;
        case 'm':
          e.preventDefault();
          currentConfig.onMealPlanner?.();
          break;
        case 'r':
          e.preventDefault();
          currentConfig.onRestaurants?.();
          break;
        case 't':
          e.preventDefault();
          currentConfig.onToggleTheme?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLegacyAPI, legacyEnabled]);

  // New API keyboard handler effect
  useEffect(() => {
    if (isLegacyAPI || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (isInputFocused()) return;

      // Parse shortcut from event
      const shortcut = buildShortcutString(e);

      // Find matching handler
      const currentShortcuts = shortcutsRef.current;
      if (!currentShortcuts) return;

      const handler = findMatchingHandler(currentShortcuts, shortcut, e);

      if (handler) {
        // Get current options from ref
        const currentOptions = optionsRef.current;
        const shouldPreventDefault = currentOptions?.preventDefault !== false;
        const shouldStopPropagation = currentOptions?.stopPropagation === true;

        // Call preventDefault/stopPropagation if configured
        if (shouldPreventDefault) {
          e.preventDefault();
        }
        if (shouldStopPropagation) {
          e.stopPropagation();
        }

        // Create enhanced event object with all original properties
        const enhancedEvent = {
          ...e,
          key: e.key,
          code: e.code,
          preventDefault: () => {
            if (typeof (e as unknown as { preventDefault?: () => void }).preventDefault === 'function') {
              (e as unknown as { preventDefault: () => void }).preventDefault();
            } else {
              e.preventDefault();
            }
          },
          stopPropagation: () => {
            if (typeof (e as unknown as { stopPropagation?: () => void }).stopPropagation === 'function') {
              (e as unknown as { stopPropagation: () => void }).stopPropagation();
            } else {
              e.stopPropagation();
            }
          },
        };

        handler(enhancedEvent as KeyboardEvent);
      }
    };

    const targetElement = target === window ? window : target;
    targetElement.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [isLegacyAPI, enabled, target]);

  // Update active state effect
  useEffect(() => {
    if (isLegacyAPI) {
      setIsActive(legacyEnabled);
    } else {
      setIsActive(enabled);
    }
  }, [isLegacyAPI, legacyEnabled, enabled]);

  // Update refs effect for new API
  useEffect(() => {
    if (!isLegacyAPI && shortcuts && options) {
      shortcutsRef.current = shortcuts;
      optionsRef.current = options;
    }
  }, [isLegacyAPI, shortcuts, options]);

  if (isLegacyAPI) {
    return { isActive };
  } else {
    return {
      isActive,
      activeShortcuts: shortcuts ? Object.keys(shortcuts) : [],
    };
  }
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = (activeElement as HTMLElement).contentEditable === 'true';
  
  return isInput || isContentEditable;
}

function buildShortcutString(e: KeyboardEvent): string {
  const parts: string[] = [];
  
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  
  const key = normalizeKeyName(e.key);
  if (key) parts.push(key);
  
  return parts.join('+');
}

function normalizeKeyName(key: string): string {
  const normalized = key.toLowerCase();
  
  // Handle special keys
  const specialKeys: Record<string, string> = {
    'escape': 'escape',
    'esc': 'escape',
    'arrowup': 'arrowup',
    'uparrow': 'arrowup',
    'arrowdown': 'arrowdown',
    'downarrow': 'arrowdown',
    'arrowleft': 'arrowleft',
    'leftarrow': 'arrowleft',
    'arrowright': 'arrowright',
    'rightarrow': 'arrowright',
    'control': 'ctrl',
  };
  
  return specialKeys[normalized] || normalized;
}

function findMatchingHandler(
  shortcuts: ShortcutMap,
  shortcut: string,
  event: KeyboardEvent
): ((event: KeyboardEvent) => void) | undefined {
  // Direct match
  if (shortcuts[shortcut]) {
    return shortcuts[shortcut];
  }
  
  // Try case-insensitive match
  const lowerShortcut = shortcut.toLowerCase();
  for (const [key, handler] of Object.entries(shortcuts)) {
    if (key.toLowerCase() === lowerShortcut) {
      return handler;
    }
  }
  
  // Try alternative formats (e.g., 'control+s' vs 'ctrl+s')
  const alternatives = [
    shortcut.replace(/ctrl/g, 'control'),
    shortcut.replace(/control/g, 'ctrl'),
  ];
  
  for (const alt of alternatives) {
    if (shortcuts[alt]) {
      return shortcuts[alt];
    }
  }
  
  return undefined;
}
