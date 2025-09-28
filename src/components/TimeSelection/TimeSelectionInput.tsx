'use client';

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { timeToMinutes, minutesToTime, to12h, snapToAnchor } from '@/lib/utils/time';
import { toast } from 'sonner';
import type { PlannerConfig, ColorName } from '@/lib/types';
import { COLORS } from '@/lib/colorConstants';

interface TimeSelectionInputProps {
  startTime: string;
  duration: number;
  endTime: string;
  useDurationMode: boolean;
  selectedColor: ColorName;
  plannerConfig: PlannerConfig;
  onStartTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
  onEndTimeChange: (time: string) => void;
  onModeToggle: () => void;
  onStartTimeBlur?: (time: string) => void;
  onEndTimeBlur?: (time: string) => void;
}

export function TimeSelectionInput({
  startTime,
  duration,
  endTime,
  useDurationMode,
  selectedColor,
  plannerConfig,
  onStartTimeChange,
  onDurationChange,
  onEndTimeChange,
  onModeToggle,
  onStartTimeBlur,
  onEndTimeBlur,
}: TimeSelectionInputProps) {
  // Generate duration options based on interval
  const durationOptions = useMemo(() => {
    const safeInterval = Math.max(5, plannerConfig.interval || 30);
    return Array.from({ length: 12 }, (_, i) => (i + 1) * safeInterval);
  }, [plannerConfig.interval]);

  const handleStartTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const anchor = timeToMinutes(plannerConfig.startTime);
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const raw = timeToMinutes(newTime);

    // Validate against day start
    if (raw < anchor) {
      const snapped = Math.max(
        anchor,
        Math.min(snapToAnchor(raw, plannerConfig.interval, anchor, 'nearest'), endLimit)
      );

      toast.error('Invalid start time', {
        description: `Start time adjusted to ${to12h(minutesToTime(snapped))}`,
      });

      onStartTimeChange(minutesToTime(snapped));
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
      onStartTimeChange(minutesToTime(snapped));
    }

    onStartTimeBlur?.(minutesToTime(snapped));
  };

  const handleEndTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const anchor = timeToMinutes(plannerConfig.startTime);
    const endLimit = timeToMinutes(plannerConfig.endTime);
    const raw = timeToMinutes(newTime);
    const startMinutes = timeToMinutes(startTime);

    // Validate against day limits
    if (raw > endLimit) {
      toast.error('Invalid end time', {
        description: `End time cannot be after ${to12h(plannerConfig.endTime)}`,
      });
      onEndTimeChange(plannerConfig.endTime);
      return;
    }

    if (raw <= startMinutes) {
      const minEnd = startMinutes + plannerConfig.interval;
      toast.error('Invalid end time', {
        description: `End time must be after start time`,
      });
      onEndTimeChange(minutesToTime(minEnd));
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
      onEndTimeChange(minutesToTime(snapped));
    }

    onEndTimeBlur?.(minutesToTime(snapped));
  };

  // Get color config for preview background
  const colorConfig = COLORS.find((c) => c.name === selectedColor);

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Time</Label>
        <div className="flex items-center space-x-2">
          <Label htmlFor="duration-mode" className="text-sm text-neutral-600">
            {useDurationMode ? 'Duration' : 'End time'}
          </Label>
          <Switch
            id="duration-mode"
            checked={useDurationMode}
            onCheckedChange={onModeToggle}
          />
        </div>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-neutral-500">Start</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            onBlur={handleStartTimeBlur}
            className="text-sm [appearance:textfield] pr-3 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
        </div>

        {useDurationMode ? (
          <div>
            <Label className="text-xs text-neutral-500">Duration</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => onDurationChange(Number(v))}
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
        ) : (
          <div>
            <Label className="text-xs text-neutral-500">End</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              onBlur={handleEndTimeBlur}
              className="text-sm [appearance:textfield] pr-3 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
            />
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className={`text-sm text-center rounded-md p-3 ${colorConfig?.bg} ${colorConfig?.text} transition-colors`}>
        <div className="font-medium">
          {to12h(startTime)} → {to12h(endTime)}
        </div>
        <div className="text-xs opacity-75 mt-1">
          {duration}min
        </div>
      </div>
    </div>
  );
}