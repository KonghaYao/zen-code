/**
 * Cron Middleware
 *
 * Provides agents with cron task management capabilities via a unified tool.
 * All operations are performed through the `cron_command` tool with different commands.
 */

import { tool } from 'langchain';
import { z } from 'zod';
import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';
import type { CronTask, CronLog } from '../cron/types.js';

// ========================================
// Schemas
// ========================================

const TaskSchema = z.object({
    id: z.string().min(1).describe('Task ID'),
    name: z.string().min(1).describe('Task name'),
    description: z.string().optional().describe('Task description'),
    cron_expression: z
        .string()
        .min(5)
        .describe('Cron expression (5 fields: minute hour day-of-month month day-of-week)'),
    prompt: z.string().min(1).describe('Prompt to execute'),
    agent_id: z.string().min(1).describe('Agent ID to use'),
    initial_state: z
        .record(z.string(), z.unknown())
        .optional()
        .default({})
        .describe(
            'Initial state parameters for the LangGraph run. Must include: cwd (workspace path). Recommended: model_id (model to use), provider_type (e.g. "openai" | "anthropic"). Optional: agent_id (overrides task agent_id). Example: { cwd: "/workspace", model_id: "model-uuid", provider_type: "openai" }',
        ),
    enabled: z.boolean().optional().default(true).describe('Enabled state'),
    max_retries: z.number().min(0).max(10).optional().default(0).describe('Max retry count'),
    variables: z.record(z.string(), z.string()).optional().describe('Variables (key-value object, NOT JSON string)'),
});

const CronCommandSchema = z.object({
    command: z.enum(['list', 'get', 'upsert', 'delete', 'toggle', 'trigger', 'logs', 'status']),
    filter: z.enum(['all', 'enabled', 'disabled']).optional(),
    task_id: z.string().optional(),
    task: TaskSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
});

// ========================================
// Types
// ========================================

export interface CronMiddlewareOptions {
    storage: CronStorage;
    scheduler: CronScheduler;
}

export type CronCommandInput = z.infer<typeof CronCommandSchema>;

// ========================================
// Cron Middleware
// ========================================

const CRON_TOOL_DESCRIPTION = `
Manage cron scheduled tasks in the zen-swarm system.

⚠️ CRITICAL: All object parameters (task, updates) MUST be passed as JavaScript objects, NOT as JSON strings!
- WRONG: "task": "{\\"id\\": \\"...\\", ...}" (This is a string)
- CORRECT: "task": {"id": "...", ...} (This is an object)
- Do NOT use JSON.stringify() on nested object parameters!

## Available Commands

### list
List all cron tasks.

\`\`\`json
{
  "command": "list",
  "filter": "all" | "enabled" | "disabled"
}
\`\`\`

### get
Get details of a specific task.

\`\`\`json
{
  "command": "get",
  "task_id": "my-task-id"
}
\`\`\`

### upsert
Create a new task or update an existing one.
If task ID exists, it will be updated. If not, a new task will be created.

The \`task\` parameter MUST be a JavaScript object, NOT a JSON string. Do NOT use JSON.stringify().

\`\`\`json
{
  "command": "upsert",
  "task": {
    "id": "daily-report",
    "name": "Daily Report",
    "description": "Generate daily activity report",
    "cron_expression": "0 9 * * *",
    "prompt": "Generate a summary report of yesterday's activities",
    "agent_id": "agents/default",
    "initial_state": {
      "cwd": "/workspace/my-project",
      "model_id": "model-uuid",
      "provider_type": "openai"
    },
    "enabled": true,
    "max_retries": 3,
    "variables": {}
  }
}
\`\`\`

Note: The \`variables\` field is an object with string values, also MUST NOT be a JSON string.

### delete
Delete a task permanently.

\`\`\`json
{
  "command": "delete",
  "task_id": "daily-report"
}
\`\`\`

### toggle
Toggle task enabled state (pause/resume).

\`\`\`json
{
  "command": "toggle",
  "task_id": "daily-report"
}
\`\`\`

### trigger
Manually trigger a task execution.

\`\`\`json
{
  "command": "trigger",
  "task_id": "daily-report"
}
\`\`\`

### logs
View execution history and logs.

\`\`\`json
{
  "command": "logs",
  "task_id": "daily-report",
  "limit": 20
}
\`\`\`

### status
Get scheduler and queue status.

\`\`\`json
{
  "command": "status"
}
\`\`\`

## Cron Expression Format

Standard 5-field cron expression:
\`\`\`
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
\`\`\`

Examples:
- \`0 9 * * 1-5\` - Weekdays at 9:00 AM
- \`*/30 * * * *\` - Every 30 minutes
- \`0 0 * * 0\` - Every Sunday at midnight
- \`0 0 1 * *\` - First day of every month at midnight

## Important Notes

1. Always use valid cron expressions
2. The \`agent_id\` must reference an existing agent
3. Use \`toggle\` to pause/resume tasks without deleting them
4. Check \`logs\` to monitor task execution and debug issues
5. Use descriptive task IDs and names for clarity
`;

