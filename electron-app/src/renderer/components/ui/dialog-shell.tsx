import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
}

export function DialogShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'max-w-md',
  contentClassName,
  footerClassName,
  hideCloseButton = false,
}: DialogShellProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const hasContent = children !== undefined && children !== null;

  React.useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const mainContent = document.getElementById('main-content');
    const previousMainOverflow = mainContent?.style.overflow ?? '';

    document.body.style.overflow = 'hidden';
    if (mainContent) {
      mainContent.style.overflow = 'hidden';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (mainContent) {
        mainContent.style.overflow = previousMainOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-surface-950/82 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-[121] w-full overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl',
          widthClassName,
        )}
      >
        {(title || description || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-700/90 px-4 py-3.5">
            <div className="min-w-0">
              {title && (
                <h3 id={titleId} className="text-[15px] font-semibold text-surface-100">
                  {title}
                </h3>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className={cn('text-[12px] leading-5 text-surface-400', title ? 'mt-1' : '')}
                >
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-mr-1 shrink-0"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            )}
          </div>
        )}
        {hasContent && <div className={cn('px-4 py-4', contentClassName)}>{children}</div>}
        {footer && (
          <div
            className={cn(
              'flex items-center justify-end gap-2 border-t border-surface-700/90 bg-surface-900/95 px-4 py-3',
              footerClassName,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
