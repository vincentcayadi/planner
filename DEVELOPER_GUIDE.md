# Developer Guide - Task Planner

## Quick Start for New Developers

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TaskForm      │    │  SettingsPanel   │    │  ScheduleView   │
│   (Create)      │────│  (Configure)     │────│  (Display)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   PlannerStore      │
                    │   (Zustand State)   │
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   IndexedDB         │
                    │   (Persistence)     │
                    └─────────────────────┘
```

### Core Concepts

#### 1. **State Management (Zustand + Immer)**
- **Single Store**: All state lives in `src/stores/plannerStore.ts`
- **Immutable Updates**: Uses Immer for safe state mutations
- **Persistence**: Auto-syncs to IndexedDB with Dexie

#### 2. **Time System**
- **Format**: All times stored as "HH:MM" (24-hour)
- **Conversion**: Use `timeToMinutes()` for calculations, `minutesToTime()` for display
- **Date Keys**: YYYY-MM-DD format for indexing schedules by day

#### 3. **Configuration Hierarchy**
```
Global Config (applies to all days)
    ↓
Day Config (overrides for specific days)
    ↓
Task (uses day's time boundaries)
```

#### 4. **Conflict Resolution**
- **Detection**: Automatic overlap checking using time intervals
- **UI**: Modal dialogs for user decisions (override, adjust, cancel)
- **Prevention**: Real-time validation in forms

## Key Files & What They Do

### State Management
- **`src/stores/plannerStore.ts`** - Main Zustand store with all app state
- **`src/lib/types.ts`** - TypeScript interfaces for the entire app

### Core Components
- **`src/components/TaskForm/TaskForm.tsx`** - Task creation with duration/end-time modes
- **`src/components/ScheduleView/ScheduleView.tsx`** - Calendar grid display with time slots
- **`src/components/SettingsPanel/SettingsPanel.tsx`** - Day/global settings + data import/export
- **`src/components/calendar-16.tsx`** - Unified date/time picker component

### Utility Libraries
- **`src/lib/utils/time.ts`** - Time conversion, formatting, overlap detection
- **`src/lib/debounce.ts`** - Auto-save hooks with loading states
- **`src/lib/colorConstants.ts`** - Task color definitions

### Backend
- **`src/app/api/share/`** - Redis-based task sharing system

## Common Development Tasks

### Adding a New Task Field

1. **Update Types** (`src/lib/types.ts`):
```typescript
interface Task {
  // ... existing fields
  newField: string; // Add your field
}

interface TaskFormState {
  // ... existing fields
  newField: string; // Add to form state
}
```

2. **Update Store** (`src/stores/plannerStore.ts`):
```typescript
const initialTaskForm: TaskFormState = {
  // ... existing fields
  newField: '',
};
```

3. **Update Form** (`src/components/TaskForm/TaskForm.tsx`):
```tsx
<Input
  value={taskForm.newField}
  onChange={(e) => updateTaskForm({ newField: e.target.value })}
/>
```

### Adding a New Setting

1. **Update Config Types** (`src/lib/types.ts`):
```typescript
interface PlannerConfig {
  // ... existing settings
  newSetting: boolean;
}
```

2. **Update Default Config** (`src/stores/plannerStore.ts`):
```typescript
const initialGlobalConfig: PlannerConfig = {
  // ... existing settings
  newSetting: false,
};
```

3. **Add UI** in `GlobalSettingsDialog.tsx` or `SettingsPanel.tsx`

### Working with Time

```typescript
// Convert time string to minutes for calculations
const startMinutes = timeToMinutes("09:30"); // 570

// Convert back to display format
const displayTime = minutesToTime(570); // "09:30"

// Check for time overlaps
const hasConflict = overlaps(
  timeToMinutes("09:00"), timeToMinutes("10:00"), // Task A: 9-10 AM
  timeToMinutes("09:30"), timeToMinutes("10:30")  // Task B: 9:30-10:30 AM
); // true - they overlap
```

## State Patterns

### Reading State
```typescript
const { currentDate, getCurrentSchedule, getDayConfig } = usePlannerStore();

// Get today's tasks
const todaysTasks = getCurrentSchedule();

// Get today's settings (falls back to global if no day-specific config)
const settings = getDayConfig(formatDateKey(currentDate));
```

### Updating State
```typescript
const { updateTaskForm, updateGlobalConfig, addTask } = usePlannerStore();

// Update form (auto-saves to IndexedDB)
updateTaskForm({ taskName: "New Task" });

// Update global settings (applies to all days without custom config)
updateGlobalConfig({ interval: 15 });

// Add task (handles conflicts automatically)
const result = await addTask();
if (!result.success) {
  toast.error(result.error);
}
```

## Auto-Save System

### How It Works
1. **User Input** → Component calls store update
2. **Store Update** → Triggers `saveToStorage()`
3. **Debounced Save** → Waits 300ms before actually saving
4. **IndexedDB** → Persists data locally

### Using Auto-Save Hooks
```typescript
import { useAutoSave, DEBOUNCE_DELAYS } from '@/lib/debounce';

const { save: autoSave, isSaving } = useAutoSave(
  (data) => updateGlobalConfig(data),
  DEBOUNCE_DELAYS.STANDARD
);

// Triggers auto-save after 300ms of inactivity
const handleChange = (newData) => {
  setLocalData(newData);
  autoSave(newData);
};
```

## Component Patterns

### Form Components
```typescript
// Use controlled inputs with store updates
<Input
  value={taskForm.fieldName}
  onChange={(e) => updateTaskForm({ fieldName: e.target.value })}
/>

// Handle validation
const isValid = taskForm.taskName.trim().length > 0;
```

### Dialog Components
```typescript
// Follow this pattern for all dialogs
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Use store state for dialog management
const { editDialog, openEditDialog, closeEditDialog } = usePlannerStore();
```

## Performance Guidelines

### Re-render Optimization
```typescript
// Wrap expensive calculations in useMemo
const expensiveData = useMemo(() => {
  return complexCalculation(dependency);
}, [dependency]);

// Wrap callbacks in useCallback
const handleClick = useCallback((id: string) => {
  removeTask(id);
}, [removeTask]);
```

### Bundle Size
- **Import Specific Functions**: `import { format } from 'date-fns'` not `import * as dateFns`
- **Code Splitting**: Components auto-split by Next.js App Router
- **Tree Shaking**: Unused exports automatically removed

## Testing Strategy

### Unit Tests (Recommended)
```typescript
// Test utility functions
import { timeToMinutes, overlaps } from '@/lib/utils/time';

test('timeToMinutes converts correctly', () => {
  expect(timeToMinutes('09:30')).toBe(570);
});

// Test store actions
import { usePlannerStore } from '@/stores/plannerStore';

test('addTask handles conflicts', async () => {
  const store = usePlannerStore.getState();
  // ... test implementation
});
```

### Integration Tests (Recommended)
- **TaskForm** → **Store** → **ScheduleView** data flow
- **Settings** → **Config Updates** → **UI Changes**
- **Conflict Detection** → **Dialog Display** → **User Resolution**

## Debugging Tips

### Common Issues

1. **Time Format Errors**
   - Always use 24-hour format "HH:MM"
   - Convert to minutes for calculations
   - Validate input format before processing

2. **State Not Updating**
   - Check if using Immer pattern correctly
   - Ensure `saveToStorage()` is called after state changes
   - Verify component is subscribed to correct store slice

3. **Dialog Not Opening**
   - Check if dialog state is being managed in store
   - Verify `open` prop is connected to store state
   - Ensure `onOpenChange` updates store

### DevTools
- **React DevTools**: Check component props and state
- **Zustand DevTools**: Monitor store state changes
- **Network Tab**: Verify API calls for share functionality
- **Application Tab**: Inspect IndexedDB storage

## Code Style Guide

### TypeScript
- **Strict Mode**: Enabled, no `any` types allowed
- **Interface Naming**: `ComponentNameProps` pattern
- **Generic Constraints**: Use proper bounds for type safety

### React
- **Functional Components Only**: No class components (except ErrorBoundary)
- **Hooks**: Use built-in and custom hooks for all logic
- **Props**: Destructure in component signature

### Imports
- **Absolute Paths**: Use `@/` alias for src/ directory
- **Named Imports**: Prefer specific imports over default
- **Order**: External → Internal → Types → Assets

## Contributing Workflow

1. **Understand the Issue**: Read this guide + architecture.md
2. **Find Relevant Files**: Use the file map above
3. **Make Changes**: Follow patterns established in existing code
4. **Test Locally**: Run `npm run build` to check for errors
5. **Update Documentation**: Add JSDoc for new public functions

## Need Help?

- **Architecture**: Read `architecture.md` for system overview
- **Types**: Check `src/lib/types.ts` for data structures
- **Examples**: Look at existing components for patterns
- **Time Utilities**: See `src/lib/utils/time.ts` for time handling