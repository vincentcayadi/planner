// src/components/SettingsPanel/SettingsPanel.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Calendar16 from '@/components/calendar-16';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlannerStore } from '@/stores/plannerStore';
import { formatDateKey } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { PlannerExport, DayConfig, Task } from '@/lib/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Upload, Settings } from 'lucide-react';
import { useAutoSave, DEBOUNCE_DELAYS } from '@/lib/debounce';
import { INTERVAL_OPTIONS } from '@/lib/constants/intervals';
import {
  SettingsConfirmationDialog,
  type ConfirmationType,
} from '@/components/Dialogs/SettingsConfirmationDialog';
import { GlobalSettingsDialog } from '@/components/Dialogs/GlobalSettingsDialog';

// File System Access API types
interface FilePickerOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  multiple?: boolean;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
}

interface FileSystemWritableFileStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

type FSWin = Window &
  typeof globalThis & {
    showSaveFilePicker?: (opts?: FilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (opts?: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
  };

/**
 * Settings panel component for managing planner configuration.
 * Supports both global settings and per-day customizations.
 */
export function SettingsPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  // Auto-save functionality
  const { save: autoSaveDayConfig, isSaving: isSavingDayConfig } = useAutoSave(
    (config: DayConfig) => {
      updateDayConfig(dateKey, config);
      toast.success('Day settings updated', {
        description: 'Custom settings applied to this day only',
      });
    },
    DEBOUNCE_DELAYS.STANDARD
  );

  // Confirmation dialog state
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    type: ConfirmationType | null;
    pendingAction: (() => void) | null;
    conflictingTasks?: Task[];
  }>({
    isOpen: false,
    type: null,
    pendingAction: null,
  });

  const {
    currentDate,
    setCurrentDate,
    globalConfig,
    getDayConfig,
    updateGlobalConfig,
    updateDayConfig,
    resetDayConfig,
    exportData,
    importData,
    checkDayConfigConflicts,
    removeTask,
  } = usePlannerStore();

  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);
  const hasCustomDayConfig = JSON.stringify(dayConfig) !== JSON.stringify(globalConfig);

  const [localConfig, setLocalConfig] = useState<DayConfig>(dayConfig);
  const [oldConfigBeforeConflict, setOldConfigBeforeConflict] = useState<DayConfig>(dayConfig);

  // Sync local config when date changes
  React.useEffect(() => {
    setLocalConfig(dayConfig);
    setOldConfigBeforeConflict(dayConfig);
  }, [dateKey, dayConfig]);

  // Check for File System Access API support
  const w: FSWin | undefined = typeof window !== 'undefined' ? (window as FSWin) : undefined;
  const supportsFileSystemAPI = !!(w?.showSaveFilePicker && w?.showOpenFilePicker);

  /**
   * Handles input changes with auto-save
   */
  const handleConfigChange = (config: Partial<DayConfig>) => {
    const newConfig = { ...localConfig, ...config };

    // Check for conflicts before saving
    const conflicts = checkDayConfigConflicts(dateKey, newConfig);

    if (conflicts.length > 0) {
      // Save the old config for potential revert
      setOldConfigBeforeConflict(localConfig);
      // Update local config to show the new value in UI
      setLocalConfig(newConfig);

      setConfirmationState({
        isOpen: true,
        type: 'DAY_CONFIG_CONFLICTS',
        conflictingTasks: conflicts,
        pendingAction: () => autoSaveDayConfig(newConfig),
      });
      return;
    }

    // Auto-save if no conflicts
    setLocalConfig(newConfig);
    autoSaveDayConfig(newConfig);
  };

  /**
   * Handle revert to global settings
   */
  const handleRevertToGlobal = () => {
    resetDayConfig(dateKey);
    setLocalConfig(globalConfig);
    toast.success('Day reverted to global settings');
  };

  /**
   * Handles conflict resolution actions
   */
  const handleConflictAction = (action: 'remove') => {
    const pendingAction = confirmationState.pendingAction;
    const conflictingTasks = confirmationState.conflictingTasks;
    if (!pendingAction || !conflictingTasks) return;

    // Remove conflicting tasks and apply config
    conflictingTasks.forEach(task => {
      removeTask(task.id);
    });
    pendingAction();
    toast.success(`Settings applied. Removed ${conflictingTasks.length} conflicting task${conflictingTasks.length > 1 ? 's' : ''}`);

    setConfirmationState({ isOpen: false, type: null, pendingAction: null });
  };

  /**
   * Handle cancel - revert to old config values
   */
  const handleCancel = () => {
    // Revert local config to the old value before conflict
    setLocalConfig(oldConfigBeforeConflict);
    setConfirmationState({ isOpen: false, type: null, pendingAction: null });
  };

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const exportPayload = exportData();
      const json = JSON.stringify(exportPayload, null, 2);
      const filename = `planner-export-${formatDateKey(new Date())}.json`;

      try {
        if (supportsFileSystemAPI && w?.showSaveFilePicker) {
          const handle = await w.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(new Blob([json], { type: 'application/json' }));
          await writable.close();

          toast.success('Export successful', {
            description: 'Data has been saved to your device',
          });
          return;
        }
      } catch (error) {
        // Fall back to download if File System API fails
        console.warn('File System API failed, falling back to download:', error);
      }

      // Fallback: traditional download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export downloaded', {
        description: 'Check your downloads folder',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    if (isImporting) return;
    setIsImporting(true);

    try {
      if (supportsFileSystemAPI && w?.showOpenFilePicker) {
        try {
          const [handle] = await w.showOpenFilePicker({
            multiple: false,
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });

          const file = await handle.getFile();
          const text = await file.text();
          const data = JSON.parse(text) as PlannerExport;

          const result = await importData(data);

          if (result.success) {
            toast.success('Import successful', {
              description: 'Your data has been loaded',
            });
          } else {
            toast.error('Import failed', {
              description: result.error,
            });
          }
          return;
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.warn('File System API failed, falling back to file input:', error);
          } else {
            // User cancelled, don't show error
            return;
          }
        }
      }

      // Fallback: traditional file input
      fileInputRef.current?.click();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed', {
        description: 'Please try again',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as PlannerExport;

      const result = await importData(data);

      if (result.success) {
        toast.success('Import successful', {
          description: 'Your data has been loaded',
        });
      } else {
        toast.error('Import failed', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Invalid file', {
        description: 'Could not parse JSON file',
      });
    } finally {
      // Clear the input so the same file can be selected again
      event.target.value = '';
    }
  };

  return (
    <>
      <Card className="gap-0">
        <CardContent className="space-y-3 pt-0">
          <div className="flex justify-center">
            <Calendar16
              selectedDate={currentDate}
              onDateSelect={setCurrentDate}
              startTime={localConfig.startTime}
              onStartTimeChange={(time) => handleConfigChange({ startTime: time })}
              endTime={localConfig.endTime}
              onEndTimeChange={(time) => handleConfigChange({ endTime: time })}
              className="w-full border-none shadow-none"
            />
          </div>

          <div>
            <Label className="label-text-block">Interval (minutes)</Label>
            <Select
              value={String(localConfig.interval)}
              onValueChange={(v) => handleConfigChange({ interval: Number(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-3">
            <Label className="label-text-block">Data Management</Label>
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="secondary"
                  className="action-button"
                  onClick={handleImportData}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <div className="loading-indicator-sm">
                      <LoadingSpinner size="sm" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="loading-indicator-sm">
                      <Upload className="h-3 w-3" />
                      <span>Import</span>
                    </div>
                  )}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="secondary"
                  className="action-button"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="loading-indicator-sm">
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="loading-indicator-sm">
                      <Download className="h-3 w-3" />
                      <span>Export</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </div>
            <p className="status-text mt-1">Backup and restore your schedules</p>
          </div>

          <Separator />

          {/* Global Actions */}
          <div className="space-y-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setIsGlobalSettingsOpen(true)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </motion.div>
            {hasCustomDayConfig && (
              <Button
                onClick={handleRevertToGlobal}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Revert to Global Settings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input for fallback import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileInputChange}
        aria-hidden="true"
      />

      {/* Confirmation dialog */}
      <SettingsConfirmationDialog
        confirmationState={confirmationState}
        onConfirm={() => {
          confirmationState.pendingAction?.();
          setConfirmationState({ isOpen: false, type: null, pendingAction: null });
        }}
        onCancel={handleCancel}
        onConflictAction={handleConflictAction}
      />

      {/* Global Settings Dialog */}
      <GlobalSettingsDialog
        open={isGlobalSettingsOpen}
        onOpenChange={setIsGlobalSettingsOpen}
      />
    </>
  );
}
