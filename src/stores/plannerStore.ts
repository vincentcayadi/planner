// src/stores/plannerStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Task, ColorName, TaskFormState, PlannerConfig, PlannerExport } from '@/lib/types';
import { formatDateKey, timeToMinutes, overlaps } from '@/lib/utils/time';
import Dexie from 'dexie';

// Database setup
const db = new Dexie('plannerDB');
db.version(1).stores({ days: 'dateKey', meta: 'key' });

interface PlannerState {
  // Core data
  schedules: Record<string, Task[]>;
  currentDate: Date;

  // Planner configuration
  plannerConfig: PlannerConfig;

  // Task form state
  taskForm: TaskFormState;

  // Dialog states
  conflictDialog: {
    isOpen: boolean;
    conflicts: Task[];
    pendingTask: { task: Task; dateKey: string } | null;
  };

  editDialog: {
    isOpen: boolean;
    editItem: Task | null;
    conflicts: Task[];
    pendingTask: Task | null;
    conflictDialogOpen: boolean;
  };

  clearAllDialog: {
    isOpen: boolean;
  };

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setCurrentDate: (date: Date) => void;
  updatePlannerConfig: (config: Partial<PlannerConfig>) => void;
  updateTaskForm: (updates: Partial<TaskFormState>) => void;
  resetTaskForm: () => void;

  // Schedule operations
  addTask: () => Promise<{ success: boolean; error?: string }>;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean; error?: string }>;
  clearAllTasks: () => void;
  autoFillBreaks: () => void;

  // Conflict handling
  openConflictDialog: (conflicts: Task[], pendingTask: { task: Task; dateKey: string }) => void;
  closeConflictDialog: () => void;
  overrideConflicts: () => void;

  // Edit dialog
  openEditDialog: (task: Task) => void;
  closeEditDialog: () => void;
  saveEditedTask: () => Promise<{ success: boolean; error?: string }>;

  // Clear all dialog
  openClearAllDialog: () => void;
  closeClearAllDialog: () => void;

  // Utility functions
  getCurrentSchedule: () => Task[];
  findConflictingTasks: (startTime: string, endTime: string, excludeId?: string) => Task[];

  // Data persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  exportData: () => PlannerExport;
  importData: (data: PlannerExport) => Promise<{ success: boolean; error?: string }>;
}

const initialTaskForm: TaskFormState = {
  taskName: '',
  taskDesc: '',
  taskStartTime: '08:00',
  taskDuration: '60',
  selectedColor: 'blue',
  nameError: false,
};

