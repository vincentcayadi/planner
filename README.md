# Planner

A comprehensive daily task planner with smart conflict resolution, time management features, and secure local-first storage. Perfect for organizing revision blocks, meetings, and daily schedules.

Built with ❤️

## ✨ Features

### 📅 Core Planning
- **Daily schedules** with visual time grid display
- **Date navigation** with calendar picker for easy day switching
- **Configurable time bounds** - set custom start/end times for your day
- **Flexible time intervals** (5 minutes to 4 hours) for grid granularity
- **12-hour display format** (AM/PM) with intuitive time inputs

### 📝 Task Management
- **Rich task creation** with title, description, start time, duration, and color coding
- **8 color themes** for visual organization (blue, green, yellow, purple, pink, orange, cyan, neutral)
- **Smart validation** with input sanitization and security measures
- **Comprehensive editing** - modify any task aspect with real-time conflict checking
- **Bulk operations** - clear all tasks for a day with confirmation dialog

### 👤 User Experience & Personalization
- **User onboarding** - guided setup for first-time users with optional name collection
- **Session-based persistence** - onboarding modal shows once per browser session until completed
- **Personal preferences** - customizable default schedule settings (start/end time, interval)
- **Smart skip functionality** - users can skip any onboarding step or entire flow
- **Personalized sharing** - shared schedules display user name when provided
- **Post-onboarding editing** - all preferences remain editable through global settings

### ⚡ Smart Features
- **Intelligent conflict detection** with visual conflict resolution dialogs
- **Override protection** - choose to replace conflicting tasks or cancel
- **Auto-fill breaks** - automatically insert break blocks in schedule gaps
- **Real-time form validation** with helpful error messages
- **Persistent form state** - remembers your preferences across sessions

### 🔒 Security & Reliability
- **Input validation** using Zod schemas with strict type checking
- **XSS protection** through proper data sanitization
- **UUID-based task IDs** for secure task identification
- **Error boundaries** with graceful fallback UI
- **Comprehensive error handling** with user-friendly messages
- **Persistent user preferences** with secure localStorage integration

### 💾 Data Management
- **Local-first storage** using IndexedDB via Dexie - no server required
- **Import/Export functionality** with JSON backup/restore
- **Data persistence** across browser sessions
- **Dual storage strategy** - IndexedDB + localStorage for reliability
- **Data validation** on import with detailed error reporting

### 🌐 Sharing & Collaboration
- **One-day share links** - publish read-only schedules with 24-hour expiry
- **Personalized sharing** - shared schedules can display user name when provided
- **Day-specific settings** - shared links respect custom time boundaries and intervals set for that day
- **Consistent styling** - shared schedules match the main app's visual design and typography
- **Secure sharing** via Upstash Redis with automatic cleanup
- **Public view pages** with responsive design for mobile/desktop
- **URL-based sharing** - easily send schedule links to others

### 🎨 User Experience
- **Responsive design** - works seamlessly on mobile and desktop
- **Dark/Light mode** support with system preference detection
- **Loading states** with elegant spinners and feedback
- **Toast notifications** for action confirmations and errors
- **Intuitive navigation** with keyboard shortcuts and accessibility features

## 🧱 Tech Stack

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand with Immer for immutable updates
- **Database**: Dexie (IndexedDB wrapper) for local storage
- **Validation**: Zod for runtime type safety and input validation
- **Sharing**: Upstash Redis for temporary share link storage
- **Icons**: Lucide React for consistent iconography
- **Build**: Turbopack for fast development and builds

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd planner
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add your Upstash Redis credentials for sharing features
   ```

4. **Run the development server**
   ```bash
   bun run dev
   ```

5. **Open in browser**: Navigate to `http://localhost:3000`

## 🕹️ Usage Guide

### First-Time Setup
- **Onboarding flow**: New users are guided through an optional 3-step setup process
- **Personal preferences**: Set your name (optional, appears on shared schedules)
- **Default schedule settings**: Configure your preferred start time, end time, and interval
- **Skip functionality**: Any step or the entire onboarding can be skipped
- **Post-setup editing**: All preferences remain editable in global settings

### Basic Setup
- **Configure your day**: Set start time, end time, and interval in the settings panel
- **Navigate dates**: Use the calendar picker or navigation arrows to switch days
- **Customize grid**: Adjust the time interval (5-240 minutes) to match your planning style

### Creating Tasks
- **Add new tasks**: Fill in the task form with title (required), description (optional), start time, duration, and color
- **Smart validation**: The app prevents invalid times and ensures tasks fit within your day bounds
- **Conflict handling**: If tasks overlap, you'll see a dialog to resolve conflicts

### Managing Your Schedule
- **Edit tasks**: Click the pencil icon to modify any task details
- **Delete tasks**: Use the trash icon with confirmation toast
- **Fill breaks**: Automatically add break blocks to fill schedule gaps
- **Clear day**: Remove all tasks for the current day with confirmation

