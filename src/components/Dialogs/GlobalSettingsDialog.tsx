'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlannerStore } from '@/stores/plannerStore';
import { useAutoSave, DEBOUNCE_DELAYS } from '@/lib/debounce';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { PlannerConfig } from '@/lib/types';

interface GlobalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSettingsDialog({ open, onOpenChange }: GlobalSettingsDialogProps) {
  const { globalConfig, updateGlobalConfig, dayConfigs } = usePlannerStore();
  const [localConfig, setLocalConfig] = useState<PlannerConfig>(globalConfig);

  // Auto-save functionality with debouncing
  const { save: autoSave, isSaving } = useAutoSave((config: PlannerConfig) => {
    updateGlobalConfig(config);
    toast.success('Global settings saved', {
      description: 'Changes will apply to new days and days without custom settings',
    });
  }, DEBOUNCE_DELAYS.STANDARD);

  // Sync local config with global config when dialog opens
  useEffect(() => {
    if (open) {
      setLocalConfig(globalConfig);
    }
  }, [open, globalConfig]);

  // Handle config changes with auto-save
  const handleConfigChange = (updates: Partial<PlannerConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    autoSave(newConfig);
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultConfig: PlannerConfig = {
      startTime: '08:00',
      endTime: '23:30',
      interval: 30,
    };
    setLocalConfig(defaultConfig);
    autoSave(defaultConfig);
    toast.success('Settings reset to defaults');
  };

  // Count days with custom settings
  const customDaysCount = Object.keys(dayConfigs).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            Configure default settings for all days. Days with custom settings will remain
            unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="rounded-lg bg-neutral-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">Status</span>
              {isSaving && (
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
            <div className="text-xs text-neutral-600">
              {customDaysCount > 0 ? (
                <>
                  {customDaysCount} day{customDaysCount !== 1 ? 's' : ''} have custom settings that
                  won&apos;t be affected
                </>
              ) : (
                'These settings will apply to all days'
              )}
            </div>
          </div>

          {/* Time Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block text-sm font-medium">Default Start Time</Label>
              <Input
                type="time"
                value={localConfig.startTime}
                onChange={(e) => handleConfigChange({ startTime: e.target.value })}
                className="text-sm [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Default End Time</Label>
              <Input
                type="time"
                value={localConfig.endTime}
                onChange={(e) => handleConfigChange({ endTime: e.target.value })}
                className="text-sm [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>

          {/* Interval Setting */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Default Interval</Label>
            <Select
              value={String(localConfig.interval)}
              onValueChange={(value) => handleConfigChange({ interval: Number(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-neutral-500">
              Controls the time grid granularity for new schedules
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
