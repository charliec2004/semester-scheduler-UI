/**
 * Keyboard Shortcuts Help Modal
 * Shows available keyboard shortcuts for accessibility
 */

import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from './button';
import { DialogShell } from './dialog-shell';

const shortcuts = [
  { keys: ['⌘', '1'], description: 'Go to Welcome tab' },
  { keys: ['⌘', '2'], description: 'Go to Departments tab' },
  { keys: ['⌘', '3'], description: 'Go to Staff tab' },
  { keys: ['⌘', '4'], description: 'Go to Flags & Solve tab' },
  { keys: ['⌘', '5'], description: 'Go to Results tab' },
  { keys: ['⌘', ','], description: 'Open Settings' },
  { keys: ['Esc'], description: 'Close modal / settings' },
  { keys: ['Tab'], description: 'Navigate between elements' },
  { keys: ['Enter'], description: 'Activate button / link' },
  { keys: ['Space'], description: 'Toggle checkbox / button' },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="h-4 w-4" strokeWidth={1.8} />
        Shortcuts
      </Button>

      <DialogShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        widthClassName="max-w-md"
        contentClassName="max-h-[min(80vh,640px)] overflow-y-auto"
      >
        <div className="space-y-2.5">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-surface-300">{shortcut.description}</span>
              <div className="flex shrink-0 gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          On Windows/Linux, use Ctrl instead of ⌘
        </p>
      </DialogShell>
    </>
  );
}
