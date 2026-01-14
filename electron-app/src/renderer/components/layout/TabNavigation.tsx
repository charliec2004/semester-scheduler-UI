/**
 * Tab Navigation Component
 * Accessible tab bar with keyboard navigation
 */

import { useUIStore, useStaffStore, useDepartmentStore, useSolverStore } from '../../store';

type TabId = 'import' | 'staff' | 'departments' | 'flags' | 'results';

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
      id: 'import',
      label: 'Import',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: 'staff',
      label: 'Staff',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: staff.length > 0 ? staff.length : undefined,
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badge: departments.length > 0 ? departments.length : undefined,
    },
    {
      id: 'flags',
      label: 'Flags & Solve',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
    },
    {
      id: 'results',
      label: 'Results',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: running ? '...' : result?.success ? '✓' : undefined,
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;
    
    if (e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
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
      className="bg-surface-900 border-b border-surface-700" 
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex gap-1">
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
                className={`
                  tab flex items-center gap-2 relative
                  ${isActive ? 'tab-active' : ''}
                  ${hasError ? 'text-danger-400' : ''}
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`
                    ml-1 px-1.5 py-0.5 text-xs rounded-full
                    ${isActive ? 'bg-accent-500/20 text-accent-400' : 'bg-surface-700 text-surface-400'}
                  `}>
                    {tab.badge}
                  </span>
                )}
                {hasError && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-danger-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
