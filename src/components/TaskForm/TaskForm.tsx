// src/components/TaskForm/TaskForm.tsx
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime, formatDateKey } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { ColorName } from '@/lib/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus } from 'lucide-react';

/**
 * Form component for creating new tasks with time selection and validation
 */
export function TaskForm() {
  const {
    taskForm,
    currentDate,
    setCurrentDate,
    getDayConfig,
    updateTaskForm,
    addTask,
    resetTaskForm,
  } = usePlannerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);
  const startMinutes = timeToMinutes(taskForm.taskStartTime);
  const durationMinutes = parseInt(taskForm.taskDuration, 10) || 0;
  const endMinutes = startMinutes + durationMinutes;
  const calculatedEndTime = minutesToTime(endMinutes);
  const displayEndTime = taskForm.taskEndTime || calculatedEndTime;

  // Generate interval-based duration options
  const generateDurationOptions = useMemo(() => {
    const options = [];

    if (dayConfig.interval === 15) {
      // 15min interval: show 15, 30, 45, 60, 75, 90, 105, 120, etc.
      for (let multiplier = 1; multiplier <= 16; multiplier++) {
        const duration = 15 * multiplier;
        if (duration <= 240) options.push(duration);
      }
    } else if (dayConfig.interval === 30) {
      // 30min interval: show 30, 60, 90, 120, 150, 180, 210, 240
      for (let multiplier = 1; multiplier <= 8; multiplier++) {
        const duration = 30 * multiplier;
        if (duration <= 240) options.push(duration);
      }
    } else if (dayConfig.interval === 60) {
      // 60min interval: show 1h, 2h, 3h, 4h (by the hour)
      for (let hours = 1; hours <= 4; hours++) {
        options.push(hours * 60);
      }
    }

    return options.map((duration) => ({
      value: String(duration),
      label:
        duration >= 60
          ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
          : `${duration} min`,
    }));
  }, [dayConfig.interval]);

  /**
   * Handles task submission with loading state management
   */
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
      const newEndMinutes = newStartMinutes + durationMinutes;
      updateTaskForm({
        taskStartTime: newStart,
        taskEndTime: minutesToTime(newEndMinutes),
      });
    } else {
      const endMinutes = timeToMinutes(taskForm.taskEndTime || displayEndTime);
      const newDuration = Math.max(dayConfig.interval, endMinutes - newStartMinutes);
      updateTaskForm({
        taskStartTime: newStart,
        taskDuration: String(newDuration),
      });
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    const endMinutes = timeToMinutes(newEnd);
    const newDuration = Math.max(dayConfig.interval, endMinutes - startMinutes);

    updateTaskForm({
      taskEndTime: newEnd,
      taskDuration: String(newDuration),
    });
  };

  const handleDurationChange = useCallback((duration: number) => {
    const newEndMinutes = startMinutes + duration;

    updateTaskForm({
      taskDuration: String(duration),
      taskEndTime: minutesToTime(newEndMinutes),
    });
  }, [startMinutes, updateTaskForm]);

  const toggleDurationMode = () => {
    updateTaskForm({ useDurationMode: !taskForm.useDurationMode });
  };

  // Auto-select first available duration if current one is invalid
  React.useEffect(() => {
    const currentDuration = parseInt(taskForm.taskDuration, 10);
    const validDurations = generateDurationOptions.map((opt) => parseInt(opt.value, 10));

    if (currentDuration > 0 && !validDurations.includes(currentDuration)) {
      const defaultDuration = validDurations[0];
      if (defaultDuration) {
        handleDurationChange(defaultDuration);
      }
    }
  }, [dayConfig.interval, generateDurationOptions, handleDurationChange, taskForm.taskDuration]);

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
            data-task-name-input
            className={`${
              taskForm.nameError ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
          />
          {taskForm.nameError && (
            <p className="text-destructive mt-1 text-xs">This field is required.</p>
          )}
        </div>

        {/* Task Time Selection - Stable Layout */}
        <div className="space-y-3">
          {/* Duration Mode Toggle - Fixed Layout */}
          <div className="flex items-center justify-between">
            <Label className="flex-shrink-0 text-xs text-neutral-500">Duration Mode</Label>
            <div className="flex flex-shrink-0 items-center gap-3">
              <div className="w-16 text-right">
                <span className="text-xs text-neutral-500">
                  {taskForm.useDurationMode ? 'Duration' : 'End Time'}
                </span>
              </div>
              <Switch
                id="duration-mode"
                checked={taskForm.useDurationMode}
                onCheckedChange={toggleDurationMode}
              />
            </div>
          </div>

          {/* Time Inputs - Stable Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Time - Always Present */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-neutral-500">Start</Label>
              <Input
                type="time"
                value={taskForm.taskStartTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
              />
            </div>

            {/* Duration or End Time - Same Container */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-neutral-500">
                {taskForm.useDurationMode ? 'Duration' : 'End'}
              </Label>
              {taskForm.useDurationMode ? (
                <Select
                  value={taskForm.taskDuration}
                  onValueChange={(value) => handleDurationChange(parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateDurationOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="time"
                  value={displayEndTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="[appearance:textfield] pr-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                />
              )}
            </div>
          </div>
        </div>

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
              className="w-full transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
