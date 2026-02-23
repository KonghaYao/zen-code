import { Box, Static, Text } from 'ink';

import { useState, useMemo, Fragment, memo, useCallback } from 'react';
import { useTimeout } from 'usehooks-ts';
import MessageHuman from './MessageHuman';
import MessageAI from './MessageAI';
import { RenderMessage } from '@langgraph-js/sdk';
import { getTextContent } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';
import { PlatformStatic } from '../common/PlatformStatic';
import DynamicRenderer from './DynamicRenderer';

interface CompactMessagesBoxProps {
    renderMessages: RenderMessage[];
    startIndex: number;
    staticKey: string;
    depth?: number;
    loading: boolean;
    getToolUIRender: (toolName: string) => ((msg: RenderMessage) => React.ReactNode) | null;
}

type CompactRenderMessages =
    | RenderMessage
    | {
          id: string;
          type: 'group';
          toolGroup: RenderMessage[];
      };

/**
 * ToolGroupExtraRender - 工具组额外渲染组件
 *
 * 内存泄漏修复：
 * 1. getToolUIRender 通过 props 传入，避免使用 useChat() 导致 memo 失效
 * 2. 限制 submessages 深度最多 1 层，防止无限递归
 * 3. 每个工具消息最多显示 4 条 sub_messages
 */
const ToolGroupExtraRender = memo(function ToolGroupExtraRender({
    toolGroup,
    groupId,
    getToolUIRender,
    depth = 0,
    loading,
}: {
    toolGroup: RenderMessage[];
    groupId: string;
    getToolUIRender: (toolName: string) => ((msg: RenderMessage) => React.ReactNode) | null;
    depth?: number;
    loading: boolean;
}) {
    // 限制递归深度，防止无限嵌套导致内存泄漏
    if (depth > 1) {
        return null;
    }

    return (
        <Box flexDirection="column">
            {toolGroup.map((msg, idx) => {
                const render = msg.name ? getToolUIRender(msg.name!) : null;
                if (!render) return null;
                const totalSubmessages = msg.sub_messages?.length || 0;
                const submessages = msg.sub_messages?.slice(-4) || [];
                const omittedCount = totalSubmessages - submessages.length;

                return (
                    <Fragment key={`${groupId}-${idx}-${msg.status}`}>
                        {render(msg) as any}
                        {submessages.length ? (
                            <>
                                {omittedCount > 0 && (
                                    <Box paddingLeft={2}>
                                        <Text dimColor>
                                            ... {omittedCount} more submessage{omittedCount > 1 ? 's' : ''}
                                        </Text>
                                    </Box>
                                )}
                                {/* 递归渲染，但传入 depth 参数限制深度 */}
                                <CompactMessagesBox
                                    renderMessages={submessages}
                                    startIndex={1}
                                    depth={depth + 1}
                                    // 修复：使用唯一 instanceId 生成 staticKey，避免不同子组件间冲突
                                    staticKey={`sub-d${depth}-i${idx}`}
                                    getToolUIRender={getToolUIRender}
                                    loading={loading}
                                />
                            </>
                        ) : null}
                    </Fragment>
                );
            })}
        </Box>
    );
});
interface MessageItemProps {
    message: CompactRenderMessages;
    displayIndex: number;
    isCurrent: boolean;
    startIndex?: number;
    getToolUIRender: (toolName: string) => ((msg: RenderMessage) => React.ReactNode) | null;
    depth?: number;
    loading: boolean;
}

/**
 * MessageItem - 单条消息渲染组件
 *
 * 将 renderMessage 函数转换为组件，支持 hooks 和更好的 memo 化
 */