const initialPlannerConfig: PlannerConfig = {
  startTime: '08:00',
  endTime: '23:30',
  interval: 30,
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      schedules: {},
      currentDate: new Date(),
      plannerConfig: initialPlannerConfig,
      taskForm: initialTaskForm,

      conflictDialog: {
        isOpen: false,
        conflicts: [],
        pendingTask: null,
      },

      editDialog: {
        isOpen: false,
        editItem: null,
        conflicts: [],
        pendingTask: null,
        conflictDialogOpen: false,
      },

      clearAllDialog: {
        isOpen: false,
      },

      isLoading: false,
      isSaving: false,

      // Actions
      setCurrentDate: (date: Date) => {
        set((state) => {
          state.currentDate = date;
        });
      },

      updatePlannerConfig: (config: Partial<PlannerConfig>) => {
        set((state) => {
          Object.assign(state.plannerConfig, config);
        });

        // Persist to IndexedDB
        const { saveToStorage } = get();
        saveToStorage();
      },

      updateTaskForm: (updates: Partial<TaskFormState>) => {
        set((state) => {
          Object.assign(state.taskForm, updates);
        });
      },

      resetTaskForm: () => {
        set((state) => {
          state.taskForm = { ...initialTaskForm };
        });
      },

      addTask: async () => {
        const {
          taskForm,
          currentDate,
          schedules,
          plannerConfig,
          findConflictingTasks,
          openConflictDialog,
        } = get();

        // Validation
        const trimmedName = taskForm.taskName.trim();
        if (!trimmedName) {
          set((state) => {
            state.taskForm.nameError = true;
          });
          return { success: false, error: 'Task name is required' };
        }

        set((state) => {
          state.taskForm.nameError = false;
        });

        const startMinutes = timeToMinutes(taskForm.taskStartTime);
        const duration = parseInt(taskForm.taskDuration, 10) || 0;
        const endMinutes = startMinutes + duration;

        // Validate time bounds
        const dayStart = timeToMinutes(plannerConfig.startTime);
        const dayEnd = timeToMinutes(plannerConfig.endTime);

        if (startMinutes < dayStart) {
          return { success: false, error: 'Start time is before day start' };
        }

        if (endMinutes > dayEnd) {
          return { success: false, error: 'End time is after day end' };
        }

        if (duration <= 0) {
          return { success: false, error: 'Invalid duration' };
        }

        const dateKey = formatDateKey(currentDate);
        const newTask: Task = {
          id: crypto.randomUUID(),
          name: trimmedName,
          description: taskForm.taskDesc.trim(),
          startTime: taskForm.taskStartTime,
          endTime: `${Math.floor(endMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`,
          duration,
          color: taskForm.selectedColor,
        };

        // Check for conflicts
        const conflicts = findConflictingTasks(newTask.startTime, newTask.endTime);

        if (conflicts.length > 0) {
          openConflictDialog(conflicts, { task: newTask, dateKey });
          return { success: false, error: 'Time conflict detected' };
        }

        // Add task
        set((state) => {
          if (!state.schedules[dateKey]) {
            state.schedules[dateKey] = [];
          }
          state.schedules[dateKey].push(newTask);
          state.schedules[dateKey].sort(
            (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );
        });

        get().resetTaskForm();
        get().saveToStorage();

        return { success: true };
      },

      removeTask: (id: string) => {
        const { currentDate } = get();
        const dateKey = formatDateKey(currentDate);

        set((state) => {
          if (state.schedules[dateKey]) {
            state.schedules[dateKey] = state.schedules[dateKey].filter((task) => task.id !== id);
          }
        });

        get().saveToStorage();
      },

      updateTask: async (id: string, updates: Partial<Task>) => {
        const { currentDate, findConflictingTasks } = get();
        const dateKey = formatDateKey(currentDate);

        return new Promise((resolve) => {
          set((state) => {
            const schedule = state.schedules[dateKey];
            if (!schedule) {
              resolve({ success: false, error: 'Schedule not found' });
              return;
            }

            const taskIndex = schedule.findIndex((task) => task.id === id);
            if (taskIndex === -1) {
              resolve({ success: false, error: 'Task not found' });
              return;
            }

            const updatedTask = { ...schedule[taskIndex], ...updates };

            // Check for conflicts (excluding current task)
            const conflicts = findConflictingTasks(updatedTask.startTime, updatedTask.endTime, id);

            if (conflicts.length > 0) {
              resolve({ success: false, error: 'Time conflict detected' });
              return;
            }

            schedule[taskIndex] = updatedTask;
            schedule.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            resolve({ success: true });
          });

          get().saveToStorage();
        });
      },

      clearAllTasks: () => {
        const { currentDate } = get();
        const dateKey = formatDateKey(currentDate);

        set((state) => {
          delete state.schedules[dateKey];
        });

        get().saveToStorage();
        get().closeClearAllDialog();
      },

      autoFillBreaks: () => {
        const { currentDate, plannerConfig, getCurrentSchedule } = get();
        const dateKey = formatDateKey(currentDate);
        const currentSchedule = getCurrentSchedule();

        const startMinutes = timeToMinutes(plannerConfig.startTime);
        const endMinutes = timeToMinutes(plannerConfig.endTime);

        const breaks: Task[] = [];
        let cursor = startMinutes;

        // Sort tasks by start time
        const sortedTasks = [...currentSchedule].sort(
          (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
        );

        sortedTasks.forEach((task) => {
          const taskStart = timeToMinutes(task.startTime);
          const taskEnd = timeToMinutes(task.endTime);

          if (taskStart > cursor) {
            breaks.push({
              id: crypto.randomUUID(),
              name: 'Break',
              description: '',
              startTime: `${Math.floor(cursor / 60)
                .toString()
                .padStart(2, '0')}:${(cursor % 60).toString().padStart(2, '0')}`,
              endTime: `${Math.floor(taskStart / 60)
                .toString()
                .padStart(2, '0')}:${(taskStart % 60).toString().padStart(2, '0')}`,
              duration: taskStart - cursor,
              color: 'cyan',
            });
          }

          cursor = Math.max(cursor, taskEnd);
        });

        // Add final break if needed
        if (cursor < endMinutes) {
          breaks.push({
            id: crypto.randomUUID(),
            name: 'Break',
            description: '',
            startTime: `${Math.floor(cursor / 60)
              .toString()
              .padStart(2, '0')}:${(cursor % 60).toString().padStart(2, '0')}`,
            endTime: `${Math.floor(endMinutes / 60)
              .toString()
              .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`,
            duration: endMinutes - cursor,
            color: 'cyan',
          });
        }

        set((state) => {
          if (!state.schedules[dateKey]) {
            state.schedules[dateKey] = [];
          }
          state.schedules[dateKey].push(...breaks);
          state.schedules[dateKey].sort(
            (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );
        });

        get().saveToStorage();
      },

      // Conflict dialog actions
      openConflictDialog: (conflicts: Task[], pendingTask: { task: Task; dateKey: string }) => {
        set((state) => {
          state.conflictDialog = {
            isOpen: true,
            conflicts,
            pendingTask,
          };
        });
      },

      closeConflictDialog: () => {
        set((state) => {
          state.conflictDialog = {
            isOpen: false,
            conflicts: [],
            pendingTask: null,
          };
        });
      },

      overrideConflicts: () => {
        const { conflictDialog } = get();

        if (!conflictDialog.pendingTask) return;

        const { task, dateKey } = conflictDialog.pendingTask;
        const conflictIds = new Set(conflictDialog.conflicts.map((c) => c.id));

        set((state) => {
          if (!state.schedules[dateKey]) {
            state.schedules[dateKey] = [];
          }

          // Remove conflicting tasks
          state.schedules[dateKey] = state.schedules[dateKey].filter((t) => !conflictIds.has(t.id));

          // Add new task
          state.schedules[dateKey].push(task);
          state.schedules[dateKey].sort(
            (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );

          // Close dialog
          state.conflictDialog = {
            isOpen: false,
            conflicts: [],
            pendingTask: null,
          };
        });

        get().resetTaskForm();
        get().saveToStorage();
      },

      // Edit dialog actions
      openEditDialog: (task: Task) => {
        set((state) => {
          state.editDialog.isOpen = true;
          state.editDialog.editItem = { ...task };
        });
      },

      closeEditDialog: () => {
        set((state) => {
          state.editDialog = {
            isOpen: false,
            editItem: null,
            conflicts: [],
            pendingTask: null,
            conflictDialogOpen: false,
          };
        });
      },

      saveEditedTask: async () => {
        const { editDialog, findConflictingTasks } = get();

        if (!editDialog.editItem) {
          return { success: false, error: 'No item to edit' };
        }

        const conflicts = findConflictingTasks(
          editDialog.editItem.startTime,
          editDialog.editItem.endTime,
          editDialog.editItem.id
        );

        if (conflicts.length > 0) {
          set((state) => {
            state.editDialog.conflicts = conflicts;
            state.editDialog.pendingTask = editDialog.editItem;
            state.editDialog.conflictDialogOpen = true;
          });
          return { success: false, error: 'Time conflict detected' };
        }

        const result = await get().updateTask(editDialog.editItem.id, editDialog.editItem);

        if (result.success) {
          get().closeEditDialog();
        }

        return result;
      },

      // Clear all dialog
      openClearAllDialog: () => {
        set((state) => {
          state.clearAllDialog.isOpen = true;
        });
      },

      closeClearAllDialog: () => {
        set((state) => {
          state.clearAllDialog.isOpen = false;
        });
      },

      // Utility functions
      getCurrentSchedule: () => {
        const { schedules, currentDate } = get();
        const dateKey = formatDateKey(currentDate);
        return schedules[dateKey] || [];
      },

      findConflictingTasks: (startTime: string, endTime: string, excludeId?: string) => {
        const currentSchedule = get().getCurrentSchedule();
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        return currentSchedule.filter((task) => {
          if (excludeId && task.id === excludeId) return false;

          const taskStart = timeToMinutes(task.startTime);
          const taskEnd = timeToMinutes(task.endTime);

          return overlaps(startMinutes, endMinutes, taskStart, taskEnd);
        });
      },

      // Data persistence
      loadFromStorage: async () => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          const days = db.table('days');
          const meta = db.table('meta');

          const [scheduleRows, startTimeRow, endTimeRow, intervalRow] = await Promise.all([
            days.toArray(),
            meta.get('startTime'),
            meta.get('endTime'),
            meta.get('interval'),
          ]);

          set((state) => {
            // Load schedules
            if (scheduleRows?.length) {
              const loadedSchedules: Record<string, Task[]> = {};
              scheduleRows.forEach((row: any) => {
                loadedSchedules[row.dateKey] = row.items || [];
              });
              state.schedules = loadedSchedules;
            }

            // Load planner config
            if (startTimeRow?.value) state.plannerConfig.startTime = startTimeRow.value;
            if (endTimeRow?.value) state.plannerConfig.endTime = endTimeRow.value;
            if (intervalRow?.value) state.plannerConfig.interval = Number(intervalRow.value);
          });
        } catch (error) {
          console.error('Failed to load from storage:', error);
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      saveToStorage: async () => {
        const { schedules, plannerConfig } = get();

        set((state) => {
          state.isSaving = true;
        });

        try {
          const days = db.table('days');
          const meta = db.table('meta');

          // Save schedules
          const rows = Object.entries(schedules).map(([dateKey, items]) => ({
            dateKey,
            items,
          }));

          await days.clear();
          if (rows.length) {
            await days.bulkPut(rows);
          }

          // Save planner config
          await meta.bulkPut([
            { key: 'startTime', value: plannerConfig.startTime },
            { key: 'endTime', value: plannerConfig.endTime },
            { key: 'interval', value: plannerConfig.interval },
          ]);
        } catch (error) {
          console.error('Failed to save to storage:', error);
        } finally {
          set((state) => {
            state.isSaving = false;
          });
        }
      },

      exportData: (): PlannerExport => {
        const { schedules, plannerConfig } = get();

        const days = Object.entries(schedules)
          .map(([dateKey, items]) => ({
            dateKey,
            items: items.filter((item) => item.duration > 0),
          }))
          .filter((day) => day.items.length > 0)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        return {
          exportedAt: new Date().toISOString(),
          planner: plannerConfig,
          days,
        };
      },

      importData: async (data: PlannerExport) => {
        if (!data?.days || !Array.isArray(data.days) || !data.planner) {
          return { success: false, error: 'Invalid export format' };
        }

        try {
          set((state) => {
            // Update planner config
            state.plannerConfig = { ...data.planner };

            // Update schedules
            const newSchedules: Record<string, Task[]> = {};
            data.days.forEach((day) => {
              if (day?.dateKey && Array.isArray(day.items)) {
                newSchedules[day.dateKey] = day.items;
              }
            });
            state.schedules = newSchedules;
          });

          await get().saveToStorage();

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Failed to import data' };
        }
      },
    })),
    {
      name: 'planner-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        schedules: state.schedules,
        plannerConfig: state.plannerConfig,
      }),
    }
  )
);
