/**
 * Toast Notification Component
 * Accessible notification popup with auto-dismiss
 */

import { useUIStore } from '../../store';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function Toast({ message, type }: ToastProps) {
  const { hideToast, showSettings } = useUIStore();

  const icons = {
    success: (
      <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const bgColors = {
    success: 'bg-surface-800 border-accent-500/50',
    error: 'bg-surface-800 border-danger-500/50',
    info: 'bg-surface-800 border-surface-600',
  };

  // Position on left when settings panel is open (it covers the right side)
  const positionClass = showSettings ? 'left-6' : 'right-6';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-6 ${positionClass} z-50 flex items-center gap-3 px-4 py-3
        border rounded-lg shadow-xl animate-slide-up
        ${bgColors[type]}
      `}
    >
      {icons[type]}
      <span className="text-sm text-surface-100">{message}</span>
      <button
        onClick={hideToast}
        className="ml-2 p-1 hover:bg-surface-700 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
