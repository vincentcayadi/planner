// src/components/TaskList/TaskList.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Pencil, Share2, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePlannerStore } from '@/stores/plannerStore';
import { COLORS } from '@/lib/colorConstants';
import { to12h, formatDateKey } from '@/lib/utils/time';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function TaskList() {
  const {
    getCurrentSchedule,
    removeTask,
    openEditDialog,
    autoFillBreaks,
    openClearAllDialog,
    setSharedLink,
    getSharedLink,
    removeSharedLink,
    currentDate,
    getDayConfig
  } = usePlannerStore();

  const [isSharing, setIsSharing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentSchedule = getCurrentSchedule();
  const currentDateKey = formatDateKey(currentDate);
  const existingShare = getSharedLink(currentDateKey);

  // Check if existing share might be expired
  const isLikelyExpired = existingShare ?
    Date.now() > (new Date(existingShare.createdAt).getTime() + (25 * 60 * 60 * 1000)) :
    false;

  // Check if schedule has changed since last share
  const [hasScheduleChanged, setHasScheduleChanged] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side only execution to prevent hydration errors
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !existingShare) {
      setHasScheduleChanged(false);
      return;
    }

    // Get the current schedule items (filtered like we do when sharing)
    const currentItems = currentSchedule.filter((t) => t.duration > 0);
    const scheduleString = JSON.stringify(currentItems.map(item => ({
      name: item.name,
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.duration
    })));

    // Store the schedule hash in localStorage for comparison
    const storageKey = `schedule-hash-${currentDateKey}-${existingShare.id}`;
    const storedHash = localStorage.getItem(storageKey);
    const currentHash = btoa(scheduleString); // Simple base64 encoding as hash

    if (!storedHash) {
      // First time checking, store current hash
      localStorage.setItem(storageKey, currentHash);
      setHasScheduleChanged(false);
      return;
    }

    setHasScheduleChanged(storedHash !== currentHash);
  }, [isClient, currentSchedule, existingShare, currentDateKey]);

  const handleRemoveTask = (id: string, name: string) => {
    removeTask(id);
    toast.error('Task deleted', {
      description: `${name} has been removed`,
    });
  };

  const handleShareCurrentDay = async (forceRefresh = false) => {
    const items = currentSchedule.filter((t) => t.duration > 0);

    if (items.length === 0) {
      toast.error('Nothing to share', {
        description: 'This day has no items.',
      });
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsSharing(true);
    }

    try {
      // Clean up old link to prevent Redis bloat
      if (existingShare?.id) {
        try {
          const deleteResponse = await fetch(`/api/share/${existingShare.id}`, {
            method: 'DELETE',
          });

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.warn('Failed to delete old share link:', deleteResponse.status, errorText);
          }
        } catch (error) {
          // Continue even if deletion fails - don't block new link creation
          console.warn('Failed to delete old share link:', error);
        }
      }

      // Get day-specific config and user preferences from store for sharing
      const { userPreferences } = usePlannerStore.getState();
      const dayConfig = getDayConfig(currentDateKey);

      console.log('Day config for sharing:', currentDateKey, dayConfig);

      const payload = {
        dateKey: currentDateKey,
        items,
        planner: dayConfig,
        userName: userPreferences.name,
      };

      console.log('Share payload:', payload);

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
      const id: string = data.id;

      // Store the share link
      setSharedLink(currentDateKey, url, id);

      // Update the stored hash to reflect current state (client-side only)
      if (typeof window !== 'undefined') {
        const currentItems = items;
        const scheduleString = JSON.stringify(currentItems.map(item => ({
          name: item.name,
          startTime: item.startTime,
          endTime: item.endTime,
          duration: item.duration
        })));
        const currentHash = btoa(scheduleString);
        const storageKey = `schedule-hash-${currentDateKey}-${id}`;
        localStorage.setItem(storageKey, currentHash);
        setHasScheduleChanged(false); // Reset the change indicator
      }

      try {
        await navigator.clipboard.writeText(url);
        toast.success(forceRefresh ? 'Link refreshed and copied!' : 'Share link copied!', {
          description: url,
        });
      } catch {
        toast.success(forceRefresh ? 'Link refreshed!' : 'Share link ready!', {
          description: url,
        });
      }
    } catch (error) {
      toast.error('Share failed', { description: 'Please try again.' });
    } finally {
      setIsSharing(false);
      setIsRefreshing(false);
    }
  };

  const handleCopyExistingLink = async () => {
    if (!existingShare) return;

    // Check if link might be expired (24 hours + 1 hour buffer)
    const expiryTime = new Date(existingShare.createdAt).getTime() + (25 * 60 * 60 * 1000);
    const isLikelyExpired = Date.now() > expiryTime;

    if (isLikelyExpired) {
      toast.warning('Link may have expired', {
        description: 'This link is over 24 hours old. Consider refreshing it.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(existingShare.url);
      toast.success('Link copied!', {
        description: existingShare.url,
      });
    } catch {
      toast.success('Link ready!', {
        description: existingShare.url,
      });
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
            {!existingShare ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleShareCurrentDay(false)}
                  disabled={isSharing}
                  size="sm"
                  className="w-full transition-all duration-200 hover:shadow-md"
                >
                  {isSharing ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      <span>Share This Day</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleCopyExistingLink}
                    variant="outline"
                    size="sm"
                    className="w-full transition-all duration-200 hover:shadow-md hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      <span>Copy Link</span>
                    </div>
                  </Button>
                </motion.div>
                <div className="grid grid-cols-2 gap-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => handleShareCurrentDay(true)}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className={`w-full text-xs transition-all duration-200 hover:shadow-md ${
                        hasScheduleChanged
                          ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200 hover:border-green-500'
                          : ''
                      }`}
                    >
                      {isRefreshing ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <RefreshCw className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>{hasScheduleChanged ? 'Update' : 'Refresh'}</span>
                        </div>
                      )}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => window.open(existingShare.url, '_blank')}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs transition-all duration-200 hover:shadow-md hover:bg-green-50"
                    >
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span>Open</span>
                      </div>
                    </Button>
                  </motion.div>
                </div>
                <p className={`text-xs text-center ${isLikelyExpired ? 'text-orange-600' : 'text-neutral-500'}`}>
                  {isLikelyExpired ? (
                    <span className="flex items-center justify-center gap-1">
                      <span>⚠️ Link expired</span>
                    </span>
                  ) : (() => {
                    const expiryTime = new Date(existingShare.createdAt).getTime() + (24 * 60 * 60 * 1000);
                    const timeRemaining = expiryTime - Date.now();
                    const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
                    const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

                    if (hoursRemaining > 0) {
                      return `Expires in ${hoursRemaining}h ${minutesRemaining}m`;
                    } else if (minutesRemaining > 0) {
                      return `Expires in ${minutesRemaining}m`;
                    } else {
                      return `Expires soon`;
                    }
                  })()}
                </p>
              </div>
            )}
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
