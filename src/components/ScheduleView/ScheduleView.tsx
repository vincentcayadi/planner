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
  const { currentDate, getDayConfig, schedules, updateTaskForm } = usePlannerStore();
  const [isMobile, setIsMobile] = React.useState(false);

  // Get day-specific config
  const dateKey = formatDateKey(currentDate);
  const dayConfig = getDayConfig(dateKey);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    const safeInterval = Math.max(5, dayConfig.interval || 30);
    let t = timeToMinutes(dayConfig.startTime);
    const end = timeToMinutes(dayConfig.endTime);

    if (end <= t) return slots;

    while (t <= end) {
      slots.push(minutesToTime(t));
      t += safeInterval;
    }

    return slots;
  }, [dayConfig.startTime, dayConfig.endTime, dayConfig.interval]);

  const scheduleDisplay = useMemo((): ScheduleDisplayRow[] => {
    // Change this line: use currentSchedule instead of getCurrentSchedule()
    const schedule = currentSchedule;
    const display: ScheduleDisplayRow[] = [];
    const safeInterval = Math.max(5, dayConfig.interval || 30);
    const dayEnd = timeToMinutes(dayConfig.endTime);

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
  }, [timeSlots, currentSchedule, dayConfig.interval, dayConfig.endTime]);

  return (
    <Card className="mx-auto flex h-full max-w-3xl flex-col overflow-clip bg-neutral-200/70 pt-3 pb-0 shadow-lg md:pt-6">
      <CardHeader className="grid grid-cols-[1fr_auto] items-end px-4 pt-2 pb-1 leading-none font-bold tracking-tighter text-neutral-500 md:px-8">
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
                    whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                    whileTap={isMobile ? undefined : { backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                    onClick={() => handleQuickAdd(slot.time)}
                    className="group grid cursor-pointer touch-manipulation grid-cols-[70px_1fr] border-b border-neutral-200 transition-colors sm:grid-cols-[90px_1fr] md:grid-cols-[110px_1fr]"
                  >
                    <div className="flex items-center justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm">
                      {to12h(slot.time)}
                    </div>
                    <div className="flex min-h-[44px] items-center justify-between bg-neutral-50 px-2 py-2 text-sm text-neutral-400 transition-colors duration-300 group-hover:bg-neutral-200 sm:px-3 sm:py-3 md:px-4 md:py-4">
                      <span className="text-xs opacity-50 transition-opacity group-hover:opacity-70 sm:text-sm">
                        Available
                      </span>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="flex items-center gap-1 text-neutral-600 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden text-xs font-medium sm:inline">Add task</span>
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
                    ease: 'easeOut',
                  }}
                  className="grid touch-manipulation grid-cols-[70px_1fr] border-b border-neutral-200 transition-shadow sm:grid-cols-[90px_1fr] md:grid-cols-[110px_1fr]"
                >
                  <div className="flex items-start justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm">
                    {to12h(slot.time)}
                  </div>
                  <motion.div
                    whileHover={{ backgroundColor: colorConfig?.bg.replace('200', '300') }}
                    whileTap={isMobile ? undefined : { backgroundColor: colorConfig?.bg.replace('200', '300') }}
                    className={`${slot.rowSpan === 1 ? 'p-1 sm:p-2 md:py-6 md:px-3' : 'p-2 sm:p-4 md:py-8 md:px-6'} ${colorConfig?.bg} ${colorConfig?.text} flex cursor-pointer flex-col items-center justify-center gap-1 text-center transition-colors md:gap-2`}
                    style={{
                      minHeight: `${Math.max(slot.rowSpan * 44, 44)}px`,
                    }}
                  >
                    <div className={`font-semibold ${slot.rowSpan === 1 ? 'text-xs sm:text-sm md:text-base' : 'text-sm sm:text-lg md:text-xl'}`}>
                      {slot.task.name}
                    </div>
                    {slot.task.description && slot.rowSpan > 1 && (
                      <div className="line-clamp-2 text-xs whitespace-pre-wrap text-neutral-700 sm:line-clamp-none md:text-sm">
                        {slot.task.description}
                      </div>
                    )}
                    <div className={`text-neutral-600 ${slot.rowSpan === 1 ? 'text-xs' : 'text-xs sm:text-sm md:text-sm'}`}>
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
