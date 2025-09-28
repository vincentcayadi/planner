// src/components/Dialogs/ConflictDialog.tsx
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
import { to12h } from '@/lib/utils/time';
import { toast } from 'sonner';

export function ConflictDialog() {
  const { conflictDialog, closeConflictDialog, overrideConflicts } = usePlannerStore();

  const handleOverride = () => {
    overrideConflicts();
    toast.success('Task added', {
      description: 'Conflicting tasks have been replaced',
    });
  };

  return (
    <AlertDialog open={conflictDialog.isOpen} onOpenChange={closeConflictDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Time Conflict Detected</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              The new task overlaps with the following {conflictDialog.conflicts.length} task
              {conflictDialog.conflicts.length > 1 ? 's' : ''}:
              <ul className="mt-3 space-y-2">
                {conflictDialog.conflicts.map((conflict) => (
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
                  <strong>Warning:</strong> Proceeding will permanently remove the conflicting
                  tasks.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Existing</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleOverride}
          >
            Replace Tasks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
