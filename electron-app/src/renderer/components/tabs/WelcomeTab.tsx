import { ArrowRight, Building2, FileInput, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { QuickStartGuide } from '../ui/QuickStartGuide';
import { useUIStore } from '../../store';

export function WelcomeTab() {
  const { setActiveTab } = useUIStore();
  const ctaButtonClassName = 'min-w-[176px] justify-center';

  return (
    <div className="animate-fade-in space-y-12 pb-2">
      <div className="max-w-4xl space-y-3 pt-1">
        <h1 className="text-4xl font-display font-bold tracking-tight text-surface-100">
          Welcome
        </h1>
        <p className="max-w-3xl text-[15px] text-surface-400">
          Build a balanced student employee schedule from imported data or from scratch.
        </p>
      </div>

      <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-10">
        <div className="flex min-h-[240px] flex-col items-center gap-8 text-center md:px-8">
          <div className="mx-auto flex max-w-[36rem] flex-col items-center space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-900 text-surface-300">
              <FileInput className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="space-y-3">
              <h3 className="text-[18px] font-semibold text-surface-100">
                Import department &amp; employee data
              </h3>
              <p className="max-w-xl text-[13px] leading-6 text-surface-400">
                Bring in your CSV files and jump straight into validation, flags, and schedule generation.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              size="sm"
              className={ctaButtonClassName}
              onClick={() => setActiveTab('import')}
            >
              Open Import
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Button>
          </div>
        </div>

        <div className="relative hidden px-4 md:flex">
          <div className="absolute bottom-1 left-1/2 top-1 -translate-x-1/2 border-l border-dashed border-surface-600/80" />
          <div className="relative flex items-center justify-center">
            <span className="rounded-full border border-surface-600/80 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-300">
              OR
            </span>
          </div>
        </div>

        <div className="relative flex min-h-[240px] flex-col items-center gap-8 border-t border-surface-700/70 pt-10 text-center md:border-t-0 md:px-8 md:pt-0">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:hidden">
            <span className="rounded-full border border-surface-600/80 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-300">
              OR
            </span>
          </div>
          <div className="mx-auto flex max-w-[36rem] flex-col items-center space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-900 text-surface-300">
              <Building2 className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="space-y-3">
              <h3 className="text-[18px] font-semibold text-surface-100">
                Create departments and staff
              </h3>
              <p className="max-w-xl text-[13px] leading-6 text-surface-400">
                Start manually and enter department budgets, employee hours, roles, and availability directly in the app.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Button
              type="button"
              size="sm"
              className={ctaButtonClassName}
              onClick={() => setActiveTab('departments')}
            >
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
              Departments
            </Button>
            <Button
              type="button"
              size="sm"
              className={ctaButtonClassName}
              onClick={() => setActiveTab('staff')}
            >
              <Users className="h-4 w-4" strokeWidth={1.8} />
              Staff
            </Button>
          </div>
        </div>
      </section>

      <QuickStartGuide />
    </div>
  );
}
