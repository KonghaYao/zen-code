/**
 * useApprovalIntegration - 审批系统集成 Hook
 *
 * 监听 LangGraph 消息流，检测工具调用并添加到 InteractionContext
 *
 * 职责：
 * 1. 监听 renderMessages，检测工具调用
 * 2. 将工具调用添加到 InteractionContext（仅对需要审批的工具）
 * 3. 通过 exists 检测避免重复添加
 *
 * 注意：
 * - 仅处理需要全局审批的工具（如 terminal）
 * - HITL 中间件生效时：工具 render 函数先添加，exists 检测跳过
 * - HITL 中间件未生效时：此 Hook 添加，工具 render 函数通过 getInteractions() 查找
 */

/**
 * 不需要全局审批的工具白名单
 * 这些工具会自己创建特定类型的交互（如 selection）
 */
const SKIP_TOOLS: string[] = [
];

import { useEffect, useRef } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useInteractionContext } from '../interaction';

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
    console.log('[extractToolCallInfo] Extracting from message:', message);

    // 优先从 content.tool_calls 获取
    if (message.content && message.content.tool_calls && Array.isArray(message.content.tool_calls)) {
        const toolCall = message.content.tool_calls[0];
        const args = toolCall.args || toolCall.function?.arguments || toolCall.function?.parameters || {};

        console.log('[extractToolCallInfo] From tool_calls:', { name: toolCall.name, args });

        return {
            name: toolCall.name || toolCall.function?.name,
            args,
            tool: message, // 存储整个 message 对象
        };
    }

    // 尝试从 message 本身获取
    if (message.name) {
        // 尝试多个可能的参数字段
        const args = message.input || message.args || message.content?.input || message.content?.args || message.parameters || {};

        console.log('[extractToolCallInfo] From message:', { name: message.name, args });

        return {
            name: message.name,
            args,
            tool: message,
        };
    }

    console.log('[extractToolCallInfo] Failed to extract tool call info');
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
 * 1. 监听 renderMessages，检测所有工具调用
 * 2. 将工具调用添加到 InteractionContext（通过 exists 检测避免重复）
 * 3. 执行逻辑由 UnifiedUIPanel 中的渲染器处理（通过 tool.sendResumeData 发送结果）
 *
 * MODIFIED: 会话隔离逻辑
 * - 为每个交互添加 chatId 字段，实现会话隔离
 * - 检测重复时，只检查当前会话（chatId）的交互
 * - 会话切换时不再清空 InteractionContext，避免历史交互丢失
 *
 * 关键机制：
 * - 所有工具（包括 ask_user_with_options、terminal）都统一处理
 * - 通过 chatId + 工具名+参数 检测避免重复添加
 * - HITL 中间件生效时：工具 render 函数先添加，exists 检测跳过
 * - HITL 中间件未生效时：此 Hook 添加，工具 render 函数通过 getInteractions() 查找
 */
export const useApprovalIntegration = () => {
    const { renderMessages, currentChatId } = useChat();
    const { addInteraction, getInteractions } = useInteractionContext();

    // 调试：打印消息数量
    useEffect(() => {
        console.log('[useApprovalIntegration] renderMessages count:', renderMessages.length, 'chatId:', currentChatId);
    }, [renderMessages, currentChatId]);

    /**
     * MODIFIED: 监听 renderMessages 变化，检测新的工具调用
     *
     * 去重逻辑：
     * 1. 只检查当前会话（chatId）的交互
     * 2. 对于每个工具调用消息，检查当前会话中是否已存在（工具名+参数匹配）
     * 3. 只添加不存在的工具调用
     * 4. 为每个交互添加 chatId 字段，实现会话隔离
     *
     * 注意：移除 getInteractions 依赖，避免无限循环（每次添加交互都会更新 getInteractions 的引用）
     */
    useEffect(() => {
        if (!currentChatId) {
            console.log('[useApprovalIntegration] No chatId, skipping');
            return;
        }

        console.log('[useApprovalIntegration] Checking renderMessages:', renderMessages.length, 'chatId:', currentChatId);

        // MODIFIED: 获取当前交互列表（用于去重检查）
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const currentInteractions = getInteractions();
        const currentSessionInteractions = currentInteractions.filter(i => i.metadata.chatId === currentChatId);

        console.log('[useApprovalIntegration] Current session interactions count:', currentSessionInteractions.length);

        for (const message of renderMessages) {
            // 检查是否是工具调用
            if (isToolCallMessage(message)) {
                const toolCallInfo = extractToolCallInfo(message);

                if (toolCallInfo) {
                    // 跳过白名单中的工具（这些工具自己创建交互）
                    if (SKIP_TOOLS.includes(toolCallInfo.name)) {
                        console.log('[useApprovalIntegration] Skipping tool (self-handled):', toolCallInfo.name);
                        continue;
                    }

                    // MODIFIED: 检查当前会话中是否已经存在（工具名+参数匹配）
                    const exists = currentSessionInteractions.some(i =>
                        i.content.type === 'approval' &&
                        i.content.toolCall.name === toolCallInfo.name &&
                        JSON.stringify(i.content.toolCall.args) === JSON.stringify(toolCallInfo.args)
                    );

                    if (exists) {
                        console.log('[useApprovalIntegration] Tool already exists in current session, skipping:', toolCallInfo.name);
                        continue;
                    }

                    // MODIFIED: 只添加真正新的工具调用，并附带 chatId
                    console.log('[useApprovalIntegration] Adding new tool to interaction queue:', toolCallInfo.name, 'chatId:', currentChatId);

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
                                chatId: currentChatId, // MODIFIED: 添加 chatId 实现会话隔离
                            },
                        }
                    );
                }
            }
        }
    }, [renderMessages, addInteraction, currentChatId]);

    return {
        hasPendingApprovals: getInteractions().some(i =>
            i.content.type === 'approval' &&
            (i.state === 'idle' || i.state === 'active') &&
            i.metadata.chatId === currentChatId
        ),
        approvalCount: getInteractions().filter(i =>
            i.content.type === 'approval' &&
            i.metadata.chatId === currentChatId
        ).length,
    };
};
