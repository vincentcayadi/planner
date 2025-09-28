// src/components/Dialogs/ClearAllDialog.tsx
'use client';

import React, { useState } from 'react';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function ClearAllDialog() {
  const { clearAllDialog, closeClearAllDialog, clearAllTasks, currentDate, getCurrentSchedule } =
    usePlannerStore();
  const [isClearing, setIsClearing] = useState(false);

  const currentSchedule = getCurrentSchedule();
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleClearAll = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      // Brief delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));
      clearAllTasks();
      toast.success('Day cleared', {
        description: `All tasks for ${dateString} have been removed`,
      });
    } finally {
      setIsClearing(false);
    }
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
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isClearing}
          >
            {isClearing ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Clearing...</span>
              </div>
            ) : (
              'Clear All'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
