# Cron Middleware Design

## Overview

Design a cron middleware for zen-swarm that provides agents with the ability to operate cron tasks through a unified
tool with command-based operations.

## Requirements Summary

### Capabilities (All in one tool via command pattern)

1. **Create cron task** - Create new scheduled tasks
2. **Delete/Update task** - Modify existing tasks
3. **View task list and status** - List all tasks with their status
4. **Pause/Resume task** - Toggle task enabled state
5. **View execution history and logs** - Query execution logs
6. **Manual trigger** - Immediately trigger a task execution

### Task Types

Cron tasks execute agents with prompts - the existing system already supports this:

- Tasks are associated with `agent_id` and `prompt`
- Variables can be substituted in prompts
- Execution happens via LangGraph API

### Storage

Use existing SQLite-based `CronStorage` in zen-swarm:

- Location: `zen-swarm/src/cron/storage.ts`
- Tables: `cron_tasks`, `cron_logs`
- Already integrated with zen-swarm server

### Architecture Placement

**Application Layer**: `packages/agent/src/middlewares/cron.ts`

Rationale:

- Cron is a zen-swarm specific feature
- Depends on zen-swarm's CronStorage and CronScheduler
- Not reusable across other applications (like zen-code)
- Follows the three-layer architecture principle

## Existing System Analysis

### Current Cron System (zen-swarm/src/cron/)

```
zen-swarm/src/cron/
├── types.ts           # CronTask, CronLog type definitions
├── storage.ts         # CronStorage - SQLite CRUD operations
├── scheduler.ts       # CronScheduler - node-cron based scheduling
├── executor.ts        # CronExecutor - LangGraph API execution
├── queue.ts           # ExecutionQueue - prevent concurrent execution
├── variable-replacer.ts # Variable substitution in prompts
└── index.ts           # Module exports
```

### Key Types

```typescript
interface CronTask {
    id: string;
    name: string;
    description?: string;
    cron_expression: string; // e.g., "0 9 * * 1-5" (weekdays at 9am)
    prompt: string; // Task description for agent
    agent_id: string; // Which agent to use
    enabled: boolean;
    max_retries: number;
    variables: Record<string, string>;
    created_at?: string;
    updated_at?: string;
}

interface CronLog {
    id: string;
    cron_task_id: string;
    thread_id?: string;
    status: 'pending' | 'queued' | 'running' | 'success' | 'failed';
    started_at: string;
    finished_at?: string;
    error_message?: string;
    retry_count: number;
    queued_at?: string;
    created_at?: string;
}
```

### Current API (tRPC)

The cron system already has a tRPC router at `zen-swarm/src/api/cron.ts`:

- `listTasks` - List all tasks
- `getTask` - Get single task
- `createTask` - Create task
- `updateTask` - Update task
- `deleteTask` - Delete task
- `toggleTask` - Toggle enabled state
- `triggerTask` - Manual trigger
- `getLogs` - Get task logs
- `getRecentLogs` - Get recent logs
- `getLog` - Get single log
- `clearLogs` - Clear logs before date
- `clearAllLogs` - Clear all logs for task
- `getQueueStatus` - Get execution queue status
- `getSchedulerStatus` - Get scheduler status

## Design

### Middleware Structure

```typescript
// packages/agent/src/middlewares/cron.ts

import { AgentMiddleware } from 'langchain';
import { z } from 'zod';
import type { CronStorage } from '../../zen-swarm/src/cron/storage.js';
import type { CronScheduler } from '../../zen-swarm/src/cron/scheduler.js';

/**
 * Cron Middleware
 *
 * Provides agent with cron task management capabilities via a unified tool.
 */
export class CronMiddleware implements AgentMiddleware {
    name = 'CronMiddleware';

    tools = [];

    private storage: CronStorage;
    private scheduler: CronScheduler;

    constructor(options: { storage: CronStorage; scheduler: CronScheduler }) {
        this.storage = options.storage;
        this.scheduler = options.scheduler;

        // Register the unified cron tool
        this.tools.push(this.createCronTool());
    }

    private createCronTool() {
        // Single tool with command-based operations
    }
}
```

### Tool Design: `cron_command`

A unified tool that handles all cron operations via a `command` parameter:

```typescript
const cronCommandSchema = z.discriminatedUnion('command', [
    // List tasks
    z.object({
        command: z.literal('list'),
        filter: z.enum(['all', 'enabled', 'disabled']).optional(),
    }),

    // Get task details
    z.object({
        command: z.literal('get'),
        task_id: z.string(),
    }),

    // Create task
    z.object({
        command: z.literal('create'),
        task: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            cron_expression: z.string(),
            prompt: z.string(),
            agent_id: z.string(),
            enabled: z.boolean().optional(),
            max_retries: z.number().optional(),
            variables: z.record(z.string()).optional(),
        }),
    }),

    // Update task
    z.object({
        command: z.literal('update'),
        task_id: z.string(),
        updates: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            cron_expression: z.string().optional(),
            prompt: z.string().optional(),
            agent_id: z.string().optional(),
            enabled: z.boolean().optional(),
            max_retries: z.number().optional(),
            variables: z.record(z.string()).optional(),
        }),
    }),

    // Delete task
    z.object({
        command: z.literal('delete'),
        task_id: z.string(),
    }),

    // Toggle task (pause/resume)
    z.object({
        command: z.literal('toggle'),
        task_id: z.string(),
    }),

    // Trigger task manually
    z.object({
        command: z.literal('trigger'),
        task_id: z.string(),
    }),

    // Get logs
    z.object({
        command: z.literal('logs'),
        task_id: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
    }),

    // Get queue/scheduler status
    z.object({
        command: z.literal('status'),
    }),
]);
```

