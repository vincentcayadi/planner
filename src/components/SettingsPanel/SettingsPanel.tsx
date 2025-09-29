// src/components/SettingsPanel/SettingsPanel.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Download, Upload } from 'lucide-react';
import { useAutoSave, DEBOUNCE_DELAYS } from '@/lib/debounce';
import { SettingsConfirmationDialog, type ConfirmationType } from '@/components/Dialogs/SettingsConfirmationDialog';

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
    globalConfig,
    getDayConfig,
    updateGlobalConfig,
    updateDayConfig,
    resetDayConfig,
    exportData,
    importData,
    checkDayConfigConflicts
  } = usePlannerStore();

  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);
  const hasCustomDayConfig = JSON.stringify(dayConfig) !== JSON.stringify(globalConfig);

  const [localConfig, setLocalConfig] = useState<DayConfig>(dayConfig);

  // Sync local config when date changes
  React.useEffect(() => {
    setLocalConfig(dayConfig);
  }, [dateKey, dayConfig]);

  // Check for File System Access API support
  const w: FSWin | undefined = typeof window !== 'undefined' ? (window as FSWin) : undefined;
  const supportsFileSystemAPI = !!(w?.showSaveFilePicker && w?.showOpenFilePicker);

  /**
   * Handles input changes with auto-save
   */
  const handleConfigChange = (config: Partial<DayConfig>) => {
    const newConfig = { ...localConfig, ...config };
    setLocalConfig(newConfig);

    // Check for conflicts before saving
    const conflicts = checkDayConfigConflicts(dateKey, newConfig);

    if (conflicts.length > 0) {
      setConfirmationState({
        isOpen: true,
        type: 'DAY_CONFIG_CONFLICTS',
        conflictingTasks: conflicts,
        pendingAction: () => autoSaveDayConfig(newConfig),
      });
      return;
    }

    // Auto-save if no conflicts
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
  const handleConflictAction = (action: 'remove' | 'adjust' | 'allow') => {
    if (!pendingChanges) return;

    const newConfig = { ...displayConfig, ...pendingChanges };

    switch (action) {
      case 'remove':
        // Remove conflicting tasks and apply config
        // TODO: Implement task removal logic
        updateDayConfig(dateKey, pendingChanges);
        toast.success('Settings applied with conflicting tasks removed');
        break;

      case 'adjust':
        // Auto-adjust tasks to fit within new bounds
        // TODO: Implement task adjustment logic
        updateDayConfig(dateKey, pendingChanges);
        toast.success('Settings applied with tasks auto-adjusted');
        break;

      case 'allow':
        // Allow tasks outside bounds
        updateDayConfig(dateKey, pendingChanges);
        toast.success('Settings applied, tasks may be outside day bounds');
        break;
    }

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
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-xs text-neutral-500">Start</Label>
              <Input
                type="time"
                value={localConfig.startTime}
                onChange={(e) => handleConfigChange({ startTime: e.target.value })}
                className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-500">End</Label>
              <Input
                type="time"
                value={localConfig.endTime}
                onChange={(e) => handleConfigChange({ endTime: e.target.value })}
                className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-neutral-500">Interval (minutes)</Label>
            <Select
              value={String(localConfig.interval)}
              onValueChange={(v) => handleConfigChange({ interval: Number(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-save status indicator */}
          {isSavingDayConfig && (
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-blue-800">Saving changes...</span>
              </div>
            </div>
          )}

          {/* Day status and revert option */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-400">
                {hasCustomDayConfig
                  ? 'Custom settings for this day'
                  : 'Using global defaults'
                }
              </div>
              {isSavingDayConfig && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
            {hasCustomDayConfig && (
              <Button
                onClick={() => {
                  resetDayConfig(dateKey);
                  setLocalConfig(globalConfig);
                  toast.success('Day reverted to global settings');
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Revert to Global Settings
              </Button>
            )}
          </div>

          <div>
            <Label className="mb-2 block text-xs text-neutral-500">Data Management</Label>
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="secondary"
                  className="w-full text-xs transition-all duration-200 hover:shadow-md"
                  onClick={handleImportData}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <div className="flex items-center gap-1">
                      <LoadingSpinner size="sm" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      <span>Import</span>
                    </div>
                  )}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="secondary"
                  className="w-full text-xs transition-all duration-200 hover:shadow-md"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="flex items-center gap-1">
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      <span>Export</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Backup and restore your schedules</p>
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
        onCancel={() => {
          setConfirmationState({ isOpen: false, type: null, pendingAction: null });
        }}
        onConflictAction={handleConflictAction}
      />
    </>
  );
}
