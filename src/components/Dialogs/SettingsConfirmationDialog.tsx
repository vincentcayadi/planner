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
import { Button } from '@/components/ui/button';
import { to12h } from '@/lib/utils/time';
import type { Task } from '@/lib/types';

export type ConfirmationType = 'APPLY_TO_CURRENT_DAY' | 'APPLY_TO_ALL_DAYS' | 'REVERT_TO_GLOBAL' | 'DAY_CONFIG_CONFLICTS';

interface ConfirmationState {
  isOpen: boolean;
  type: ConfirmationType | null;
  pendingAction: (() => void) | null;
  conflictingTasks?: Task[];
}

interface SettingsConfirmationDialogProps {
  confirmationState: ConfirmationState;
  onConfirm: () => void;
  onCancel: () => void;
  onConflictAction?: (action: 'remove') => void;
}

const getDialogContent = (type: ConfirmationType | null) => {
  switch (type) {
    case 'APPLY_TO_CURRENT_DAY':
      return {
        title: 'Apply to Current Day',
        description: 'These settings will only apply to the current day, leaving other days unchanged.',
        confirmText: 'Apply to Current Day',
        confirmVariant: 'default' as const,
      };

    case 'APPLY_TO_ALL_DAYS':
      return {
        title: 'Apply to All Days',
        description: 'These settings will become the new defaults and override any existing per-day customizations. This action cannot be undone.',
        confirmText: 'Apply to All Days',
        confirmVariant: 'destructive' as const,
      };

    case 'REVERT_TO_GLOBAL':
      return {
        title: 'Revert to Global Settings',
        description: 'This will remove the custom settings for this day and use the global defaults. Your custom times will be lost.',
        confirmText: 'Revert to Global',
        confirmVariant: 'destructive' as const,
      };

    case 'DAY_CONFIG_CONFLICTS':
      return {
        title: 'Time Conflicts Detected',
        description: 'The new day settings will affect existing tasks. Choose how to handle conflicts:',
        confirmText: 'Continue',
        confirmVariant: 'default' as const,
      };

    default:
      return {
        title: '',
        description: '',
        confirmText: 'Confirm',
        confirmVariant: 'default' as const,
      };
  }
};

/**
 * Unified confirmation dialog for all settings-related actions
 * Handles apply to current day, apply to all days, and revert operations
 */
export function SettingsConfirmationDialog({
  confirmationState,
  onConfirm,
  onCancel,
  onConflictAction,
}: SettingsConfirmationDialogProps) {
  const { title, description, confirmText, confirmVariant } = getDialogContent(confirmationState.type);

  // Special handling for conflict dialog
  if (confirmationState.type === 'DAY_CONFIG_CONFLICTS' && confirmationState.conflictingTasks) {
    return (
      <AlertDialog open={confirmationState.isOpen} onOpenChange={(open) => !open && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">{description}</p>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">
                    Affected tasks ({confirmationState.conflictingTasks.length}):
                  </p>
                  <ul className="space-y-2">
                    {confirmationState.conflictingTasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium">{task.name}</div>
                          <div className="text-xs text-neutral-600">
                            {to12h(task.startTime)} – {to12h(task.endTime)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!flex !flex-col !gap-3 !items-stretch">
            <Button
              onClick={() => onConflictAction?.('remove')}
              variant="destructive"
              className="w-full text-white"
            >
              Remove Conflicting Tasks
            </Button>
            <AlertDialogCancel onClick={onCancel} className="w-full">
              Cancel Changes
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Standard confirmation dialog
  return (
    <AlertDialog open={confirmationState.isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={confirmVariant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}