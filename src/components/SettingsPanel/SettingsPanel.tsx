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
import type { PlannerExport, DayConfig } from '@/lib/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Upload } from 'lucide-react';

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

  // Pending changes state for action buttons
  const [pendingChanges, setPendingChanges] = useState<Partial<DayConfig> | null>(null);
  const [tempConfig, setTempConfig] = useState<DayConfig | null>(null);

  const {
    currentDate,
    globalConfig,
    getDayConfig,
    updateGlobalConfig,
    updateDayConfig,
    exportData,
    importData
  } = usePlannerStore();

  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);
  const hasCustomDayConfig = JSON.stringify(dayConfig) !== JSON.stringify(globalConfig);

  // Use temp config if available, otherwise use actual day config
  const displayConfig = tempConfig || dayConfig;

  // Check for File System Access API support
  const w: FSWin | undefined = typeof window !== 'undefined' ? (window as FSWin) : undefined;
  const supportsFileSystemAPI = !!(w?.showSaveFilePicker && w?.showOpenFilePicker);

  /**
   * Handles input changes and shows action buttons for confirmation
   */
  const handleConfigChange = (config: Partial<DayConfig>) => {
    const newConfig = { ...displayConfig, ...config };
    setTempConfig(newConfig);
    setPendingChanges({ ...pendingChanges, ...config });
  };

  /**
   * Applies changes to current day only
   */
  const applyToCurrentDay = () => {
    if (pendingChanges) {
      updateDayConfig(dateKey, pendingChanges);
      toast.success('Settings applied to current day only');
      cancelChanges();
    }
  };

  /**
   * Applies changes globally to all days (warning action)
   */
  const applyToAllDays = () => {
    if (pendingChanges) {
      updateGlobalConfig(pendingChanges);
      toast.success('Settings applied to all days');
      cancelChanges();
    }
  };

  /**
   * Cancels pending changes and reverts to actual config
   */
  const cancelChanges = () => {
    setPendingChanges(null);
    setTempConfig(null);
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
                value={displayConfig.startTime}
                onChange={(e) => handleConfigChange({ startTime: e.target.value })}
                className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-500">End</Label>
              <Input
                type="time"
                value={displayConfig.endTime}
                onChange={(e) => handleConfigChange({ endTime: e.target.value })}
                className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-neutral-500">Interval (minutes)</Label>
            <Select
              value={String(displayConfig.interval)}
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

          {/* Action buttons when changes are pending */}
          {pendingChanges && (
            <div className="space-y-2 border-t pt-3 bg-neutral-50 rounded-md p-3">
              <div className="text-xs text-neutral-600 font-medium">Apply changes to:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={applyToCurrentDay}
                  size="sm"
                  className="text-xs"
                >
                  Current Day Only
                </Button>
                <Button
                  onClick={applyToAllDays}
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                >
                  All Days
                </Button>
              </div>
              <Button
                onClick={cancelChanges}
                variant="ghost"
                size="sm"
                className="w-full text-xs"
              >
                Cancel Changes
              </Button>
            </div>
          )}

          {/* Day status */}
          {!pendingChanges && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs text-neutral-400">
                {hasCustomDayConfig
                  ? `This day has custom times (${dayConfig.startTime} - ${dayConfig.endTime})`
                  : 'Using default times for this day'
                }
              </div>
            </div>
          )}

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
    </>
  );
}
