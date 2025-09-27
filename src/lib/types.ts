/** "HH:MM" 24-hour time string (e.g., "08:00", "23:30"). */
export type TimeHHMM = string;

export type ColorName =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'cyan'
  | 'neutral';

export type Task = {
  id: string; 
  name: string;
  description?: string;
  startTime: TimeHHMM; 
  endTime: TimeHHMM; 
  duration: number; 
  color: ColorName;
};

export type DayExport = { dateKey: string; items: Task[] };

export type PlannerConfig = {
  startTime: TimeHHMM;
  endTime: TimeHHMM;
  interval: number; 
};

export type PlannerExport = {
  exportedAt: string; 
  planner: PlannerConfig;
  days: DayExport[];
};

export type PendingTask = {
  task: Task;
  dateKey: string;
};

export type ScheduleDisplayRow = {
  time: TimeHHMM;
  task: Task | null;
  isTaskStart: boolean;
  rowSpan: number;
};

export type TaskFormState = {
  taskName: string;
  taskDesc: string;
  taskStartTime: TimeHHMM;
  taskDuration: string;
  selectedColor: ColorName;
  nameError: boolean;
};

export type ShareRequest = {
  dateKey: string;
  items: Task[];
  planner: PlannerConfig;
};

export type ShareResponse = {
  url: string;
};
