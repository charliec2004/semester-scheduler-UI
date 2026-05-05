/**
 * Tab Navigation Component
 * Accessible tab bar with keyboard navigation
 */

import { Building2, FileOutput, Flag, Home, Upload, Users } from 'lucide-react';
import { useUIStore, useStaffStore, useDepartmentStore, useSolverStore } from '../../store';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

type TabId = 'welcome' | 'import' | 'staff' | 'departments' | 'flags' | 'results';

interface Tab {
  id: TabId;
  label: string;
  icon: JSX.Element;
  badge?: string | number;
}

export function TabNavigation() {
  const { activeTab, setActiveTab } = useUIStore();
  const { staff, errors: staffErrors } = useStaffStore();
  const { departments, errors: deptErrors } = useDepartmentStore();
  const { running, result } = useSolverStore();

  const tabs: Tab[] = [
    {
      id: 'welcome',
      label: 'Home',
      icon: <Home className="h-4 w-4" strokeWidth={1.8} />,
    },
    {
      id: 'import',
      label: 'Import',
      icon: <Upload className="h-4 w-4" strokeWidth={1.8} />,
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: <Building2 className="h-4 w-4" strokeWidth={1.8} />,
      badge: departments.length > 0 ? departments.length : undefined,
    },
    {
      id: 'staff',
      label: 'Staff',
      icon: <Users className="h-4 w-4" strokeWidth={1.8} />,
      badge: staff.length > 0 ? staff.length : undefined,
    },
    {
      id: 'flags',
      label: 'Flags & Solve',
      icon: <Flag className="h-4 w-4" strokeWidth={1.8} />,
    },
    {
      id: 'results',
      label: 'Results',
      icon: <FileOutput className="h-4 w-4" strokeWidth={1.8} />,
      badge: running ? '...' : result?.success ? '✓' : undefined,
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveTab(tabs[newIndex].id);
    // Focus the new tab
    const tabElement = document.getElementById(`tab-${tabs[newIndex].id}`);
    tabElement?.focus();
  };

  return (
    <nav 
      className="border-b border-border bg-surface-900/95" 
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="container mx-auto max-w-7xl px-5">
        <div className="flex gap-0.5">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const hasError = 
              (tab.id === 'staff' && staffErrors.length > 0) ||
              (tab.id === 'departments' && deptErrors.length > 0);

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  'tab relative',
                  isActive && 'tab-active',
                  hasError && 'text-surface-100',
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className={cn('ml-0.5 min-w-5 justify-center px-1.5', isActive && 'bg-foreground/10 text-foreground')}
                  >
                    {tab.badge}
                  </Badge>
                )}
                {hasError && (
                  <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-surface-200" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
