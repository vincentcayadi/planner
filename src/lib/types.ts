// src/lib/types/index.ts
import { z } from 'zod';

// Base validation schemas
export const TimeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Expected HH:MM');

export const ColorNameSchema = z.enum([
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'orange',
  'cyan',
  'neutral',
]);

export const DateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD');

// Task validation schema
export const TaskSchema = z
  .object({
    id: z.string().uuid('Invalid task ID format'),
    name: z.string().min(1, 'Task name is required').max(200, 'Task name too long').trim(),
    description: z.string().max(1000, 'Description too long').optional().default(''),
    startTime: TimeSchema,
    endTime: TimeSchema,
    duration: z
      .number()
      .min(5, 'Duration must be at least 5 minutes')
      .max(1440, 'Duration cannot exceed 24 hours'),
    color: ColorNameSchema,
  })
  .refine(
    (data) => {
      const start = timeToMinutes(data.startTime);
      const end = timeToMinutes(data.endTime);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

// Planner configuration schema
export const PlannerConfigSchema = z
  .object({
    startTime: TimeSchema,
    endTime: TimeSchema,
    interval: z
      .number()
      .min(5, 'Interval must be at least 5 minutes')
      .max(240, 'Interval cannot exceed 4 hours'),
  })
  .refine(
    (data) => {
      const start = timeToMinutes(data.startTime);
      const end = timeToMinutes(data.endTime);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

// Export data schemas
export const DayExportSchema = z.object({
  dateKey: DateKeySchema,
  items: z.array(TaskSchema),
});

export const PlannerExportSchema = z.object({
  exportedAt: z.string().datetime(),
  planner: PlannerConfigSchema,
  days: z.array(DayExportSchema),
});

// Share request/response schemas
export const ShareRequestSchema = z.object({
  dateKey: DateKeySchema,
  items: z.array(TaskSchema),
  planner: PlannerConfigSchema,
});

export const ShareResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
});

// Form state schemas
export const TaskFormStateSchema = z.object({
  taskName: z.string(),
  taskDesc: z.string(),
  taskStartTime: TimeSchema,
  taskDuration: z.string(),
  taskEndTime: TimeSchema.optional(),
  selectedColor: ColorNameSchema,
  nameError: z.boolean(),
  useDurationMode: z.boolean().default(true),
});

// Type definitions derived from schemas
export type TimeHHMM = z.infer<typeof TimeSchema>;
export type ColorName = z.infer<typeof ColorNameSchema>;
export type DateKey = z.infer<typeof DateKeySchema>;
export type Task = z.infer<typeof TaskSchema>;
export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;
export type DayExport = z.infer<typeof DayExportSchema>;
export type PlannerExport = z.infer<typeof PlannerExportSchema>;
export type ShareRequest = z.infer<typeof ShareRequestSchema>;
export type ShareResponse = z.infer<typeof ShareResponseSchema>;
export type TaskFormState = z.infer<typeof TaskFormStateSchema>;

// Additional utility types
export type ScheduleDisplayRow = {
  time: TimeHHMM;
  task: Task | null;
  isTaskStart: boolean;
  rowSpan: number;
};

export type PendingTask = {
  task: Task;
  dateKey: DateKey;
};

// API Error types
export type ApiError = {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

// Validation result types
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: string[];
    };

// Helper functions for validation
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Validation helper functions
export const validateTask = (data: unknown): ValidationResult<Task> => {
  try {
    const validated = TaskSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Invalid task data format'],
    };
  }
};

export const validatePlannerExport = (data: unknown): ValidationResult<PlannerExport> => {
  try {
    const validated = PlannerExportSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Invalid export data format'],
    };
  }
};

export const validateShareRequest = (data: unknown): ValidationResult<ShareRequest> => {
  try {
    const validated = ShareRequestSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Invalid share request format'],
    };
  }
};

// Security-focused type guards
export const isValidDateKey = (value: string): value is DateKey => {
  return DateKeySchema.safeParse(value).success;
};

export const isValidTaskId = (value: string): boolean => {
  // Accept both UUID format and secure random string format (32 chars alphanumeric)
  return z.string().uuid().safeParse(value).success ||
         z.string().regex(/^[A-Za-z0-9]{32}$/).safeParse(value).success;
};

export const isValidTimeString = (value: string): value is TimeHHMM => {
  return TimeSchema.safeParse(value).success;
};

// Sanitization helpers
export const sanitizeTaskName = (name: string): string => {
  return name.trim().slice(0, 200);
};

export const sanitizeDescription = (desc: string): string => {
  return desc.trim().slice(0, 1000);
};

// Constants for validation
export const VALIDATION_CONSTANTS = {
  MAX_TASK_NAME_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_TASK_DURATION: 5,
  MAX_TASK_DURATION: 1440, // 24 hours
  MIN_INTERVAL: 5,
  MAX_INTERVAL: 240, // 4 hours
  MAX_TASKS_PER_DAY: 100,
  MAX_EXPORT_SIZE_MB: 10,
} as const;
