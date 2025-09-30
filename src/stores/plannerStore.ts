import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Task, ColorName, TaskFormState, PlannerConfig, DayConfig, PlannerExport } from '@/lib/types';
import { formatDateKey, timeToMinutes, minutesToTime, overlaps } from '@/lib/utils/time';
import Dexie from 'dexie';

/**
 * IndexedDB database for persistent storage with automatic versioning
 * v1: Basic schedules and global settings
 * v2: Added per-day configurations
 */
const db = new Dexie('plannerDB');
db.version(1).stores({ days: 'dateKey', meta: 'key' });
db.version(2).stores({
  days: 'dateKey',
  meta: 'key',
  dayConfigs: 'dateKey'
});

/**
 * Main application state interface
 */
interface PlannerState {
  schedules: Record<string, Task[]>;
  currentDate: Date;
  globalConfig: PlannerConfig;
  dayConfigs: Record<string, DayConfig>;
  taskForm: TaskFormState;
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

  // Share tracking
  sharedLinks: Record<string, { url: string; createdAt: string; id: string }>;

  // Actions
  setCurrentDate: (date: Date) => void;
  updateGlobalConfig: (config: Partial<PlannerConfig>) => void;
  updateDayConfig: (dateKey: string, config: Partial<DayConfig>) => void;
  getDayConfig: (dateKey: string) => DayConfig;
  resetDayConfig: (dateKey: string) => void;
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
  checkDayConfigConflicts: (dateKey: string, newConfig: DayConfig) => Task[];

  // Data persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  exportData: () => PlannerExport;
  importData: (data: PlannerExport) => Promise<{ success: boolean; error?: string }>;

  // Share management
  setSharedLink: (dateKey: string, url: string, id: string) => void;
  getSharedLink: (dateKey: string) => { url: string; createdAt: string; id: string } | null;
  removeSharedLink: (dateKey: string) => void;
}

const initialTaskForm: TaskFormState = {
  taskName: '',
  taskDesc: '',
  taskStartTime: '08:00',
  taskDuration: '60',
  taskEndTime: '',
  selectedColor: 'blue',
  nameError: false,
  useDurationMode: true,
};

