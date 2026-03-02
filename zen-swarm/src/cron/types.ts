/**
 * Cron 任务系统类型定义
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
    initial_state: Record<string, unknown>; // 完整 state 参数（包含 cwd、model_id 等）
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
    initial_state?: Record<string, unknown>; // 可选，默认 {}
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
    initial_state?: Record<string, unknown>; // 可选
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

export interface CronLogInput {
    id?: string;
    cron_task_id: string;
    thread_id?: string;
    status: CronLogStatus;
    started_at: string;
    finished_at?: string;
    error_message?: string;
    retry_count: number;
    queued_at?: string;
}

// ========================================
// Queue Types
// ========================================

export interface QueuedExecution {
    taskId: string;
    logId: string;
    queuedAt: string;
}

// ========================================
// Database Row Types
// ========================================

export interface CronTaskRow {
    id: string;
    name: string;
    description: string | null;
    cron_expression: string;
    prompt: string;
    agent_id: string;
    initial_state: string; // JSON string
    enabled: number;
    max_retries: number;
    variables: string; // JSON string
    created_at: string;
    updated_at: string;
}

export interface CronLogRow {
    id: string;
    cron_task_id: string;
    thread_id: string | null;
    status: string;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
    retry_count: number;
    queued_at: string | null;
    created_at: string;
}
