// src/components/TaskForm/TaskForm.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ColorName } from '@/lib/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus } from 'lucide-react';

export function TaskForm() {
  const { taskForm, plannerConfig, updateTaskForm, addTask, resetTaskForm } = usePlannerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate duration options based on interval
  const durationOptions = useMemo(() => {
    const safeInterval = Math.max(5, plannerConfig.interval || 30);
    return Array.from({ length: 12 }, (_, i) => (i + 1) * safeInterval);
  }, [plannerConfig.interval]);

  const handleAddTask = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await addTask();

      if (result.success) {
        toast.success('Task added successfully');
      } else {
        toast.error('Failed to add task', {
          description: result.error,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const anchor = timeToMinutes(plannerConfig.startTime);
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const raw = timeToMinutes(e.target.value);

    // Validate against day start
    if (raw < anchor) {
      const snapped = Math.max(
        anchor,
        Math.min(snapToAnchor(raw, plannerConfig.interval, anchor, 'nearest'), endLimit)
      );

      toast.error('Invalid start time', {
        description: `Start time adjusted to ${to12h(minutesToTime(snapped))}`,
      });

      updateTaskForm({ taskStartTime: minutesToTime(snapped) });
      return;
    }

    // Snap to grid
    const snapped = Math.max(
      anchor,
      Math.min(snapToAnchor(raw, plannerConfig.interval, anchor, 'nearest'), endLimit)
    );

    if (snapped !== raw) {
      toast.info('Time adjusted', {
        description: `${to12h(minutesToTime(raw))} → ${to12h(minutesToTime(snapped))}`,
      });
      updateTaskForm({ taskStartTime: minutesToTime(snapped) });
    }
  };

  return (
    <Card className="gap-0" data-task-form>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Task</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div>
          <Input
            placeholder="Subject / Paper / Task"
            value={taskForm.taskName}
            onChange={(e) => updateTaskForm({ taskName: e.target.value })}
            aria-invalid={taskForm.nameError}
            className={`${
              taskForm.nameError ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
          />
          {taskForm.nameError && (
            <p className="text-destructive mt-1 text-xs">This field is required.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-neutral-500">Start</label>
            <Input
              type="time"
              value={taskForm.taskStartTime}
              onChange={(e) => updateTaskForm({ taskStartTime: e.target.value })}
              onBlur={handleStartTimeBlur}
              className="[appearance:textfield] pr-3 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Duration</label>
            <Select
              value={taskForm.taskDuration}
              onValueChange={(v) => updateTaskForm({ taskDuration: v })}
            >
              <SelectTrigger className="w-full">
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
          <label className="text-xs text-neutral-500">Description</label>
          <Textarea
            value={taskForm.taskDesc}
            onChange={(e) => updateTaskForm({ taskDesc: e.target.value })}
            placeholder="Optional notes for this item"
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-neutral-500">Color</label>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => updateTaskForm({ selectedColor: c.name as ColorName })}
                className={`h-8 rounded-lg ${c.bg} ${
                  taskForm.selectedColor === c.name ? 'ring-2 ring-neutral-400 ring-offset-2' : ''
                } cursor-pointer transition-all duration-200 hover:scale-105`}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              onClick={handleAddTask}
              disabled={isSubmitting || !taskForm.taskName.trim()}
              className="w-full transition-all duration-200 hover:shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Adding...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </div>
              )}
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
