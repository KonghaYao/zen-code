---
name: cron
description:
    Cron task management (create, update, delete, trigger scheduled tasks). Use when the user wants to manage
    scheduled/cron tasks, set up periodic jobs, or check cron execution logs.
---

# Cron Task Management

Manage cron scheduled tasks via the zen-core tRPC API.

## API Base

All cron operations use tRPC endpoints at `http://127.0.0.1:8125/api/trpc/cron.*`

Use `curl` to call tRPC endpoints. Query procedures use GET, mutation procedures use POST.

## Available Operations

### List all tasks

```bash
curl 'http://127.0.0.1:8125/api/trpc/cron.listTasks'
```

### Get a specific task

```bash
curl 'http://127.0.0.1:8125/api/trpc/cron.getTask?input=%7B%22id%22%3A%22my-task-id%22%7D'
```

### Create a task

```bash
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.createTask' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "daily-report",
    "name": "Daily Report",
    "description": "Generate daily activity report",
    "cron_expression": "0 9 * * *",
    "prompt": "Generate a summary report",
    "agent_id": "agents/default",
    "initial_state": {
      "cwd": "/workspace/my-project",
      "model_id": "model-uuid",
      "provider_type": "openai"
    },
    "enabled": true,
    "max_retries": 3,
    "variables": {}
  }'
```

### Update a task

```bash
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.updateTask' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "daily-report",
    "cron_expression": "0 10 * * *",
    "enabled": false
  }'
```

### Delete a task

```bash
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.deleteTask' \
  -H 'Content-Type: application/json' \
  -d '{"id": "daily-report"}'
```

### Toggle task enabled state

```bash
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.toggleTask' \
  -H 'Content-Type: application/json' \
  -d '{"id": "daily-report"}'
```

### Manually trigger a task

```bash
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.triggerTask' \
  -H 'Content-Type: application/json' \
  -d '{"id": "daily-report"}'
```

### Get execution logs

```bash
# Logs for a specific task
curl 'http://127.0.0.1:8125/api/trpc/cron.getLogs?input=%7B%22taskId%22%3A%22daily-report%22%2C%22limit%22%3A20%7D'

# Recent logs across all tasks
curl 'http://127.0.0.1:8125/api/trpc/cron.getRecentLogs?input=%7B%22limit%22%3A50%7D'
```

### Get scheduler/queue status

```bash
curl 'http://127.0.0.1:8125/api/trpc/cron.getSchedulerStatus'
curl 'http://127.0.0.1:8125/api/trpc/cron.getQueueStatus'
```

### Clear logs

```bash
# Clear all logs for a task
curl -X POST 'http://127.0.0.1:8125/api/trpc/cron.clearAllLogs' \
  -H 'Content-Type: application/json' \
  -d '{"taskId": "daily-report"}'
```

## Cron Expression Format

Standard 5-field cron expression:

```
minute (0-59) | hour (0-23) | day-of-month (1-31) | month (1-12) | day-of-week (0-6, Sun=0)
```

Examples:

- `0 9 * * 1-5` — Weekdays at 9:00 AM
- `*/30 * * * *` — Every 30 minutes
- `0 0 * * 0` — Every Sunday at midnight
- `0 0 1 * *` — First day of every month

## Task Fields

| Field             | Required | Description                                               |
| ----------------- | -------- | --------------------------------------------------------- |
| `id`              | Yes      | Unique task identifier                                    |
| `name`            | Yes      | Human-readable name                                       |
| `description`     | No       | Task description                                          |
| `cron_expression` | Yes      | 5-field cron expression                                   |
| `prompt`          | Yes      | Prompt to execute                                         |
| `agent_id`        | Yes      | Agent ID (e.g. `agents/default`)                          |
| `initial_state`   | No       | Initial state params (`cwd`, `model_id`, `provider_type`) |
| `enabled`         | No       | Whether task is active (default: true)                    |
| `max_retries`     | No       | Max retry count 0-10 (default: 0)                         |
| `variables`       | No       | Key-value variables for prompt templates                  |

## Notes

- The `agent_id` must reference an existing agent in the system.
- Use `toggleTask` to pause/resume without deleting.
- Check `getLogs` / `getRecentLogs` to monitor execution and debug.
- The `initial_state.cwd` field determines the workspace directory for execution.
