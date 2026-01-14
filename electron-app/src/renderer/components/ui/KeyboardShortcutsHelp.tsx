/**
 * Keyboard Shortcuts Help Modal
 * Shows available keyboard shortcuts for accessibility
 */

import { useState, useEffect, ReactNode } from 'react';

const shortcuts = [
  { keys: ['⌘', '1'], description: 'Go to Import tab' },
  { keys: ['⌘', '2'], description: 'Go to Staff tab' },
  { keys: ['⌘', '3'], description: 'Go to Departments tab' },
  { keys: ['⌘', '4'], description: 'Go to Flags & Solve tab' },
  { keys: ['⌘', '5'], description: 'Go to Results tab' },
  { keys: ['⌘', ','], description: 'Open Settings' },
  { keys: ['Esc'], description: 'Close modal / settings' },
  { keys: ['Tab'], description: 'Navigate between elements' },
  { keys: ['Enter'], description: 'Activate button / link' },
  { keys: ['Space'], description: 'Toggle checkbox / button' },
  { keys: ['←', '→'], description: 'Navigate tabs' },
];

// Reusable modal wrapper that locks body scroll
function ScrollLockModal({ 
  children, 
  onClose 
}: { 
  children: ReactNode; 
  onClose: () => void;
}) {
  // Lock main content scroll when modal is open
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.overflow = 'hidden';
    }
    return () => {
      if (mainContent) {
        mainContent.style.overflow = '';
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {children}
    </div>
  );
}

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-ghost text-sm"
        aria-label="Show keyboard shortcuts"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Shortcuts
      </button>

      {isOpen && (
        <ScrollLockModal onClose={() => setIsOpen(false)}>
          <div 
            className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="shortcuts-title" className="text-lg font-semibold text-surface-100">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-ghost p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd
                        key={j}
                        className="px-2 py-1 bg-surface-800 border border-surface-600 rounded text-xs font-mono text-surface-200"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-surface-500 text-center">
              On Windows/Linux, use Ctrl instead of ⌘
            </p>
          </div>
        </ScrollLockModal>
      )}
    </>
  );
}
