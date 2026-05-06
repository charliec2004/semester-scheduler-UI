import { useMemo, useState } from 'react';
import { ArrowRight, Building2, Check, FileInput, Users } from 'lucide-react';
import type { HistoryEntry } from '../../../main/ipc-types';
import { useHistoryStore, useUIStore } from '../../store';
import { useProjectConfigActions } from '../../hooks/useProjectConfigActions';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { DialogShell } from '../ui/dialog-shell';
import { Input } from '../ui/input';
import { NoticePanel } from '../ui/notice-panel';

function DesktopDivider() {
  return (
    <div className="relative hidden px-4 md:flex" aria-hidden="true">
      <div className="absolute bottom-1 left-1/2 top-1 -translate-x-1/2 border-l border-dashed border-surface-600/80" />
      <div className="relative flex items-center justify-center">
        <span className="rounded-full border border-surface-600/80 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-300">
          OR
        </span>
      </div>
    </div>
  );
}

function MobileDivider() {
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:hidden" aria-hidden="true">
      <span className="rounded-full border border-surface-600/80 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-300">
        OR
      </span>
    </div>
  );
}

export function WelcomeTab() {
  const { setActiveTab, showToast } = useUIStore();
  const { history, restoreConfig } = useHistoryStore();
  const { importErrors, importing, openConfigPicker } = useProjectConfigActions();
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isOpenConfigWarningOpen, setIsOpenConfigWarningOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getHistoryLabel = (entry: HistoryEntry, index: number) => entry.name?.trim() || `Schedule ${index + 1}`;
  const allHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [history],
  );
  const filteredHistory = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) {
      return allHistory;
    }

    return allHistory.filter((entry, index) => {
      const label = getHistoryLabel(entry, index).toLowerCase();
      const timestamp = formatDate(entry.timestamp).toLowerCase();
      return label.includes(query) || timestamp.includes(query);
    });
  }, [allHistory, projectSearch]);

  const handleRestoreConfig = async (entry: HistoryEntry) => {
    try {
      const success = await restoreConfig(entry.id);
      if (success) {
        setIsProjectsModalOpen(false);
        setActiveTab('departments');
        showToast(`Restored configuration from ${formatDate(entry.timestamp)}`, 'success');
      } else {
        showToast('Failed to restore configuration', 'error');
      }
    } catch (error) {
      showToast(`Failed to restore configuration: ${(error as Error).message}`, 'error');
    }
  };

  return (
    <div className="animate-fade-in space-y-12 pb-2">
      <div className="max-w-4xl space-y-3 pt-1">
        <h1 className="text-4xl font-display font-bold tracking-tight text-surface-100">
          Welcome
        </h1>
        <p className="max-w-3xl text-[15px] text-surface-400">
          Open a saved project, restore a previous configuration, or start building a schedule from scratch.
        </p>
      </div>

      <section className="pt-6 md:pt-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-10">
        <div className="flex h-full flex-col items-center gap-8 text-center md:px-6">
          <div className="mx-auto flex min-h-[236px] w-full max-w-[24rem] flex-col items-center justify-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-900 text-surface-300">
              <FileInput className="h-6 w-6" strokeWidth={1.8} />
            </div>

            <div className="space-y-3">
              <h3 className="text-[18px] font-semibold text-surface-100">
                Open config file
              </h3>
              <p className="text-[13px] leading-6 text-surface-400">
                Open a full project file exported from Semester Scheduler. This loads staff, departments, and solve settings together.
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-[24rem] justify-center">
            <Button
              type="button"
              size="sm"
              className="min-w-[176px]"
              onClick={() => {
                setIsOpenConfigWarningOpen(true);
              }}
              disabled={importing}
            >
              {importing ? 'Opening...' : 'Open Config File'}
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Button>
          </div>

          {importErrors.length > 0 && (
            <div className="w-full max-w-[24rem]">
              <NoticePanel variant="error" title={`Import issues (${importErrors.length})`}>
                <ul className="max-h-40 space-y-1 overflow-auto text-left">
                  {importErrors.map((item, index) => (
                    <li key={`${item.message}-${index}`} className="flex items-start gap-2">
                      <span className="text-surface-300">•</span>
                      <span>{item.message}</span>
                    </li>
                  ))}
                </ul>
              </NoticePanel>
            </div>
          )}
        </div>

        <DesktopDivider />

        <div className="relative flex h-full flex-col items-center gap-8 border-t border-surface-700/70 pt-10 text-center md:border-t-0 md:px-6 md:pt-0">
          <MobileDivider />
          <div className="mx-auto flex min-h-[236px] w-full max-w-[24rem] flex-col items-center justify-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-900 text-surface-300">
              <Check className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="space-y-3">
              <h3 className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em] text-surface-100 md:text-[18px]">
                Open recent project
              </h3>
              <p className="text-[13px] leading-6 text-surface-400">
                Browse and reopen any project saved on this device from a searchable project list.
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-[24rem] flex-col items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="min-w-[176px]"
              onClick={() => {
                setProjectSearch('');
                setIsProjectsModalOpen(true);
              }}
              disabled={allHistory.length === 0}
            >
              Open Projects
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Button>
            <div className="text-[12px] text-surface-500">
              {allHistory.length > 0 ? `${allHistory.length} saved projects` : 'No saved projects yet'}
            </div>
          </div>
        </div>

        <DesktopDivider />

        <div className="relative flex h-full flex-col items-center gap-8 border-t border-surface-700/70 pt-10 text-center md:border-t-0 md:px-6 md:pt-0">
          <MobileDivider />
          <div className="mx-auto flex min-h-[236px] w-full max-w-[24rem] flex-col items-center justify-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-900 text-surface-300">
              <Building2 className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="space-y-3">
              <h3 className="text-[18px] font-semibold text-surface-100">
                Start from scratch
              </h3>
              <p className="text-[13px] leading-6 text-surface-400">
                Build departments and staff directly in the app, then refine your flags and generate schedules.
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-[24rem] grid-cols-2 gap-3">
            <Button
              type="button"
              size="sm"
              className="w-full justify-center"
              onClick={() => setActiveTab('departments')}
            >
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
              Departments
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full justify-center"
              onClick={() => setActiveTab('staff')}
            >
              <Users className="h-4 w-4" strokeWidth={1.8} />
              Staff
            </Button>
          </div>
        </div>
        </div>
      </section>

      <DialogShell
        open={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        title="Open project"
        description="Search your saved projects and reopen the one you want to continue working on."
        widthClassName="max-w-2xl"
        contentClassName="space-y-4"
      >
        <Input
          type="text"
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          placeholder="Search projects..."
          className="h-10"
          autoFocus
        />

        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border/80 bg-background/60">
          {filteredHistory.length > 0 ? (
            <div className="divide-y divide-border/70">
              {filteredHistory.map((entry) => {
                const originalIndex = allHistory.findIndex((candidate) => candidate.id === entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      void handleRestoreConfig(entry);
                    }}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-900/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-surface-200">
                        {getHistoryLabel(entry, originalIndex)}
                      </div>
                      <div className="mt-1 text-sm text-surface-500">
                        {formatDate(entry.timestamp)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-surface-500" strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-surface-500">
              No projects match your search.
            </div>
          )}
        </div>
      </DialogShell>

      <ConfirmDialog
        open={isOpenConfigWarningOpen}
        onOpenChange={setIsOpenConfigWarningOpen}
        title="Replace current project?"
        description="Opening a config file will override the current project, including departments, employees, Front Desk settings, and all Flags & Solve preferences."
        confirmLabel="Open And Replace"
        confirmVariant="destructive"
        onConfirm={() => {
          void openConfigPicker();
        }}
      />
    </div>
  );
}
