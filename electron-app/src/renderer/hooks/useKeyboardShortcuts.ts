/**
 * Keyboard Shortcuts Hook
 * Global keyboard navigation and shortcuts for accessibility
 */

import { useEffect } from 'react';
import { useUIStore, useSolverStore } from '../store';

export function useKeyboardShortcuts() {
  const { setActiveTab, setShowSettings } = useUIStore();
  const { running } = useSolverStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Cmd/Ctrl + number for tab navigation
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('import');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('staff');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('departments');
            break;
          case '4':
            e.preventDefault();
            setActiveTab('flags');
            break;
          case '5':
            e.preventDefault();
            setActiveTab('results');
            break;
          case ',':
            e.preventDefault();
            setShowSettings(true);
            break;
        }
      }

      // Escape to close modals/settings
      if (e.key === 'Escape') {
        setShowSettings(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, setShowSettings, running]);
}

/**
 * Focus trap hook for modals
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
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

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Announce messages to screen readers
 */
export function useAnnounce() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  };

  return announce;
}
