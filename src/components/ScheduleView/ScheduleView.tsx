// src/components/ScheduleView/ScheduleView.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime, to12h, formatDateKey } from '@/lib/utils/time'; // Add formatDateKey import
import type { Task } from '@/lib/types';

interface ScheduleDisplayRow {
  time: string;
  task: Task | null;
  isTaskStart: boolean;
  rowSpan: number;
}

export function ScheduleView() {
  const { currentDate, plannerConfig, schedules } = usePlannerStore();

  // Add this: compute current schedule locally
  const currentSchedule = useMemo(() => {
    const dateKey = formatDateKey(currentDate);
    return schedules[dateKey] || [];
  }, [schedules, currentDate]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const safeInterval = Math.max(5, plannerConfig.interval || 30);
    let t = timeToMinutes(plannerConfig.startTime);
    const end = timeToMinutes(plannerConfig.endTime);

    if (end <= t) return slots;

    while (t <= end) {
      slots.push(minutesToTime(t));
      t += safeInterval;
    }

    return slots;
  }, [plannerConfig.startTime, plannerConfig.endTime, plannerConfig.interval]);

  const scheduleDisplay = useMemo((): ScheduleDisplayRow[] => {
    // Change this line: use currentSchedule instead of getCurrentSchedule()
    const schedule = currentSchedule;
    const display: ScheduleDisplayRow[] = [];
    const safeInterval = Math.max(5, plannerConfig.interval || 30);
    const dayEnd = timeToMinutes(plannerConfig.endTime);

    for (let i = 0; i < timeSlots.length; i++) {
      const timeSlot = timeSlots[i];
      const tm = timeToMinutes(timeSlot);

      // Check if a task starts at this time
      const starting = schedule.find((x) => timeToMinutes(x.startTime) === tm);

      if (starting) {
        const span = Math.ceil(starting.duration / safeInterval);
        display.push({
          time: timeSlot,
          task: starting,
          isTaskStart: true,
          rowSpan: span,
        });
        i += span - 1; // skip covered slots
        continue;
      }

      // If we're exactly at the terminal boundary, don't render an empty row
      if (tm >= dayEnd) continue;

      const ongoing = schedule.find(
        (x) => tm >= timeToMinutes(x.startTime) && tm < timeToMinutes(x.endTime)
      );

      if (!ongoing) {
        display.push({
          time: timeSlot,
          task: null,
          isTaskStart: false,
          rowSpan: 1,
        });
      }
    }

    return display;
  }, [timeSlots, currentSchedule, plannerConfig.interval, plannerConfig.endTime]);

  return (
    <Card className="mx-auto flex h-full max-w-3xl flex-col overflow-clip bg-neutral-200/70 pt-6 pb-0 shadow-lg">
      <CardHeader className="grid grid-cols-[1fr_auto] items-end px-8 pt-2 pb-1 leading-none font-bold tracking-tighter text-neutral-500">
        <div className="text-5xl">{currentDate.getDate()}</div>
        <div className="text-3xl">
          {currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-y-auto p-0">
        <div className="flex-1">
          {scheduleDisplay.map((slot, idx) => {
            if (!slot.task) {
              return (
                <div
                  key={`${to12h(slot.time)}-${idx}`}
                  className="grid grid-cols-[80px_1fr] border-b border-neutral-200 md:grid-cols-[96px_1fr]"
                >
                  <div className="flex items-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-tighter whitespace-nowrap text-neutral-700 tabular-nums md:px-4 md:py-4 md:text-sm">
                    {to12h(slot.time)}
                  </div>
                  <div className="flex items-center bg-neutral-50 px-3 py-3 text-sm text-neutral-400 md:px-4 md:py-4">
                    <span className="opacity-50">Available</span>
                  </div>
                </div>
              );
            }

            const colorConfig = COLORS.find((x) => x.name === slot.task.color);

            return (
              <div
                key={`${slot.task.id}-${idx}`}
                className="grid grid-cols-[80px_1fr] border-b border-neutral-200 md:grid-cols-[96px_1fr]"
              >
                <div className="flex items-start border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-tighter whitespace-nowrap text-neutral-700 tabular-nums md:px-4 md:py-4 md:text-sm">
                  {to12h(slot.time)}
                </div>
                <div
                  className={`p-4 md:p-6 ${colorConfig?.bg} ${colorConfig?.text} flex flex-col items-center justify-center gap-1 text-center md:gap-2`}
                  style={{
                    minHeight: `${slot.rowSpan * 60}px`,
                    height: `${slot.rowSpan * 60}px`,
                  }}
                >
                  <div className="text-lg font-semibold md:text-xl">{slot.task.name}</div>
                  {slot.task.description && (
                    <div className="text-xs whitespace-pre-wrap text-neutral-700 md:text-sm">
                      {slot.task.description}
                    </div>
                  )}
                  <div className="text-xs text-neutral-600 md:text-sm">
                    {to12h(slot.task.startTime)} – {to12h(slot.task.endTime)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
