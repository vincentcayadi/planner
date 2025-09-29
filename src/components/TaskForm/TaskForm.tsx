// src/components/TaskForm/TaskForm.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { TimeSelectionInput } from '@/components/TimeSelection/TimeSelectionInput';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { ColorName } from '@/lib/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus } from 'lucide-react';

export function TaskForm() {
  const { taskForm, plannerConfig, updateTaskForm, addTask, resetTaskForm } = usePlannerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate derived values
  const startMinutes = timeToMinutes(taskForm.taskStartTime);
  const durationMinutes = parseInt(taskForm.taskDuration, 10) || 0;
  const endMinutes = startMinutes + durationMinutes;
  const calculatedEndTime = minutesToTime(endMinutes);

  // Use calculated end time if taskEndTime is not set
  const displayEndTime = taskForm.taskEndTime || calculatedEndTime;

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

  const handleStartTimeChange = (newStart: string) => {
    const newStartMinutes = timeToMinutes(newStart);

    if (taskForm.useDurationMode) {
      // Keep duration, update end time
      const newEndMinutes = newStartMinutes + durationMinutes;
      updateTaskForm({
        taskStartTime: newStart,
        taskEndTime: minutesToTime(newEndMinutes),
      });
    } else {
      // Keep end time, update duration
      const endMinutes = timeToMinutes(taskForm.taskEndTime || displayEndTime);
      const newDuration = Math.max(plannerConfig.interval, endMinutes - newStartMinutes);
      updateTaskForm({
        taskStartTime: newStart,
        taskDuration: String(newDuration),
      });
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    const endMinutes = timeToMinutes(newEnd);
    const newDuration = Math.max(plannerConfig.interval, endMinutes - startMinutes);

    updateTaskForm({
      taskEndTime: newEnd,
      taskDuration: String(newDuration),
    });
  };

  const handleDurationChange = (duration: number) => {
    const newEndMinutes = startMinutes + duration;

    updateTaskForm({
      taskDuration: String(duration),
      taskEndTime: minutesToTime(newEndMinutes),
    });
  };

  const toggleDurationMode = () => {
    updateTaskForm({ useDurationMode: !taskForm.useDurationMode });
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

        <TimeSelectionInput
          startTime={taskForm.taskStartTime}
          duration={durationMinutes}
          endTime={displayEndTime}
          useDurationMode={taskForm.useDurationMode}
          selectedColor={taskForm.selectedColor}
          plannerConfig={plannerConfig}
          onStartTimeChange={handleStartTimeChange}
          onDurationChange={handleDurationChange}
          onEndTimeChange={handleEndTimeChange}
          onModeToggle={toggleDurationMode}
        />

        <div>
          <Label className="text-xs text-neutral-500">Description</Label>
          <Textarea
            value={taskForm.taskDesc}
            onChange={(e) => updateTaskForm({ taskDesc: e.target.value })}
            placeholder="Optional notes for this item"
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs text-neutral-500">Color</Label>
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
              className="w-full transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
