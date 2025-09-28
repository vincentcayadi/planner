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

### 💾 Data Management
- **Local-first storage** using IndexedDB via Dexie - no server required
- **Import/Export functionality** with JSON backup/restore
- **Data persistence** across browser sessions
- **Dual storage strategy** - IndexedDB + localStorage for reliability
- **Data validation** on import with detailed error reporting

### 🌐 Sharing & Collaboration
- **One-day share links** - publish read-only schedules with 24-hour expiry
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

## 📄 License

GPL-3.0-or-later - see LICENSE file for details

---

**Built with modern web technologies for a secure, efficient, and delightful planning experience.**

**Dawg I let claude fix the code base and damn I was blown away**
