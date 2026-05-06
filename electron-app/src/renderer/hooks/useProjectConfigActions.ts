import { useCallback, useState } from 'react';
import type { ValidationError } from '../../main/ipc-types';
import { createConfigSnapshot, useProjectStore, useUIStore } from '../store';
import { createProjectConfigFile, parseProjectConfigFile } from '../utils/projectConfig';

function formatImportFailure(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Configuration import failed.';
  }
  if (errors.length === 1) {
    return errors[0].message;
  }
  return `Configuration import failed with ${errors.length} validation errors.`;
}

export function useProjectConfigActions() {
  const { showToast, setActiveTab } = useUIStore();
  const { applyAndSaveCurrentProject } = useProjectStore();
  const [importErrors, setImportErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const importFromContent = useCallback(async (content: string) => {
    setImporting(true);

    try {
      const parsed = parseProjectConfigFile(content);
      if (!parsed.config) {
        setImportErrors(parsed.errors);
        showToast(formatImportFailure(parsed.errors), 'error');
        return false;
      }

      await applyAndSaveCurrentProject(parsed.config);
      setImportErrors([]);
      setActiveTab('departments');
      showToast('Project configuration imported', 'success');
      return true;
    } catch (error) {
      setImportErrors([
        {
          message: (error as Error).message,
          severity: 'error',
        },
      ]);
      showToast(`Configuration import failed: ${(error as Error).message}`, 'error');
      return false;
    } finally {
      setImporting(false);
    }
  }, [applyAndSaveCurrentProject, setActiveTab, showToast]);

  const openConfigPicker = useCallback(async () => {
    try {
      const result = await window.electronAPI.files.openConfig();
      if (!result.canceled && result.content) {
        await importFromContent(result.content);
      }
    } catch (error) {
      setImportErrors([
        {
          message: `Failed to open configuration file: ${(error as Error).message}`,
          severity: 'error',
        },
      ]);
      showToast(`Failed to open configuration file: ${(error as Error).message}`, 'error');
    }
  }, [importFromContent, showToast]);

  const exportConfig = useCallback(async () => {
    setExporting(true);

    try {
      const snapshot = createConfigSnapshot();
      const file = createProjectConfigFile(snapshot);
      const result = await window.electronAPI.files.saveConfig({
        content: JSON.stringify(file, null, 2),
      });

      if (!result.canceled) {
        showToast('Project configuration exported', 'success');
      }
    } catch (error) {
      showToast(`Failed to export configuration: ${(error as Error).message}`, 'error');
    } finally {
      setExporting(false);
    }
  }, [showToast]);

  return {
    exportConfig,
    exporting,
    importErrors,
    importing,
    importFromContent,
    openConfigPicker,
    clearImportErrors: () => setImportErrors([]),
  };
}
