// src/components/Dialogs/ClearAllDialog.tsx
'use client';

import React from 'react';
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
import { usePlannerStore } from '@/stores/plannerStore';
import { toast } from 'sonner';

export function ClearAllDialog() {
  const { clearAllDialog, closeClearAllDialog, clearAllTasks, currentDate, getCurrentSchedule } =
    usePlannerStore();

  const currentSchedule = getCurrentSchedule();
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleClearAll = () => {
    clearAllTasks();
    toast.success('Day cleared', {
      description: `All tasks for ${dateString} have been removed`,
    });
  };

  return (
    <AlertDialog open={clearAllDialog.isOpen} onOpenChange={closeClearAllDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Tasks?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              This will permanently remove all {currentSchedule.length} task
              {currentSchedule.length > 1 ? 's' : ''} for <strong>{dateString}</strong>.
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                <span className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Consider exporting your
                  data first.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Tasks</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleClearAll}
          >
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