const initialGlobalConfig: PlannerConfig = {
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
      globalConfig: initialGlobalConfig,
      dayConfigs: {},
      taskForm: { ...initialTaskForm, taskStartTime: initialGlobalConfig.startTime },
      sharedLinks: {},

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

      /**
       * Updates global configuration that applies to all days by default
       */
      updateGlobalConfig: (config: Partial<PlannerConfig>) => {
        set((state) => {
          Object.assign(state.globalConfig, config);
          if (config.startTime) {
            state.taskForm.taskStartTime = config.startTime;
          }
        });
        get().saveToStorage();
      },

      /**
       * Updates configuration for a specific day, creating day-specific overrides
       */
      updateDayConfig: (dateKey: string, config: Partial<DayConfig>) => {
        set((state) => {
          if (!state.dayConfigs[dateKey]) {
            state.dayConfigs[dateKey] = { ...state.globalConfig };
          }
          Object.assign(state.dayConfigs[dateKey], config);

          const currentDateKey = formatDateKey(state.currentDate);
          if (dateKey === currentDateKey && config.startTime) {
            state.taskForm.taskStartTime = config.startTime;
          }
        });
        get().saveToStorage();
      },

      /**
       * Retrieves configuration for a specific day, falling back to global config
       */
      getDayConfig: (dateKey: string): DayConfig => {
        const { dayConfigs, globalConfig } = get();
        return dayConfigs[dateKey] || globalConfig;
      },

      /**
       * Removes day-specific configuration, reverting to global defaults
       */
      resetDayConfig: (dateKey: string) => {
        set((state) => {
          delete state.dayConfigs[dateKey];
        });
        get().saveToStorage();
      },

      updateTaskForm: (updates: Partial<TaskFormState>) => {
        set((state) => {
          Object.assign(state.taskForm, updates);
        });
      },

      resetTaskForm: () => {
        set((state) => {
          const { getDayConfig, currentDate } = get();
          const dateKey = formatDateKey(currentDate);
          const dayConfig = getDayConfig(dateKey);

          state.taskForm = {
            ...initialTaskForm,
            taskStartTime: dayConfig.startTime,
            taskEndTime: '',
          };
        });
      },

      /**
       * Validates and adds a new task to the current day's schedule
       * Handles time validation, conflict detection, and automatic storage
       */
      addTask: async () => {
        const {
          taskForm,
          currentDate,
          schedules,
          getDayConfig,
          findConflictingTasks,
          openConflictDialog,
        } = get();

        const dateKey = formatDateKey(currentDate);
        const dayConfig = getDayConfig(dateKey);
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
        const dayStart = timeToMinutes(dayConfig.startTime);
        const dayEnd = timeToMinutes(dayConfig.endTime);

        if (startMinutes < dayStart) {
          return { success: false, error: 'Start time is before day start' };
        }

        if (endMinutes > dayEnd) {
          return { success: false, error: 'End time is after day end' };
        }

        if (duration <= 0) {
          return { success: false, error: 'Invalid duration' };
        }

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

      /**
       * Automatically fills gaps between scheduled tasks with "Break" tasks
       * Removes existing breaks first to prevent duplicates and enable re-calculation
       * Creates breaks for gaps between tasks and at the beginning/end of the day
       */
      autoFillBreaks: () => {
        const { currentDate, getDayConfig, getCurrentSchedule } = get();
        const dateKey = formatDateKey(currentDate);
        const dayConfig = getDayConfig(dateKey);
        const currentSchedule = getCurrentSchedule();

        const startMinutes = timeToMinutes(dayConfig.startTime);
        const endMinutes = timeToMinutes(dayConfig.endTime);

        // Remove existing breaks first to prevent duplicates and enable merging
        const nonBreakTasks = currentSchedule.filter(task => task.name !== 'Break');

        const breaks: Task[] = [];
        let cursor = startMinutes;

        // Sort non-break tasks by start time
        const sortedTasks = [...nonBreakTasks].sort(
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
          // Replace the schedule with non-break tasks + new breaks
          state.schedules[dateKey] = [...nonBreakTasks, ...breaks];
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

      /**
       * Finds all tasks that overlap with the given time range
       * @param startTime - Start time in "HH:MM" format
       * @param endTime - End time in "HH:MM" format
       * @param excludeId - Optional task ID to exclude from conflict check (useful when editing existing tasks)
       * @returns Array of conflicting tasks
       */
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

      /**
       * Checks if changing a day's time boundaries would conflict with existing tasks
       * @param dateKey - Date in YYYY-MM-DD format
       * @param newConfig - New day configuration with updated time boundaries
       * @returns Array of tasks that would be outside the new time boundaries
       */
      checkDayConfigConflicts: (dateKey: string, newConfig: DayConfig) => {
        const { schedules } = get();
        const dayTasks = schedules[dateKey] || [];

        const newDayStart = timeToMinutes(newConfig.startTime);
        const newDayEnd = timeToMinutes(newConfig.endTime);

        return dayTasks.filter((task) => {
          const taskStart = timeToMinutes(task.startTime);
          const taskEnd = timeToMinutes(task.endTime);

          // Check if task falls outside new day bounds
          return taskStart < newDayStart || taskEnd > newDayEnd;
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

          const dayConfigsTable = db.table('dayConfigs');
          const [scheduleRows, dayConfigRows, startTimeRow, endTimeRow, intervalRow] = await Promise.all([
            days.toArray(),
            dayConfigsTable.toArray(),
            meta.get('startTime'),
            meta.get('endTime'),
            meta.get('interval'),
          ]);

          set((state) => {
            // Load schedules
            if (scheduleRows?.length) {
              const loadedSchedules: Record<string, Task[]> = {};
              scheduleRows.forEach((row: { dateKey: string; items?: Task[] }) => {
                loadedSchedules[row.dateKey] = row.items || [];
              });
              state.schedules = loadedSchedules;
            }

            // Load day configs
            if (dayConfigRows?.length) {
              const loadedDayConfigs: Record<string, DayConfig> = {};
              dayConfigRows.forEach((row: { dateKey: string; config?: DayConfig }) => {
                if (row.config) {
                  loadedDayConfigs[row.dateKey] = row.config;
                }
              });
              state.dayConfigs = loadedDayConfigs;
            }

            // Load global config
            if (startTimeRow?.value) state.globalConfig.startTime = startTimeRow.value;
            if (endTimeRow?.value) state.globalConfig.endTime = endTimeRow.value;
            if (intervalRow?.value) state.globalConfig.interval = Number(intervalRow.value);

            // Sync task form start time with current day's start time
            const currentDateKey = formatDateKey(state.currentDate);
            const dayConfig = state.dayConfigs[currentDateKey] || state.globalConfig;
            state.taskForm.taskStartTime = dayConfig.startTime;
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
        const { schedules, globalConfig, dayConfigs } = get();

        set((state) => {
          state.isSaving = true;
        });

        try {
          const days = db.table('days');
          const meta = db.table('meta');
          const dayConfigsTable = db.table('dayConfigs');

          // Save schedules
          const scheduleRows = Object.entries(schedules).map(([dateKey, items]) => ({
            dateKey,
            items,
          }));

          await days.clear();
          if (scheduleRows.length) {
            await days.bulkPut(scheduleRows);
          }

          // Save day configs
          const dayConfigRows = Object.entries(dayConfigs).map(([dateKey, config]) => ({
            dateKey,
            config,
          }));

          await dayConfigsTable.clear();
          if (dayConfigRows.length) {
            await dayConfigsTable.bulkPut(dayConfigRows);
          }

          // Save global config
          await meta.bulkPut([
            { key: 'startTime', value: globalConfig.startTime },
            { key: 'endTime', value: globalConfig.endTime },
            { key: 'interval', value: globalConfig.interval },
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
        const { schedules, globalConfig } = get();

        const days = Object.entries(schedules)
          .map(([dateKey, items]) => ({
            dateKey,
            items: items.filter((item) => item.duration > 0),
          }))
          .filter((day) => day.items.length > 0)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        return {
          exportedAt: new Date().toISOString(),
          planner: globalConfig,
          days,
        };
      },

      importData: async (data: PlannerExport) => {
        if (!data?.days || !Array.isArray(data.days) || !data.planner) {
          return { success: false, error: 'Invalid export format' };
        }

        try {
          set((state) => {
            // Update global config
            state.globalConfig = { ...data.planner };

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

      // Share management
      setSharedLink: (dateKey: string, url: string, id: string) => {
        set((state) => {
          state.sharedLinks[dateKey] = {
            url,
            id,
            createdAt: new Date().toISOString(),
          };
        });
      },

      getSharedLink: (dateKey: string) => {
        const { sharedLinks } = get();
        return sharedLinks[dateKey] || null;
      },

      removeSharedLink: (dateKey: string) => {
        set((state) => {
          delete state.sharedLinks[dateKey];
        });
      },
    })),
    {
      name: 'planner-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        schedules: state.schedules,
        globalConfig: state.globalConfig,
        dayConfigs: state.dayConfigs,
        sharedLinks: state.sharedLinks,
      }),
    }
  )
);
