// src/components/Dialogs/EditTaskDialog.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { TimeSelectionInput } from '@/components/TimeSelection/TimeSelectionInput';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime, to12h, snapToAnchor, formatDateKey } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { ColorName, Task } from '@/lib/types';

export function EditTaskDialog() {
  const { editDialog, currentDate, getDayConfig, closeEditDialog, saveEditedTask, getCurrentSchedule } =
    usePlannerStore();
  const [useDurationMode, setUseDurationMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get day-specific config
  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await saveEditedTask();

      if (result.success) {
        toast.success('Task updated successfully');
      } else {
        if (result.error !== 'Time conflict detected') {
          toast.error('Failed to update task', {
            description: result.error,
          });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditItem = (updates: Partial<Task>) => {
    if (!editDialog.editItem) return;

    const { editDialog: currentEditDialog } = usePlannerStore.getState();
    const updatedItem = { ...currentEditDialog.editItem!, ...updates };

    usePlannerStore.setState((state) => ({
      editDialog: {
        ...state.editDialog,
        editItem: updatedItem,
      },
    }));
  };

  const handleStartTimeChange = (newStartTime: string) => {
    if (!editDialog.editItem) return;

    const startMinutes = timeToMinutes(newStartTime);
    const endMinutes = startMinutes + (editDialog.editItem.duration || 0);
    const endLimit = timeToMinutes(dayConfig.endTime);
    const clampedEnd = Math.min(endMinutes, endLimit);

    updateEditItem({
      startTime: newStartTime,
      endTime: minutesToTime(clampedEnd),
      duration: clampedEnd - startMinutes,
    });
  };

  const handleStartTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const anchor = timeToMinutes(dayConfig.startTime);
    const endLimit = timeToMinutes(dayConfig.endTime);
    const raw = timeToMinutes(e.target.value);

    if (raw < anchor) {
      toast.error('Invalid start time', {
        description: `Start time cannot be before day start (${to12h(dayConfig.startTime)})`,
      });

      const correctedStart = minutesToTime(anchor);
      handleStartTimeChange(correctedStart);
      return;
    }

    const snapped = Math.max(
      anchor,
      Math.min(snapToAnchor(raw, dayConfig.interval, anchor, 'nearest'), endLimit)
    );

    if (snapped !== raw) {
      toast.info('Time adjusted to grid', {
        description: `${to12h(minutesToTime(raw))} → ${to12h(minutesToTime(snapped))}`,
      });
      handleStartTimeChange(minutesToTime(snapped));
    }
  };

  const handleDurationChange = (duration: number) => {
    if (!editDialog.editItem) return;

    const startMinutes = timeToMinutes(editDialog.editItem.startTime);
    const endMinutes = startMinutes + duration;
    const endLimit = timeToMinutes(dayConfig.endTime);
    const clampedEnd = Math.min(endMinutes, endLimit);

    updateEditItem({
      duration: clampedEnd - startMinutes,
      endTime: minutesToTime(clampedEnd),
    });
  };

  const handleEndTimeChange = (newEnd: string) => {
    if (!editDialog.editItem) return;

    const endMinutes = timeToMinutes(newEnd);
    const startMinutes = timeToMinutes(editDialog.editItem.startTime);
    const newDuration = Math.max(dayConfig.interval, endMinutes - startMinutes);
    const endLimit = timeToMinutes(dayConfig.endTime);
    const clampedEnd = Math.min(endMinutes, endLimit);

    updateEditItem({
      duration: clampedEnd - startMinutes,
      endTime: minutesToTime(clampedEnd),
    });
  };

  const toggleDurationMode = () => {
    setUseDurationMode(!useDurationMode);
  };

  const handleEditConflictOverride = () => {
    const { editDialog: currentEditDialog, getCurrentSchedule } = usePlannerStore.getState();

    if (!currentEditDialog.pendingTask) return;

    const currentSchedule = getCurrentSchedule();
    const conflictIds = new Set(currentEditDialog.conflicts.map((c) => c.id));

    // Remove conflicts and update the task
    const updatedSchedule = currentSchedule
      .filter((task) => !conflictIds.has(task.id) && task.id !== currentEditDialog.pendingTask!.id)
      .concat(currentEditDialog.pendingTask);

    usePlannerStore.setState((state) => {
      const dateKey = state.currentDate.toISOString().split('T')[0];
      state.schedules[dateKey] = updatedSchedule.sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

      // Close all edit dialogs
      state.editDialog = {
        isOpen: false,
        editItem: null,
        conflicts: [],
        pendingTask: null,
        conflictDialogOpen: false,
      };
    });

    // Save to storage
    usePlannerStore.getState().saveToStorage();

    toast.success('Task updated', {
      description: 'Conflicting tasks have been replaced',
    });
  };

  if (!editDialog.editItem) return null;

  return (
    <>
      <Dialog open={editDialog.isOpen} onOpenChange={closeEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details. Changes will be validated for conflicts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-sm font-medium">Task Name</Label>
              <Input
                value={editDialog.editItem.name}
                onChange={(e) => updateEditItem({ name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>

            <TimeSelectionInput
              startTime={editDialog.editItem.startTime}
              duration={editDialog.editItem.duration}
              endTime={editDialog.editItem.endTime}
              useDurationMode={useDurationMode}
              selectedColor={editDialog.editItem.color}
              plannerConfig={dayConfig}
              onStartTimeChange={handleStartTimeChange}
              onDurationChange={handleDurationChange}
              onEndTimeChange={handleEndTimeChange}
              onModeToggle={toggleDurationMode}
            />

            <div>
              <Label className="mb-1 block text-sm font-medium">Description</Label>
              <Textarea
                value={editDialog.editItem.description || ''}
                onChange={(e) => updateEditItem({ description: e.target.value })}
                placeholder="Optional task description"
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => updateEditItem({ color: color.name as ColorName })}
                    className={`h-8 rounded-lg ${color.bg} ${
                      editDialog.editItem.color === color.name
                        ? 'ring-2 ring-neutral-400 ring-offset-2'
                        : ''
                    } cursor-pointer transition-all duration-200 hover:scale-105`}
                    aria-label={`Select ${color.name} color`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editDialog.editItem?.name?.trim()}
              className="transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Conflict Dialog */}
      <AlertDialog
        open={editDialog.conflictDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            usePlannerStore.setState((state) => ({
              editDialog: {
                ...state.editDialog,
                conflictDialogOpen: false,
                conflicts: [],
                pendingTask: null,
              },
            }));
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Conflict Detected</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Your changes conflict with {editDialog.conflicts.length} existing task
                {editDialog.conflicts.length > 1 ? 's' : ''}:
                <ul className="mt-3 space-y-2">
                  {editDialog.conflicts.map((conflict) => (
                    <li
                      key={conflict.id}
                      className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{conflict.name}</div>
                        <div className="text-xs text-neutral-600">
                          {to12h(conflict.startTime)} – {to12h(conflict.endTime)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <span className="text-sm text-amber-800">
                    <strong>Warning:</strong> Saving will permanently remove the conflicting tasks.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Original</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEditConflictOverride}
            >
              Save & Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
