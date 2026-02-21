/**
 * task 工具 - 子代理任务执行
 * 用于启动和管理子代理执行复杂任务
 */

import React, { useEffect, useRef, useState } from 'react';
import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { LimitedOutput } from '../components/common/LimitedOutput';

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

    return (
        <Box paddingX={1} flexDirection="column">
            <Box>
                <Text color="yellow">Task </Text>
                <Text dimColor>(</Text>
                <Text color="cyan">{input.subagent_id}</Text>
                <Text dimColor>)</Text>
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
    const input = tool.getInputRepaired();
    const output = tool.output as string;

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
