/**
 * useApprovalIntegration - 审批系统集成 Hook
 *
 * 监听 LangGraph 消息流，检测中断的工具并添加到 InteractionContext
 * 注意：执行逻辑由各工具的 render 函数自己处理（如 terminal.tsx），此 Hook 只负责检测和添加
 *
 * 重要：此 Hook 只处理非 UI 工具的情况。UI 工具（如 terminal）会在自己的 render 函数中处理审批
 */

import { useEffect, useRef } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useInteractionContext } from '../interaction';

/**
 * UI 工具列表 - 这些工具会在自己的 render 函数中处理审批
 */
const UI_TOOLS = ['terminal', 'ask_user_with_options'];

/**
 * 检查消息是否是工具调用（通过 type 或 content 判断）
 */
function isToolCallMessage(message: any): boolean {
    // 检查 type 字段
    if (message.type === 'tool') {
        return true;
    }

    // 检查 content 中是否有工具调用信息
    if (message.content && typeof message.content === 'object') {
        // 检查是否有 tool_calls 数组
        if (message.content.tool_calls && Array.isArray(message.content.tool_calls)) {
            return message.content.tool_calls.length > 0;
        }
    }

    return false;
}

/**
 * 从消息中提取工具调用信息
 */
function extractToolCallInfo(message: any): { name: string; args: any; tool?: any } | null {
    // 优先从 content.tool_calls 获取
    if (message.content && message.content.tool_calls && Array.isArray(message.content.tool_calls)) {
        const toolCall = message.content.tool_calls[0];
        return {
            name: toolCall.name || toolCall.function?.name,
            args: toolCall.args || toolCall.function?.arguments || {},
            tool: message, // 存储整个 message 对象
        };
    }

    // 尝试从 message 本身获取
    if (message.name) {
        return {
            name: message.name,
            args: message.input || message.args || message.content?.input || {},
            tool: message,
        };
    }

    return null;
}

/**
 * 生成消息的唯一标识符
 */
function getMessageId(message: any): string {
    if (message.id) return message.id;
    if (message.message_id) return message.message_id;

    // 使用内容和时间戳生成唯一标识
    return JSON.stringify({
        name: message.name,
        content: message.content,
        timestamp: message.created_at || message.timestamp || Date.now(),
    });
}

/**
 * 审批系统集成 Hook
 *
 * 职责：
 * 1. 监听 renderMessages，检测工具调用
 * 2. 将工具调用添加到 InteractionContext（统一交互系统）
 * 3. 执行逻辑由各工具的 render 函数自己处理
 */
export const useApprovalIntegration = () => {
    const { renderMessages } = useChat();
    const { addInteraction, getInteractions } = useInteractionContext();
    const processedMessageIds = useRef<Set<string>>(new Set());

    /**
     * 监听 renderMessages 变化，检测新的工具调用
     */
    useEffect(() => {
        for (const message of renderMessages) {
            const messageId = getMessageId(message);

            // 如果已经处理过这个消息，跳过
            if (processedMessageIds.current.has(messageId)) {
                continue;
            }

            // 检查是否是工具调用
            if (isToolCallMessage(message)) {
                const toolCallInfo = extractToolCallInfo(message);

                if (toolCallInfo) {
                    // 跳过 UI 工具 - 它们会在自己的 render 函数中处理审批
                    if (UI_TOOLS.includes(toolCallInfo.name)) {
                        console.log('[useApprovalIntegration] Skipping UI tool:', toolCallInfo.name);
                        processedMessageIds.current.add(messageId);
                        continue;
                    }

                    // 检查是否已经在交互队列中
                    const interactions = getInteractions();
                    const exists = interactions.some(i =>
                        i.content.type === 'approval' &&
                        i.content.toolCall.name === toolCallInfo.name &&
                        JSON.stringify(i.content.toolCall.args) === JSON.stringify(toolCallInfo.args)
                    );

                    if (!exists) {
                        console.log('[useApprovalIntegration] Adding tool to interaction queue:', toolCallInfo.name);

                        addInteraction(
                            {
                                type: 'approval',
                                toolCall: {
                                    name: toolCallInfo.name,
                                    args: toolCallInfo.args,
                                },
                                editableFields: ['args'],
                            },
                            {
                                tool: toolCallInfo.tool, // 存储 tool 对象，工具的 render 函数会用它调用 sendResumeData
                                metadata: {
                                    title: `审批 ${toolCallInfo.name}`,
                                    description: (message as any).description,
                                    groupKey: 'approvals',
                                },
                            }
                        );

                        // 标记为已处理
                        processedMessageIds.current.add(messageId);
                    }
                }
            }
        }
    }, [renderMessages, addInteraction, getInteractions]);

    return {
        hasPendingApprovals: getInteractions().some(i => i.content.type === 'approval' && i.state === 'pending'),
        approvalCount: getInteractions().filter(i => i.content.type === 'approval').length,
    };
};
