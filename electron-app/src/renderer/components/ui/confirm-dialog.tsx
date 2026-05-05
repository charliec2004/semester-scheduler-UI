import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { DialogShell } from './dialog-shell';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onOpenChange(false);
    void onConfirm();
  };

  return (
    <DialogShell
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      widthClassName="max-w-sm"
      contentClassName="px-4 pb-4 pt-3"
    >
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} size="sm" onClick={handleConfirm}>
          {confirmVariant === 'destructive' && <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />}
          {confirmLabel}
        </Button>
      </div>
    </DialogShell>
  );
}
