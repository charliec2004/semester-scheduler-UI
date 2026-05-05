/**
 * Toast Notification Component
 * Accessible notification popup with auto-dismiss
 */

import { Check, CircleAlert, Info, X } from 'lucide-react';
import { useUIStore } from '../../store';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function Toast({ message, type }: ToastProps) {
  const { hideToast, showSettings } = useUIStore();

  const icons = {
    success: <Check className="h-4 w-4 text-foreground" strokeWidth={2} />,
    error: <CircleAlert className="h-4 w-4 text-danger-300" strokeWidth={2} />,
    info: <Info className="h-4 w-4 text-surface-300" strokeWidth={2} />,
  };

  const bgColors = {
    success: 'border-border bg-card/95',
    error: 'border-danger-700/45 bg-card/95',
    info: 'border-border bg-card/95',
  };

  // Position on left when settings panel is open (it covers the right side)
  const positionClass = showSettings ? 'left-6' : 'right-6';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        `fixed bottom-4 ${positionClass} z-50 flex max-w-[320px] items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-2xl animate-slide-up`,
        bgColors[type],
      )}
    >
      {icons[type]}
      <span className="text-[12px] leading-5 text-surface-100">{message}</span>
      <Button
        onClick={hideToast}
        variant="ghost"
        size="icon-sm"
        className="ml-0.5 h-6 w-6"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-surface-400" strokeWidth={1.8} />
      </Button>
    </div>
  );
}
