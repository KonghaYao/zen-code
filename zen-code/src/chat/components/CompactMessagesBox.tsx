import { Box, Static, Text } from 'ink';
import { useState, useEffect, useMemo, Fragment, memo, useCallback } from 'react';
import MessageHuman from './MessageHuman';
import MessageAI from './MessageAI';
import { RenderMessage } from '@langgraph-js/sdk';
import { getTextContent } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';
import { useChat } from '@langgraph-js/sdk/react';
import { CompactToolSummary } from './CompactToolSummary';

interface CompactMessagesBoxProps {
    renderMessages: RenderMessage[];
    startIndex: number;
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
 * 分离出来避免在 processedMessages 中预计算渲染结果
 */
const ToolGroupExtraRender = memo(function ToolGroupExtraRender({
    toolGroup,
    groupId,
}: {
    toolGroup: RenderMessage[];
    groupId: string;
}) {
    const { getToolUIRender } = useChat();

    return (
        <>
            {toolGroup.map((msg, idx) => {
                const render = msg.name ? getToolUIRender(msg.name!) : null;
                if (!render) return null;
                const totalSubmessages = msg.sub_messages?.length || 0;
                const submessages = msg.sub_messages?.slice(-4) || [];
                const omittedCount = totalSubmessages - submessages.length;
                return (
                    <Fragment key={`extra-render-${groupId}-${idx}`}>
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
                                <CompactMessagesBox renderMessages={submessages} startIndex={1}></CompactMessagesBox>
                            </>
                        ) : null}
                    </Fragment>
                );
            })}
        </>
    );
});

/**
 * CompactMessagesBox - 紧凑消息显示组件
 *
 * 性能优化：
 * 1. 使用 memo 包装组件避免不必要的重新渲染
 * 2. 移除 extraRender 预计算，改为延迟渲染（ToolGroupExtraRender）
 * 3. 使用 useCallback 缓存渲染函数
 * 4. processedMessages 不再存储渲染结果，只存储数据
 */
export const CompactMessagesBox = memo(function CompactMessagesBox({
    renderMessages,
    startIndex,
}: CompactMessagesBoxProps) {
    const { currentChatId } = useChat();
    // 修复 Static 首次渲染问题：强制重新渲染
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 延迟一帧确保 Static 已挂载
        const timer = setTimeout(() => setReady(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // 检查 AI 消息是否有文本内容
    const hasAITextContent = useCallback((message: RenderMessage): boolean => {
        if (message.type !== 'ai') return true;
        try {
            const content = getTextContent(message);
            return !!(content && content.trim().length > 0);
        } catch {
            return false;
        }
    }, []);

    // 预处理消息：收集连续的 tool 消息并标记
    // 注意：不再预计算 extraRender，只存储数据
    const processedMessages = useMemo(() => {
        return renderMessages
            .filter((i) => {
                if (i.type === 'ai') return hasAITextContent(i);
                return true;
            })
            .reduce((col, cur) => {
                if (cur.type === 'tool') {
                    const last = col[col.length - 1];
                    if (last && last.type === 'group') {
                        last.toolGroup.push(cur);
                    } else {
                        col.push({
                            id: cur.id!,
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

    const renderMessage = useCallback(
        (message: CompactRenderMessages, displayIndex: number, isCurrent: boolean) => {
            const messageId = message.id || `message-${displayIndex}`;
            return (
                <Box
                    key={messageId}
                    flexDirection="column"
                    borderStyle={isCurrent ? 'double' : 'single'}
                    borderLeft
                    paddingLeft={1}
                    paddingBottom={1}
                    borderBottom={false}
                    borderTop={false}
                    borderRight={false}
                    borderLeftColor={
                        message.type === 'ai'
                            ? getColor('teal')
                            : message.type === 'human'
                              ? getColor('amber')
                              : 'yellow'
                    }
                >
                    {/* 如果不是 skipMessage，显示消息内容 */}
                    {message.type === 'human' ? (
                        <MessageHuman content={message.content} messageNumber={displayIndex + 1 + startIndex} />
                    ) : null}
                    {message.type === 'ai' ? (
                        <MessageAI message={message} messageNumber={displayIndex + 1 + startIndex} />
                    ) : null}
                    {/* 如果有工具组，显示摘要 */}
                    {message.type === 'group' && (
                        <>
                            {/* <CompactToolSummary
                                toolMessages={message.toolGroup}
                                messageNumber={displayIndex + 1 + startIndex}
                            /> */}
                            {/* 延迟渲染工具额外内容，避免预计算 */}
                            <ToolGroupExtraRender toolGroup={message.toolGroup} groupId={message.id} />
                        </>
                    )}
                </Box>
            );
        },
        [startIndex],
    );

    // 找到当前消息的索引
    let currentDisplayIndex = processedMessages.length - 1;

    // 没有未完成的消息，最后一个作为 current
    if (currentDisplayIndex === -1) {
        currentDisplayIndex = processedMessages.length - 1;
    }

    const histories = processedMessages.slice(0, currentDisplayIndex);
    const current = processedMessages.slice(currentDisplayIndex);

    // 首次渲染时直接显示，后续使用 Static
    if (!ready) {
        return (
            <Box flexDirection="column">
                {processedMessages.map((item, i) => renderMessage(item, i, i === currentDisplayIndex))}
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            {/* 历史消息：用 Static 固定，使用 key 强制重新挂载 */}
            <Static items={histories} key={currentChatId}>
                {(item, i) => renderMessage(item, i, false)}
            </Static>

            {/* 当前消息 */}
            {current.map((item, i) => renderMessage(item, histories.length + i, true))}
        </Box>
    );
});
