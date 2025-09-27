export type Task = {
  id: string; // use uuid for stability across imports
  name: string;
  description?: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  duration: number; // minutes
  color: ColorName;
};

export type DayExport = { dateKey: string; items: Task[] };

export type PlannerExport = {
  exportedAt: string;
  planner: { startTime: string; endTime: string; interval: number };
  days: DayExport[];
};

export type ColorName =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'cyan'
  | 'neutral';
