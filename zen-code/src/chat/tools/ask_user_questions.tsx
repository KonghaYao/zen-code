/**
 * ask_user_questions 工具
 * 使用统一的 UI 交互系统
 */

import React, { useEffect, useRef, useState } from 'react';
import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { useInteractionContext } from '../interaction';
import type { SelectionContent } from '../interaction/content';
import { z } from 'zod';

/**
 * 选项 Schema
 */
const OptionSchema = z.object({
    label: z.string().min(1).max(50).describe('选项显示文本，简洁明了（1-50 字符）'),
});

/**
 * 完整参数 Schema
 */
export const AskUserQuestionsSchema = z.object({
    description: z.string().min(1).describe('向用户提出的问题，清晰具体，包含必要的上下文'),
    type: z.enum(['single_select', 'multi_select']).describe('选择类型：single_select（单选）或 multi_select（多选）'),
    options: z.array(OptionSchema).min(2).max(6).describe('选项列表，至少 2 个，最多 6 个'),
    allow_custom_input: z.boolean().default(true).describe('是否允许用户输入自定义文本，默认 true'),
    placeholder: z.string().optional().describe('自定义输入框的占位符文本'),
});

export type AskUserQuestionsParams = z.infer<typeof AskUserQuestionsSchema>;

/**
 * 问题交互组件
 */
const QuestionInteractionComponent: React.FC<{
    tool: any;
}> = ({ tool }) => {
    const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
    const [interactionId, setInteractionId] = useState<string | null>(null);
    const hasProcessedRef = useRef(false);

    const input = tool.getInputRepaired();

    // 1. 工具中断时创建交互
    useEffect(() => {
        if (tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
            // 转换选项格式
            const options =
                input.options?.map((option: any, idx: number) => ({
                    label: option.label,
                    value: option.label,
                })) || [];

            // 构建选择内容
            const content: SelectionContent = {
                type: 'selection',
                options,
                singleSelect: input.type === 'single_select',
                allowCustomInput: input.allow_custom_input ?? true,
                placeholder: input.placeholder,
            };

            // 添加交互
            const interaction = addInteraction(content, {
                tool,
                metadata: {
                    title: input.description || '请选择一个选项',
                    groupKey: 'user-input',
                },
            });

            setInteractionId(interaction.id);
        }
    }, [tool, interactionId, addInteraction, input]);

    // 2. 监听交互状态并发送结果
    useEffect(() => {
        if (!interactionId || hasProcessedRef.current) return;

        const checkInteraction = () => {
            const interactions = getInteractions();
            const interaction = interactions.find((i) => i.id === interactionId);

            // 交互完成且未发送结果
            if (
                interaction &&
                (interaction.state === 'submitted' ||
                    interaction.state === 'edited' ||
                    interaction.state === 'cancelled') &&
                !interaction.resultSent
            ) {
                hasProcessedRef.current = true;

                // 构建结果消息
                const result = interaction.result;
                let message = '';

                if (result) {
                    if (result.selected && result.selected.length > 0) {
                        message += `User selected: ${result.selected.join(', ')}`;
                    }
                    if (result.customInput && result.customInput.trim()) {
                        message += (message ? '\n' : '') + `User Custom Input: ${result.customInput}`;
                    }
                }

                // 发送结果给工具
                tool.sendResumeData({
                    type: 'respond',
                    message: message || 'User made a selection',
                });

                // 标记结果已发送
                updateInteraction(interactionId, { resultSent: true });
            }
        };

        // 立即检查
        checkInteraction();

        // 轮询检查交互状态（100ms 间隔）
        const interval = setInterval(checkInteraction, 100);

        return () => clearInterval(interval);
    }, [interactionId, getInteractions, updateInteraction, tool]);

    // 3. 渲染状态
    if (tool.state === 'interrupted' && !tool.output) {
        return (
            <Box flexDirection="column">
                <Box paddingX={1}>
                    <Text color="yellow">⏳ 等待用户选择...</Text>
                </Box>
            </Box>
        );
    }

    if (tool.output) {
        return <Text color="yellow">{tool.output}</Text>;
    }

    return null;
};

export const ask_user_questions = createUITool({
    name: 'ask_user_questions',
    description: 'Ask the user a question with selectable options',
    parameters: AskUserQuestionsSchema,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        return <QuestionInteractionComponent tool={tool} />;
    },
});
