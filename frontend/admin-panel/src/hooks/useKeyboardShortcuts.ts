import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

interface KeyboardShortcutsConfig {
  onDashboard?: () => void;
  onAnalytics?: () => void;
  onFinancial?: () => void;
  onRBAC?: () => void;
  onRestaurants?: () => void;
  onDishes?: () => void;
  onOrders?: () => void;
  onCustomers?: () => void;
  onDrivers?: () => void;
  onAudit?: () => void;
  onPromotions?: () => void;
  onReviews?: () => void;
  onSettings?: () => void;
  onToggleTheme?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  // Navigation Shortcuts (only when not in input/textarea)
  useHotkeys('d', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onDashboard?.();
  }, { enabled: !!config.onDashboard });

  useHotkeys('n', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onAnalytics?.();
  }, { enabled: !!config.onAnalytics });

  useHotkeys('m', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onFinancial?.();
  }, { enabled: !!config.onFinancial });

  useHotkeys('b', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onRBAC?.();
  }, { enabled: !!config.onRBAC });

  useHotkeys('r', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onRestaurants?.();
  }, { enabled: !!config.onRestaurants });

  useHotkeys('g', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onDishes?.();
  }, { enabled: !!config.onDishes });

  useHotkeys('o', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onOrders?.();
  }, { enabled: !!config.onOrders });

  useHotkeys('c', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onCustomers?.();
  }, { enabled: !!config.onCustomers });

  useHotkeys('f', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onDrivers?.();
  }, { enabled: !!config.onDrivers });

  useHotkeys('a', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onAudit?.();
  }, { enabled: !!config.onAudit });

  useHotkeys('p', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onPromotions?.();
  }, { enabled: !!config.onPromotions });

  useHotkeys('b', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onReviews?.();
  }, { enabled: !!config.onReviews });

  useHotkeys('s', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onSettings?.();
  }, { enabled: !!config.onSettings });

  useHotkeys('t', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    config.onToggleTheme?.();
  }, { enabled: !!config.onToggleTheme });
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = (activeElement as HTMLElement).contentEditable === 'true';
  
  return isInput || isContentEditable;
}