const MessageItem = memo(function MessageItem({
    message,
    displayIndex,
    isCurrent,
    startIndex = 0,
    getToolUIRender,
    depth = 0,
    loading,
}: MessageItemProps) {
    return (
        <Box
            flexDirection="column"
            borderStyle={isCurrent ? 'double' : 'single'}
            paddingBottom={1}
            borderLeft={false}
            borderBottom={false}
            borderTop={message.type === 'group' ? false : true}
            borderRight={false}
            borderTopColor={
                message.type === 'ai'
                    ? getColor('teal')
                    : message.type === 'human'
                      ? getColor('amber')
                      : getColor('rose')
            }
        >
            {/* 如果不是 skipMessage，显示消息内容 */}
            {message.type === 'human' ? (
                <MessageHuman content={message.content} messageNumber={displayIndex + 1 + startIndex} />
            ) : null}
            {message.type === 'ai' ? (
                <MessageAI message={message} messageNumber={displayIndex + 1 + startIndex} loading={loading} />
            ) : null}
            {/* 如果有工具组，显示摘要 */}
            {message.type === 'group' && (
                <>
                    <ToolGroupExtraRender
                        toolGroup={message.toolGroup}
                        groupId={message.id}
                        getToolUIRender={getToolUIRender}
                        depth={depth}
                        loading={loading}
                    />
                </>
            )}
        </Box>
    );
});
const hasAITextContent = (message: RenderMessage): boolean => {
    if (message.type !== 'ai') return true;
    try {
        const content = getTextContent(message);
        return !!(content && content.trim().length > 0);
    } catch {
        return false;
    }
};
/**
 * CompactMessagesBox - 紧凑消息显示组件
 *
 * Fully props-driven for better memoization:
 * - No internal useChat() calls
 * - Relies on staticKey from parent for Static component
 */
export const CompactMessagesBox = memo(function CompactMessagesBox({
    renderMessages,
    startIndex,
    staticKey,
    depth = 0,
    getToolUIRender,
    loading,
}: CompactMessagesBoxProps) {
    // 预处理消息：收集连续的 tool 消息并标记
    // 注意：不再预计算 extraRender，只存储数据
    const processedMessages = useMemo(() => {
        let groupCounter = 0;
        return renderMessages
            .filter((i) => {
                if (i.type === 'ai') return hasAITextContent(i);
                return true;
            })
            .reduce((col, cur) => {
                if (cur.type === 'tool') {
                    const last = col[col.length - 1];
                    // 如果上一个元素是 group 且未满 10 个，添加到现有 group
                    // 否则创建新的 group
                    if (last && last.type === 'group' && last.toolGroup.length < 5) {
                        last.toolGroup.push(cur);
                    } else {
                        // 修复：为每个 group 生成唯一的 id，避免 key 冲突
                        col.push({
                            id: `tool-group-${groupCounter++}`,
                            type: 'group' as const,
                            toolGroup: [cur],
                        });
                    }
                } else {
                    col.push(cur);
                }
                return col;
            }, [] as CompactRenderMessages[]);
    }, [renderMessages, hasAITextContent]);

    // 找到当前消息的索引
    let currentDisplayIndex = processedMessages.length - 1;

    // 没有未完成的消息，最后一个作为 current
    if (currentDisplayIndex === -1) {
        currentDisplayIndex = processedMessages.length - 1;
    }

    // 如果不 loading 时, 直接全部静态渲染
    if (!loading) {
        currentDisplayIndex = processedMessages.length;
    }

    const histories = processedMessages.slice(0, currentDisplayIndex);
    const current = processedMessages.slice(currentDisplayIndex);

    return (
        <Box flexDirection="column">
            {/* 历史消息：用 PlatformStatic 固定，仅在 Windows 上启用 Static 能力 */}
            <DynamicRenderer staticKey={`${staticKey} ${histories.length}`}>
                {() => (
                    <Static items={histories}>
                        {(item, i) => (
                            <MessageItem
                                key={item.id ? `hist-${item.id}` : `hist-msg-${depth}-${i}`}
                                message={item}
                                displayIndex={i}
                                isCurrent={false}
                                startIndex={startIndex}
                                getToolUIRender={getToolUIRender}
                                depth={depth}
                                loading={loading}
                            />
                        )}
                    </Static>
                )}
            </DynamicRenderer>

            {/* 当前消息 */}
            {current.map((item, i) => (
                <MessageItem
                    key={item.id ? `curr-${item.id}` : `curr-msg-${depth}-${histories.length}-${i}`}
                    message={item}
                    displayIndex={histories.length + i}
                    isCurrent={true}
                    startIndex={startIndex}
                    getToolUIRender={getToolUIRender}
                    depth={depth}
                    loading={loading}
                />
            ))}
        </Box>
    );
});