/**
 * Create the cron command tool
 */
function createCronTool(storage: CronStorage, scheduler: CronScheduler) {
    return tool(
        async (input: CronCommandInput) => {
            try {
                switch (input.command) {
                    case 'list': {
                        let tasks: CronTask[];
                        if (input.filter === 'enabled') {
                            tasks = await storage.getEnabledTasks();
                        } else {
                            tasks = await storage.getAllTasks();
                            if (input.filter === 'disabled') {
                                tasks = tasks.filter((t) => !t.enabled);
                            }
                        }
                        return JSON.stringify(
                            {
                                success: true,
                                count: tasks.length,
                                tasks: tasks.map((t) => ({
                                    id: t.id,
                                    name: t.name,
                                    description: t.description,
                                    cron_expression: t.cron_expression,
                                    agent_id: t.agent_id,
                                    initial_state: t.initial_state,
                                    enabled: t.enabled,
                                    max_retries: t.max_retries,
                                    created_at: t.created_at,
                                    updated_at: t.updated_at,
                                })),
                            },
                            null,
                            2,
                        );
                    }

                    case 'get': {
                        const task = await storage.getTask(input.task_id!);
                        if (!task) {
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Task not found: ${input.task_id}`,
                                },
                                null,
                                2,
                            );
                        }
                        return JSON.stringify(
                            {
                                success: true,
                                task,
                            },
                            null,
                            2,
                        );
                    }

                    case 'upsert': {
                        try {
                            const existing = await storage.getTask(input.task!.id);
                            const message = existing
                                ? `Task "${input.task!.name}" updated`
                                : `Task "${input.task!.name}" created and scheduled`;

                            if (existing) {
                                await storage.updateTask(input.task!);
                            } else {
                                await storage.insertTask(input.task!);
                            }

                            const task = await storage.getTask(input.task!.id);
                            if (task) {
                                scheduler.scheduleTask(task);
                            }

                            return JSON.stringify(
                                {
                                    success: true,
                                    id: input.task!.id,
                                    message,
                                },
                                null,
                                2,
                            );
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Failed to upsert task: ${message}`,
                                },
                                null,
                                2,
                            );
                        }
                    }

                    case 'delete': {
                        try {
                            const existing = await storage.getTask(input.task_id!);
                            if (!existing) {
                                return JSON.stringify(
                                    {
                                        success: false,
                                        error: `Task not found: ${input.task_id}`,
                                    },
                                    null,
                                    2,
                                );
                            }

                            scheduler.unscheduleTask(input.task_id!);
                            await storage.deleteTask(input.task_id!);

                            return JSON.stringify(
                                {
                                    success: true,
                                    id: input.task_id,
                                    message: `Task "${existing.name}" deleted`,
                                },
                                null,
                                2,
                            );
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Failed to delete task: ${message}`,
                                },
                                null,
                                2,
                            );
                        }
                    }

                    case 'toggle': {
                        try {
                            const task = await storage.getTask(input.task_id!);
                            if (!task) {
                                return JSON.stringify(
                                    {
                                        success: false,
                                        error: `Task not found: ${input.task_id}`,
                                    },
                                    null,
                                    2,
                                );
                            }

                            const newEnabled = !task.enabled;
                            await storage.updateTask({
                                id: input.task_id!,
                                enabled: newEnabled,
                            });

                            if (newEnabled) {
                                const updated = await storage.getTask(input.task_id!);
                                if (updated) {
                                    scheduler.scheduleTask(updated);
                                }
                            } else {
                                scheduler.unscheduleTask(input.task_id!);
                            }

                            return JSON.stringify(
                                {
                                    success: true,
                                    id: input.task_id,
                                    enabled: newEnabled,
                                    message: `Task "${task.name}" ${newEnabled ? 'resumed' : 'paused'}`,
                                },
                                null,
                                2,
                            );
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Failed to toggle task: ${message}`,
                                },
                                null,
                                2,
                            );
                        }
                    }

                    case 'trigger': {
                        try {
                            const task = await storage.getTask(input.task_id!);
                            if (!task) {
                                return JSON.stringify(
                                    {
                                        success: false,
                                        error: `Task not found: ${input.task_id}`,
                                    },
                                    null,
                                    2,
                                );
                            }

                            const logId = await scheduler.triggerManually(input.task_id!);

                            return JSON.stringify(
                                {
                                    success: true,
                                    id: input.task_id,
                                    logId,
                                    message: `Task "${task.name}" triggered manually`,
                                },
                                null,
                                2,
                            );
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Failed to trigger task: ${message}`,
                                },
                                null,
                                2,
                            );
                        }
                    }

                    case 'logs': {
                        try {
                            let logs: CronLog[];
                            if (input.task_id) {
                                logs = await storage.getLogsByTaskId(
                                    input.task_id,
                                    input.limit ?? 50,
                                    input.offset ?? 0,
                                );
                            } else {
                                logs = await storage.getRecentLogs(input.limit ?? 50);
                            }

                            return JSON.stringify(
                                {
                                    success: true,
                                    count: logs.length,
                                    logs: logs.map((log) => ({
                                        id: log.id,
                                        cron_task_id: log.cron_task_id,
                                        thread_id: log.thread_id,
                                        status: log.status,
                                        started_at: log.started_at,
                                        finished_at: log.finished_at,
                                        error_message: log.error_message,
                                        retry_count: log.retry_count,
                                        queued_at: log.queued_at,
                                    })),
                                },
                                null,
                                2,
                            );
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            return JSON.stringify(
                                {
                                    success: false,
                                    error: `Failed to get logs: ${message}`,
                                },
                                null,
                                2,
                            );
                        }
                    }

                    case 'status': {
                        const queueStatus = scheduler.getQueueStatus();
                        const schedulerStatus = {
                            isRunning: scheduler.isActive(),
                            scheduledCount: scheduler.getScheduledCount(),
                        };

                        return JSON.stringify(
                            {
                                success: true,
                                scheduler: schedulerStatus,
                                queue: queueStatus,
                            },
                            null,
                            2,
                        );
                    }

                    default:
                        return JSON.stringify(
                            {
                                success: false,
                                error: `Unknown command: ${(input as any).command}`,
                            },
                            null,
                            2,
                        );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return JSON.stringify(
                    {
                        success: false,
                        error: `Internal error: ${message}`,
                    },
                    null,
                    2,
                );
            }
        },
        {
            name: 'cron_command',
            description: CRON_TOOL_DESCRIPTION,
            schema: CronCommandSchema,
        },
    );
}

// ========================================
// Middleware Class
// ========================================

/**
 * Cron Middleware
 *
 * Provides agent with cron task management capabilities via a unified tool.
 *
 * @example
 * ```typescript
 * import { CronMiddleware } from './middlewares/cron.js';
 * import { CronStorage } from '../cron/storage.js';
 * import { CronScheduler } from '../cron/scheduler.js';
 *
 * const storage = new CronStorage('./data/cron.db');
 * const scheduler = new CronScheduler(storage, executor);
 *
 * const middleware = new CronMiddleware({ storage, scheduler });
 *
 * // Use in agent creation
 * createAgent({
 *   tools: [...middleware.tools],
 *   // ...
 * });
 * ```
 */
export class CronMiddleware {
    name = 'CronMiddleware';

    tools: ReturnType<typeof createCronTool>[];

    private storage: CronStorage;
    private scheduler: CronScheduler;

    constructor(options: CronMiddlewareOptions) {
        this.storage = options.storage;
        this.scheduler = options.scheduler;
        this.tools = [createCronTool(this.storage, this.scheduler)];
    }
}

/**
 * Create CronMiddleware with dependency injection
 */
export function createCronMiddleware(options: CronMiddlewareOptions): CronMiddleware {
    return new CronMiddleware(options);
}
