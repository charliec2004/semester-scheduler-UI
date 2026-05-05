/**
 * Empty State Component
 * Displays friendly placeholder when no data is present
 */

import { Button } from './button';

interface EmptyStateProps {
  icon: JSX.Element;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-surface-400">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-surface-200">{title}</h3>
      <p className="mb-5 max-w-2xl text-[13px] text-surface-400 sm:whitespace-nowrap">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
