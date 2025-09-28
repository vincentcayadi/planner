// src/components/Dialogs/EditTaskDialog.tsx
'use client';

import React, { useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime, to12h, snapToAnchor } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { ColorName, Task } from '@/lib/types';

export function EditTaskDialog() {
  const { editDialog, plannerConfig, closeEditDialog, saveEditedTask, getCurrentSchedule } =
    usePlannerStore();

  const durationOptions = useMemo(() => {
    const safeInterval = Math.max(5, plannerConfig.interval || 30);
    return Array.from({ length: 12 }, (_, i) => (i + 1) * safeInterval);
  }, [plannerConfig.interval]);

  const handleSave = async () => {
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
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const clampedEnd = Math.min(endMinutes, endLimit);

    updateEditItem({
      startTime: newStartTime,
      endTime: minutesToTime(clampedEnd),
      duration: clampedEnd - startMinutes,
    });
  };

  const handleStartTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const anchor = timeToMinutes(plannerConfig.startTime);
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const raw = timeToMinutes(e.target.value);

    if (raw < anchor) {
      toast.error('Invalid start time', {
        description: `Start time cannot be before day start (${to12h(plannerConfig.startTime)})`,
      });

      const correctedStart = minutesToTime(anchor);
      handleStartTimeChange(correctedStart);
      return;
    }

    const snapped = Math.max(
      anchor,
      Math.min(snapToAnchor(raw, plannerConfig.interval, anchor, 'nearest'), endLimit)
    );

    if (snapped !== raw) {
      toast.info('Time adjusted to grid', {
        description: `${to12h(minutesToTime(raw))} → ${to12h(minutesToTime(snapped))}`,
      });
      handleStartTimeChange(minutesToTime(snapped));
    }
  };

  const handleDurationChange = (newDuration: string) => {
    if (!editDialog.editItem) return;

    const duration = Number(newDuration);
    const startMinutes = timeToMinutes(editDialog.editItem.startTime);
    const endMinutes = startMinutes + duration;
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const clampedEnd = Math.min(endMinutes, endLimit);

    updateEditItem({
      duration: clampedEnd - startMinutes,
      endTime: minutesToTime(clampedEnd),
    });
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
              <label className="mb-1 block text-sm font-medium">Task Name</label>
              <Input
                value={editDialog.editItem.name}
                onChange={(e) => updateEditItem({ name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={editDialog.editItem.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  onBlur={handleStartTimeBlur}
                  className="[appearance:textfield] pr-3 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Duration</label>
                <Select
                  value={String(editDialog.editItem.duration)}
                  onValueChange={handleDurationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d >= 60 ? `${d / 60}h` : `${d}min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea
                value={editDialog.editItem.description || ''}
                onChange={(e) => updateEditItem({ description: e.target.value })}
                placeholder="Optional task description"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Color</label>
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

            {editDialog.editItem.startTime && editDialog.editItem.endTime && (
              <div className="rounded bg-neutral-50 p-2 text-sm text-neutral-600">
                <strong>Preview:</strong> {to12h(editDialog.editItem.startTime)} –{' '}
                {to12h(editDialog.editItem.endTime)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
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
