/**
 * ask_user_with_options 工具 - React DOM 版本
 *
 * 使用统一 UI 交互系统
 */

import React, { useEffect, useRef, useState } from 'react';
import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { useInteractionContext } from '../interaction';
import type { SelectionContent } from '../interaction';

/**
 * 选择内容组件
 * 使用统一交互系统
 */
const SelectionContentComponent: React.FC<{
    tool: ToolRenderData<any, any>;
}> = ({ tool }) => {
    const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
    const [interactionId, setInteractionId] = useState<string | null>(null);
    const hasProcessedRef = useRef(false);

    // MODIFIED: 对齐 zen-code，工具自己创建 selection 交互
    // 当工具中断时，自动添加交互
    useEffect(() => {
        if (tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
            const input = tool.getInputRepaired();

            // 转换选项格式
            const options = input.options?.map((option: any) => ({
                label: option.label,
                value: option.label,
                description: option.description,
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
                    title: input.description || 'Select an option',
                    groupKey: 'user-input',
                },
            });

            setInteractionId(interaction.id);
        }
    }, [tool, interactionId, addInteraction]);

    // 监听交互状态变化，当交互完成时发送结果
    useEffect(() => {
        if (!interactionId || hasProcessedRef.current) return;

        const checkInteraction = () => {
            const interactions = getInteractions();
            const interaction = interactions.find(i => i.id === interactionId);

            if (interaction && (interaction.state === 'submitted' || interaction.state === 'edited' || interaction.state === 'cancelled') && !interaction.resultSent) {
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

                console.log('[ask_user_with_options] Sent result:', message);

                // 标记结果已发送
                updateInteraction(interactionId, { resultSent: true });
            }
        };

        // 立即检查一次
        checkInteraction();

        // 设置轮询检查交互状态
        const interval = setInterval(checkInteraction, 100);

        return () => clearInterval(interval);
    }, [interactionId, getInteractions, updateInteraction, tool]);

    // 渲染预览状态
    if (tool.state === 'interrupted' && !tool.output) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <div className="flex items-center gap-2">
                    <span className="text-xl">⏳</span>
                    <span className="text-yellow-700">等待用户选择...</span>
                </div>
            </div>
        );
    }

    // 渲染输出
    if (tool.output) {
        return (
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <span className="text-green-700">{tool.output}</span>
                </div>
            </div>
        );
    }

    return null;
};

export const ask_user_with_options = createUITool({
    name: 'ask_user_with_options',
    description: 'Ask the user for a selection from a list of options',
    parameters: {} as any,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        return <SelectionContentComponent tool={tool} />;
    },
});
