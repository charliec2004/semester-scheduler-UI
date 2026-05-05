import * as React from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type NoticeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const variantClasses: Record<NoticeVariant, string> = {
  neutral: 'border-border bg-surface-900/60 text-surface-100',
  success: 'border-[hsl(var(--action-primary-border)/0.5)] bg-[hsl(var(--action-primary)/0.14)] text-[hsl(var(--action-primary-foreground))]',
  warning: 'border-warning-400/55 bg-warning-500/12 text-surface-100',
  error: 'border-danger-700/45 bg-danger-700/10 text-surface-100',
  info: 'border-border bg-surface-900/60 text-surface-100',
};

const iconClasses: Record<NoticeVariant, string> = {
  neutral: 'text-surface-300',
  success: 'text-[hsl(var(--action-primary-foreground))]',
  warning: 'text-warning-300',
  error: 'text-danger-300',
  info: 'text-surface-300',
};

const variantIcons: Record<NoticeVariant, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleAlert,
  info: Info,
};

interface NoticePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NoticeVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export function NoticePanel({
  className,
  variant = 'neutral',
  title,
  description,
  children,
  icon,
  ...props
}: NoticePanelProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      className={cn(
        'rounded-lg border px-3.5 py-3',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', iconClasses[variant])}>
          {icon ?? <Icon className="h-4 w-4" strokeWidth={1.9} />}
        </div>
        <div className="min-w-0 flex-1">
          {title && <div className="text-[13px] font-medium">{title}</div>}
          {description && (
            <div
              className={cn(
                'text-[12px] leading-5',
                title ? 'mt-0.5' : '',
                variant === 'warning'
                  ? 'text-warning-100/90'
                  : variant === 'error'
                    ? 'text-danger-100/90'
                    : variant === 'success'
                      ? 'text-[hsl(var(--action-primary-foreground)/0.82)]'
                    : 'text-surface-400',
              )}
            >
              {description}
            </div>
          )}
          {children && <div className={cn(title || description ? 'mt-2' : '', 'text-[12px] leading-5')}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
