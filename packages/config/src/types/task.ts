/**
 * Task System Core Types
 * 任务系统核心类型定义
 */

import { z } from 'zod';

// ============= Spark List Types =============

export const SparkItemTypeSchema = z.enum(['idea', 'bug_report', 'feature', 'refactor']);
export type SparkItemType = z.infer<typeof SparkItemTypeSchema>;

export const SparkPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type SparkPriority = z.infer<typeof SparkPrioritySchema>;

export const SparkStatusSchema = z.enum(['pending', 'planned', 'archived']);
export type SparkStatus = z.infer<typeof SparkStatusSchema>;

export const SparkSourceSchema = z.enum(['user_input', 'ai_suggestion', 'conversation_derived']);
export type SparkSource = z.infer<typeof SparkSourceSchema>;

export const SparkItemSchema = z.object({
    id: z.string().uuid(),
    type: SparkItemTypeSchema,
    title: z.string().min(1).max(200),
    description: z.string(),
    priority: SparkPrioritySchema.default('medium'),
    source: SparkSourceSchema,
    status: SparkStatusSchema.default('pending'),
    createdAt: z.string().datetime(),
    tags: z.array(z.string()).default([]),
    metadata: z
        .object({
            relatedFiles: z.array(z.string()).optional(),
            conversationContext: z.string().optional(),
            estimatedComplexity: z.enum(['simple', 'medium', 'complex']).optional(),
        })
        .optional(),
});

export type SparkItem = z.infer<typeof SparkItemSchema>;

export const SparkStoreSchema = z.object({
    version: z.literal('1.0'),
    sparks: z.array(SparkItemSchema),
    lastUpdated: z.string().datetime(),
});

export type SparkStore = z.infer<typeof SparkStoreSchema>;

// ============= Task System Types =============

export const TaskStatusSchema = z.enum([
    'pickup', // 待领取（新任务，未被 agent 接管）
    'running', // 运行中（agent 正在执行）
    'complete', // 已完成（成功完成）
    'error', // 已失败（失败，暂停中）
    'review', // 待审核（完成，等待人工确认）
    'feedback', // 待反馈（agent 卡住，需要人工输入）
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const AgentTypeSchema = z.enum([
    'default',
    'planner',
    'reviewer',
    'refactor',
    'finder',
    'debugger',
    'architect',
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const TaskExecutionSchema = z.enum(['serial', 'parallel']);
export type TaskExecution = z.infer<typeof TaskExecutionSchema>;

// TaskNode interface for recursive type definition
export interface TaskNode {
    // 基本信息
    id: string;
    title: string;
    description: string;

    // 执行控制
    execution?: TaskExecution;
    children?: TaskNode[];

    // Agent 分配
    agentType?: AgentType;
    threadId?: string; // 关联的 LangGraph thread ID

    // 元数据
    estimatedTime?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    dependencies?: string[];
    acceptanceCriteria?: string[];

    // 状态相关（运行时）
    status?: TaskStatus;
    startedAt?: string;
    completedAt?: string;
    assignedTo?: AgentType; // 改为类型安全的 AgentType
    error?: {
        message: string;
        stack?: string;
        retryCount?: number;
    };
}

// Zod schema for validation
export const TaskNodeSchema: z.ZodType<TaskNode> = z.lazy(() =>
    z.object({
        // 基本信息
        id: z.string(),
        title: z.string().min(1).max(200),
        description: z.string(),

        // 执行控制
        execution: TaskExecutionSchema.optional(),
        children: z.array(z.lazy(() => TaskNodeSchema)).optional(),

        // Agent 分配
        agentType: AgentTypeSchema.optional(),
        threadId: z.string().optional(),

        // 元数据
        estimatedTime: z.string().optional(),
        complexity: z.enum(['simple', 'medium', 'complex']).optional(),
        dependencies: z.array(z.string()).optional(),
        acceptanceCriteria: z.array(z.string()).optional(),

        // 状态相关（运行时）
        status: TaskStatusSchema.optional(),
        startedAt: z.string().datetime().optional(),
        completedAt: z.string().datetime().optional(),
        assignedTo: AgentTypeSchema.optional(),
        error: z
            .object({
                message: z.string(),
                stack: z.string().optional(),
                retryCount: z.number().optional(),
            })
            .optional(),
    }),
);

export const TaskExecutionRecordSchema = z.object({
    taskId: z.string(),
    planId: z.string(),
    threadId: z.string(), // 关联的 LangGraph thread ID
    agentType: AgentTypeSchema, // 改为类型安全的 AgentType
    status: TaskStatusSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    output: z.string().optional(),
    error: z.string().optional(),
    changedFiles: z.array(z.string()).optional(),
});

export type TaskExecutionRecord = z.infer<typeof TaskExecutionRecordSchema>;

export const TaskStoreSchema = z.object({
    version: z.literal('1.0'),
    lastUpdated: z.string().datetime(),

    // 活跃的任务树
    activePlanId: z.string().optional(),
    tasks: z.record(z.string(), TaskNodeSchema),

    // 执行历史
    history: z.array(TaskExecutionRecordSchema),

    // 全局配置
    config: z.object({
        maxConcurrentAgents: z.number().min(1).max(10).default(3),
        retryLimit: z.number().min(0).max(10).default(3),
        autoResume: z.boolean().default(false),
    }),
});

export type TaskStore = z.infer<typeof TaskStoreSchema>;
