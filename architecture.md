# System Architecture

## Overview
This is a Next.js 15 task planning application with a modern React frontend and Redis-based backend for sharing functionality.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Date Handling**: React Day Picker
- **Notifications**: Sonner (toast notifications)

### Backend
- **Runtime**: Next.js API Routes (Edge & Node.js)
- **Database**: Redis (Upstash)
- **Security**: Custom rate limiting, IP validation, CSRF protection
- **Deployment**: Vercel

## Architecture Patterns

### Component Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── share/[id]/        # Dynamic share pages
│   └── globals.css        # Global styles
├── components/            # React Components
│   ├── ui/               # shadcn/ui primitives
│   ├── TaskForm/         # Task creation form
│   ├── TaskList/         # Task management
│   ├── ScheduleView/     # Calendar display
│   ├── TimeSelection/    # Time input components
│   ├── SettingsPanel/    # Configuration
│   └── Dialogs/          # Modal dialogs
├── lib/                  # Utility libraries
│   ├── utils/           # Helper functions
│   ├── security.ts      # Security utilities
│   ├── kv.ts           # Redis client
│   └── types.ts        # TypeScript definitions
└── stores/              # Zustand state stores
    └── plannerStore.ts  # Main application state
```

### State Management (Zustand)
- **Single Store**: Centralized state in `plannerStore.ts`
- **Persistence**: localStorage integration for offline capability
- **Share Management**: Local tracking of shared links with Redis backend

### Data Flow
1. **User Input** → TaskForm → Zustand Store → localStorage
2. **Schedule Display** → ScheduleView reads from Store
3. **Share Feature** → Store → API Route → Redis → Share URL
4. **Share Cleanup** → Delete old Redis entries before creating new ones

## Security Architecture

### Rate Limiting
- **Implementation**: Custom RateLimit class with in-memory storage
- **Scope**: Per-IP rate limiting for share API endpoints
- **Cleanup**: Auto-cleanup to prevent memory leaks

### Input Validation
- **Client-Side**: Zod schema validation for forms
- **Server-Side**: Request sanitization and validation
- **XSS Prevention**: Input sanitization for all user data

### CSRF Protection
- **Origin Validation**: Check request origin in production
- **Content-Type**: Enforce application/json for API requests
- **Size Limits**: Request size validation (1MB limit)

## Share System Architecture

### Redis Structure
```typescript
Key: share:day:{id}
Value: {
  dateKey: "YYYY-MM-DD",
  items: Task[],
  planner: PlannerConfig,
  createdAt: ISO timestamp,
  createdBy: IP address,
  version: number
}
TTL: 24 hours
```

### Share Lifecycle
1. **Create**: POST /api/share → Generate ID → Store in Redis
2. **Read**: GET /api/share/[id] → Fetch from Redis
3. **Update**: DELETE old → POST new (prevents Redis bloat)
4. **Expire**: Automatic TTL cleanup after 24 hours

### Memory Optimization
- **Pre-deletion**: Remove old links before creating new ones
- **TTL Management**: 24-hour automatic expiration
- **Error Handling**: Graceful fallback if cleanup fails

## Performance Considerations

### Frontend Optimization
- **Component Memoization**: React.memo for expensive components
- **State Optimization**: Minimal re-renders with Zustand
- **Bundle Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component

### Backend Optimization
- **Redis Connection**: Single connection pool
- **Edge Runtime**: Used for lightweight API routes
- **Caching**: Appropriate cache headers for static content

## Deployment Architecture

### Vercel Platform
- **Frontend**: Static generation + ISR where applicable
- **API Routes**: Serverless functions
- **Edge Functions**: For share pages and lightweight operations

### Environment Configuration
- **Redis**: Upstash connection string
- **Security**: Environment-based configuration
- **Monitoring**: Built-in Vercel analytics

## Error Handling Strategy

### Frontend
- **Toast Notifications**: User-friendly error messages
- **Graceful Degradation**: Fallbacks for failed operations
- **State Recovery**: localStorage persistence prevents data loss

### Backend
- **Structured Errors**: Consistent error response format
- **Logging**: Console logging with error details
- **Rate Limit Headers**: Clear feedback to clients

## Recent Improvements (December 2024)

### Share System Enhancement
- **Redis Cleanup**: Automatic deletion of old share links
- **Time Display**: Expiration countdown instead of creation date
- **Memory Optimization**: 50% reduction in Redis usage for active users

### UX Improvements
- **Animation Control**: Selective animation disabling for better page load
- **Loading States**: Comprehensive loading indicators
- **Error Boundaries**: Better error handling throughout the app

## Future Architecture Considerations

### Scalability
- **Redis Clustering**: For high-traffic scenarios
- **CDN Integration**: Static asset optimization
- **Database Migration**: Consider PostgreSQL for complex queries

### Security Enhancements
- **CSP Headers**: Stricter content security policies
- **Audit Logging**: Track user actions for security
- **Penetration Testing**: Regular security assessments

### Performance Monitoring
- **APM Integration**: Application performance monitoring
- **Error Tracking**: Sentry or similar error monitoring
- **Metrics**: Redis health monitoring and alerts