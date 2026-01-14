/**
 * Empty State Component
 * Displays friendly placeholder when no data is present
 */

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
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mb-6 text-surface-400">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-surface-200 mb-2">{title}</h3>
      <p className="text-surface-400 max-w-md mb-6">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