### Data Management
- **Automatic saving**: All changes are saved immediately to local storage
- **Export data**: Download your entire planner as JSON for backup
- **Import data**: Restore from JSON backup with validation and error handling
- **Share schedules**: Create temporary share links for specific days

### Sharing Features
- **Create share link**: Click "Share Today" to generate a public URL
- **Personalized schedules**: Shared links display your name when provided during onboarding
- **Day-specific configuration**: Shared schedules respect custom time boundaries and intervals for that day
- **Visual consistency**: Shared pages match the main app's typography and styling exactly
- **24-hour expiry**: Shared schedules automatically expire after one day
- **Read-only access**: Shared links show schedules without editing capabilities
- **Mobile friendly**: Shared schedules work perfectly on mobile devices

## 💾 Data Storage

### Local Storage (IndexedDB via Dexie)
```javascript
// Database schema
{
  days: { dateKey: "YYYY-MM-DD", items: Task[] },
  meta: { key: "startTime" | "endTime" | "interval", value: string | number }
}
```

### Features
- **Offline capability**: Works completely offline once loaded
- **Cross-session persistence**: Data survives browser restarts
- **No authentication required**: Fully client-side storage
- **Privacy focused**: No data sent to servers (except optional sharing)

### Backup & Restore
- **JSON export**: Complete planner state including settings and all schedules
- **Import validation**: Strict validation ensures data integrity
- **Merge protection**: Import process preserves existing data safety

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── Dialogs/        # Modal dialogs
│   ├── ScheduleView/   # Main schedule display
│   ├── SettingsPanel/  # Configuration panel
│   ├── TaskForm/       # Task creation form
│   └── TaskList/       # Task management
├── lib/
│   ├── types.ts        # TypeScript definitions
│   └── utils/          # Utility functions
└── stores/
    └── plannerStore.ts # Zustand state management
```

### Key Features
- **Type safety**: Comprehensive TypeScript coverage with Zod validation
- **Immutable updates**: Zustand with Immer for predictable state changes
- **Error boundaries**: Graceful error handling with fallback UI
- **Security focused**: Input sanitization and validation throughout
- **Performance optimized**: Efficient re-renders and state updates

## 🔧 Recent Improvements

### Bug Fixes & Enhancements
- **Fixed user preferences persistence**: User name and onboarding status now survive browser refreshes via localStorage
- **Fixed onboarding persistence**: Modal no longer reappears on page refresh using sessionStorage
- **Fixed share page configuration**: Shared schedules now respect custom day-specific time settings
- **Enhanced visual consistency**: Share page styling matches main schedule view typography and spacing
- **Improved user experience**: Onboarding flow with proper session management
- **Code quality**: Fixed ESLint errors and improved JSX apostrophe handling

### Technical Improvements
- **Enhanced state persistence**: User preferences now persist across browser sessions via Zustand partialize function
- **Session-based modal management**: Prevents onboarding modal from showing repeatedly
- **Day-specific config sharing**: Share API now sends correct time boundaries for custom days
- **Responsive typography**: Consistent font scaling across main app and share pages
- **Better error handling**: Improved validation and sanitization throughout the application

## 📄 License

GPL-3.0-or-later - see LICENSE file for details

---

**Built with modern web technologies for a secure, efficient, and delightful planning experience.**

## 🔮 Potential Future Features

### 🎨 Accent Color Customization
A potential enhancement to further personalize the user experience:

#### Concept
- **Custom accent colors** - allow users to choose from predefined color themes
- **System integration** - seamlessly integrate with existing shadcn/ui theming system
- **Real-time preview** - see color changes immediately in the interface
- **Cross-component consistency** - accent colors would affect buttons, highlights, and interactive elements

#### Implementation Details
- **Predefined themes**: 6-8 carefully curated color schemes (blue, green, purple, orange, pink, etc.)
- **CSS variable system**: Leverage existing `--accent` and `--accent-foreground` variables
- **User preferences storage**: Store choice in existing user preferences system
- **Light/dark mode compatibility**: Colors designed to work in both themes

#### Technical Approach
```typescript
// Extend UserPreferences type
interface UserPreferences {
  name?: string;
  hasCompletedOnboarding: boolean;
  accentColor?: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
}

// CSS implementation
.accent-blue {
  --accent: oklch(0.6 0.15 240);
  --accent-foreground: oklch(0.98 0 0);
}
```

#### Integration Points
- **Global Settings Dialog**: Add color picker section
- **Onboarding Flow**: Optional accent color selection step
- **CSS Application**: Dynamic class application based on user preference
- **Export/Import**: Include accent color in backup/restore functionality

#### Estimated Implementation Effort
- **Difficulty**: ⭐⭐☆☆☆ (Easy to Medium)
- **Time Estimate**: 2-3 hours
- **Files to modify**: 3-4 (types, store, GlobalSettings, CSS)
- **Testing needed**: Color contrast validation, theme switching

**Dawg I let claude fix the code base and damn I was blown away**
