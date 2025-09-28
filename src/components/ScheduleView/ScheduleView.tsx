// src/components/ScheduleView/ScheduleView.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { timeToMinutes, minutesToTime, to12h, formatDateKey } from '@/lib/utils/time'; // Add formatDateKey import
import type { Task } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface ScheduleDisplayRow {
  time: string;
  task: Task | null;
  isTaskStart: boolean;
  rowSpan: number;
}

export function ScheduleView() {
  const { currentDate, plannerConfig, schedules, updateTaskForm } = usePlannerStore();

  const handleQuickAdd = (time: string) => {
    updateTaskForm({ taskStartTime: time });
    // Scroll to task form (we can enhance this later)
    const taskForm = document.querySelector('[data-task-form]');
    if (taskForm) {
      taskForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
    <Card className="mx-auto flex h-full max-w-3xl flex-col overflow-clip bg-neutral-200/70 pt-3 md:pt-6 pb-0 shadow-lg">
      <CardHeader className="grid grid-cols-[1fr_auto] items-end px-4 md:px-8 pt-2 pb-1 leading-none font-bold tracking-tighter text-neutral-500">
        <div className="text-3xl md:text-5xl">{currentDate.getDate()}</div>
        <div className="text-xl md:text-3xl">
          {currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-y-auto p-0">
        <div className="flex-1">
          <AnimatePresence mode="popLayout">
            {scheduleDisplay.map((slot, idx) => {
            if (!slot.task) {
              return (
                <motion.div
                  key={`${to12h(slot.time)}-${idx}`}
                  whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                  whileTap={{ scale: 0.98, backgroundColor: "rgba(99, 102, 241, 0.1)" }}
                  onClick={() => handleQuickAdd(slot.time)}
                  className="grid grid-cols-[70px_1fr] sm:grid-cols-[90px_1fr] border-b border-neutral-200 md:grid-cols-[110px_1fr] cursor-pointer group transition-colors touch-manipulation"
                >
                  <div className="flex items-center justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm">
                    {to12h(slot.time)}
                  </div>
                  <div className="flex items-center justify-between bg-neutral-50 px-2 py-2 text-sm text-neutral-400 sm:px-3 sm:py-3 md:px-4 md:py-4 group-hover:bg-indigo-50 transition-colors min-h-[44px]">
                    <span className="opacity-50 group-hover:opacity-70 transition-opacity text-xs sm:text-sm">Available</span>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-xs font-medium hidden sm:inline">Add task</span>
                    </motion.div>
                  </div>
                </motion.div>
              );
            }

            const colorConfig = COLORS.find((x) => x.name === slot.task.color);

            return (
              <motion.div
                key={`${slot.task.id}-${idx}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{
                  duration: 0.25,
                  delay: idx * 0.015,
                  ease: "easeOut"
                }}
                whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.99 }}
                className="grid grid-cols-[70px_1fr] sm:grid-cols-[90px_1fr] border-b border-neutral-200 md:grid-cols-[110px_1fr] transition-shadow touch-manipulation"
              >
                <div className="flex items-start justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm">
                  {to12h(slot.time)}
                </div>
                <motion.div
                  whileHover={{ backgroundColor: colorConfig?.bg.replace('200', '300') }}
                  whileTap={{ backgroundColor: colorConfig?.bg.replace('200', '300') }}
                  className={`p-2 sm:p-4 md:p-6 ${colorConfig?.bg} ${colorConfig?.text} flex flex-col items-center justify-center gap-1 text-center md:gap-2 transition-colors cursor-pointer`}
                  style={{
                    minHeight: `${Math.max(slot.rowSpan * 44, 44)}px`,
                    height: `${Math.max(slot.rowSpan * 44, 44)}px`,
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-sm font-semibold sm:text-lg md:text-xl"
                  >
                    {slot.task.name}
                  </motion.div>
                  {slot.task.description && (
                    <div className="text-xs whitespace-pre-wrap text-neutral-700 line-clamp-2 sm:line-clamp-none md:text-sm">
                      {slot.task.description}
                    </div>
                  )}
                  <div className="text-xs text-neutral-600 sm:text-sm md:text-sm">
                    {to12h(slot.task.startTime)} – {to12h(slot.task.endTime)}
                  </div>
                </motion.div>
              </motion.div>
            );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
