/**
 * task 工具 - 子代理任务执行
 * 用于启动和管理子代理执行复杂任务
 */

import React, { useEffect, useRef, useState } from 'react';
import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';

import { z } from 'zod';

/**
 * Task 工具参数 Schema
 */
const TaskSchema = z.object({
    task_id: z.string().optional().describe('The task id to ask the subagent'),
    subagent_id: z.string().describe('The id of subagent to use'),
    subagent_type: z
        .string()
        .describe('The type of subagent to use (general-purpose, statusline-setup, output-style-setup)'),
    task_description: z.string().describe('Describe what you want the subagent to do'),
    data_transfer: z.any().optional().describe('Data to transfer to the subagent'),
});

export type TaskParams = z.infer<typeof TaskSchema>;

/**
 * 任务头部信息
 */
const TaskHeader: React.FC<{ tool: ToolRenderData<Record<string, never>, TaskParams> }> = ({ tool }) => {
    const input = tool.getInputRepaired();

    // 防御：subagent_id 在流式阶段可能是 undefined 或非字符串
    const subagentId = typeof input?.subagent_id === 'string' ? input.subagent_id : String(input?.subagent_id ?? '');

    // 提取并格式化 task_description
    const rawDesc = input?.task_description as unknown as string;
    const truncatedDesc = rawDesc ? rawDesc.slice(0, 50) : '';
    const hasEllipsis = rawDesc && rawDesc.length > 50;

    return (
        <Box paddingX={1} flexDirection="column">
            <Box>
                <Text color="yellow">Task </Text>
                <Text dimColor>{'→ '}</Text>
                <Text color="cyan">@{subagentId}</Text>
            </Box>
            <Box>
                <Text dimColor>{'  '}</Text>
                <Text color="gray" italic>
                    {truncatedDesc}
                    {hasEllipsis && <Text color="dim">...</Text>}
                </Text>
            </Box>
        </Box>
    );
};

/**
 * 主渲染组件
 */
const TaskComponent: React.FC<{
    tool: ToolRenderData<Record<string, never>, TaskParams>;
}> = ({ tool }) => {
    return (
        <Box flexDirection="column">
            {/* 头部信息 */}
            <TaskHeader tool={tool} />
        </Box>
    );
};

/**
 * task 工具定义
 */
export const task = createUITool({
    name: 'task',
    description: 'Launch a subagent to handle complex tasks autonomously',
    parameters: TaskSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        return <TaskComponent tool={tool as any} />;
    },
});
