// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { TaskForm } from '@/components/TaskForm/TaskForm';
import { TaskList } from '@/components/TaskList/TaskList';
import { ScheduleView } from '@/components/ScheduleView/ScheduleView';
import { SettingsPanel } from '@/components/SettingsPanel/SettingsPanel';
import { ConflictDialog } from '@/components/Dialogs/ConflictDialog';
import { EditTaskDialog } from '@/components/Dialogs/EditTaskDialog';
import { ClearAllDialog } from '@/components/Dialogs/ClearAllDialog';
import { usePlannerStore } from '@/stores/plannerStore';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlannerPage() {
  const { currentDate, setCurrentDate, isLoading, loadFromStorage } = usePlannerStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle touch gestures for sidebar
  const handleSidebarDrag = (event: MouseEvent | TouchEvent, info: { offset: { x: number; y: number } }) => {
    // Close sidebar if dragged left significantly
    if (info.offset.x < -100) {
      setIsSidebarOpen(false);
    }
  };

  // Handle swipe gesture to open sidebar from main content
  const handleMainContentDrag = (event: MouseEvent | TouchEvent, info: { offset: { x: number; y: number } }) => {
    // Open sidebar if swiped right from left edge
    if (info.offset.x > 100 && 'clientX' in event && event.clientX < 50) {
      setIsSidebarOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-hidden bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
        {/* Mobile Menu Button */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            size="lg"
            className="h-14 w-14 rounded-full bg-white shadow-lg border-2 border-neutral-200 hover:bg-neutral-50 hover:shadow-xl transition-all duration-200"
          >
            {isSidebarOpen ? <X className="h-5 w-5 text-neutral-700" /> : <Menu className="h-5 w-5 text-neutral-700" />}
          </Button>
        </div>

        <div className="flex h-full">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-80 flex-col gap-4 overflow-y-auto bg-white p-6 shadow-lg">
            {/* Calendar */}
            <Card className="gap-0 py-3">
              <CardContent className="flex justify-center pt-0">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  weekStartsOn={1}
                  className="rounded-md border-0"
                />
              </CardContent>
            </Card>

            {/* Settings Panel */}
            <SettingsPanel />

            {/* Task Form */}
            <TaskForm />

            {/* Task List */}
            <TaskList />
          </aside>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="md:hidden fixed inset-0 bg-black/50 z-40"
                  onClick={() => setIsSidebarOpen(false)}
                />
                {/* Mobile Sidebar */}
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: -320, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleSidebarDrag}
                  className="md:hidden fixed left-0 top-0 h-full w-80 flex flex-col gap-4 overflow-y-auto bg-white p-6 shadow-lg z-50"
                >
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-neutral-700">Planner</h2>
                    <Button
                      onClick={() => setIsSidebarOpen(false)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Calendar */}
                  <Card className="gap-0 py-3">
                    <CardContent className="flex justify-center pt-0">
                      <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={(date) => {
                          if (date) {
                            setCurrentDate(date);
                            setIsSidebarOpen(false); // Close sidebar after date selection
                          }
                        }}
                        weekStartsOn={1}
                        className="rounded-md border-0"
                      />
                    </CardContent>
                  </Card>

                  {/* Settings Panel */}
                  <SettingsPanel />

                  {/* Task Form */}
                  <TaskForm />

                  {/* Task List */}
                  <TaskList />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <motion.main
            className="flex-1 overflow-hidden p-3 md:p-6"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleMainContentDrag}
          >
            <ScheduleView />
          </motion.main>
        </div>
      </div>

      {/* Dialogs */}
      <ConflictDialog />
      <EditTaskDialog />
      <ClearAllDialog />

      {/* Toast notifications */}
      <Toaster richColors position="top-right" />
    </>
  );
}


