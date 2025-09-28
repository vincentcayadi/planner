// src/components/TaskList/TaskList.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Pencil } from 'lucide-react';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { to12h } from '@/lib/utils/time';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function TaskList() {
  const { getCurrentSchedule, removeTask, openEditDialog, autoFillBreaks, openClearAllDialog } =
    usePlannerStore();

  const currentSchedule = getCurrentSchedule();

  const handleRemoveTask = (id: string, name: string) => {
    removeTask(id);
    toast.error('Task deleted', {
      description: `${name} has been removed`,
    });
  };

  const handleShareCurrentDay = async () => {
    const items = currentSchedule.filter((t) => t.duration > 0);

    if (items.length === 0) {
      toast.error('Nothing to share', {
        description: 'This day has no items.',
      });
      return;
    }

    // Get planner config from store
    const { plannerConfig, currentDate } = usePlannerStore.getState();
    const dateKey = currentDate.toISOString().split('T')[0];

    const payload = {
      dateKey,
      items,
      planner: plannerConfig,
    };

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Share failed');
      }

      const data = await res.json();
      const url: string = data.url;

      try {
        await navigator.clipboard.writeText(url);
        toast.success('Share link copied', { description: url });
      } catch {
        toast.success('Share link ready', { description: url });
      }
    } catch {
      toast.error('Share failed', { description: 'Please try again.' });
    }
  };

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Current Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <AnimatePresence mode="popLayout">
          {currentSchedule.map((task, index) => {
            const colorConfig = COLORS.find((x) => x.name === task.color);
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -15, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  x: 25,
                  scale: 0.9,
                  height: 0,
                  marginBottom: 0,
                  paddingTop: 0,
                  paddingBottom: 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 0.8,
                  delay: index * 0.02,
                  layout: { duration: 0.2 }
                }}
                className={`rounded p-2 ${colorConfig?.bg} flex items-center justify-between transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer overflow-hidden`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${colorConfig?.text} truncate text-sm`}>
                    {task.name}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {task.description && (
                      <div className="mb-0.5 line-clamp-2 whitespace-pre-wrap text-neutral-700">
                        {task.description}
                      </div>
                    )}
                    <div className="font-medium">
                      {to12h(task.startTime)} – {to12h(task.endTime)}
                    </div>
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-1">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => openEditDialog(task)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-neutral-700 transition-colors hover:bg-neutral-100"
                      aria-label={`Edit ${task.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => handleRemoveTask(task.id, task.name)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-600 transition-colors hover:bg-red-100"
                      aria-label={`Delete ${task.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {currentSchedule.length === 0 && (
          <div className="py-8 text-center">
            <div className="mb-2 text-sm text-neutral-500">No tasks scheduled</div>
            <div className="text-xs text-neutral-400">Add a task to get started</div>
          </div>
        )}

        {currentSchedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
            className="space-y-2 pt-2"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={autoFillBreaks}
                variant="outline"
                size="sm"
                className="w-full transition-all duration-200 hover:bg-cyan-50 hover:border-cyan-300 hover:shadow-md"
              >
                Fill Breaks
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleShareCurrentDay}
                size="sm"
                className="w-full transition-all duration-200 hover:shadow-md"
              >
                Share This Day
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={openClearAllDialog}
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-white w-full transition-all duration-200 hover:shadow-md"
              >
                Clear All
              </Button>
            </motion.div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
