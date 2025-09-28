// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
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

export default function PlannerPage() {
  const { currentDate, setCurrentDate, isLoading, loadFromStorage } = usePlannerStore();

  // Load data from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="flex w-80 flex-col gap-4 overflow-y-auto bg-white p-6 shadow-lg">
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

          {/* Main Content */}
          <main className="flex-1 overflow-hidden p-6">
            <ScheduleView />
          </main>
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


