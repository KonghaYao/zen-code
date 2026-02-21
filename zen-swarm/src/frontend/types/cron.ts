/**
 * Cron 前端类型定义
 */

// ========================================
// Cron Task Types
// ========================================

export interface CronTask {
    id: string;
    name: string;
    description?: string;
    cron_expression: string;
    prompt: string;
    agent_id: string;
    enabled: boolean;
    max_retries: number;
    variables: Record<string, string>;
    created_at?: string;
    updated_at?: string;
}

export interface CronTaskInput {
    id: string;
    name: string;
    description?: string;
    cron_expression: string;
    prompt: string;
    agent_id: string;
    enabled?: boolean;
    max_retries?: number;
    variables?: Record<string, string>;
}

export interface UpdateCronTaskInput {
    id: string;
    name?: string;
    description?: string;
    cron_expression?: string;
    prompt?: string;
    agent_id?: string;
    enabled?: boolean;
    max_retries?: number;
    variables?: Record<string, string>;
}

// ========================================
// Cron Log Types
// ========================================

export type CronLogStatus = 'pending' | 'queued' | 'running' | 'success' | 'failed';

export interface CronLog {
    id: string;
    cron_task_id: string;
    thread_id?: string;
    status: CronLogStatus;
    started_at: string;
    finished_at?: string;
    error_message?: string;
    retry_count: number;
    queued_at?: string;
    created_at?: string;
}

// ========================================
// Queue Status Types
// ========================================

export interface QueuedExecution {
    taskId: string;
    logId: string;
    queuedAt: string;
}

export interface QueueStatus {
    running: Array<{ taskId: string; logId: string }>;
    queued: QueuedExecution[];
}

export interface SchedulerStatus {
    isRunning: boolean;
    scheduledCount: number;
}
