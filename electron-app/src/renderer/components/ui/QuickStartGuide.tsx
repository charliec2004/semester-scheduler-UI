export function QuickStartGuide() {
  return (
    <div className="card bg-surface-800/50 p-7 md:p-8">
      <h3 className="mb-6 font-semibold text-surface-200">Quick Start Guide</h3>
      <div className="grid gap-8 text-sm md:grid-cols-3 md:gap-10">
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-900 text-[12px] font-semibold text-surface-300">
            1
          </div>
          <h4 className="font-medium text-surface-200">Import or Create Data</h4>
          <p className="max-w-sm text-surface-400">
            Upload your CSV files or use the Departments and Staff tabs to create data from scratch.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-900 text-[12px] font-semibold text-surface-300">
            2
          </div>
          <h4 className="font-medium text-surface-200">Configure Flags</h4>
          <p className="max-w-sm text-surface-400">
            Set preferences like favored employees, training pairs, and department priorities.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-900 text-[12px] font-semibold text-surface-300">
            3
          </div>
          <h4 className="font-medium text-surface-200">Generate Schedule</h4>
          <p className="max-w-sm text-surface-400">
            Run the optimizer and export your completed schedule as Excel.
          </p>
        </div>
      </div>
    </div>
  );
}