### System Prompt

```markdown
## Cron Task System

You have access to a cron task management system via the `cron_command` tool.

**Available Commands:**

- `list` - List all cron tasks
- `get` - Get details of a specific task
- `create` - Create a new scheduled task
- `update` - Update an existing task
- `delete` - Delete a task
- `toggle` - Pause or resume a task
- `trigger` - Manually trigger a task execution
- `logs` - View execution history and logs
- `status` - Get scheduler and queue status

**Cron Expression Format:**

Standard 5-field cron expression:
```

┌───────────── minute (0 - 59) │ ┌───────────── hour (0 - 23) │ │ ┌───────────── day of month (1 - 31) │ │ │
┌───────────── month (1 - 12) │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0) │ │ │ │ │

---

````

Examples:
- `0 9 * * 1-5` - Weekdays at 9:00 AM
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * 0` - Every Sunday at midnight

**Task Structure:**

Each task has:
- `id`: Unique identifier
- `name`: Human-readable name
- `description`: What the task does
- `cron_expression`: When to run
- `prompt`: Instructions for the agent
- `agent_id`: Which agent to use
- `enabled`: Whether the task is active
- `variables`: Key-value pairs for prompt substitution

**Example Usage:**

```json
{
  "command": "create",
  "task": {
    "id": "daily-report",
    "name": "Daily Report",
    "cron_expression": "0 9 * * *",
    "prompt": "Generate a daily summary report of yesterday's activities",
    "agent_id": "default"
  }
}
````

**Important Notes:**

1. Always use valid cron expressions
2. Use descriptive task IDs and names
3. The `agent_id` must reference an existing agent
4. Use `toggle` to pause/resume tasks without deleting them
5. Check `logs` to monitor task execution and debug issues

```

## Implementation Plan

### Phase 1: Core Middleware

1. Create `packages/agent/src/middlewares/cron.ts`
2. Implement `CronMiddleware` class
3. Create unified `cron_command` tool with Zod schema
4. Implement all command handlers

### Phase 2: Integration

1. Update `packages/agent/src/middlewares/index.ts` to export CronMiddleware
2. Update zen-swarm's agent factory to include CronMiddleware
3. Pass CronStorage and CronScheduler instances via dependency injection

### Phase 3: Testing

1. Unit tests for each command
2. Integration tests with mock storage/scheduler
3. E2E tests with actual cron execution

## File Structure

```

packages/agent/src/ ├── middlewares/ │ ├── cron.ts # NEW: CronMiddleware implementation │ └── index.ts # UPDATE: Export
CronMiddleware └── **tests**/ └── middlewares/ └── cron.test.ts # NEW: Unit tests

zen-swarm/src/ ├── cron/ # EXISTING: Cron system │ ├── types.ts │ ├── storage.ts │ ├── scheduler.ts │ └── ... └──
graphBuilder.ts # UPDATE: Include CronMiddleware

````

## API Reference

### cron_command Tool

#### list

List all cron tasks.

```typescript
{
  command: "list",
  filter?: "all" | "enabled" | "disabled"
}
````

Returns: `CronTask[]`

#### get

Get details of a specific task.

```typescript
{
  command: "get",
  task_id: string
}
```

Returns: `CronTask`

#### create

Create a new cron task.

```typescript
{
  command: "create",
  task: {
    id: string,
    name: string,
    description?: string,
    cron_expression: string,
    prompt: string,
    agent_id: string,
    enabled?: boolean,
    max_retries?: number,
    variables?: Record<string, string>
  }
}
```

Returns: `{ id: string }`

#### update

Update an existing task.

```typescript
{
  command: "update",
  task_id: string,
  updates: Partial<CronTask>
}
```

Returns: `{ id: string }`

#### delete

Delete a task.

```typescript
{
  command: "delete",
  task_id: string
}
```

Returns: `{ id: string }`

#### toggle

Toggle task enabled state (pause/resume).

```typescript
{
  command: "toggle",
  task_id: string
}
```

Returns: `{ id: string, enabled: boolean }`

#### trigger

Manually trigger a task.

```typescript
{
  command: "trigger",
  task_id: string
}
```

Returns: `{ logId: string }`

#### logs

Get execution logs.

```typescript
{
  command: "logs",
  task_id?: string,  // If omitted, get recent logs for all tasks
  limit?: number,
  offset?: number
}
```

Returns: `CronLog[]`

#### status

Get scheduler and queue status.

```typescript
{
    command: 'status';
}
```

Returns:

```typescript
{
  scheduler: {
    isRunning: boolean,
    scheduledCount: number
  },
  queue: {
    running: Array<{ taskId: string, logId: string }>,
    queued: Array<{ taskId: string, logId: string, queuedAt: string }>
  }
}
```

## Security Considerations

1. **Agent ID Validation**: Verify agent_id exists before creating/updating tasks
2. **Cron Expression Validation**: Validate cron expressions to prevent injection
3. **Rate Limiting**: Consider rate limiting task creation to prevent abuse
4. **Access Control**: Future - implement role-based access to cron management

## Future Enhancements

1. **Web UI Integration**: Expose cron management in zen-swarm web UI
2. **Task Templates**: Predefined templates for common tasks
3. **Notifications**: Webhook/notification on task completion/failure
4. **Dependencies**: Task dependencies (run B after A completes)
5. **Timezone Support**: Per-task timezone configuration
