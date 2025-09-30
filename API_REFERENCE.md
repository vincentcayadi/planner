# API Reference - Task Planner

## Store API (`usePlannerStore`)

### State Structure

```typescript
interface PlannerState {
  // Core Data
  schedules: Record<string, Task[]>;        // Tasks by date key (YYYY-MM-DD)
  currentDate: Date;                        // Currently selected date
  globalConfig: PlannerConfig;              // Default settings for all days
  dayConfigs: Record<string, DayConfig>;    // Per-day setting overrides
  taskForm: TaskFormState;                  // Current form input state

  // UI State
  conflictDialog: ConflictDialogState;      // Task conflict resolution
  editDialog: EditDialogState;              // Task editing modal
  clearAllDialog: { isOpen: boolean };      // Clear all confirmation
  isLoading: boolean;                       // Initial data load
  isSaving: boolean;                        // Data persistence state

  // Share Management
  sharedLinks: Record<string, SharedLink>;  // Local share URL tracking
}
```

### Core Actions

#### Task Management

**`addTask(): Promise<{ success: boolean; error?: string }>`**
- Validates current task form and adds task to schedule
- Handles conflict detection and time boundary validation
- Auto-saves to storage on success

**`removeTask(id: string): void`**
- Removes task from current day's schedule
- Auto-saves changes

**`updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }>`**
- Updates existing task with conflict checking
- Returns error if update would create conflicts

**`clearAllTasks(): void`**
- Removes all tasks from current day
- Closes clear all dialog

**`autoFillBreaks(): void`**
- Automatically fills gaps between tasks with "Break" tasks
- Removes existing breaks first to prevent duplicates
- Creates breaks for gaps at start, between tasks, and at end of day

#### Configuration Management

**`updateGlobalConfig(config: Partial<PlannerConfig>): void`**
- Updates default settings that apply to all days
- Auto-saves changes
- Updates task form start time if changed

**`updateDayConfig(dateKey: string, config: Partial<DayConfig>): void`**
- Creates or updates day-specific setting overrides
- Auto-saves changes
- Updates current task form if editing current day

**`getDayConfig(dateKey: string): DayConfig`**
- Returns effective configuration for a specific day
- Falls back to global config if no day-specific config exists

**`resetDayConfig(dateKey: string): void`**
- Removes day-specific overrides, reverting to global settings

#### Conflict Resolution

**`findConflictingTasks(startTime: string, endTime: string, excludeId?: string): Task[]`**
- Returns all tasks that overlap with given time range
- Optionally excludes a specific task (useful when editing)

**`checkDayConfigConflicts(dateKey: string, newConfig: DayConfig): Task[]`**
- Checks if changing day boundaries would affect existing tasks
- Returns tasks that would fall outside new time boundaries

**`openConflictDialog(conflicts: Task[], pendingTask: { task: Task; dateKey: string }): void`**
- Opens conflict resolution dialog with conflicting tasks

#### Data Persistence

**`loadFromStorage(): Promise<void>`**
- Loads all data from IndexedDB (schedules, configs, shared links)
- Called automatically on app startup

**`saveToStorage(): Promise<void>`**
- Saves current state to IndexedDB
- Called automatically after state changes

**`exportData(): PlannerExport`**
- Returns all app data in export format
- Used for backup/sharing functionality

**`importData(data: PlannerExport): Promise<{ success: boolean; error?: string }>`**
- Replaces current data with imported data
- Validates format before importing

### Form Management

**`updateTaskForm(updates: Partial<TaskFormState>): void`**
- Updates task creation form state
- Triggers validation and UI updates

**`resetTaskForm(): void`**
- Resets form to initial state with current day's start time

### Dialog Management

**`openEditDialog(task: Task): void`**
- Opens task editing modal with pre-filled data

**`closeEditDialog(): void`**
- Closes edit dialog and clears edit state

**`saveEditedTask(): Promise<{ success: boolean; error?: string }>`**
- Saves changes from edit dialog with conflict checking

### Share Management

**`setSharedLink(dateKey: string, url: string, id: string): void`**
- Records a shared link for local tracking

**`getSharedLink(dateKey: string): SharedLink | null`**
- Retrieves shared link info for a specific day

**`removeSharedLink(dateKey: string): void`**
- Removes shared link from local tracking

## Time Utilities (`src/lib/utils/time.ts`)

**`formatDateKey(date: Date): string`**
- Converts Date to YYYY-MM-DD string for indexing

**`timeToMinutes(time: string): number`**
- Converts "HH:MM" to minutes since midnight
- Example: `timeToMinutes("09:30")` returns `570`

**`minutesToTime(minutes: number): string`**
- Converts minutes since midnight to "HH:MM"
- Example: `minutesToTime(570)` returns `"09:30"`

**`to12h(time: string): string`**
- Converts 24-hour to 12-hour format with AM/PM

**`overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean`**
- Checks if two time intervals overlap (in minutes)
- Uses open interval logic (touching endpoints don't overlap)

**`snapToAnchor(mins: number, step: number, anchorMin: number, mode?: SnapMode): number`**
- Snaps time to interval boundaries
- Modes: 'nearest', 'floor', 'ceil'

## Auto-Save Hooks (`src/lib/debounce.ts`)

**`useAutoSave<T>(saveFunction: (data: T) => void, delay: number)`**
- Returns `{ save: (data: T) => void, isSaving: boolean }`
- Debounces save calls and provides loading state
- Use for form inputs that should auto-save

**`DEBOUNCE_DELAYS`**
- `STANDARD: 300` - For settings and form updates
- `FAST: 100` - For real-time UI updates
- `SLOW: 1000` - For expensive operations

## Type Definitions

### Core Types

```typescript
interface Task {
  id: string;
  name: string;
  description: string;
  startTime: string;    // "HH:MM" format
  endTime: string;      // "HH:MM" format
  duration: number;     // Minutes
  color: ColorName;
}

interface PlannerConfig {
  startTime: string;    // Day start time "HH:MM"
  endTime: string;      // Day end time "HH:MM"
  interval: number;     // Time grid interval in minutes (15, 30, 60)
}

interface TaskFormState {
  taskName: string;
  taskDesc: string;
  taskStartTime: string;
  taskDuration: string;     // Duration in minutes as string
  taskEndTime: string;
  selectedColor: ColorName;
  nameError: boolean;
  useDurationMode: boolean; // true = duration picker, false = end time picker
}
```

### Color System

```typescript
type ColorName = 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'yellow';

// Each color has:
interface ColorConfig {
  name: ColorName;
  bg: string;      // Tailwind background class
  border: string;  // Tailwind border class
  text: string;    // Tailwind text class
}
```

## Component Props Patterns

### Dialog Components
```typescript
interface ComponentNameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### Form Components
```typescript
interface ComponentNameProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}
```

## Error Handling

### Store Actions
- All async actions return `{ success: boolean; error?: string }`
- UI components should check success and display error messages

### Validation
- Task name required (trimmed)
- Start time must be within day boundaries
- End time must be after start time
- Duration must be positive

### Conflicts
- Automatic detection using time overlap checking
- User presented with options: override, cancel, or adjust
- Edit operations exclude current task from conflict checking

## Performance Notes

### Store Updates
- Uses Immer for immutable updates
- Automatic persistence to IndexedDB
- Debounced saves prevent excessive storage writes

### Component Optimization
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations
- Avoid creating new objects in render methods

### Time Calculations
- All calculations done in minutes (integers)
- Convert to/from strings only for display
- Use utilities consistently to avoid format errors